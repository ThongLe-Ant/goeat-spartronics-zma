// GoEat ZMA — mock quầy / bếp (chỉ chạy khi VITE_API_MODE=mock).
// Quét: thẻ của chính NV mẫu (MOCK_EMPLOYEE) đọc từ kho đơn localStorage; vài
// thẻ đồng nghiệp mẫu để thử luồng "phát thành công"/"đã nhận"/"không có suất".
import type { KitchenBoard, KitchenShift, ScanOutcome, ScanServed } from "../types";
import { MEAL_TIMES, MOCK_EMPLOYEE, dishesFor, effectiveOrder, key, load, save } from "./ordering.mock";
import { hmToMin, hmVN, weekdayIndex, ymdVN } from "@/lib/date-vn";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const PICKUP_MINUTES = 15;

type Mt = (typeof MEAL_TIMES)[number];
const serveWindow = (mt: Mt) => `${mt.start_time}–${mt.end_time}`;
const isOpen = (mt: Mt, nowMin: number) => nowMin >= hmToMin(mt.start_time) - PICKUP_MINUTES && nowMin <= hmToMin(mt.end_time);

/**
 * Ca đang mở cửa phát; ngoài giờ, mock lấy ca kế tiếp trong ngày (hoặc ca cuối)
 * để thử được luồng phát bất kể giờ chạy thử. Server thật trả `out_of_window`.
 */
function currentShift(nowMin: number): Mt {
  return MEAL_TIMES.find((mt) => isOpen(mt, nowMin)) ?? MEAL_TIMES.find((mt) => hmToMin(mt.start_time) > nowMin) ?? MEAL_TIMES[MEAL_TIMES.length - 1];
}

/** Đồng nghiệp mẫu: mã thẻ ➝ (tên, bộ phận, món theo cột). `picked` = đã nhận rồi. */
const COLLEAGUES: Record<string, { code: string; name: string; dept: string; col: number | null; picked?: boolean }> = {
  "0007248201": { code: "SP04901", name: "Trần Thị Bích", dept: "Sản xuất — Line 1", col: 2 },
  "0007248202": { code: "SP04902", name: "Lê Minh Tuấn", dept: "Kho vận", col: 4 },
  "0007248203": { code: "SP04903", name: "Phạm Hồng Ngọc", dept: "QA", col: 1, picked: true },
  "0007248204": { code: "SP04904", name: "Võ Anh Khoa", dept: "Bảo trì", col: null },
};
const servedOnce = new Set<string>();

export async function mockScan(scanValue: string): Promise<ScanOutcome> {
  await delay(350);
  const v = scanValue.trim().toUpperCase();
  const today = ymdVN();
  const nowMin = hmToMin(hmVN());
  const mt = currentShift(nowMin);
  const base = { meal_time_name: mt.name };

  // Thẻ của chính NV mẫu — đọc đơn thật trong kho mock.
  if (v === MOCK_EMPLOYEE.card_number || v === MOCK_EMPLOYEE.employee_code.toUpperCase()) {
    const orders = load();
    // Không chọn món vẫn được nhận suất mặc định — ghi nhận vào kho ngay lúc phát.
    const o = effectiveOrder(today, mt.id);
    if (o) orders[key(today, mt.id)] = o;
    const details = { employee_code: MOCK_EMPLOYEE.employee_code, employee_name: MOCK_EMPLOYEE.full_name, department: MOCK_EMPLOYEE.department, ...base };
    if (!o || o.entitlement === "none") return { kind: "denied", result: "no_order", message: `Không có suất ${mt.name} hôm nay.`, details, duplicate: false };
    const dish = dishesFor(today, mt.id).find((d) => d.menu_line_id === o.menu_line_id);
    if (o.picked_up) return { kind: "denied", result: "already_picked", message: `Suất ${mt.name} đã được nhận lúc ${o.pickup_time ? hmVN(new Date(o.pickup_time)) : "—"}.`, details: { ...details, food_name: dish?.name }, duplicate: false };
    o.picked_up = true;
    o.pickup_time = new Date().toISOString();
    save();
    const data: ScanServed = { employee_name: MOCK_EMPLOYEE.full_name, employee_code: MOCK_EMPLOYEE.employee_code, department: MOCK_EMPLOYEE.department, meal_time_name: mt.name, food_name: dish?.name ?? null, pickup_time: hmVN(), entitlement: o.entitlement };
    return { kind: "served", data, duplicate: false, message: "Xử lý nhận suất ăn thành công" };
  }

  const c = COLLEAGUES[v] ?? Object.values(COLLEAGUES).find((x) => x.code === v);
  if (!c) return { kind: "denied", result: "unknown_user", message: `Không tìm thấy nhân viên với mã ${scanValue.trim()}.`, duplicate: false };
  const details = { employee_code: c.code, employee_name: c.name, department: c.dept, ...base };
  if (c.col === null) return { kind: "denied", result: "no_order", message: `Không có suất ${mt.name} hôm nay.`, details, duplicate: false };
  const dish = dishesFor(today, mt.id)[c.col - 1];
  const k = `${today}|${mt.id}|${c.code}`;
  if (c.picked || servedOnce.has(k)) return { kind: "denied", result: "already_picked", message: `Suất ${mt.name} đã được nhận lúc ${mt.start_time}.`, details: { ...details, food_name: dish?.name }, duplicate: false };
  servedOnce.add(k);
  return { kind: "served", data: { employee_name: c.name, employee_code: c.code, department: c.dept, meal_time_name: mt.name, food_name: dish?.name ?? null, pickup_time: hmVN(), entitlement: "main" }, duplicate: false, message: "Xử lý nhận suất ăn thành công" };
}

export async function mockKitchenBoard(): Promise<KitchenBoard> {
  await delay(250);
  const today = ymdVN();
  const wd = weekdayIndex(today);
  const nowMin = hmToMin(hmVN());
  const orders = load();
  // Số suất giả lập ổn định theo (thứ, ca, cột): Ca 1 đông nhất, Ca 3 ít.
  const BASE: Record<number, number[]> = { 1: [96, 74, 22, 18], 2: [41, 33, 9, 7], 3: [12, 9, 3, 2] };
  const shifts: KitchenShift[] = MEAL_TIMES.map((mt) => {
    const dishes = dishesFor(today, mt.id).map((d, i) => {
      const registered = BASE[mt.id][i] + ((wd * 7 + i * 3) % 5);
      const endMin = hmToMin(mt.end_time);
      const pct = nowMin > endMin ? 0.97 : isOpen(mt, nowMin) ? Math.min(0.95, (nowMin - hmToMin(mt.start_time) + PICKUP_MINUTES) / (endMin - hmToMin(mt.start_time) + PICKUP_MINUTES)) : 0;
      return { name: d.name, registered, picked_up: Math.round(registered * pct) };
    });
    // Cộng suất của chính NV mẫu để thao tác đặt món / quét thẻ thấy được số nhảy.
    const own = orders[key(today, mt.id)];
    if (own && own.entitlement !== "none") {
      const line = dishesFor(today, mt.id).findIndex((d) => d.menu_line_id === own.menu_line_id);
      if (line >= 0) {
        dishes[line].registered += 1;
        if (own.picked_up) dishes[line].picked_up += 1;
      }
    }
    const registered = dishes.reduce((a, d) => a + d.registered, 0);
    const picked_up = dishes.reduce((a, d) => a + d.picked_up, 0);
    return { meal_time_id: mt.id, meal_time_name: mt.name, serve_window: serveWindow(mt), window_open: isOpen(mt, nowMin), registered, picked_up, dishes };
  });
  return { date: today, total_registered: shifts.reduce((a, s) => a + s.registered, 0), total_picked_up: shifts.reduce((a, s) => a + s.picked_up, 0), shifts };
}
