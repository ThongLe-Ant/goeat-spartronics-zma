// GoEat ZMA — BÁO CÁO PHÁT MÓN theo ngày (GET /api/zma/staff/report/meal-day).
//
// Khác BẢNG BẾP (`/admin/kitchen`): bảng bếp là HÔM NAY, tự làm mới 30 giây, để
// người đang đứng quầy nhìn; còn đây là số của MỘT NGÀY BẤT KỲ, đọc để đối soát
// với nhà máy — nên có thanh chọn ngày và KHÔNG tự làm mới.
//
// Cả màn hình chỉ có một hệ số học, giữ nguyên như web:
//
//   Dự trù − Loại trừ = Thực nấu = Đã phát + Chưa nhận
//   Phát ngoại lệ nằm NGOÀI dự trù — cộng riêng, KHÔNG trộn vào Thực nấu.
//
// Vì thế "phát ngoại lệ" luôn đứng ở một dòng riêng dưới vạch kẻ, không bao giờ
// cộng vào Thực nấu: trộn hai con số là làm hỏng luôn bản đối soát với nhà máy.
//
// THIẾT KẾ (§12.10): bản cũ xếp bốn con số thành lưới bốn ô bằng nhau, nên phép
// tính biến mất — người đọc thấy bốn số rời rạc chứ không thấy số này TRỪ số kia
// ra số nọ. Ở đây đổi sang dạng SỔ: mỗi số một dòng, có vạch kẻ đúng chỗ phép
// tính khép lại. Và mỗi con số chỉ in MỘT LẦN trên màn.
//
// Không có nút xuất Excel — `report:export` giữ trên web.
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { I } from "@/components/icons";
import { ScreenHeader } from "@/components/ui";
import StaffGuard from "@/components/staff-guard";
import { ErrorBlock, LoadingBlock } from "@/components/ordering/status";
import { fetchMealDayReport } from "@/api/report";
import { addDays, weekdayVN, ymdVN } from "@/lib/date-vn";
import { staffDishTone } from "@/lib/dish-tone";
import { dayLook } from "@/lib/day-look";
import { DayLeaf } from "@/components/admin/day-leaf";
import type { MealDayReport, ReportShift } from "@/api/types";

/** Cửa sổ ngày: 11 ngày đã qua + hôm nay + 2 ngày tới (xem bếp sắp nấu bao nhiêu). */
const DAY_WINDOW = Array.from({ length: 14 }, (_, i) => addDays(ymdVN(), i - 11));

const pct = (done: number, total: number) => (total ? Math.round((done / total) * 100) : 0);

// Dải ngày dùng NGUYÊN công thức màu của trang đặt món (`dayLook`): tô cả viên
// — nền, viền, nhãn, số — chứ không chỉ tô con số. Tô mỗi con số thì bảy ô vẫn
// là bảy ô trắng giống hệt nhau, người đối soát chẳng thấy cuối tuần nằm đâu.

/** Một dòng sổ. `rule` = vạch kẻ phía trên, đánh dấu chỗ phép tính khép lại. */
function Row({ label, note, value, strong, tone, rule }: { label: string; note?: string; value: number | string; strong?: boolean; tone?: string; rule?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 10,
        padding: "9px 0",
        borderBottom: "1px solid var(--fd-wd-line)",
        borderTop: rule ? "1.5px solid var(--fg-1)" : undefined,
        marginTop: rule ? 4 : undefined,
      }}
    >
      <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: strong ? 700 : 500, color: strong ? "var(--fg-1)" : "var(--fg-2)" }}>
        {label}
        {note && <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 500, color: "var(--fg-3)" }}>{note}</span>}
      </span>
      <span className="tnum" style={{ flexShrink: 0, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: strong ? 17 : 15.5, color: tone ?? "var(--fg-1)" }}>
        {value}
      </span>
    </div>
  );
}

/** Dải nhắc "số này mới là dự trù" — nhà máy chưa đẩy danh sách ăn. */
function AwaitingNote({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 7, alignItems: "flex-start", marginTop: 12, padding: "9px 11px", borderRadius: 12, background: "var(--warning-50)", border: "1px solid var(--warning-500)", color: "var(--warning-700)", fontSize: 12.5, fontWeight: 600, lineHeight: 1.45 }}>
      <I.info size={14} style={{ flex: "0 0 auto", marginTop: 1 }} />
      <span>{children}</span>
    </div>
  );
}

/** "2 CN mới, 1 khách" — bỏ hẳn vế bằng 0 cho khỏi tốn chỗ trên màn hẹp. */
function extraBreakdown(s: ReportShift): string | undefined {
  const parts: string[] = [];
  if (s.extra_new_workers > 0) parts.push(`${s.extra_new_workers} CN mới`);
  if (s.extra_guests > 0) parts.push(`${s.extra_guests} khách`);
  return parts.length ? parts.join(", ") : undefined;
}

function ShiftBlock({ s, future }: { s: ReportShift; future: boolean }) {
  const [open, setOpen] = useState(false);
  const extra = s.exception + s.extra_total;
  // Ca chưa phát suất nào (chưa tới giờ) thì viết "92 suất" chứ không viết
  // "0/92": tỷ lệ 0% của một ca còn chưa mở quầy đọc như một ca hỏng.
  const started = !future && s.picked > 0;
  return (
    <section
      className="ge-dots"
      style={{
        ["--ge-dot-ink" as string]: "var(--fd-wd-ink)",
        ["--ge-dot-alpha" as string]: "15%",
        marginTop: 14,
        borderRadius: 20,
        padding: "14px 15px 15px",
        background: "var(--fd-wd-card)",
        border: `1px solid ${started ? "var(--fd-wd-line-strong)" : "var(--border-subtle)"}`,
        boxShadow: "var(--ge-shadow-card)",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, paddingBottom: 8, borderBottom: "1.5px solid var(--fg-1)" }}>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15.5 }}>{s.meal_time_name}</span>
        <span className="tnum" style={{ fontSize: 12.5, color: "var(--fg-3)" }}>{s.serve_window}</span>
        <span className="tnum" style={{ marginLeft: "auto", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15.5 }}>
          {started ? (
            <>
              {s.picked}
              <span style={{ fontWeight: 600, color: "var(--fg-4)" }}>/{s.actual}</span>
            </>
          ) : (
            `${s.actual} suất`
          )}
        </span>
      </div>

      <div style={{ fontSize: 12, color: "var(--fg-3)", paddingTop: 7 }}>{s.cook_locked ? `Đã chốt lúc ${s.cook_lock_clock}` : `Chốt số nấu lúc ${s.cook_lock_clock}`}</div>

      {/* Chưa có lượt đẩy ⇒ con số đang là DỰ TRÙ, phải nói rõ kẻo bếp tưởng đã chốt. */}
      {!s.roster_pushed && <AwaitingNote>Nhà máy chưa đẩy danh sách ăn của ca này, số dưới đây vẫn là dự trù.</AwaitingNote>}

      <div style={{ marginTop: 8 }}>
        <Row label="Dự trù" value={s.forecast} />
        {s.excluded > 0 && <Row label="Loại trừ" value={`− ${s.excluded}`} />}
        {started && <Row label="Chưa nhận" value={s.missed} />}
        {extra > 0 && <Row label="Phát ngoại lệ" note={extraBreakdown(s)} value={extra} />}
        {s.to_cook !== s.actual && <Row label="Bếp phải ra" value={s.to_cook} strong rule />}
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 5, padding: 0, border: "none", background: "none", color: "var(--fd-wd-solid)", fontSize: 13, fontWeight: 700, cursor: "pointer", font: "inherit" }}
      >
        {open ? "Ẩn chi tiết món" : `Chi tiết ${s.dishes.length} món`}
        <I.chevDown size={15} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
      </button>

      {open &&
        (s.dishes.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--fg-3)", paddingTop: 10 }}>Ngày này ca không có suất nào.</div>
        ) : (
          <div style={{ marginTop: 8 }}>
            {s.dishes.map((d) => {
              const full = started && d.picked >= d.actual && d.actual > 0;
              const look = staffDishTone(d.name, d.label);
              const Glyph = I[look.icon];
              return (
                <div key={d.name} style={{ display: "flex", alignItems: "baseline", gap: 11, padding: "9px 0", borderBottom: "1px solid var(--fd-wd-line)" }}>
                  <span aria-hidden style={{ flex: "0 0 auto", width: 20, color: look.ink, transform: "translateY(3px)" }}>
                    <Glyph size={17} sw={2.2} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, lineHeight: 1.35 }}>{d.name}</div>
                    <div style={{ fontSize: 11.5, color: "var(--fg-4)" }}>
                      {d.label}
                      {d.excluded > 0 && <span style={{ marginLeft: 8 }}>loại trừ {d.excluded}</span>}
                    </div>
                  </div>
                  <div className="tnum" style={{ flexShrink: 0, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15, color: full ? "var(--success-700)" : "var(--fg-1)" }}>
                    {started ? (
                      <>
                        {d.picked}
                        <span style={{ fontWeight: 600, color: "var(--fg-4)" }}>/{d.actual}</span>
                      </>
                    ) : (
                      d.actual
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
    </section>
  );
}

function ReportScreen() {
  const navigate = useNavigate();
  const [date, setDate] = useState(ymdVN());
  const [data, setData] = useState<MealDayReport | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    setData(null);
    try {
      const r = await fetchMealDayReport(date);
      setData(r);
      setStatus("ready");
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Không tải được báo cáo ngày này");
      setStatus("error");
    }
  }, [date]);

  useEffect(() => {
    void load();
  }, [load]);

  // Hôm nay nằm gần cuối dải ngày — kéo sẵn tới đó, không bắt người dùng vuốt.
  useEffect(() => {
    const el = stripRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);

  const t = data?.totals;
  /** Ngày chưa tới: bếp chưa nấu, quầy chưa mở — số nào cũng là DỰ TRÙ. */
  const future = date > ymdVN();
  const dayExtra = t ? t.exception + t.extra_total : 0;

  return (
    <div style={{ height: "100%", background: "var(--bg-page)", display: "flex", flexDirection: "column" }}>
      <ScreenHeader
        title="Báo cáo phát món"
        subtitle={data ? "Chọn ngày để đối soát" : "Đang tải…"}
        onBack={() => navigate("/profile")}
        right={
          <button
            onClick={() => void load()}
            title="Tải lại"
            style={{ width: 38, height: 38, borderRadius: 11, border: "1px solid var(--border-subtle)", background: "var(--bg-surface)", color: status === "loading" ? "var(--fd-wd-solid)" : "var(--fg-1)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            <I.refresh size={19} />
          </button>
        }
      />

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px calc(var(--safe-bottom) + 24px)" }} className="no-scrollbar">
        {/* Chọn ngày */}
        <div ref={stripRef} className="no-scrollbar" style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 14 }}>
          {DAY_WINDOW.map((d) => {
            const L = dayLook(d, d === date, d === ymdVN());
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDate(d)}
                style={{
                  flex: "0 0 auto",
                  width: 52,
                  padding: "7px 0 6px",
                  borderRadius: 14,
                  border: L.border,
                  background: L.bg,
                  boxShadow: L.shadow,
                  cursor: "pointer",
                  font: "inherit",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <span style={{ fontSize: 10.5, fontWeight: 700, color: L.label }}>{weekdayVN(d)}</span>
                <span className="tnum" style={{ fontSize: 15, fontWeight: 800, fontFamily: "var(--font-display)", color: L.num }}>
                  {d.slice(8, 10)}
                </span>
              </button>
            );
          })}
        </div>

        {status === "loading" && <LoadingBlock rows={3} />}
        {status === "error" && <ErrorBlock message={error ?? "Không tải được"} onRetry={() => void load()} />}

        {status === "ready" && data && t && (
          <>
            {data.shifts.length === 0 ? (
              <div style={{ color: "var(--fg-3)", fontSize: 13.5, padding: "22px 2px", lineHeight: 1.55 }}>Ngày này bếp không nấu, không có suất nào.</div>
            ) : (
              <>
                {/* Tờ lịch: mốc ấm ở đầu màn, nói NGÀY NÀO trước khi nói bao nhiêu suất. */}
                <div style={{ marginBottom: 14 }}>
                  <DayLeaf date={date} sub={future ? "Bếp chưa nấu, số còn chạy" : `${data.shifts.length} ca phát`} />
                </div>

                {/* Số của cả ngày — khối đặc DUY NHẤT của màn, có hoa văn chấm
                    như thẻ ngày trang đặt món để nó là một MẶT có chất liệu. */}
                <div className="ge-dots" style={{ ["--ge-dot-ink" as string]: "#ffffff", ["--ge-dot-alpha" as string]: "20%", borderRadius: 20, padding: "16px 18px 18px", background: "var(--fd-wd-solid)", color: "var(--fd-wd-on-solid)", boxShadow: "0 16px 32px -22px rgba(20, 114, 76, 0.95)" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 9 }}>
                    <span className="tnum" style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 46, lineHeight: 1, letterSpacing: "-0.03em" }}>
                      {t.actual}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.75)" }}>suất thực nấu</span>
                  </div>
                  {!future && (
                    <>
                      <div style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,0.24)", overflow: "hidden", marginTop: 14 }}>
                        <div style={{ width: `${Math.min(100, pct(t.picked, t.actual))}%`, height: "100%", background: "#fff", transition: "width .3s" }} />
                      </div>
                      <div className="tnum" style={{ fontSize: 12.5, fontWeight: 600, color: "rgba(255,255,255,0.75)", marginTop: 7 }}>
                        đã phát {t.picked} trên {t.actual}
                      </div>
                    </>
                  )}
                  <div className="tnum" style={{ fontSize: 12.5, fontWeight: 600, color: "rgba(255,255,255,0.75)", marginTop: future ? 12 : 2 }}>
                    {t.headcount} người có suất
                  </div>
                </div>

                {/* Sổ của cả ngày. Thực nấu và Đã phát đã nằm trên khối xanh nên
                    không in lại ở đây — mỗi con số chỉ xuất hiện một lần. */}
                <div style={{ marginTop: -14, padding: "26px 15px 12px", borderRadius: "0 0 20px 20px", background: "var(--fd-wd-card)", border: "1px solid var(--fd-wd-line-strong)", borderTop: "none" }}>
                  <Row label="Dự trù" value={t.forecast} />
                  {t.excluded > 0 && <Row label="Loại trừ" value={`− ${t.excluded}`} />}
                  {!future && <Row label="Chưa nhận" value={t.missed} />}
                  {(dayExtra > 0 || t.picked > 0) && <Row label="Phát ngoại lệ" note="ngoài dự trù" value={dayExtra} />}
                  {t.to_cook !== t.actual && <Row label="Bếp phải ra" value={t.to_cook} strong rule />}
                </div>

                {data.shifts_awaiting_roster.length > 0 && <AwaitingNote>Chưa có danh sách nhà máy cho {data.shifts_awaiting_roster.join(", ")}, số của các ca đó vẫn là dự trù.</AwaitingNote>}

                {data.shifts.map((s) => (
                  <ShiftBlock key={s.meal_time_id} s={s} future={future} />
                ))}

                <p style={{ margin: "22px 2px 0", fontSize: 12, lineHeight: 1.55, color: "var(--fg-3)" }}>
                  {data.note}
                  {data.reconciled_at && ` Lượt đẩy gần nhất: ${new Date(data.reconciled_at).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}.`}
                  {" Cần bản Excel thì mở trang web, điện thoại chỉ để xem."}
                </p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function ReportPage() {
  return (
    <StaffGuard need="canReport">
      <ReportScreen />
    </StaffGuard>
  );
}
