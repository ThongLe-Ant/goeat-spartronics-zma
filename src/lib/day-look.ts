// GoEat ZMA — MÀU THEO LOẠI NGÀY, tách từ dải ngày trang đặt món (§12.10.9).
//
// Trang đặt món (bản đã duyệt) tô CẢ VIÊN ngày theo loại ngày: nền, viền, nhãn,
// số. Nhóm màn quầy/bếp trước đó chỉ tô mỗi CON SỐ nên nhìn vẫn ra một màu —
// đó là lý do dải ngày báo cáo đọc như bảy ô trắng giống hệt nhau.
//
// Để đây (không để trong `pages/weekly.tsx`) vì trang đó đã duyệt, không sửa;
// đây là bản chép giá trị, dùng cho các màn khác.
export type DayKind = "weekday" | "sat" | "sun";

export const dayKindOf = (ymd: string): DayKind => {
  const d = new Date(`${ymd}T00:00:00+07:00`).getDay();
  return d === 0 ? "sun" : d === 6 ? "sat" : "weekday";
};

export interface DayLook {
  bg: string;
  border: string;
  label: string;
  num: string;
  shadow: string;
  /** Mực chấm/vạch phụ, dùng cho chấm trạng thái dưới số. */
  dot: string;
}

/** `on` = ngày đang xem, `today` = hôm nay. Thứ tự ưu tiên bám đúng trang đặt món. */
export function dayLook(ymd: string, on: boolean, today: boolean): DayLook {
  const kind = dayKindOf(ymd);
  if (on) {
    if (kind === "sat")
      return { bg: "linear-gradient(180deg, #d99b00 0%, #b28900 100%)", border: "1px solid #806200", label: "#fff", num: "#fff", dot: "#fff", shadow: "0 3px 9px -1px rgba(178, 137, 0, 0.35)" };
    if (kind === "sun")
      return { bg: "var(--fd-sun-solid)", border: "1px solid var(--fd-sun-deep)", label: "#fff", num: "#fff", dot: "#fff", shadow: "0 3px 9px -1px rgba(186, 26, 26, 0.3)" };
    return { bg: "var(--fd-wd-solid)", border: "1px solid var(--fd-wd-solid)", label: "#fff", num: "#fff", dot: "#fff", shadow: "0 3px 9px -1px rgba(20, 114, 76, 0.3)" };
  }
  if (today)
    return { bg: "var(--fd-accent-tint)", border: "1px solid var(--fd-accent-solid)", label: "var(--fd-accent-ink)", num: "var(--fd-accent-ink)", dot: "var(--fd-accent-solid)", shadow: "none" };
  if (kind === "sat")
    return { bg: "color-mix(in srgb, var(--fd-sat-solid) 26%, var(--bg-surface))", border: "1px solid color-mix(in srgb, var(--fd-sat-ink) 40%, transparent)", label: "var(--fd-sat-deep)", num: "var(--fd-sat-deep)", dot: "var(--fd-sat-deep)", shadow: "none" };
  if (kind === "sun")
    return { bg: "color-mix(in srgb, var(--fd-sun-solid) 12%, var(--bg-surface))", border: "1px solid color-mix(in srgb, var(--fd-sun-ink) 35%, transparent)", label: "var(--fd-sun-deep)", num: "var(--fd-sun-deep)", dot: "var(--fd-sun-deep)", shadow: "none" };
  return { bg: "var(--bg-surface)", border: "1px solid var(--border-subtle)", label: "var(--fg-3)", num: "var(--fg-1)", dot: "var(--fd-wd-solid)", shadow: "none" };
}
