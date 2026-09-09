// GoEat ZMA — mock quầy / bếp (chỉ chạy khi VITE_API_MODE=mock).
// Quét: thẻ của chính NV mẫu (MOCK_EMPLOYEE) đọc từ kho đơn localStorage; vài
// thẻ đồng nghiệp mẫu để thử luồng "phát thành công"/"đã nhận"/"không có suất".
import type {
  KitchenBoard,
  KitchenShift,
  ManualDispenseInput,
  StaffEmployeeHit,
  ManualMeta,
  ManualOutcome,
  ScanOutcome,
  ScanServed,
} from "../types";
import { MEAL_TIMES, MOCK_EMPLOYEE, dishesFor, effectiveOrder, key, load, save } from "./ordering.mock";
import { hmToMin, hmVN, weekdayIndex, ymdVN } from "@/lib/date-vn";
import { endMin, isServing, nowMinFor, startMin } from "@/lib/shift-window";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const PICKUP_MINUTES = 15;

type Mt = (typeof MEAL_TIMES)[number];
const serveWindow = (mt: Mt) => `${mt.start_time}–${mt.end_time}`;
// Ca có thể vắt qua nửa đêm — để shift-window lo phần cộng 1440.
const isOpen = (mt: Mt, nowMin: number) => isServing(mt, nowMin, PICKUP_MINUTES);

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
      const from = startMin(mt) - PICKUP_MINUTES;
      const to = endMin(mt);
      const t = nowMinFor(mt, nowMin, PICKUP_MINUTES);
      const pct = t > to ? 0.97 : isOpen(mt, nowMin) ? Math.min(0.95, (t - from) / (to - from)) : 0;
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

// ---- Phát ngoại lệ ------------------------------------------------------------
// Danh mục `pickup_manual_reason` như bản seed của spartronics (§16, §20).
const MANUAL_REASONS = [
  { code: "no_attendance", name: "Chưa có dữ liệu chấm công" },
  { code: "no_order", name: "Không có suất trong hệ thống" },
  { code: "shift_changed", name: "Đổi ca đột xuất" },
  { code: "guest", name: "Khách / trường hợp đặc biệt" },
  { code: "wrong_dispenser", name: "Quầy không phát được nhóm món đã đăng ký" },
];

/** Trần suất phát sinh trong ngày (server thật đọc từ cấu hình). */
const EXTRA_QUOTA = 5;
let extraDay = "";
let extraUsed = 0;

export async function mockManualMeta(): Promise<ManualMeta> {
  await delay(200);
  const today = ymdVN();
  const mt = currentShift(hmToMin(hmVN()));
  // `foodItemId` trong mock chính là `menu_line_id` — kho đơn mock chỉ có khoá đó.
  const dishes = dishesFor(today, mt.id).map((d) => ({ foodItemId: d.menu_line_id, name: d.name, columnName: d.columnName ?? null }));
  return { reasons: MANUAL_REASONS, dishes };
}

export async function mockSearchEmployees(q: string): Promise<StaffEmployeeHit[]> {
  await delay(220);
  const t = q.trim().toLowerCase();
  if (t.length < 2) return [];
  // Khớp cả mã NV, tên và số thẻ — quầy hay gõ số in trên thẻ nhựa.
  const rows: (StaffEmployeeHit & { card: string })[] = [
    { id: MOCK_EMPLOYEE.id, employee_code: MOCK_EMPLOYEE.employee_code, full_name: MOCK_EMPLOYEE.full_name, department: MOCK_EMPLOYEE.department, card: MOCK_EMPLOYEE.card_number },
    ...Object.entries(COLLEAGUES).map(([card, c], i) => ({ id: 4900 + i, employee_code: c.code, full_name: c.name, department: c.dept, card })),
  ];
  return rows
    .filter((e) => e.employee_code.toLowerCase().includes(t) || e.full_name.toLowerCase().includes(t) || e.card.includes(t))
    .map(({ card: _card, ...e }) => e);
}

export async function mockManualDispense(input: ManualDispenseInput): Promise<ManualOutcome> {
  await delay(420);
  const reason = MANUAL_REASONS.find((r) => r.code === input.manual_reason);
  if (!reason) return { kind: "denied", result: "no_order", message: "Lý do phát ngoại lệ không hợp lệ." };

  const today = ymdVN();
  const nowMin = hmToMin(hmVN());
  const mt = currentShift(nowMin);
  const menu = dishesFor(today, mt.id);
  const chosen = input.food_item_id ? menu.find((d) => d.menu_line_id === input.food_item_id) : undefined;
  const pickup_time = hmVN();

  // a. Suất phát sinh — không gắn nhân viên, trừ vào trần trong ngày.
  if (input.no_employee) {
    if (extraDay !== today) {
      extraDay = today;
      extraUsed = 0;
    }
    if (extraUsed >= EXTRA_QUOTA) return { kind: "denied", result: "extra_quota_exhausted", message: `Đã hết ${EXTRA_QUOTA} suất phát sinh của ${mt.name} hôm nay.` };
    extraUsed += 1;
    const who = input.kind === "new_worker" ? "Công nhân mới" : "Khách";
    return {
      kind: "served",
      message: `Đã phát suất phát sinh, còn lại ${EXTRA_QUOTA - extraUsed}.`,
      data: {
        employee_name: input.label?.trim() || who,
        employee_code: "EXTRA",
        department: input.department ?? null,
        meal_time_name: mt.name,
        food_name: chosen?.name ?? menu[0].name,
        pickup_time,
        order_id: 900000 + extraUsed,
        created: true,
        reason_name: reason.name,
        remaining: EXTRA_QUOTA - extraUsed,
        is_extra: true,
      },
    };
  }

  const v = (input.employee_identifier ?? "").trim().toUpperCase();
  if (!v) return { kind: "denied", result: "unknown_user", message: "Thiếu mã nhân viên." };

  // b. Chính NV mẫu — ghi thẳng vào kho đơn mock để bảng bếp và thẻ QR cùng nhảy.
  if (v === MOCK_EMPLOYEE.card_number || v === MOCK_EMPLOYEE.employee_code.toUpperCase()) {
    const orders = load();
    const k = key(today, mt.id);
    const existing = effectiveOrder(today, mt.id);
    const details = { employee_name: MOCK_EMPLOYEE.full_name, employee_code: MOCK_EMPLOYEE.employee_code, department: MOCK_EMPLOYEE.department };
    if (existing?.picked_up) return { kind: "denied", result: "already_picked", message: `Suất ${mt.name} đã được nhận lúc ${existing.pickup_time ? hmVN(new Date(existing.pickup_time)) : "—"} — phát ngoại lệ không phải cửa nhận hai lần.` };
    const created = !existing;
    // Suất tạo mới mang nhãn `none` (§21): đã ăn thì đếm bằng `picked_up`, không đếm bằng nhãn.
    const line = chosen?.menu_line_id ?? existing?.menu_line_id ?? menu[0].menu_line_id;
    orders[k] = { menu_line_id: line, entitlement: existing?.entitlement ?? "none", picked_up: true, pickup_time: new Date().toISOString() };
    save();
    return {
      kind: "served",
      message: `Đã phát ngoại lệ cho ${MOCK_EMPLOYEE.full_name}.`,
      data: { ...details, meal_time_name: mt.name, food_name: menu.find((d) => d.menu_line_id === line)?.name ?? null, pickup_time, order_id: 800000 + mt.id, created, reason_name: reason.name },
    };
  }

  // c. Đồng nghiệp mẫu — chỉ giữ trong bộ nhớ phiên, đủ để thử luồng.
  const c = COLLEAGUES[v] ?? Object.values(COLLEAGUES).find((x) => x.code === v);
  if (!c) return { kind: "denied", result: "unknown_user", message: `Không tìm thấy nhân viên với mã ${input.employee_identifier}.` };
  const k = `${today}|${mt.id}|${c.code}`;
  if (c.picked || servedOnce.has(k)) return { kind: "denied", result: "already_picked", message: `Suất ${mt.name} của ${c.name} đã được nhận rồi.` };
  servedOnce.add(k);
  return {
    kind: "served",
    message: `Đã phát ngoại lệ cho ${c.name}.`,
    data: { employee_name: c.name, employee_code: c.code, department: c.dept, meal_time_name: mt.name, food_name: chosen?.name ?? (c.col ? menu[c.col - 1]?.name ?? null : menu[0].name), pickup_time, order_id: 700000 + mt.id, created: c.col === null, reason_name: reason.name },
  };
}
