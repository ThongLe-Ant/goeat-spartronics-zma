// GoEat ZMA — số học khung giờ ca phát cơm.
// Ca có thể vắt qua nửa đêm (ví dụ ca đêm 23:00–00:30). Khi đó `end_time` nhỏ
// hơn `start_time`, nên MỌI phép so sánh phải quy về phút và cộng 1440 cho mốc
// kết thúc — so chuỗi "HH:mm" trực tiếp sẽ cho kết quả ngược.
import { addDays, hmToMin } from "./date-vn";

export interface ShiftWindow {
  start_time: string; // "HH:mm"
  end_time: string; // "HH:mm"
}

/** Ca kết thúc sang ngày hôm sau? (end <= start nghĩa là vắt qua nửa đêm) */
export const crossesMidnight = (mt: ShiftWindow) => hmToMin(mt.end_time) <= hmToMin(mt.start_time);

/** Phút bắt đầu ca, tính từ 00:00 của NGÀY ĂN. */
export const startMin = (mt: ShiftWindow) => hmToMin(mt.start_time);

/** Phút kết thúc ca, tính từ 00:00 của NGÀY ĂN — vượt 1440 nếu ca vắt sang hôm sau. */
export const endMin = (mt: ShiftWindow) => hmToMin(mt.end_time) + (crossesMidnight(mt) ? 1440 : 0);

/** Phút mở quầy: sớm hơn giờ ăn `pickupMinutes` (có thể âm nếu ca bắt đầu ngay sau nửa đêm). */
export const openMin = (mt: ShiftWindow, pickupMinutes = 0) => startMin(mt) - pickupMinutes;

/**
 * Quy `nowMin` (phút trong ngày theo đồng hồ) về cùng trục thời gian với ca.
 * Với ca vắt nửa đêm, 00:20 của hôm sau chính là phút 1460 của ca.
 */
export function nowMinFor(mt: ShiftWindow, nowMin: number, pickupMinutes = 0): number {
  return crossesMidnight(mt) && nowMin < openMin(mt, pickupMinutes) ? nowMin + 1440 : nowMin;
}

/** Quầy có đang trong khung phát của ca không. */
export function isServing(mt: ShiftWindow, nowMin: number, pickupMinutes = 0): boolean {
  const t = nowMinFor(mt, nowMin, pickupMinutes);
  return t >= openMin(mt, pickupMinutes) && t <= endMin(mt);
}

/** Epoch ms lúc ca kết thúc, theo giờ VN (+07:00, không DST). */
export function shiftEndMs(ymd: string, mt: ShiftWindow): number {
  const day = crossesMidnight(mt) ? addDays(ymd, 1) : ymd;
  return Date.parse(`${day}T${mt.end_time.padStart(5, "0")}:00+07:00`);
}
