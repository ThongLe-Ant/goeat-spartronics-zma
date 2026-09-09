// GoEat ZMA — TỜ LỊCH đỡ ngày, dùng lại class `.ge-daynum` của trang đặt món
// (gáy đất nung + hai lỗ đóng gáy). Đây là VẬT THỂ, không phải một con số kê
// trên nền trắng: hai màn nhiều số nhất (bảng bếp, báo cáo) cần một cái mốc ấm
// ở đầu màn để mắt bám vào, nếu không cả màn chỉ còn xanh với đen.
import { dayKindOf } from "@/lib/day-look";
import { weekdayFullVN } from "@/lib/date-vn";

const NUM_INK: Record<ReturnType<typeof dayKindOf>, string> = {
  weekday: "var(--fd-cal-ink)",
  sat: "var(--fd-sat-deep)",
  sun: "var(--fd-sun-deep)",
};

/** `sub` là dòng phụ dưới thứ (giờ chốt, số người…), bỏ trống thì không hiện. */
export function DayLeaf({ date, sub }: { date: string; sub?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div className="ge-daynum">
        <span className="tnum" style={{ color: NUM_INK[dayKindOf(date)] }}>{date.slice(8, 10)}</span>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 17, letterSpacing: "-0.01em", color: "var(--fg-1)", lineHeight: 1.2 }}>{weekdayFullVN(date)}</div>
        {sub && <div style={{ fontSize: 12.5, color: "var(--fg-3)", marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}
