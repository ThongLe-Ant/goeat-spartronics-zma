// GoEat ZMA — mock adapter cho tenant spartronics.
// Sinh dữ liệu ĐÚNG hình WeeklyMenuData của server (combo/thay thế/chay,
// khoá 48h, nhãn suất main/ot/none) và giữ đơn trong localStorage để
// reload không mất. Không có giá — spartronics không hiện giá cho công nhân.
import type {
  BatchOrderInput,
  BatchOrderResult,
  Bootstrap,
  Entitlement,
  OrderHistoryItem,
  OrderingFoodItem,
  PickupCardData,
  WeeklyDay,
  WeeklyMenuData,
  WeeklyShift,
} from "../types";
import { addDays, dayKind, hmToMin, mondayOf, weekdayIndex, ymdVN } from "@/lib/date-vn";
import { isLockedAt, lockClock, lockLeadDays } from "@/lib/ordering-lock";

export const DEADLINE_HOURS = 48;
const PICKUP_MINUTES = 15;
const FUTURE_HORIZON_DAYS = 14;

export const MOCK_EMPLOYEE = {
  id: 4821,
  employee_code: "SP04821",
  full_name: "Nguyễn Văn Quang",
  department: "Sản xuất — Line 3",
  position: "Công nhân vận hành",
  card_number: "0007248113",
  avatar_url: "https://i.pravatar.cc/160?img=12",
  zalo_phone: "0912 345 678",
};

// Bữa trong DB ("Bữa trưa") ➝ tên ca nhà máy quen gọi ("Ca 1"), như SHIFT_MAP.
export const MEAL_TIMES = [
  { id: 1, name: "Ca 1", start_time: "11:30", end_time: "12:30", lock_minutes_before_start: 0 },
  { id: 2, name: "Ca 2", start_time: "17:30", end_time: "18:30", lock_minutes_before_start: 0 },
  { id: 3, name: "Ca 3", start_time: "23:00", end_time: "23:45", lock_minutes_before_start: 0 },
];

/** Ca nào NV này có tên trong danh sách nhà máy: Ca 1 = ca chính, Ca 2 = tăng ca. */
const ROSTER: Record<number, Entitlement> = { 1: "main", 2: "ot", 3: "none" };

export const SHIFTS: WeeklyShift[] = MEAL_TIMES.map((mt) => {
  const cutoff_time = lockClock(DEADLINE_HOURS, mt);
  const cutoff_days = lockLeadDays(DEADLINE_HOURS, mt);
  return { id: mt.id, name: mt.name, start_time: mt.start_time, end_time: mt.end_time, cutoff_time, cutoff_days, cutoff_label: `${DEADLINE_HOURS} tiếng trước giờ ăn` };
});

// Thực đơn xoay theo thứ. Mỗi ngày: 2 combo mặn + 1 món thay thế + 1 chay.
// Tên món viết "Món chính + món phụ" như bếp spartronics nhập trên web.
const MENU_BY_WD: Record<number, { m1: string; m2: string; sub: string; chay: string; canh: string }> = {
  1: { m1: "Gà kho gừng + trứng chiên", m2: "Cá basa kho tộ + đậu hũ sốt cà", sub: "Thịt heo luộc + rau muống xào tỏi", chay: "Đậu hũ kho nấm + rau củ luộc", canh: "Canh bí đỏ nấu tôm" },
  2: { m1: "Sườn ram mặn + chả lụa", m2: "Cá thu sốt cà + trứng kho", sub: "Gà xào sả ớt + cải thìa xào", chay: "Nấm kho tiêu + đậu hũ chiên sả", canh: "Canh cải ngọt thịt bằm" },
  3: { m1: "Bò xào hành tây + trứng đúc", m2: "Cá diêu hồng chiên + thịt kho", sub: "Gà rô ti + bắp cải xào", chay: "Đậu hũ sốt nấm + su su luộc", canh: "Canh chua cá" },
  4: { m1: "Thịt kho tàu + trứng", m2: "Gà chiên nước mắm + chả cá", sub: "Cá kho + rau luộc", chay: "Chả chay kho + rau xào", canh: "Canh khổ qua dồn thịt" },
  5: { m1: "Cá nục kho + đậu bắp xào", m2: "Thịt xá xíu + trứng ốp la", sub: "Gà kho sả + đậu que xào", chay: "Đậu hũ chiên sả + bí xanh luộc", canh: "Canh rau dền tôm khô" },
  6: { m1: "Gà nướng mật ong + chả trứng", m2: "Sườn xào chua ngọt + cá viên", sub: "Thịt heo rim + rau muống luộc", chay: "Nấm xào sả ớt + đậu hũ hấp", canh: "Canh mồng tơi cua" },
  0: { m1: "Cơm sườn nướng", m2: "Bún thịt nướng", sub: "Cơm gà xối mỡ", chay: "Cơm chay thập cẩm", canh: "Canh rau" },
};

/** menu_line_id ổn định theo (thứ, ca, cột) để reload vẫn khớp đơn đã lưu. */
const lineId = (wd: number, shiftId: number, col: number) => 1000 + wd * 100 + shiftId * 10 + col;

export function dishesFor(date: string, shiftId: number): OrderingFoodItem[] {
  const wd = weekdayIndex(date);
  const m = MENU_BY_WD[wd];
  const base = { description: null, meal_time_id: shiftId, side_dishes: m.canh, image_url: null, date };
  return [
    { ...base, id: lineId(wd, shiftId, 1), menu_line_id: lineId(wd, shiftId, 1), name: m.m1, category: "man", ingredients: `COMBO:${lineId(wd, shiftId, 1)}`, kind: "combo", columnName: "Mặn 1", isDefault: true },
    { ...base, id: lineId(wd, shiftId, 2), menu_line_id: lineId(wd, shiftId, 2), name: m.m2, category: "man", ingredients: `COMBO:${lineId(wd, shiftId, 2)}`, kind: "combo", columnName: "Mặn 2" },
    { ...base, id: lineId(wd, shiftId, 3), menu_line_id: lineId(wd, shiftId, 3), name: m.sub, category: "man", ingredients: `SUB:${lineId(wd, shiftId, 1)}:${lineId(wd, shiftId, 3)}`, kind: "substitute", columnName: "Món thay thế" },
    { ...base, id: lineId(wd, shiftId, 4), menu_line_id: lineId(wd, shiftId, 4), name: m.chay, category: "chay", ingredients: null, kind: "single", isVegetarian: true, columnName: "Chay" },
  ];
}

// ---- Kho đơn (localStorage) ---------------------------------------------------
export type StoredOrder = { menu_line_id: number; entitlement: Entitlement; picked_up?: boolean; pickup_time?: string | null };
const STORE_KEY = `goeat.mock.orders.v1.${MOCK_EMPLOYEE.employee_code}`;
let store: Record<string, StoredOrder> | null = null;
export const key = (date: string, shiftId: number) => `${date}|${shiftId}`;

export function load(): Record<string, StoredOrder> {
  if (store) return store;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    store = raw ? JSON.parse(raw) : null;
  } catch {
    store = null;
  }
  if (!store) store = seed();
  return store;
}
export function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    /* ignore */
  }
}

/**
 * Kho đơn của NGƯỜI KHÁC — chỉ dùng khi nhân sự đặt hộ / sửa đăng ký.
 * Cố ý KHÔNG ghi localStorage: đơn mock của đồng nghiệp không đáng chiếm chỗ
 * lưu của máy, và mỗi lần mở lại app nhân sự thấy dữ liệu sạch để thử.
 */
const proxyStores: Record<number, Record<string, StoredOrder>> = {};

/** Kho đơn của một nhân viên: chính mình thì là kho thật, người khác thì kho phiên. */
export function storeOf(employeeId: number): Record<string, StoredOrder> {
  if (employeeId === MOCK_EMPLOYEE.id) return load();
  if (!proxyStores[employeeId]) proxyStores[employeeId] = {};
  return proxyStores[employeeId];
}

/** Ghi xuống đĩa nếu là kho của chính mình; kho người khác chỉ sống trong phiên. */
export function saveOf(employeeId: number) {
  if (employeeId === MOCK_EMPLOYEE.id) save();
}

/** Đơn mẫu: các ngày làm việc đã qua trong tuần này đã ăn Ca 1 (combo Mặn 1). */
function seed(): Record<string, StoredOrder> {
  const today = ymdVN();
  const mon = mondayOf(today);
  const out: Record<string, StoredOrder> = {};
  for (let i = 0; i < 7; i++) {
    const d = addDays(mon, i);
    if (d >= today || dayKind(d) === "sun") continue;
    const wd = weekdayIndex(d);
    out[key(d, 1)] = { menu_line_id: lineId(wd, 1, wd % 2 ? 1 : 2), entitlement: "main", picked_up: wd !== 3, pickup_time: wd !== 3 ? `${d}T11:4${wd}:00+07:00` : null };
    if (wd === 2 || wd === 4) out[key(d, 2)] = { menu_line_id: lineId(wd, 2, 3), entitlement: "ot", picked_up: true, pickup_time: `${d}T17:38:00+07:00` };
  }
  return out;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---- API ---------------------------------------------------------------------
export async function mockBootstrap(): Promise<Bootstrap> {
  await delay(120);
  return { employee: MOCK_EMPLOYEE, config: { tenant: "spartronics", hidePrice: true, deadlineHours: DEADLINE_HOURS, futureHorizonDays: FUTURE_HORIZON_DAYS }, staff: { canScan: true, canKitchen: true, canManual: true, canProxy: true, canRegView: true, canRegEdit: true, canReport: true, canTempCard: true } };
}

function buildDay(date: string, today: string, now: number, orders: Record<string, StoredOrder>): WeeklyDay {
  const past = date < today;
  const hasMenu = dayKind(date) !== "sun";
  const menus: WeeklyDay["menus"] = {};
  const lockedShifts: WeeklyDay["lockedShifts"] = {};
  const dayOrders: WeeklyDay["orders"] = {};
  const entitlements: NonNullable<WeeklyDay["entitlements"]> = {};
  for (const mt of MEAL_TIMES) {
    if (hasMenu) menus[mt.id] = dishesFor(date, mt.id);
    lockedShifts[mt.id] = past || isLockedAt(now, date, DEADLINE_HOURS, mt);
    const o = orders[key(date, mt.id)];
    if (o) {
      dayOrders[mt.id] = o.menu_line_id;
      entitlements[mt.id] = o.entitlement;
    }
  }
  const wdVN = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"][weekdayIndex(date)];
  return { date, weekday: wdVN, isToday: date === today, isLocked: MEAL_TIMES.every((mt) => lockedShifts[mt.id]), lockedShifts, menus, orders: dayOrders, entitlements };
}

export async function mockWeekMenu(employeeId: number = MOCK_EMPLOYEE.id): Promise<WeeklyMenuData> {
  await delay(180);
  const now = Date.now();
  const today = ymdVN();
  const mon = mondayOf(today);
  const orders = storeOf(employeeId);
  const week = (start: string) =>
    Array.from({ length: 7 }, (_, i) => buildDay(addDays(start, i), today, now, orders)).filter(
      (d) => dayKind(d.date) !== "sun" || Object.keys(d.menus).length > 0 || Object.keys(d.orders).length > 0,
    );
  return { shifts: SHIFTS, thisWeek: week(mon), nextWeek: week(addDays(mon, 7)), allowOrderingThisWeek: true };
}

export async function mockBatchOrder(input: BatchOrderInput, employeeId: number = MOCK_EMPLOYEE.id): Promise<BatchOrderResult> {
  await delay(260);
  const now = Date.now();
  const today = ymdVN();
  const orders = storeOf(employeeId);
  const horizon = addDays(today, FUTURE_HORIZON_DAYS);
  const noPortion: BatchOrderResult["noPortion"] = [];

  const guard = (date: string, shiftId: number) => {
    const mt = MEAL_TIMES.find((m) => m.id === shiftId);
    if (!mt) throw new Error("Ca không tồn tại");
    if (date < today) throw new Error("Không thể đặt món cho ngày đã qua");
    if (date > horizon) throw new Error(`Chỉ được đăng ký trước tối đa ${FUTURE_HORIZON_DAYS} ngày`);
    if (isLockedAt(now, date, DEADLINE_HOURS, mt)) throw new Error(`${mt.name} ngày ${date.slice(8, 10)}/${date.slice(5, 7)} đã quá hạn đăng ký`);
    return mt;
  };

  for (const del of input.ordersToDelete) {
    guard(del.meal_date, del.meal_time_id);
    delete orders[key(del.meal_date, del.meal_time_id)];
  }
  for (const o of input.ordersToSave) {
    guard(o.meal_date, o.meal_time_id);
    const valid = dishesFor(o.meal_date, o.meal_time_id).some((d) => d.menu_line_id === o.menu_line_id);
    if (!valid) throw new Error("Món không có trong thực đơn ca này");
    // Luật Spartronics: mỗi ngày tối đa 2 suất (1 ca chính + 1 tăng ca)
    const existingShifts = Object.keys(orders)
      .filter((k) => k.startsWith(`${o.meal_date}|`))
      .map((k) => Number(k.split("|")[1]));
    const otherShifts = existingShifts.filter((sid) => sid !== o.meal_time_id);
    if (otherShifts.length >= 2) {
      throw new Error("Mỗi ngày chỉ được đăng ký tối đa 2 suất ăn (1 ca chính + 1 tăng ca)");
    }
    const ent: Entitlement = otherShifts.length === 0 ? "main" : "ot";
    orders[key(o.meal_date, o.meal_time_id)] = { menu_line_id: o.menu_line_id, entitlement: ent };
  }
  saveOf(employeeId);
  return { message: "Đã lưu", noPortion };
}

const serveWindow = (mt: (typeof MEAL_TIMES)[number]) => `${mt.start_time}–${mt.end_time}`;
/** Suất NV nhận nếu không chọn — cùng quy tắc với autoDishOf() ở state/ordering.ts. */
const autoDish = (dishes: OrderingFoodItem[]) => (dishes.length === 0 ? null : dishes.find((d) => d.isDefault) ?? dishes[0]);

/**
 * Suất HIỆU LỰC của một ô: đơn NV đã chọn, hoặc suất mặc định nếu không chọn.
 * Thẻ QR và máy quét ở quầy đều đọc qua đây để không lệch nhau.
 * Ca "ngoài ca làm việc" và Chủ nhật thì không có suất.
 */
export function effectiveOrder(date: string, shiftId: number): StoredOrder | null {
  const o = load()[key(date, shiftId)];
  if (o) return o;
  if (dayKind(date) === "sun" || (ROSTER[shiftId] ?? "none") === "none") return null;
  const dish = autoDish(dishesFor(date, shiftId));
  return dish ? { menu_line_id: dish.menu_line_id, entitlement: ROSTER[shiftId] } : null;
}
/** Phút ➝ "HH:mm"; chuẩn hoá về [0,1440) trước khi chia để mốc âm (mở quầy trước 00:00) không ra "23:-15". */
const minToHm = (min: number) => {
  const m = (((min % 1440) + 1440) % 1440);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

export async function mockPickupCard(): Promise<PickupCardData> {
  await delay(150);
  const today = ymdVN();
  const meals: PickupCardData["meals"] = [];
  for (const mt of MEAL_TIMES) {
    const o = effectiveOrder(today, mt.id);
    if (!o) continue;
    const dish = dishesFor(today, mt.id).find((d) => d.menu_line_id === o.menu_line_id);
    if (!dish) continue;
    meals.push({
      meal_time_id: mt.id,
      meal_time_name: mt.name,
      serve_window: serveWindow(mt),
      open_from: minToHm(hmToMin(mt.start_time) - PICKUP_MINUTES),
      open_to: mt.end_time,
      food_name: dish.name,
      entitlement: o.entitlement,
      picked_up: !!o.picked_up,
      pickup_time: o.pickup_time ?? null,
    });
  }
  return { date: today, employee: MOCK_EMPLOYEE, scan_value: MOCK_EMPLOYEE.card_number || MOCK_EMPLOYEE.employee_code, meals };
}

export async function mockOrderHistory(): Promise<OrderHistoryItem[]> {
  await delay(150);
  const orders = load();
  return Object.entries(orders)
    .map(([k, o]) => {
      const [date, sid] = k.split("|");
      // Ca có thể bị gỡ khỏi cấu hình — bỏ qua thay vì ném lỗi làm trắng màn lịch sử.
      const mt = MEAL_TIMES.find((m) => m.id === Number(sid));
      if (!mt) return null;
      const dish = dishesFor(date, mt.id).find((d) => d.menu_line_id === o.menu_line_id);
      return { meal_date: date, meal_time_id: mt.id, meal_time_name: mt.name, serve_window: serveWindow(mt), food_name: dish?.name ?? "—", entitlement: o.entitlement, picked_up: !!o.picked_up, pickup_time: o.pickup_time ?? null };
    })
    .filter((x): x is OrderHistoryItem => x !== null)
    .sort((a, b) => (a.meal_date === b.meal_date ? a.meal_time_id - b.meal_time_id : a.meal_date < b.meal_date ? 1 : -1));
}

/** Dành cho màn quét thử của admin trong mock: đánh dấu đã nhận. */
export function mockMarkPickedUp(date: string, shiftId: number) {
  const orders = load();
  const o = orders[key(date, shiftId)];
  if (o) {
    o.picked_up = true;
    o.pickup_time = new Date().toISOString();
    save();
  }
}
