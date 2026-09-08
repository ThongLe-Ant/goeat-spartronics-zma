// GoEat ZMA — lịch Việt Nam. Port từ spartronics ordering-parts.tsx.
// Máy khách có thể ở múi giờ khác; mọi "hôm nay" phải theo Asia/Ho_Chi_Minh.
const VN_TZ = "Asia/Ho_Chi_Minh";

const ymdFmt = new Intl.DateTimeFormat("en-CA", { timeZone: VN_TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const hmFmt = new Intl.DateTimeFormat("en-GB", { timeZone: VN_TZ, hour: "2-digit", minute: "2-digit", hour12: false });

/** YYYY-MM-DD của một Date theo giờ VN. */
export const ymdVN = (d: Date = new Date()) => ymdFmt.format(d);
/** HH:mm theo giờ VN. */
export const hmVN = (d: Date = new Date()) => hmFmt.format(d);

/** Cộng n ngày vào chuỗi YYYY-MM-DD (thuần lịch, không dính múi giờ). */
export function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d + n);
  return new Date(t).toISOString().slice(0, 10);
}

/** 0 = Chủ nhật … 6 = Thứ bảy, theo ngày lịch (không phụ thuộc TZ máy). */
export function weekdayIndex(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Thứ hai của tuần chứa ngày này. */
export function mondayOf(ymd: string): string {
  const wd = weekdayIndex(ymd);
  return addDays(ymd, wd === 0 ? -6 : 1 - wd);
}

const WD_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const WD_FULL = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];

export const weekdayVN = (ymd: string) => WD_SHORT[weekdayIndex(ymd)];
export const weekdayFullVN = (ymd: string) => WD_FULL[weekdayIndex(ymd)];
export type DayKind = "weekday" | "sat" | "sun";
export function dayKind(ymd: string): DayKind {
  const i = weekdayIndex(ymd);
  return i === 0 ? "sun" : i === 6 ? "sat" : "weekday";
}
/** "09/06" */
export const dayMonth = (ymd: string) => `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}`;
/** "9" */
export const dayNum = (ymd: string) => String(Number(ymd.slice(8, 10)));

/** "09/06 – 15/06" */
export function weekRangeLabel(days: { date: string }[]): string {
  if (!days.length) return "";
  return `${dayMonth(days[0].date)} – ${dayMonth(days[days.length - 1].date)}`;
}

/** "Chốt 10:30 trước 2 ngày" / "Chốt 10:30 hôm trước" / "Chốt 10:30 cùng ngày" */
export function cutoffText(s: { cutoff_time: string; cutoff_days: number }): string {
  if (s.cutoff_days <= 0) return `Chốt ${s.cutoff_time} cùng ngày`;
  if (s.cutoff_days === 1) return `Chốt ${s.cutoff_time} hôm trước`;
  return `Chốt ${s.cutoff_time} trước ${s.cutoff_days} ngày`;
}

/** Gộp các ca có cùng mốc chốt thành một câu ngắn cho phần đầu trang. */
export function cutoffSummary(shifts: { name: string; cutoff_time: string; cutoff_days: number }[]): string {
  const groups = new Map<string, string[]>();
  for (const s of shifts) {
    const k = cutoffText(s);
    groups.set(k, [...(groups.get(k) ?? []), s.name]);
  }
  if (groups.size === 1) return [...groups.keys()][0];
  return [...groups.entries()].map(([k, names]) => `${names.join(", ")}: ${k.toLowerCase()}`).join(" · ");
}

/** Tách "Cơm gà + canh chua" ➝ { main:"Cơm gà", side:"canh chua" }. */
export function splitDishName(name: string): { main: string; side: string | null } {
  const i = name.indexOf("+");
  if (i < 0) return { main: name.trim(), side: null };
  return { main: name.slice(0, i).trim(), side: name.slice(i + 1).trim() || null };
}

/** "HH:mm" ➝ phút trong ngày. */
export const hmToMin = (hm: string) => {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + (m || 0);
};
