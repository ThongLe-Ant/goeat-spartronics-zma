// GoEat ZMA — Đăng ký suất ăn theo tuần (tuần này / tuần sau).
// Thiết kế tối ưu theo phản hồi người dùng:
// 1. Header tinh gọn, bỏ thông tin thừa lặp lại.
// 2. Dải chọn ngày T2 -> T7/CN nằm ngang trực quan, chạm là chuyển ngày tức thì.
// 3. Toàn bộ thông tin đặt món của 1 ngày nằm trọn vẹn trong trung tâm màn hình, KHÔNG CẦN CUỘN.
// 4. Có nút chuyển ngày nhanh [← Trước] [Sau →] lướt trọn tuần cực mượt.
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { I } from "@/components/icons";
import { DayCard } from "@/components/ordering/day-card";
import { ErrorBlock, LoadingBlock } from "@/components/ordering/status";
import { dayKind, weekdayVN, weekRangeLabel, ymdVN } from "@/lib/date-vn";
import { countPortions, hasOpenCell, useWeekMenu } from "@/state/ordering";

type WeekTab = "this" | "next";

export default function WeeklyPage() {
  const { data, status, error, reload, clearDays, isCellLocked } = useWeekMenu();
  const [tab, setTab] = useState<WeekTab>("this");
  const [activeDate, setActiveDate] = useState<string>("");
  const [confirmClear, setConfirmClear] = useState(false);

  const days = useMemo(() => (data ? (tab === "this" ? data.thisWeek : data.nextWeek) : []), [data, tab]);
  const total = countPortions(days);
  const openable = data ? hasOpenCell(days, data.shifts) : false;
  const clearable = openable && days.some((d) => Object.keys(d.orders).some((sid) => !d.isLocked && !d.lockedShifts[Number(sid)]));

  // Ngày có thực đơn / ngày đã có suất
  const menuDays = data ? days.filter((d) => data.shifts.some((s) => (d.menus[s.id]?.length ?? 0) > 0)).length : 0;
  const pickedDays = days.filter((d) => Object.keys(d.orders).length > 0).length;

  // Tự động chọn ngày phù hợp khi chuyển tab hoặc tải dữ liệu
  useEffect(() => {
    if (days.length === 0) return;
    const today = ymdVN();
    const hasToday = days.find((d) => d.date === today);
    const firstOpen = days.find((d) => !data?.shifts.every((s) => isCellLocked(d, s.id)));
    if (!days.some((d) => d.date === activeDate)) {
      setActiveDate(hasToday ? today : (firstOpen?.date ?? days[0].date));
    }
  }, [days, tab, data, activeDate, isCellLocked]);

  const activeIndex = days.findIndex((d) => d.date === activeDate);
  const activeDay = days[activeIndex >= 0 ? activeIndex : 0];
  const prevDay = activeIndex > 0 ? days[activeIndex - 1] : null;
  const nextDay = activeIndex >= 0 && activeIndex < days.length - 1 ? days[activeIndex + 1] : null;

  const onClearWeek = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3500);
      return;
    }
    setConfirmClear(false);
    clearDays(days);
    toast("Đã bỏ chọn các ca còn mở trong tuần");
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--bg-page)" }}>
      {/* 1. ĐẦU TRANG — BỐ TRÍ THOÁNG ĐÃNG, CHỐNG ĐÈ CAPSULE ZALO */}
      <div style={{ flexShrink: 0, padding: "calc(var(--safe-top) + 6px) 14px 8px", background: "var(--bg-surface)", borderBottom: "1px solid var(--fd-wd-line)" }}>
        {/* Hàng 1: Tiêu đề đứng độc lập bên trái, chừa 96px an toàn cho capsule Zalo bên phải */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 30, paddingRight: 96 }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 18, letterSpacing: "-0.01em", color: "var(--fg-1)", whiteSpace: "nowrap" }}>
            Đăng ký suất ăn
          </div>
          <span className="tnum" style={{ fontSize: 11.5, fontWeight: 700, color: "var(--fd-wd-deep)" }}>
            {pickedDays}/{menuDays} ngày đã chọn
          </span>
        </div>

        {/* Hàng 2: Nằm thấp dưới capsule — Có trọn vẹn 100% bề ngang cho Tab Tuần & Khoảng ngày */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 6 }}>
          {/* Tab Tuần này / Tuần sau */}
          <div role="tablist" style={{ display: "inline-flex", gap: 2, padding: 2, borderRadius: 999, background: "var(--fd-wd-track)", flexShrink: 0 }}>
            {(["this", "next"] as WeekTab[]).map((t) => {
              const on = tab === t;
              const wk = data ? (t === "this" ? data.thisWeek : data.nextWeek) : [];
              const n = countPortions(wk);
              return (
                <button
                  key={t}
                  role="tab"
                  aria-selected={on}
                  onClick={() => setTab(t)}
                  style={{
                    padding: "4px 11px",
                    borderRadius: 999,
                    border: "none",
                    font: "inherit",
                    fontSize: 12,
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    background: on ? "var(--fd-wd-solid)" : "transparent",
                    color: on ? "var(--fd-wd-on-solid)" : "var(--fg-2)",
                    boxShadow: on ? "var(--shadow-xs)" : "none",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {t === "this" ? "Tuần này" : "Tuần sau"}
                  {n > 0 && (
                    <span style={{ fontSize: 9.5, fontWeight: 800, padding: "0 5px", borderRadius: 999, background: on ? "rgba(255,255,255,0.25)" : "var(--bg-surface)", color: on ? "#fff" : "var(--fd-wd-deep)" }}>
                      {n}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <span className="tnum" style={{ fontSize: 11.5, fontWeight: 600, color: "var(--fg-3)" }}>
            {weekRangeLabel(days)}
          </span>
        </div>

        {/* Hàng 3: Dải chọn ngày T2 -> T7 / CN — Nổi bật T7 (Vàng) và CN (Đỏ) theo Spartronics */}
        {days.length > 0 && (
          <div style={{ display: "flex", gap: 5, marginTop: 8 }}>
            {days.map((d) => {
              const on = d.date === activeDate;
              const kind = dayKind(d.date);
              const hasOrder = Object.keys(d.orders).length > 0;
              const allLocked = data ? data.shifts.length > 0 && data.shifts.every((s) => isCellLocked(d, s.id)) : false;
              const dayNum = d.date.slice(8, 10);
              const shortName = weekdayVN(d.date);

              // Phong cách màu theo loại ngày: T7 vàng hổ phách, CN đỏ ruby, ngày thường xanh lục
              let bg = "var(--bg-surface)";
              let border = "1px solid var(--border-subtle)";
              let labelColor = "var(--fg-3)";
              let numColor = "var(--fg-1)";
              let shadow = "none";
              let dotColor = "var(--fd-wd-solid)";

              if (on) {
                if (kind === "sat") {
                  bg = "linear-gradient(180deg, #d99b00 0%, #b28900 100%)";
                  border = "1.5px solid #806200";
                  shadow = "0 3px 9px -1px rgba(178, 137, 0, 0.45)";
                } else if (kind === "sun") {
                  bg = "var(--fd-sun-solid)";
                  border = "1.5px solid var(--fd-sun-deep)";
                  shadow = "0 3px 9px -1px rgba(186, 26, 26, 0.4)";
                } else {
                  bg = "var(--fd-wd-solid)";
                  border = "1.5px solid var(--fd-wd-solid)";
                  shadow = "0 3px 9px -1px rgba(20, 114, 76, 0.35)";
                }
                labelColor = "#ffffff";
                numColor = "#ffffff";
                dotColor = "#ffffff";
              } else if (d.isToday) {
                bg = "var(--fd-accent-tint)";
                border = "1.5px solid var(--fd-accent-solid)";
                labelColor = "var(--fd-accent-ink)";
                numColor = "var(--fd-accent-ink)";
                dotColor = "var(--fd-accent-solid)";
              } else if (kind === "sat") {
                bg = "color-mix(in srgb, var(--fd-sat-solid) 26%, var(--bg-surface))";
                border = "1px solid color-mix(in srgb, var(--fd-sat-ink) 40%, transparent)";
                labelColor = "var(--fd-sat-deep)";
                numColor = "var(--fd-sat-deep)";
                dotColor = "var(--fd-sat-deep)";
              } else if (kind === "sun") {
                bg = "color-mix(in srgb, var(--fd-sun-solid) 12%, var(--bg-surface))";
                border = "1px solid color-mix(in srgb, var(--fd-sun-ink) 35%, transparent)";
                labelColor = "var(--fd-sun-deep)";
                numColor = "var(--fd-sun-deep)";
                dotColor = "var(--fd-sun-deep)";
              }

              return (
                <button
                  key={d.date}
                  type="button"
                  onClick={() => setActiveDate(d.date)}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    padding: "6px 2px 5px",
                    borderRadius: 13,
                    border,
                    background: bg,
                    cursor: "pointer",
                    font: "inherit",
                    position: "relative",
                    transition: "all 140ms ease",
                    boxShadow: shadow,
                  }}
                >
                  <span style={{ fontSize: 10, fontWeight: kind !== "weekday" ? 800 : 700, color: labelColor, opacity: on ? 0.95 : 0.85 }}>
                    {shortName}
                  </span>
                  <span className="tnum" style={{ fontSize: 14, fontWeight: 800, marginTop: 1, color: numColor }}>
                    {dayNum}
                  </span>
                  <div style={{ height: 5, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2 }}>
                    {hasOrder ? (
                      <span style={{ width: 4.5, height: 4.5, borderRadius: 999, background: dotColor }} />
                    ) : allLocked ? (
                      <I.lock size={8} style={{ color: on ? "#fff" : "var(--fg-4)" }} />
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. VÙNG TRUNG TÂM — TỰ NHIÊN, KHÔNG BỊ CẮT ĐẦU ĐUÔI */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "8px 14px 14px" }} className="no-scrollbar">
        {status === "loading" && !data ? (
          <LoadingBlock />
        ) : status === "error" && !data ? (
          <ErrorBlock message={error ?? "Không tải được thực đơn"} onRetry={() => reload()} />
        ) : !activeDay ? (
          <div style={{ textAlign: "center", color: "var(--fg-4)", padding: 40 }}>Chưa có thực đơn cho tuần này</div>
        ) : (
          <div>
            {tab === "this" && data && !data.allowOrderingThisWeek && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--fd-lock)", background: "color-mix(in srgb, var(--fd-lock) 8%, var(--bg-surface))", border: "1px solid color-mix(in srgb, var(--fd-lock) 30%, transparent)", padding: "7px 12px", borderRadius: 12, marginBottom: 8 }}>
                <I.lock size={12} /> Tuần này đã chốt — chỉ xem, không đổi được.
              </div>
            )}
            <DayCard
              key={activeDay.date}
              day={activeDay}
              shifts={data!.shifts}
              onPrev={prevDay ? () => setActiveDate(prevDay.date) : undefined}
              onNext={nextDay ? () => setActiveDate(nextDay.date) : undefined}
            />
          </div>
        )}
      </div>

      {/* 3. THANH TỔNG ĐÁY TRANG */}
      {data && (
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 12, padding: "8px 16px 10px", background: "var(--bg-surface)", borderTop: "1px solid var(--fd-wd-line)" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="tnum" style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16, color: "var(--fg-1)" }}>
              <span style={{ color: total > 0 ? "var(--fd-wd-deep)" : "var(--fg-1)" }}>{total} suất</span>
              <span style={{ fontWeight: 500, fontSize: 12, color: "var(--fg-3)", marginLeft: 6 }}>{tab === "this" ? "tuần này" : "tuần sau"}</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--fg-4)" }}>Chạm món để lưu · Không chọn = nhận suất mặc định</div>
          </div>
          {clearable && (
            <button
              onClick={onClearWeek}
              style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, padding: "6px 11px", borderRadius: 999, font: "inherit", border: `1.5px solid ${confirmClear ? "var(--fd-lock)" : "var(--border-default)"}`, background: confirmClear ? "color-mix(in srgb, var(--fd-lock) 10%, var(--bg-surface))" : "transparent", color: confirmClear ? "var(--fd-lock)" : "var(--fg-2)", cursor: "pointer", whiteSpace: "nowrap" }}
            >
              <I.trash size={13} /> {confirmClear ? "Xác nhận xoá" : "Xoá tuần"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
