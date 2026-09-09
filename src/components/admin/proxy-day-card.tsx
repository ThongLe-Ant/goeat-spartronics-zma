// GoEat ZMA — thẻ MỘT NGÀY cho màn nhân sự (đặt hộ).
//
// Vì sao không dùng thẳng `<DayCard>` của trang đặt món: thẻ đó tự gọi
// `useWeekMenu()` bên trong, tức là luôn ghi vào kho đơn của NGƯỜI ĐANG ĐĂNG
// NHẬP. Đặt hộ thì mọi cú chạm phải đi vào kho của người được đặt, nên thẻ này
// nhận tất cả qua props. Phần nhìn thì dùng lại nguyên bộ của trang đặt món
// (`ShiftChips`, `DishSlot`, `.ge-daycard`) để hai bên không lệch nhau.
import { useEffect, useMemo, useState } from "react";
import { I } from "@/components/icons";
import { DishSlot } from "@/components/ordering/dish-slot";
import { ShiftChips } from "@/components/ordering/shift-chips";
import { sortDishes } from "@/components/ordering/dish-icon";
import type { OrderingFoodItem, WeeklyDay, WeeklyShift } from "@/api/types";
import { cutoffText, dayKind, weekdayFullVN, ymdVN } from "@/lib/date-vn";
import { autoDishOf, cellKey } from "@/state/ordering";

const DAY_INK = { weekday: "var(--fd-wd-ink)", sat: "var(--fd-sat-ink)", sun: "var(--fd-sun-ink)" } as const;
const NUM_INK = { weekday: "var(--fd-cal-ink)", sat: "var(--fd-sat-ink)", sun: "var(--fd-sun-ink)" } as const;

export function ProxyDayCard({
  day,
  shifts,
  saving,
  savedFlash,
  isCellLocked,
  onToggle,
  onClear,
}: {
  day: WeeklyDay;
  shifts: WeeklyShift[];
  saving: Record<string, true>;
  savedFlash: Record<string, number>;
  isCellLocked: (day: WeeklyDay, shiftId: number) => boolean;
  onToggle: (day: WeeklyDay, shiftId: number, dish: OrderingFoodItem) => void;
  onClear: (day: WeeklyDay, shiftId: number) => void;
}) {
  const openShifts = useMemo(() => shifts.filter((s) => (day.menus[s.id]?.length ?? 0) > 0), [shifts, day.menus]);
  const preferred = openShifts.find((s) => day.orders[s.id] != null)?.id ?? openShifts.find((s) => !isCellLocked(day, s.id))?.id ?? openShifts[0]?.id ?? 0;
  const [active, setActive] = useState<number>(preferred);
  useEffect(() => {
    if (!openShifts.some((s) => s.id === active)) setActive(preferred);
  }, [openShifts, active, preferred]);

  const shift = openShifts.find((s) => s.id === active);
  const dishes = useMemo(() => sortDishes(day.menus[active] ?? []), [day.menus, active]);
  const picked = day.orders[active];
  const locked = shift ? isCellLocked(day, active) : true;
  const autoDish = autoDishOf(day.menus[active]);
  const k = cellKey(day.date, active);
  const kind = dayKind(day.date);
  const past = day.date < ymdVN();
  const pickedCount = openShifts.filter((s) => day.orders[s.id] != null && day.entitlements?.[s.id] !== "none").length;

  return (
    <article
      className="ge-daycard"
      data-past={past ? "true" : undefined}
      style={{
        ["--ge-day-ink" as string]: DAY_INK[kind],
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        background: "var(--fd-wd-card)",
        border: day.isToday ? "1px solid #8FD3B0" : "1px solid #E2E8F0",
        borderRadius: 20,
        padding: "14px 14px 12px",
        boxShadow: "0 2px 10px -2px rgba(24, 20, 14, 0.05), 0 1px 3px rgba(24, 20, 14, 0.03)",
      }}
    >
      <header style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
        <span className="ge-daynum" aria-hidden>
          <span className="tnum" style={{ color: NUM_INK[kind] }}>
            {day.date.slice(8, 10)}
          </span>
        </span>
        <h3 style={{ margin: 0, minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: 1 }}>
          <span style={{ fontSize: 14.5, fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--fg-1)", whiteSpace: "nowrap" }}>{weekdayFullVN(day.date)}</span>
          <span className="tnum" style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 600, color: "var(--fg-3)" }}>
            {shift && (
              <>
                <I.clock size={11} sw={2.2} style={{ flex: "0 0 auto", color: "var(--fd-accent-ink)" }} />
                {shift.start_time}–{shift.end_time}
              </>
            )}
          </span>
        </h3>
        {day.isToday && (
          <span style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: "var(--fd-accent-solid)", color: "var(--fd-accent-on-solid)" }}>Hôm nay</span>
        )}
        {pickedCount > 0 && (
          <span className="tnum" style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10.5, fontWeight: 700, padding: "3px 8px 3px 6px", borderRadius: 999, background: "var(--fd-wd-solid)", color: "var(--fd-wd-on-solid)" }}>
            <I.check size={11} sw={3} />
            {pickedCount}/2 suất
          </span>
        )}
      </header>

      {openShifts.length === 0 || !shift ? (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 6px", color: "var(--fg-3)", fontSize: 13 }}>
          <I.utensilsX size={22} sw={1.7} />
          {kind === "sun" ? "Bếp nghỉ Chủ nhật." : "Bếp chưa lên thực đơn cho ngày này."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <ShiftChips shifts={openShifts} day={day} active={active} onChange={setActive} />

          {locked && (
            <p style={{ margin: 0, display: "flex", alignItems: "flex-start", gap: 5, fontSize: 11.5, fontWeight: 600, lineHeight: 1.4, color: "var(--fd-lock)" }}>
              <span style={{ display: "flex", flex: "0 0 auto", marginTop: 1 }}>
                <I.lock size={12} />
              </span>
              <span>
                {shift.name} đã quá hạn đăng ký — đặt hộ vẫn theo hạn chốt của nhân viên. Cần sửa thì dùng <b>Sửa đăng ký</b>.
              </span>
            </p>
          )}

          <div role={locked ? undefined : "radiogroup"} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {dishes.map((d) => (
              <DishSlot
                key={d.menu_line_id}
                dish={d}
                chosen={picked === d.menu_line_id}
                auto={picked == null && autoDish?.menu_line_id === d.menu_line_id}
                locked={locked}
                entitlement={picked === d.menu_line_id ? day.entitlements?.[active] : undefined}
                saving={!!saving[k] && picked === d.menu_line_id}
                onPick={() => onToggle(day, active, d)}
              />
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 22, marginTop: 1 }}>
            <span style={{ flex: 1, minWidth: 0, fontSize: 11, fontWeight: 600, color: "var(--fg-3)", display: "flex", alignItems: "center", gap: 4 }}>
              {savedFlash[k] ? (
                <span className="ge-savednote" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 700, color: "var(--fd-wd-ink)" }}>
                  <I.check size={12} sw={2.8} /> Đã lưu cho nhân viên
                </span>
              ) : !locked && cutoffText(shift) ? (
                <>
                  <I.clock size={11} sw={2.2} style={{ flex: "0 0 auto" }} />
                  {cutoffText(shift)}
                </>
              ) : null}
            </span>
            {picked != null && !locked && (
              <button
                type="button"
                onClick={() => onClear(day, active)}
                style={{ fontSize: 11.5, fontWeight: 700, color: "var(--fd-lock)", background: "transparent", border: "none", padding: "4px 2px", cursor: "pointer", whiteSpace: "nowrap", font: "inherit" }}
              >
                Bỏ chọn ca này
              </button>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
