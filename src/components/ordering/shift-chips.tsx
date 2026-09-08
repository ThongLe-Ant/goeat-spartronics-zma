// GoEat ZMA — dãy viên chọn ca trong thẻ ngày. Port ShiftTabs của spartronics:
// chip rời, ca đang xem là viên xanh đặc; chấm = đã có suất, ổ khoá đỏ = hết
// hạn đổi (hai dấu độc lập, không loại trừ nhau). Ẩn khi chỉ có một ca.
import { I } from "@/components/icons";
import type { WeeklyDay, WeeklyShift } from "@/api/types";
import { cutoffText } from "@/lib/date-vn";

export function ShiftChips({
  shifts,
  day,
  active,
  onChange,
}: {
  shifts: WeeklyShift[];
  day: WeeklyDay;
  active: number;
  onChange: (id: number) => void;
}) {
  if (shifts.length < 2) return null;
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {shifts.map((s) => {
        const on = s.id === active;
        const picked = day.orders[s.id] != null;
        const locked = day.isLocked || !!day.lockedShifts[s.id];
        return (
          <button
            key={s.id}
            type="button"
            className="ge-shiftchip"
            onClick={() => onChange(s.id)}
            aria-pressed={on}
            title={locked ? `${s.name} đã hết hạn đổi món — ${cutoffText(s).toLowerCase()}` : `${s.name} — ${cutoffText(s).toLowerCase()}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              borderRadius: 999,
              cursor: "pointer",
              font: "inherit",
              fontWeight: 700,
              whiteSpace: "nowrap",
              background: on ? "var(--fd-wd-solid)" : "var(--bg-surface)",
              color: on ? "var(--fd-wd-on-solid)" : "var(--fg-2)",
              border: on ? "1px solid transparent" : "1px solid var(--border-default)",
              transition: "background 160ms var(--ease-out), color 160ms var(--ease-out)",
            }}
          >
            {s.name}
            {picked && <span aria-label="đã có suất" style={{ width: 5, height: 5, borderRadius: 999, background: on ? "var(--fd-wd-on-solid)" : "var(--fd-wd-solid)" }} />}
            {locked && (
              <span aria-label="đã hết hạn đổi" style={{ display: "flex", color: on ? "var(--fd-wd-on-solid)" : "var(--fd-lock)" }}>
                <I.lock size={11} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
