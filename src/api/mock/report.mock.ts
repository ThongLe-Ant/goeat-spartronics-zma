// GoEat ZMA — mock BÁO CÁO PHÁT MÓN theo ngày.
//
// Dựng số giả nhưng phải TỰ NHẤT QUÁN, vì cả màn hình chỉ để đọc số:
//
//   Dự trù − Loại trừ = Thực nấu = Đã phát + Chưa nhận
//   Phát ngoại lệ / suất phát sinh nằm NGOÀI dự trù, cộng riêng.
//
// Nếu mock phá đẳng thức này thì lúc thử màn hình sẽ tưởng mình tính sai công
// thức, trong khi lỗi nằm ở dữ liệu giả. Nên mọi con số đều suy ra từ `forecast`
// bằng đúng các phép trừ của server thật.
import type { MealDayReport, ReportDish, ReportShift } from "../types";
import { MEAL_TIMES, dishesFor, key, load } from "./ordering.mock";
import { dayKind, hmToMin, hmVN, ymdVN } from "@/lib/date-vn";
import { mealStartMs } from "@/lib/ordering-lock";
import { endMin, nowMinFor, shiftEndMs, startMin } from "@/lib/shift-window";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Quầy mở trước giờ ăn 15 phút — cùng hằng số với bảng bếp. */
const PICKUP_MINUTES = 15;

/**
 * Mốc CHỐT BẾP giả: 90 phút trước giờ ăn. Server thật đọc
 * `cook_lock_minutes_before_start` của từng ca; mock để một số cố định là đủ để
 * thấy nhãn "đã chốt" đổi trạng thái trong ngày.
 */
const COOK_LOCK_MINUTES = 90;

/** Số suất nền theo (ca, cột món) — Ca 1 đông nhất, Ca 3 ít. Giống bảng bếp. */
const BASE: Record<number, number[]> = {
  1: [96, 74, 22, 18],
  2: [41, 33, 9, 7],
  3: [12, 9, 3, 2],
};

/** Nhiễu ổn định theo ngày: cùng một ngày luôn ra cùng một con số. */
function jitter(
  date: string,
  shiftId: number,
  i: number,
  span: number,
): number {
  const seed =
    Number(date.slice(5, 7)) * 31 +
    Number(date.slice(8, 10)) * 7 +
    shiftId * 3 +
    i;
  return seed % span;
}

const hm = (min: number) =>
  `${String(Math.floor(min / 60) % 24).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

export async function mockMealDayReport(date: string): Promise<MealDayReport> {
  await delay(280);
  const today = ymdVN();
  const now = Date.now();
  const past = date < today;
  const future = date > today;
  const nowMin = hmToMin(hmVN());

  // Chủ nhật bếp không nấu — trả ngày rỗng thay vì bịa ra suất.
  if (dayKind(date) === "sun") {
    return {
      date,
      totals: {
        headcount: 0,
        forecast: 0,
        confirmed: 0,
        excluded: 0,
        actual: 0,
        picked: 0,
        missed: 0,
        exception: 0,
        extra_total: 0,
        to_cook: 0,
      },
      shifts: [],
      reconciled_at: null,
      shifts_awaiting_roster: [],
      note: NOTE,
    };
  }

  const orders = load();
  const shifts: ReportShift[] = MEAL_TIMES.map((mt) => {
    // Nhà máy đẩy danh sách vào ngày ăn; ngày mai thì bếp còn đang nấu theo dự trù.
    const rosterPushed = !future;
    const mealOver = now > shiftEndMs(date, mt);
    const cookLocked = now > mealStartMs(date, mt) - COOK_LOCK_MINUTES * 60_000;

    // Tiến độ phát: ngày đã qua thì gần hết, hôm nay thì chạy theo đồng hồ.
    const from = startMin(mt) - PICKUP_MINUTES;
    const to = endMin(mt);
    const t = nowMinFor(mt, nowMin, PICKUP_MINUTES);
    const progress = future
      ? 0
      : past || mealOver
        ? 0.97
        : t <= from
          ? 0
          : Math.min(0.95, (t - from) / (to - from));

    const dishes: ReportDish[] = dishesFor(date, mt.id).map((d, i) => {
      const forecast = BASE[mt.id][i] + jitter(date, mt.id, i, 5);
      // Loại trừ = nhà máy đẩy sang mà không có tên. Chưa đẩy thì chưa loại ai.
      const excluded = rosterPushed ? jitter(date, mt.id, i, 4) : 0;
      const actual = forecast - excluded;
      return {
        name: d.name,
        label: d.columnName ?? "Món lẻ",
        forecast,
        excluded,
        actual,
        picked: Math.round(actual * progress),
      };
    });

    // Suất của chính NV mẫu, để đặt món / quét thẻ xong mở báo cáo thấy số nhảy.
    const own = orders[key(date, mt.id)];
    if (own && own.entitlement !== "none") {
      const line = dishesFor(date, mt.id).findIndex(
        (x) => x.menu_line_id === own.menu_line_id,
      );
      if (line >= 0) {
        dishes[line].forecast += 1;
        dishes[line].actual += 1;
        if (own.picked_up) dishes[line].picked += 1;
      }
    }

    const sum = (f: (d: ReportDish) => number) =>
      dishes.reduce((a, d) => a + f(d), 0);
    const forecast = sum((d) => d.forecast);
    const excluded = sum((d) => d.excluded);
    const actual = sum((d) => d.actual);
    const picked = sum((d) => d.picked);

    // Ngoài dự trù: người đăng ký món ở ca không phải ca mình mà vẫn tới lấy
    // (`exception`), và người chưa có hồ sơ được phát tay (`extra_*`).
    const exception = future
      ? 0
      : Math.round(jitter(date, mt.id, 9, 4) * progress);
    const extraNew = future ? 0 : jitter(date, mt.id, 11, 3);
    const extraGuests = future ? 0 : jitter(date, mt.id, 13, 2);

    return {
      meal_time_id: mt.id,
      meal_time_name: mt.name,
      serve_window: `${mt.start_time} – ${mt.end_time}`,
      cook_lock_clock: hm(startMin(mt) - COOK_LOCK_MINUTES),
      cook_locked: cookLocked,
      roster_pushed: rosterPushed,
      forecast,
      confirmed: rosterPushed ? actual : 0,
      excluded,
      actual,
      picked,
      missed: Math.max(0, actual - picked),
      exception,
      extra_total: extraNew + extraGuests,
      extra_new_workers: extraNew,
      extra_guests: extraGuests,
      to_cook: actual + extraNew + extraGuests,
      dishes,
    };
  });

  const add = (f: (s: ReportShift) => number) =>
    shifts.reduce((a, s) => a + f(s), 0);

  return {
    date,
    totals: {
      // Một người ăn nhiều ca ⇒ số NGƯỜI ít hơn tổng suất; ước lượng cho ra dáng.
      headcount: Math.round(add((s) => s.forecast) * 0.82),
      forecast: add((s) => s.forecast),
      confirmed: add((s) => s.confirmed),
      excluded: add((s) => s.excluded),
      actual: add((s) => s.actual),
      picked: add((s) => s.picked),
      missed: add((s) => s.missed),
      exception: add((s) => s.exception),
      extra_total: add((s) => s.extra_total),
      to_cook: add((s) => s.to_cook),
    },
    shifts,
    reconciled_at: future
      ? null
      : new Date(
          mealStartMs(date, MEAL_TIMES[0]) - 3 * 3_600_000,
        ).toISOString(),
    shifts_awaiting_roster: shifts
      .filter((s) => !s.roster_pushed && s.forecast > 0)
      .map((s) => s.meal_time_name),
    note: NOTE,
  };
}

const NOTE =
  "Dự trù − Loại trừ = Thực nấu = Đã phát + Chưa nhận. Phát ngoại lệ nằm ngoài dự trù, cộng riêng.";
