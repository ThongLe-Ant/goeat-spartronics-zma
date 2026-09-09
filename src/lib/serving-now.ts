// GoEat ZMA — "quầy đang ở đâu trong ngày".
//
// Việc ở quầy là việc CÓ GIỜ: quét thẻ và cấp thẻ tạm chỉ có nghĩa trong khung
// phát của một ca. Trang Cá nhân dùng câu trả lời này để nói thẳng trạng thái
// thay vì viết chú thích chung chung dưới mỗi dòng menu.
//
// Số học khung giờ (kể cả ca vắt nửa đêm) nằm hết ở `shift-window.ts` — ở đây
// chỉ chọn ca, không tự cộng phút.
import { hmToMin, hmVN } from "./date-vn";
import { endMin, isServing, nowMinFor, openMin } from "./shift-window";

/** Quầy mở sớm hơn giờ ăn 15 phút — cùng con số với máy quét ở mock/server. */
export const PICKUP_MINUTES = 15;

export interface ServingState {
  /** Tên ca đang phát, hoặc ca kế tiếp trong ngày. */
  name: string;
  /** Đang trong khung phát? */
  open: boolean;
  /** Câu ngắn để đặt cạnh tiêu đề nhóm: "Ca trưa đang phát". */
  text: string;
}

interface Shift {
  name: string;
  start_time: string;
  end_time: string;
}

/**
 * Ca đang phát; nếu không có thì ca kế tiếp trong ngày. Hết ca cuối ⇒ null,
 * lúc đó trang Cá nhân không hiện gì (im lặng đúng hơn là nói "đã đóng cửa"
 * suốt cả buổi tối).
 */
export function servingNow(shifts?: Shift[] | null, now: Date = new Date()): ServingState | null {
  if (!shifts || shifts.length === 0) return null;
  const nowMin = hmToMin(hmVN(now));
  const open = shifts.find((s) => isServing(s, nowMin, PICKUP_MINUTES));
  if (open) return { name: open.name, open: true, text: `${open.name} đang phát` };

  // Chưa tới giờ: ca gần nhất còn ở phía trước.
  const ahead = shifts
    .filter((s) => nowMinFor(s, nowMin, PICKUP_MINUTES) < openMin(s, PICKUP_MINUTES))
    .sort((a, b) => openMin(a, PICKUP_MINUTES) - openMin(b, PICKUP_MINUTES))[0];
  if (!ahead) return null;

  const mins = openMin(ahead, PICKUP_MINUTES) - nowMinFor(ahead, nowMin, PICKUP_MINUTES);
  const when = mins < 60 ? `${mins} phút nữa` : `${ahead.start_time}`;
  return { name: ahead.name, open: false, text: `${ahead.name} mở ${when}` };
}

/** Ca đã kết thúc hết chưa (dùng để biết có nên im lặng hay không). */
export const allShiftsDone = (shifts: Shift[], now: Date = new Date()) => {
  const nowMin = hmToMin(hmVN(now));
  return shifts.every((s) => nowMinFor(s, nowMin, PICKUP_MINUTES) > endMin(s));
};
