// GoEat ZMA — Suất ăn của tôi.
// Thiết kế đồng bộ 100% với style màu sắc và ngôn ngữ của trang đặt món:
// 1. Header chuẩn: tiêu đề, chừa safe-area capsule Zalo, tab chuyển đổi Sắp tới / Lịch sử đã qua.
// 2. Thẻ suất ăn phong cách DayCard: viền --fd-wd-line, góc bo 20px, tờ lịch đất nung, icon món theo loại (DishGlyph).
// 3. Khung món chọn viền vàng đứt nét (đặc trưng Spartronics), nút bấm xanh lục bảo to rõ, đậm nét.
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { I } from "@/components/icons";
import { DishGlyph } from "@/components/ordering/dish-icon";
import { ErrorBlock, LoadingBlock } from "@/components/ordering/status";
import type { OrderHistoryItem, OrderingFoodItem } from "@/api/types";
import { dayKind, dayMonth, hmVN, splitDishName, weekdayFullVN, ymdVN } from "@/lib/date-vn";
import { useOrderHistory } from "@/state/pickup";

type OrdersTab = "upcoming" | "past";

const NUM_INK = { weekday: "var(--fd-cal-ink)", sat: "var(--fd-sat-ink)", sun: "var(--fd-sun-ink)" } as const;
const DAY_INK = { weekday: "var(--fd-wd-ink)", sat: "var(--fd-sat-ink)", sun: "var(--fd-sun-ink)" } as const;
const KIND_ICON = { weekday: null, sat: I.party, sun: I.heart } as const;

export default function OrdersPage() {
  const navigate = useNavigate();
  const { data, error, loading, reload } = useOrderHistory();
  const [tab, setTab] = useState<OrdersTab>("upcoming");
  const today = ymdVN();

  const { upcoming, past } = useMemo(() => {
    const up: OrderHistoryItem[] = [];
    const pa: OrderHistoryItem[] = [];
    for (const o of data ?? []) {
      if (o.meal_date > today || (o.meal_date === today && !o.picked_up && o.pickup_time == null)) {
        up.push(o);
      } else {
        pa.push(o);
      }
    }
    up.sort((a, b) => (a.meal_date === b.meal_date ? a.meal_time_id - b.meal_time_id : a.meal_date < b.meal_date ? -1 : 1));
    pa.sort((a, b) => (a.meal_date === b.meal_date ? b.meal_time_id - a.meal_time_id : a.meal_date > b.meal_date ? -1 : 1));
    return { upcoming: up, past: pa };
  }, [data, today]);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--bg-page)" }}>
      {/* 1. ĐẦU TRANG — ĐỒNG BỘ STYLE TRANG ĐẶT MÓN, CHỐNG ĐÈ CAPSULE ZALO */}
      <div style={{ flexShrink: 0, padding: "calc(var(--safe-top) + 6px) 16px 10px", background: "var(--bg-surface)", borderBottom: "1px solid var(--fd-wd-line)" }}>
        {/* Hàng 1: Tiêu đề đứng độc lập bên trái, chừa 96px an toàn cho capsule Zalo */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 30, paddingRight: 96 }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 18, letterSpacing: "-0.01em", color: "var(--fg-1)", whiteSpace: "nowrap" }}>
            Suất ăn của tôi
          </div>
          <span className="tnum" style={{ fontSize: 11.5, fontWeight: 700, color: "var(--fd-wd-deep)" }}>
            {upcoming.length} suất sắp tới
          </span>
        </div>

        {/* Hàng 2: Tab chọn Sắp tới / Lịch sử đã qua */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 8 }}>
          <div role="tablist" style={{ display: "inline-flex", gap: 2, padding: 2, borderRadius: 999, background: "var(--fd-wd-track)", flexShrink: 0 }}>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "upcoming"}
              onClick={() => setTab("upcoming")}
              style={{
                padding: "4px 12px",
                borderRadius: 999,
                border: "none",
                font: "inherit",
                fontSize: 12,
                fontWeight: 700,
                background: tab === "upcoming" ? "var(--fd-wd-solid)" : "transparent",
                color: tab === "upcoming" ? "var(--fd-wd-on-solid)" : "var(--fg-2)",
                boxShadow: tab === "upcoming" ? "var(--shadow-xs)" : "none",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                transition: "all 140ms ease",
              }}
            >
              Sắp tới
              {upcoming.length > 0 && (
                <span style={{ fontSize: 9.5, fontWeight: 800, padding: "0 5px", borderRadius: 999, background: tab === "upcoming" ? "rgba(255,255,255,0.25)" : "var(--bg-surface)", color: tab === "upcoming" ? "#fff" : "var(--fd-wd-deep)" }}>
                  {upcoming.length}
                </span>
              )}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "past"}
              onClick={() => setTab("past")}
              style={{
                padding: "4px 12px",
                borderRadius: 999,
                border: "none",
                font: "inherit",
                fontSize: 12,
                fontWeight: 700,
                background: tab === "past" ? "var(--fd-wd-solid)" : "transparent",
                color: tab === "past" ? "var(--fd-wd-on-solid)" : "var(--fg-2)",
                boxShadow: tab === "past" ? "var(--shadow-xs)" : "none",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                transition: "all 140ms ease",
              }}
            >
              Lịch sử đã qua
              {past.length > 0 && (
                <span style={{ fontSize: 9.5, fontWeight: 800, padding: "0 5px", borderRadius: 999, background: tab === "past" ? "rgba(255,255,255,0.25)" : "var(--bg-surface)", color: tab === "past" ? "#fff" : "var(--fd-wd-deep)" }}>
                  {past.length}
                </span>
              )}
            </button>
          </div>

          <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--fg-3)" }}>
            {tab === "upcoming" ? "Chờ phục vụ" : "Đã hoàn thành"}
          </span>
        </div>
      </div>

      {/* 2. NỘI DUNG DANH SÁCH */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px 24px" }} className="no-scrollbar">
        {loading && !data ? (
          <LoadingBlock rows={4} />
        ) : error && !data ? (
          <ErrorBlock message={error} onRetry={reload} />
        ) : tab === "upcoming" ? (
          upcoming.length === 0 ? (
            <EmptyUpcoming onOrder={() => navigate("/weekly")} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {upcoming.map((o) => (
                <UpcomingCard key={`${o.meal_date}|${o.meal_time_id}`} o={o} today={today} onQr={() => navigate("/qr")} onEdit={() => navigate("/weekly")} />
              ))}
            </div>
          )
        ) : past.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--fg-4)", padding: "40px 20px", fontSize: 13 }}>Chưa có lịch sử nhận cơm</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {past.map((o) => (
              <PastCard key={`${o.meal_date}|${o.meal_time_id}`} o={o} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EntitlementTag({ e }: { e: OrderHistoryItem["entitlement"] }) {
  if (e === "ot") return <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--gold-deep)", background: "var(--gold-50)", border: "1px solid color-mix(in srgb, var(--gold) 35%, transparent)", padding: "2px 7px", borderRadius: 999, whiteSpace: "nowrap" }}>Tăng ca</span>;
  if (e === "none") return <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--fg-3)", background: "var(--bg-muted)", border: "1px solid var(--border-default)", padding: "2px 7px", borderRadius: 999, whiteSpace: "nowrap" }}>Ngoài ca</span>;
  return null;
}

/** Thẻ suất ăn sắp tới — thiết kế đúng chuẩn DayCard của trang Đặt món */
function UpcomingCard({ o, today, onQr, onEdit }: { o: OrderHistoryItem; today: string; onQr: () => void; onEdit: () => void }) {
  const { main, side } = splitDishName(o.food_name);
  const isToday = o.meal_date === today;
  const kind = dayKind(o.meal_date);
  const KindIcon = KIND_ICON[kind];

  // Mock dish item để tái sử dụng DishGlyph đúng nhóm món (mặn/chay/nước)
  const mockDish = { name: o.food_name, category: "man", kind: "combo" } as OrderingFoodItem;

  return (
    <article
      style={{
        background: "var(--fd-wd-card)",
        border: isToday
          ? "1.5px solid var(--fd-wd-solid)"
          : kind === "sat"
          ? "1.5px solid color-mix(in srgb, var(--fd-sat-ink) 35%, var(--fd-wd-line))"
          : kind === "sun"
          ? "1.5px solid color-mix(in srgb, var(--fd-sun-solid) 35%, var(--fd-wd-line))"
          : "1px solid var(--fd-wd-line)",
        borderRadius: 20,
        padding: "14px 14px 12px",
        boxShadow: isToday
          ? "inset 0 0 0 1px var(--fd-wd-solid), 0 8px 20px -8px rgba(20, 114, 76, 0.25)"
          : "0 1px 2px rgba(24, 20, 14, 0.05), 0 8px 20px -12px rgba(24, 20, 14, 0.18)",
      }}
    >
      {/* Hàng 1: Đầu thẻ — Tờ lịch đất nung + Thứ/Ca/Giờ phát + Badge Hôm nay */}
      <header style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <span className="ge-daynum" aria-hidden>
          <span className="tnum" style={{ color: NUM_INK[kind] }}>
            {o.meal_date.slice(8, 10)}
          </span>
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 14.5, fontWeight: 700, letterSpacing: "-0.01em", fontFamily: "var(--font-display)", color: "var(--fg-1)", whiteSpace: "nowrap" }}>
            {isToday ? "Hôm nay" : weekdayFullVN(o.meal_date)}
            {KindIcon && <KindIcon size={14} sw={2.1} style={{ color: DAY_INK[kind] }} />}
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--fg-3)" }}>({dayMonth(o.meal_date)})</span>
          </div>
          <div className="tnum" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 600, color: "var(--fg-3)", marginTop: 2 }}>
            <I.clock size={11} sw={2.2} style={{ color: "var(--fd-accent-ink)", flexShrink: 0 }} />
            <span>{o.meal_time_name} · Phát {o.serve_window}</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          {isToday && (
            <span style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: "var(--fd-accent-solid)", color: "var(--fd-accent-on-solid)", boxShadow: "0 4px 10px -4px color-mix(in srgb, var(--fd-accent-solid) 70%, transparent)" }}>
              Hôm nay
            </span>
          )}
          <span style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 8px", borderRadius: 999, background: "var(--fd-wd-track)", color: "var(--fd-wd-deep)", border: "1px solid var(--fd-wd-line)" }}>
            Chờ phát
          </span>
          <EntitlementTag e={o.entitlement} />
        </div>
      </header>

      {/* Hàng 2: Hộp món ăn — Khung vàng đứt nét đặc trưng của dòng ĐANG CHỌN trên trang Đặt món */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 12px",
          borderRadius: 14,
          border: "2px dashed var(--gold)",
          background: "var(--bg-surface)",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
        }}
      >
        <DishGlyph dish={mockDish} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 14.5, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--fg-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {main}
          </div>
          {side && (
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-2)", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              + {side}
            </div>
          )}
        </div>

        {/* Nút thao tác to rõ, đĩnh đạc chuẩn phong cách nút Chọn mới */}
        {isToday ? (
          <button
            type="button"
            onClick={onQr}
            className="ge-pickbtn"
            style={{
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              minWidth: 86,
              height: 38,
              padding: "0 14px",
              borderRadius: 999,
              border: "none",
              background: "var(--fd-wd-solid)",
              color: "#ffffff",
              fontSize: 13.5,
              fontWeight: 800,
              cursor: "pointer",
              font: "inherit",
              boxShadow: "0 3px 10px -2px rgba(20, 114, 76, 0.45)",
            }}
          >
            <I.qr size={14} sw={2.2} />
            Mã QR
          </button>
        ) : (
          <button
            type="button"
            onClick={onEdit}
            className="ge-pickbtn"
            style={{
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              minWidth: 86,
              height: 38,
              padding: "0 14px",
              borderRadius: 999,
              border: "1.5px solid var(--fd-wd-solid)",
              background: "var(--fd-wd-slot)",
              color: "var(--fd-wd-solid)",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              font: "inherit",
            }}
          >
            <I.swap size={13} sw={2.4} />
            Đổi món
          </button>
        )}
      </div>
    </article>
  );
}

/** Thẻ lịch sử đã qua — Tinh gọn, rõ ràng với dấu tích nhận cơm */
function PastCard({ o }: { o: OrderHistoryItem }) {
  const { main, side } = splitDishName(o.food_name);
  const kind = dayKind(o.meal_date);
  const done = o.picked_up;
  const mockDish = { name: o.food_name, category: "man" } as OrderingFoodItem;

  const status = done
    ? { ink: "var(--fd-wd-deep)", bg: "var(--fd-wd-track)", text: o.pickup_time ? hmVN(new Date(o.pickup_time)) : "Đã nhận", Ico: I.check }
    : { ink: "var(--fg-3)", bg: "var(--bg-muted)", text: "Không nhận", Ico: I.x };
  const { Ico } = status;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 16,
        background: "var(--fd-wd-card)",
        border: "1px solid var(--fd-wd-line)",
        boxShadow: "0 1px 2px rgba(24, 20, 14, 0.04)",
        opacity: done ? 1 : 0.78,
      }}
    >
      <span className="ge-daynum" aria-hidden>
        <span className="tnum" style={{ color: NUM_INK[kind] }}>
          {o.meal_date.slice(8, 10)}
        </span>
      </span>

      <DishGlyph dish={mockDish} muted={!done} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--fg-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {main}
          {side && <span style={{ fontWeight: 600, color: "var(--fg-3)", fontSize: 12 }}> + {side}</span>}
        </div>
        <div className="tnum" style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", fontSize: 11.5, fontWeight: 600, color: "var(--fg-3)", marginTop: 2 }}>
          <span>{weekdayFullVN(o.meal_date)} · {o.meal_time_name}</span>
          <EntitlementTag e={o.entitlement} />
        </div>
      </div>

      <span
        className="tnum"
        style={{
          flexShrink: 0,
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: 11.5,
          fontWeight: 700,
          padding: "4px 9px",
          borderRadius: 999,
          background: status.bg,
          color: status.ink,
          border: `1px solid ${done ? "var(--fd-wd-line)" : "var(--border-default)"}`,
          whiteSpace: "nowrap",
        }}
      >
        <Ico size={12} sw={2.8} />
        {status.text}
      </span>
    </div>
  );
}

function EmptyUpcoming({ onOrder }: { onOrder: () => void }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 20px" }}>
      <div
        style={{
          width: 58,
          height: 58,
          borderRadius: 999,
          background: "var(--fd-wd-track)",
          color: "var(--fd-wd-solid)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 12,
        }}
      >
        <I.utensils size={26} sw={1.8} />
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--fg-1)" }}>
        Chưa có suất ăn sắp tới
      </div>
      <div style={{ fontSize: 12.5, color: "var(--fg-3)", marginTop: 4, maxWidth: 240, margin: "4px auto 0" }}>
        Bạn chưa đăng ký suất ăn nào cho các ca làm việc trong tuần.
      </div>
      <button
        type="button"
        onClick={onOrder}
        style={{
          marginTop: 16,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "9px 20px",
          borderRadius: 999,
          background: "var(--fd-wd-solid)",
          color: "#ffffff",
          border: "none",
          fontSize: 13.5,
          fontWeight: 700,
          cursor: "pointer",
          boxShadow: "0 3px 10px -2px rgba(20, 114, 76, 0.45)",
          font: "inherit",
        }}
      >
        <I.calendar size={15} /> Đặt món ngay
      </button>
    </div>
  );
}
