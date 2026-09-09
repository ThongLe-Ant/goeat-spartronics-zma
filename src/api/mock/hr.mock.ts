// GoEat ZMA — mock cho các màn NHÂN SỰ (đặt hộ / sửa đăng ký).
//
// Dùng lại nguyên bộ máy của ordering.mock: cùng thực đơn, cùng kho đơn, cùng
// luật khoá. Chỉ khác một điều — kho đơn lấy theo `employeeId` (`storeOf`), nên
// nhân sự sửa cho người khác thì đơn của CHÍNH mình không suy suyển.
import type {
  BatchOrderInput,
  BatchOrderResult,
  RegistrationBoard,
  RegistrationOrder,
  RegistrationPick,
  RegistrationSaveResult,
  RegistrationShiftState,
  StaffEmployeeHit,
  WeeklyMenuData,
} from "../types";
import {
  DEADLINE_HOURS,
  MEAL_TIMES,
  MOCK_EMPLOYEE,
  SHIFTS,
  dishesFor,
  key,
  mockBatchOrder,
  mockWeekMenu,
  saveOf,
  storeOf,
} from "./ordering.mock";
import { mockSearchEmployees } from "./staff.mock";
import { dayKind } from "@/lib/date-vn";
import { isLockedAt, lockClock } from "@/lib/ordering-lock";
import { shiftEndMs } from "@/lib/shift-window";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Cùng danh bạ với ô tra cứu ở màn phát ngoại lệ — một nguồn, khỏi lệch. */
export const mockStaffEmployees = (q: string): Promise<StaffEmployeeHit[]> => mockSearchEmployees(q);

// ---- Đặt hộ ------------------------------------------------------------------
export const mockProxyWeekMenu = (employeeId: number): Promise<WeeklyMenuData> => mockWeekMenu(employeeId);

export const mockProxyBatchOrder = (employeeId: number, input: BatchOrderInput): Promise<BatchOrderResult> => mockBatchOrder(input, employeeId);

// ---- Sửa đăng ký một ngày ----------------------------------------------------
const dateLabelOf = (ymd: string) => `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}/${ymd.slice(0, 4)}`;

/** Hồ sơ người được sửa — tra trong danh bạ mock, không có thì dựng tạm từ id. */
async function employeeOf(employeeId: number): Promise<RegistrationBoard["employee"]> {
  if (employeeId === MOCK_EMPLOYEE.id) {
    return { id: MOCK_EMPLOYEE.id, code: MOCK_EMPLOYEE.employee_code, name: MOCK_EMPLOYEE.full_name, department: MOCK_EMPLOYEE.department };
  }
  const all = await mockSearchEmployees("SP");
  const hit = all.find((e) => e.id === employeeId);
  return { id: employeeId, code: hit?.employee_code ?? `NV${employeeId}`, name: hit?.full_name ?? "Nhân viên", department: hit?.department ?? "" };
}

/**
 * Vì sao ca này sửa được / không sửa được.
 *
 * HẠN SỬA CỦA NHÂN SỰ ≠ HẠN CHỐT CỦA NHÂN VIÊN (cùng luật với web): quá 48h chỉ
 * là CẢNH BÁO (`overCutoff`, bếp đã nấu theo số cũ), còn khoá cứng chỉ khi bữa
 * ăn đã xong hoặc suất đã nhận cơm — sửa lúc đó là sửa lịch sử.
 */
function stateOf(date: string, shiftId: number, now: number, picked: boolean): RegistrationShiftState {
  const mt = MEAL_TIMES.find((m) => m.id === shiftId)!;
  const shiftName = mt.name;
  const over = now > shiftEndMs(date, mt);
  const overCutoff = isLockedAt(now, date, DEADLINE_HOURS, mt);
  return {
    meal_time_id: shiftId,
    locked: picked || over,
    lockReason: picked
      ? `${shiftName}: suất này đã nhận cơm — không đổi được.`
      : over
        ? `${shiftName}: bữa ăn ngày ${dateLabelOf(date)} đã xong lúc ${mt.end_time} — không sửa được nữa.`
        : null,
    overCutoff: overCutoff && !over && !picked,
    cutoffLabel: overCutoff ? `${DEADLINE_HOURS} tiếng trước giờ ăn (${lockClock(DEADLINE_HOURS, mt)})` : null,
    // Mock chưa mô phỏng mốc "bếp chốt số" (`cook_lock_minutes_before_start`) —
    // để false còn hơn bịa ra một cảnh báo không có thật sau lưng nhân sự.
    overCookLock: false,
    cookLockLabel: null,
  };
}

export async function mockRegistrationBoard(employeeId: number, date: string): Promise<RegistrationBoard> {
  await delay(220);
  const now = Date.now();
  const store = storeOf(employeeId);
  const hasMenu = dayKind(date) !== "sun";

  const menus: RegistrationBoard["menus"] = {};
  const orders: Record<number, RegistrationOrder> = {};
  const shiftStates: Record<number, RegistrationShiftState> = {};

  for (const mt of MEAL_TIMES) {
    if (hasMenu) menus[mt.id] = dishesFor(date, mt.id);
    const o = store[key(date, mt.id)];
    if (o) {
      const dish = dishesFor(date, mt.id).find((d) => d.menu_line_id === o.menu_line_id);
      orders[mt.id] = {
        meal_time_id: mt.id,
        menu_line_id: o.menu_line_id,
        dish_name: dish?.name ?? "Món đã đăng ký",
        picked_up: !!o.picked_up,
        entitlement: o.entitlement,
      };
    }
    shiftStates[mt.id] = stateOf(date, mt.id, now, !!o?.picked_up);
  }

  return {
    date,
    dateLabel: dateLabelOf(date),
    employee: await employeeOf(employeeId),
    // Chỉ ca có thực đơn HOẶC đã có suất — ca trống thì không có gì để sửa.
    shifts: SHIFTS.filter((s) => (menus[s.id]?.length ?? 0) > 0 || orders[s.id] != null),
    menus,
    orders,
    shiftStates,
  };
}

export async function mockSaveRegistrations(employeeId: number, date: string, picks: RegistrationPick[]): Promise<RegistrationSaveResult> {
  await delay(280);
  const board = await mockRegistrationBoard(employeeId, date);
  const store = storeOf(employeeId);
  const want = new Map(picks.map((p) => [p.meal_time_id, p.menu_line_id]));

  let created = 0;
  let updated = 0;
  let deleted = 0;

  // Ca được chọn: thêm mới hoặc đổi món.
  for (const [shiftId, lineId] of Array.from(want.entries())) {
    const cur = board.orders[shiftId];
    if (cur && cur.menu_line_id === lineId) continue;
    const st = board.shiftStates[shiftId];
    if (st?.locked) throw new Error(st.lockReason ?? "Ca này không sửa được nữa.");
    if (!(board.menus[shiftId] ?? []).some((d) => d.menu_line_id === lineId)) {
      throw new Error(`Thực đơn ngày ${board.dateLabel} không có món này.`);
    }
    if (cur) updated++;
    else created++;
  }

  // Ca bị bỏ chọn.
  for (const shiftId of Object.keys(board.orders).map(Number)) {
    if (want.has(shiftId)) continue;
    const st = board.shiftStates[shiftId];
    if (st?.locked) throw new Error(st.lockReason ?? "Ca này không bỏ được nữa.");
    deleted++;
  }

  // Chỉ ghi khi mọi ca đều hợp lệ — nửa vời thì nhân sự không biết đã lưu gì.
  for (const shiftId of Object.keys(board.orders).map(Number)) {
    if (!want.has(shiftId)) delete store[key(date, shiftId)];
  }
  let n = 0;
  for (const [shiftId, lineId] of Array.from(want.entries())) {
    const prev = store[key(date, shiftId)];
    store[key(date, shiftId)] = {
      menu_line_id: lineId,
      // Suất đầu trong ngày là ca chính, suất sau là tăng ca — cùng cách gắn
      // nhãn với đường đặt món thường.
      entitlement: prev?.entitlement ?? (n === 0 ? "main" : "ot"),
      picked_up: prev?.picked_up,
      pickup_time: prev?.pickup_time,
    };
    n++;
  }
  saveOf(employeeId);

  const parts: string[] = [];
  if (created) parts.push(`thêm ${created} suất`);
  if (updated) parts.push(`đổi ${updated} suất`);
  if (deleted) parts.push(`bỏ ${deleted} suất`);
  return {
    created,
    updated,
    deleted,
    summary: parts.length ? `Đã ${parts.join(", ")}.` : "Không có thay đổi nào.",
    board: await mockRegistrationBoard(employeeId, date),
  };
}
