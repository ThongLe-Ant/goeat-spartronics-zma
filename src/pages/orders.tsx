// GoEat ZMA — Suất ăn của tôi: sắp tới / đã qua, trạng thái nhận cơm.
// Nền sage, thẻ trắng nổi bằng bóng. Nhóm "Sắp tới" dùng thẻ HAI TẦNG
// (tầng 1: ca + ngày + trạng thái · tầng 2: tờ lịch + tên món + nút Mã QR),
// nhóm "Đã qua" dùng dòng gọn một tầng.
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { I } from "@/components/icons";
import { ErrorBlock, LoadingBlock } from "@/components/ordering/status";
import type { OrderHistoryItem } from "@/api/types";
import { dayKind, dayMonth, hmVN, splitDishName, weekdayFullVN, ymdVN } from "@/lib/date-vn";
import { useOrderHistory } from "@/state/pickup";

export default function OrdersPage() {
  const navigate = useNavigate();
  const { data, error, loading, reload } = useOrderHistory();
  const today = ymdVN();

  const { upcoming, past } = useMemo(() => {
    const up: OrderHistoryItem[] = [];
    const pa: OrderHistoryItem[] = [];
    for (const o of data ?? []) (o.meal_date > today || (o.meal_date === today && !o.picked_up && o.pickup_time == null) ? up : pa).push(o);
    up.sort((a, b) => (a.meal_date === b.meal_date ? a.meal_time_id - b.meal_time_id : a.meal_date < b.meal_date ? -1 : 1));
    pa.sort((a, b) => (a.meal_date === b.meal_date ? b.meal_time_id - a.meal_time_id : a.meal_date > b.meal_date ? -1 : 1));
    return { upcoming: up, past: pa };
  }, [data, today]);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--ge-sage)" }}>
      {/* Chừa chỗ bên phải cho capsule của Zalo (nút … / thoát). */}
      <div style={{ flexShrink: 0, padding: "calc(var(--safe-top) + 10px) 16px 12px", paddingRight: 96, background: "var(--bg-surface)", borderBottom: "1px solid var(--ge-sage-line)" }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 21, letterSpacing: "-0.01em", color: "var(--fg-1)" }}>Suất ăn của tôi</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-3)", marginTop: 2 }}>Ghi nhận từ đăng ký và danh sách ca của nhà máy</div>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }} className="no-scrollbar">
        {loading && !data ? (
          <LoadingBlock rows={4} />
        ) : error && !data ? (
          <ErrorBlock message={error} onRetry={reload} />
        ) : (
          <div style={{ padding: "16px 16px 28px", display: "flex", flexDirection: "column", gap: 20 }}>
            <Group title="Sắp tới" items={upcoming} empty="Chưa có suất sắp tới">
              {upcoming.map((o) => (
                <UpcomingCard key={`${o.meal_date}|${o.meal_time_id}`} o={o} today={today} onQr={() => navigate(o.meal_date === today ? "/qr" : "/weekly")} />
              ))}
            </Group>
            <Group title="Đã qua" items={past} empty="Chưa có lịch sử">
              {past.map((o) => (
                <PastRow key={`${o.meal_date}|${o.meal_time_id}`} o={o} />
              ))}
            </Group>
          </div>
        )}
      </div>
    </div>
  );
}

function Group({ title, items, empty, children }: { title: string; items: OrderHistoryItem[]; empty: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, padding: "0 2px" }}>
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--fd-wd-deep)" }}>{title}</span>
        <span className="tnum" style={{ fontSize: 11, fontWeight: 700, color: "var(--fd-wd-deep)", background: "var(--ge-card-strip)", border: "1px solid var(--ge-sage-line)", borderRadius: 999, padding: "1px 7px" }}>{items.length}</span>
      </div>
      {items.length === 0 ? <div style={{ fontSize: 13, color: "var(--fg-4)", padding: "10px 2px" }}>{empty}</div> : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>}
    </div>
  );
}

/** Số ngày: ngày thường mượn đất nung của tờ lịch, cuối tuần giữ màu ngày (như DayCard). */
const NUM_INK = { weekday: "var(--fd-cal-ink)", sat: "var(--fd-sat-ink)", sun: "var(--fd-sun-ink)" } as const;

function EntitlementTag({ e }: { e: OrderHistoryItem["entitlement"] }) {
  if (e === "ot") return <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--gold-deep)", background: "var(--gold-50)", padding: "1px 6px", borderRadius: 999, whiteSpace: "nowrap" }}>Tăng ca</span>;
  if (e === "none") return <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--fg-3)", background: "var(--bg-muted)", padding: "1px 6px", borderRadius: 999, whiteSpace: "nowrap" }}>Ngoài ca</span>;
  return null;
}

/** Thẻ hai tầng cho suất sắp tới. */
function UpcomingCard({ o, today, onQr }: { o: OrderHistoryItem; today: string; onQr: () => void }) {
  const { main, side } = splitDishName(o.food_name);
  const isToday = o.meal_date === today;
  return (
    <article style={{ background: "#fff", borderRadius: 18, border: "1px solid var(--ge-sage-line)", boxShadow: "var(--ge-shadow-card)", overflow: "hidden" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 13px", background: "var(--ge-card-strip)", borderBottom: "1px solid var(--ge-sage-line)" }}>
        <I.clock size={13} sw={2.3} style={{ color: "var(--fd-wd-solid)", flexShrink: 0 }} />
        <span className="tnum" style={{ minWidth: 0, flex: 1, fontSize: 12.5, fontWeight: 700, color: "var(--fd-wd-deep)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {o.meal_time_name} · {isToday ? "Hôm nay" : weekdayFullVN(o.meal_date)}, {dayMonth(o.meal_date)}
        </span>
        <span style={{ flexShrink: 0, fontSize: 10.5, fontWeight: 700, padding: "3px 8px", borderRadius: 999, background: "var(--fd-accent-tint)", color: "var(--fd-accent-ink)", whiteSpace: "nowrap" }}>Chờ phát</span>
      </header>
      <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 13px" }}>
        <span className="ge-daynum" aria-hidden>
          <span className="tnum" style={{ color: NUM_INK[dayKind(o.meal_date)] }}>{o.meal_date.slice(8, 10)}</span>
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 15.5, fontWeight: 800, letterSpacing: "-0.016em", color: "var(--fd-wd-deep)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{main}</div>
          {side && <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--fg-2)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>+ {side}</div>}
          <div className="tnum" style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", fontSize: 11.5, fontWeight: 600, color: "var(--fg-3)", marginTop: 3 }}>
            <span>Phát {o.serve_window}</span>
            <EntitlementTag e={o.entitlement} />
          </div>
        </div>
        <button
          type="button"
          onClick={onQr}
          style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, color: "var(--fd-wd-solid)", background: "var(--fd-wd-slot)", border: "1px solid var(--fd-wd-line)", borderRadius: 999, padding: "7px 11px", cursor: "pointer", font: "inherit", whiteSpace: "nowrap" }}
        >
          <I.qr size={13} sw={2.2} />
          {isToday ? "Mã QR" : "Đổi món"}
        </button>
      </div>
    </article>
  );
}

/** Dòng gọn cho suất đã qua. */
function PastRow({ o }: { o: OrderHistoryItem }) {
  const { main, side } = splitDishName(o.food_name);
  const done = o.picked_up;
  const status = done
    ? { ink: "var(--fd-wd-deep)", bg: "var(--fd-wd-track)", text: o.pickup_time ? hmVN(new Date(o.pickup_time)) : "Đã nhận", Ico: I.check }
    : { ink: "var(--fg-3)", bg: "var(--bg-muted)", text: "Không nhận", Ico: I.x };
  const { Ico } = status;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 13px", borderRadius: 15, background: "#fff", border: "1px solid var(--ge-sage-line)", boxShadow: "0 1px 2px rgba(16,40,34,0.04)", opacity: done ? 1 : 0.82 }}>
      <span className="ge-daynum" aria-hidden>
        <span className="tnum" style={{ color: NUM_INK[dayKind(o.meal_date)] }}>{o.meal_date.slice(8, 10)}</span>
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 14.5, fontWeight: 700, letterSpacing: "-0.014em", color: "var(--fg-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {main}
          {side ? <span style={{ fontWeight: 600, color: "var(--fg-3)" }}> + {side}</span> : null}
        </div>
        <div className="tnum" style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", fontSize: 11.5, fontWeight: 600, color: "var(--fg-3)", marginTop: 2 }}>
          <span>{weekdayFullVN(o.meal_date)} · {o.meal_time_name}</span>
          <EntitlementTag e={o.entitlement} />
        </div>
      </div>
      <span className="tnum" style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, padding: "4px 9px", borderRadius: 999, background: status.bg, color: status.ink, whiteSpace: "nowrap" }}>
        <Ico size={12} sw={2.8} />
        {status.text}
      </span>
    </div>
  );
}
