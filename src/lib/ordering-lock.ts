// GoEat ZMA — mốc khoá đặt món. Port từ spartronics ordering-lock.ts.
// UI KHÔNG tự tính khoá (server là người gác); file này chỉ phục vụ mock
// adapter và nhãn "Chốt 10:30 trước 2 ngày".
import { addDays, hmToMin } from "./date-vn";

export interface MealTimeLockInput {
  start_time: string; // "HH:mm"
  lock_minutes_before_start?: number | null;
}

/** Số phút khoá trước giờ ăn: riêng của ca > 0 thì thắng, không thì lấy deadlineHours toàn cục. */
export function effectiveLockMinutes(deadlineHours: number, mt: MealTimeLockInput): number {
  const own = mt.lock_minutes_before_start ?? 0;
  if (own > 0) return own;
  return Math.max(0, deadlineHours) * 60;
}

/** Epoch ms của giờ bắt đầu ca trong ngày, theo múi giờ VN (+07:00, không DST). */
export function mealStartMs(ymd: string, mt: MealTimeLockInput): number {
  return Date.parse(`${ymd}T${mt.start_time.padStart(5, "0")}:00+07:00`);
}

export function lockMs(ymd: string, deadlineHours: number, mt: MealTimeLockInput): number {
  return mealStartMs(ymd, mt) - effectiveLockMinutes(deadlineHours, mt) * 60_000;
}

export function isLockedAt(now: number, ymd: string, deadlineHours: number, mt: MealTimeLockInput): boolean {
  return now >= lockMs(ymd, deadlineHours, mt);
}

/** Giờ khoá trong ngày ("HH:mm") — dùng cho nhãn cutoff_time. */
export function lockClock(deadlineHours: number, mt: MealTimeLockInput): string {
  const total = ((hmToMin(mt.start_time) - effectiveLockMinutes(deadlineHours, mt)) % 1440 + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** Khoá trước bao nhiêu ngày — dùng cho nhãn cutoff_days. */
export function lockLeadDays(deadlineHours: number, mt: MealTimeLockInput): number {
  const diff = hmToMin(mt.start_time) - effectiveLockMinutes(deadlineHours, mt);
  return diff >= 0 ? 0 : Math.ceil(-diff / 1440);
}

/** Ngày ăn ➝ ngày khoá (YYYY-MM-DD). */
export function lockDate(ymd: string, deadlineHours: number, mt: MealTimeLockInput): string {
  return addDays(ymd, -lockLeadDays(deadlineHours, mt));
}
