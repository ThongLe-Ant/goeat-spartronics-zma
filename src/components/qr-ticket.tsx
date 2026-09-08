// GoEat ZMA — thân thẻ nhận cơm theo PickupCardData của spartronics.
// QR mã hoá card_number || employee_code (plain) — máy quét ở quầy đọc rồi gọi
// /api/pickup/process; danh sách suất hôm nay hiện kèm khung giờ mở quầy.
import { I } from "./icons";
import { QRCode } from "./qr-code";
import type { PickupCardData, PickupMeal } from "@/api/types";
import { dayMonth, hmVN, weekdayFullVN } from "@/lib/date-vn";

type MealState = "done" | "open" | "soon" | "closed";
function mealState(m: PickupMeal, now: string): MealState {
  if (m.picked_up) return "done";
  if (now < m.open_from) return "soon";
  if (now > m.open_to) return "closed";
  return "open";
}
const STATE_LOOK: Record<MealState, { bg: string; fg: string; text: (m: PickupMeal) => string }> = {
  done: { bg: "var(--success-50)", fg: "var(--success-700)", text: (m) => `Đã nhận${m.pickup_time ? " " + hmVN(new Date(m.pickup_time)) : ""}` },
  open: { bg: "var(--fd-wd-track)", fg: "var(--fd-wd-deep)", text: () => "Đang phát" },
  soon: { bg: "var(--fd-wd-slot)", fg: "var(--fg-3)", text: (m) => `Mở từ ${m.open_from}` },
  closed: { bg: "color-mix(in srgb, var(--fd-lock) 8%, var(--bg-surface))", fg: "var(--fd-lock)", text: () => "Hết giờ phát" },
};

export function PickupCardBody({ card, onGoWeekly, onDark = false }: { card: PickupCardData; onGoWeekly?: () => void; onDark?: boolean }) {
  const now = hmVN();
  const emp = card.employee;
  // Màu "đục lỗ" phải trùng nền phía sau tấm vé.
  const notch = onDark ? "var(--teal-700)" : "var(--ge-sage)";
  return (
    <>
      <div style={{ color: onDark ? "rgba(255,255,255,0.82)" : "var(--fg-3)", fontSize: 13.5, fontWeight: 500, textAlign: "center", marginBottom: 16, lineHeight: 1.5 }}>
        Đưa mã này cho quầy phát cơm
        <br />
        hoặc quẹt thẻ nhân viên như thường lệ
      </div>
      <div style={{ width: "100%", maxWidth: 320, background: "#fff", borderRadius: 24, border: onDark ? "none" : "1px solid var(--ge-sage-line)", boxShadow: onDark ? "var(--ge-shadow-ticket)" : "var(--ge-shadow-lift)" }}>
        <div style={{ padding: "20px 20px 16px", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <QRCode value={card.scan_value} size={196} fg="#0d4d33" />
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 18, marginTop: 14, color: "var(--fg-1)" }}>{emp.full_name}</div>
          <div style={{ fontSize: 13, color: "var(--fg-3)", marginTop: 2, textAlign: "center" }}>
            {emp.employee_code}
            {emp.department ? ` · ${emp.department}` : ""}
          </div>
        </div>
        {/* rãnh xé vé: hai khuyết bán nguyệt ăn màu nền phía sau nên trông như vé bị bấm lỗ thật */}
        <div style={{ position: "relative", height: 1, margin: "0 18px", borderTop: "1.5px dashed #d7ded8" }}>
          <span style={{ position: "absolute", left: -29, top: -11, width: 22, height: 22, borderRadius: 999, background: notch }} />
          <span style={{ position: "absolute", right: -29, top: -11, width: 22, height: 22, borderRadius: 999, background: notch }} />
        </div>
        <div style={{ padding: "14px 16px 18px" }}>
          <div style={{ fontSize: 12, color: "var(--fg-4)", marginBottom: 8 }}>
            Suất ăn {weekdayFullVN(card.date).toLowerCase()} {dayMonth(card.date)}
          </div>
          {card.meals.length === 0 ? (
            <div style={{ textAlign: "center", padding: "10px 0 4px", color: "var(--fg-3)", fontSize: 13.5 }}>
              Hôm nay bạn chưa có suất ăn.
              {onGoWeekly && (
                <div>
                  <button onClick={onGoWeekly} style={{ marginTop: 8, fontSize: 13, fontWeight: 700, color: "var(--fd-wd-on-solid)", background: "var(--fd-wd-solid)", border: "none", padding: "8px 14px", borderRadius: 999, cursor: "pointer", font: "inherit", boxShadow: "0 4px 12px -4px color-mix(in srgb, var(--fd-wd-solid) 80%, transparent)" }}>
                    Đăng ký cho ngày tới
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {card.meals.map((m) => {
                const st = mealState(m, now);
                const look = STATE_LOOK[st];
                return (
                  <div key={m.meal_time_id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 12, background: look.bg }}>
                    <span style={{ color: look.fg, flexShrink: 0 }}>{st === "done" ? <I.checkCircle size={18} /> : <I.clock size={18} />}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="tnum" style={{ fontSize: 13.5, fontWeight: 700, color: "var(--fg-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {m.meal_time_name} <span style={{ fontWeight: 500, color: "var(--fg-3)" }}>· {m.serve_window}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 1 }}>
                        <span style={{ minWidth: 0, flex: 1, fontSize: 12.5, color: "var(--fg-2)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.food_name ?? "—"}</span>
                        {m.entitlement === "ot" && <span style={{ flexShrink: 0, fontSize: 10.5, fontWeight: 700, color: "var(--gold-deep)", background: "var(--gold-50)", padding: "1px 6px", borderRadius: 999 }}>Tăng ca</span>}
                        {m.entitlement === "none" && <span style={{ flexShrink: 0, fontSize: 10.5, fontWeight: 700, color: "var(--fg-3)", background: "var(--bg-muted)", padding: "1px 6px", borderRadius: 999 }}>Ngoài ca</span>}
                      </div>
                    </div>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: look.fg, whiteSpace: "nowrap" }}>{look.text(m)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <div className="tnum" style={{ marginTop: 16, fontSize: 12.5, fontWeight: 700, color: onDark ? "rgba(255,255,255,0.5)" : "var(--fg-4)", fontFamily: "var(--font-display)", letterSpacing: "0.08em" }}>#{card.scan_value}</div>
    </>
  );
}
