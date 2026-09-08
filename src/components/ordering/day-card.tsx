// GoEat ZMA — thẻ MỘT NGÀY. Port đúng DayCard của spartronics
// (ordering-day-list.tsx): tờ lịch đất nung đỡ số ngày, hoa văn chấm góc thẻ,
// viên "Hôm nay" cam đặc, chip ca rời, danh sách món kiểu radio (một khung
// duy nhất), câu báo ca đã chốt, nút bỏ chọn dưới danh sách.
// Khác bản web: chạm món là LƯU NGAY (không có bước xác nhận).
import { useEffect, useMemo, useState } from "react";
import { I } from "@/components/icons";
import type { WeeklyDay, WeeklyShift } from "@/api/types";
import { cutoffText, dayKind, weekdayFullVN, ymdVN } from "@/lib/date-vn";
import { autoDishOf, cellKey, useWeekMenu } from "@/state/ordering";
import { sortDishes } from "./dish-icon";
import { DishSlot } from "./dish-slot";
import { ShiftChips } from "./shift-chips";

/** Màu nhận dạng của loại ngày — chỉ cho số ngày, biểu tượng và hoa văn. */
const DAY_INK = { weekday: "var(--fd-wd-ink)", sat: "var(--fd-sat-ink)", sun: "var(--fd-sun-ink)" } as const;
/** Số ngày: ngày thường mượn đất nung của tờ lịch, cuối tuần giữ màu ngày. */
const NUM_INK = { weekday: "var(--fd-cal-ink)", sat: "var(--fd-sat-ink)", sun: "var(--fd-sun-ink)" } as const;
const KIND_ICON = { weekday: null, sat: I.party, sun: I.heart } as const;

export function DayCard({
  day,
  shifts,
  initialShift,
  onPrev,
  onNext,
}: {
  day: WeeklyDay;
  shifts: WeeklyShift[];
  initialShift?: number;
  onPrev?: () => void;
  onNext?: () => void;
  prevLabel?: string;
  nextLabel?: string;
}) {
  const { toggleDish, clearCell, isCellLocked, saving, savedFlash } = useWeekMenu();
  const openShifts = useMemo(() => shifts.filter((s) => (day.menus[s.id]?.length ?? 0) > 0), [shifts, day.menus]);

  // Ca mở sẵn: ca truyền vào ➝ ca đã có suất ➝ ca còn mở ➝ ca đầu.
  const preferred = initialShift ?? openShifts.find((s) => day.orders[s.id] != null)?.id ?? openShifts.find((s) => !isCellLocked(day, s.id))?.id ?? openShifts[0]?.id ?? 0;
  const [active, setActive] = useState<number>(preferred);
  useEffect(() => {
    if (!openShifts.some((s) => s.id === active)) setActive(preferred);
  }, [openShifts, active, preferred]);

  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (diff > 45 && onNext) {
      onNext();
    } else if (diff < -45 && onPrev) {
      onPrev();
    }
    setTouchStartX(null);
  };

  const shift = openShifts.find((s) => s.id === active);
  const dishes = useMemo(() => sortDishes(day.menus[active] ?? []), [day.menus, active]);
  const picked = day.orders[active];
  const locked = shift ? isCellLocked(day, active) : true;
  const allLocked = openShifts.length > 0 && openShifts.every((s) => isCellLocked(day, s.id));
  const stillOpen = openShifts.filter((s) => !isCellLocked(day, s.id));
  const autoDish = autoDishOf(day.menus[active]);
  const entitlement = day.entitlements?.[active];
  const k = cellKey(day.date, active);
  const cellSaving = !!saving[k];
  const justSaved = !!savedFlash[k];
  const past = day.date < ymdVN();

  const pickedCount = openShifts.filter((s) => day.orders[s.id] != null && day.entitlements?.[s.id] !== "none").length;
  const kind = dayKind(day.date);
  const KindIcon = KIND_ICON[kind];

  return (
    <article
      className="ge-daycard"
      data-past={past ? "true" : undefined}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        ["--ge-day-ink" as string]: DAY_INK[kind],
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        background: "var(--fd-wd-card)",
        border: day.isToday
          ? "1.5px solid var(--fd-wd-solid)"
          : kind === "sat"
          ? "1.5px solid color-mix(in srgb, var(--fd-sat-ink) 35%, var(--fd-wd-line))"
          : kind === "sun"
          ? "1.5px solid color-mix(in srgb, var(--fd-sun-solid) 35%, var(--fd-wd-line))"
          : "1px solid var(--fd-wd-line)",
        borderRadius: 20,
        padding: "14px 14px 12px",
        boxShadow: day.isToday
          ? "inset 0 0 0 2px var(--fd-wd-solid), 0 10px 24px -16px color-mix(in srgb, var(--fd-wd-solid) 60%, transparent)"
          : "0 1px 2px rgba(24, 20, 14, 0.05), 0 10px 22px -16px rgba(24, 20, 14, 0.3)",
      }}
    >
      <header style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
        <span className="ge-daynum" aria-hidden>
          <span className="tnum" style={{ color: NUM_INK[kind] }}>
            {day.date.slice(8, 10)}
          </span>
        </span>
        <h3 style={{ margin: 0, minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: 1 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 14.5, fontWeight: 700, letterSpacing: "-0.01em", fontFamily: "var(--font-display)", color: "var(--fg-1)", whiteSpace: "nowrap" }}>
            {weekdayFullVN(day.date)}
            {KindIcon && <KindIcon size={14} sw={2.1} style={{ color: DAY_INK[kind] }} />}
          </span>
          <span className="tnum" style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 600, color: "var(--fg-3)", minWidth: 0, whiteSpace: "nowrap" }}>
            {shift && (
              <>
                <I.clock size={11} sw={2.2} style={{ flex: "0 0 auto", color: "var(--fd-accent-ink)" }} />
                {shift.start_time}–{shift.end_time}
              </>
            )}
          </span>
        </h3>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, flex: "0 0 auto" }}>
          {day.isToday && (
            <span style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: "var(--fd-accent-solid)", color: "var(--fd-accent-on-solid)", boxShadow: "0 4px 10px -4px color-mix(in srgb, var(--fd-accent-solid) 70%, transparent)" }}>
              Hôm nay
            </span>
          )}
          {pickedCount > 0 && (
            <span className="tnum" title={`Đã đặt ${pickedCount} suất`} style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 10.5, fontWeight: 700, padding: "3px 7px 3px 5px", borderRadius: 999, background: "var(--fd-wd-solid)", color: "var(--fd-wd-on-solid)" }}>
              <I.check size={11} sw={3} />
              {pickedCount}
            </span>
          )}
          {allLocked && (
            <span title="Đã quá hạn đăng ký" style={{ display: "flex", alignItems: "center", color: "var(--fd-lock)" }}>
              <I.lock size={12} />
            </span>
          )}
        </span>
      </header>

      {openShifts.length === 0 || !shift ? (
        <EmptyBody sunday={kind === "sun"} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <ShiftChips shifts={openShifts} day={day} active={active} onChange={setActive} />

          {locked && !past && (
            <p style={{ margin: 0, display: "flex", alignItems: "flex-start", gap: 5, fontSize: 11.5, fontWeight: 600, lineHeight: 1.4, color: "var(--fd-lock)" }}>
              <span style={{ display: "flex", flex: "0 0 auto", marginTop: 1 }}>
                <I.lock size={12} />
              </span>
              <span>
                {shift.name} đã hết hạn đổi món{cutoffText(shift) ? ` — ${cutoffText(shift).toLowerCase()}` : ""}.
                {stillOpen.length > 0 ? ` Còn ${stillOpen.map((s) => s.name).join(", ")} đổi được.` : ""}
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
                entitlement={picked === d.menu_line_id ? entitlement : undefined}
                saving={cellSaving && picked === d.menu_line_id}
                onPick={() => toggleDish(day, active, d)}
              />
            ))}
          </div>

          {/* Chân danh sách: đã lưu / hạn chốt / bỏ chọn */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 22, marginTop: 1 }}>
            <span style={{ flex: 1, minWidth: 0, fontSize: 11, fontWeight: 600, color: "var(--fg-3)", display: "flex", alignItems: "center", gap: 4 }}>
              {justSaved ? (
                <span key="saved" className="ge-savednote" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 700, color: "var(--fd-wd-ink)" }}>
                  <I.check size={12} sw={2.8} /> Đã lưu lựa chọn
                </span>
              ) : !locked && cutoffText(shift) ? (
                <>
                  <I.clock size={11} sw={2.2} style={{ flex: "0 0 auto" }} />
                  {cutoffText(shift)}
                  {picked == null && !autoDish && " · không chọn = không có suất"}
                </>
              ) : null}
            </span>
            {picked != null && !locked && (
              <button
                type="button"
                onClick={() => clearCell(day, active)}
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

/** Ô rỗng giữa thẻ — Chủ nhật nghỉ bếp (ấm), hoặc bếp chưa lên thực đơn. */
function EmptyBody({ sunday }: { sunday: boolean }) {
  const ink = sunday ? "var(--fd-sun-deep)" : "var(--fd-wd-deep)";
  const fill = sunday ? "var(--fd-sun-solid)" : "var(--fd-wd-solid)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "8px 6px" }}>
      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 52, height: 52, borderRadius: 999, flexShrink: 0, background: `color-mix(in srgb, ${fill} 14%, var(--bg-surface))`, color: ink }}>
        {sunday ? <I.heart size={24} sw={1.8} /> : <I.utensilsX size={24} sw={1.7} />}
      </span>
      <span style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, fontFamily: "var(--font-display)", color: ink }}>{sunday ? "Bếp nghỉ Chủ nhật" : "Chưa có thực đơn"}</p>
        <p style={{ margin: 0, fontSize: 12.5, color: "var(--fg-3)", marginTop: 2 }}>{sunday ? "Tự nấu nướng hoặc ra ngoài ăn nhé!" : "Bếp chưa lên món cho ngày này."}</p>
      </span>
    </div>
  );
}
