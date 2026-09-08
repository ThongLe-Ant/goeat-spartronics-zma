// GoEat ZMA — bảng bếp hôm nay: số suất đăng ký / đã phát theo ca và theo món
// (GET /api/zma/staff/kitchen). Tự làm mới mỗi 30 giây.
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScreenHeader, cardS } from "@/components/ui";
import { I } from "@/components/icons";
import StaffGuard from "@/components/staff-guard";
import { fetchKitchenBoard } from "@/api/staff";
import { useBootstrap } from "@/state/ordering";
import { dayMonth, weekdayFullVN } from "@/lib/date-vn";
import type { KitchenBoard } from "@/api/types";

const REFRESH_MS = 30_000;

function Bar({ done, total }: { done: number; total: number }) {
  const pct = total ? Math.min(100, Math.round((done / total) * 100)) : 0;
  return (
    <div style={{ height: 6, borderRadius: 999, background: "var(--bg-soft)", overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: pct >= 100 ? "var(--success-500)" : "var(--teal-500)", transition: "width .3s" }} />
    </div>
  );
}

function KitchenScreen() {
  const navigate = useNavigate();
  const boot = useBootstrap();
  const [board, setBoard] = useState<KitchenBoard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(() => {
    setRefreshing(true);
    fetchKitchenBoard().then(
      (b) => {
        setBoard(b);
        setError(null);
        setRefreshing(false);
      },
      (e) => {
        setError((e as Error)?.message ?? "Không tải được bảng bếp");
        setRefreshing(false);
      },
    );
  }, []);
  useEffect(() => {
    reload();
    const t = setInterval(reload, REFRESH_MS);
    return () => clearInterval(t);
  }, [reload]);

  return (
    <div style={{ height: "100%", background: "var(--bg-page)", display: "flex", flexDirection: "column" }}>
      <ScreenHeader
        title="Bếp hôm nay"
        subtitle={board ? `${weekdayFullVN(board.date)} ${dayMonth(board.date)} · ${board.total_registered} suất · đã phát ${board.total_picked_up}` : "Đang tải…"}
        onBack={boot?.staff?.canScan ? () => navigate("/admin/scan") : undefined}
        right={
          <button
            onClick={reload}
            style={{ width: 38, height: 38, borderRadius: 11, border: "1px solid var(--border-subtle)", background: "var(--bg-surface)", color: refreshing ? "var(--teal-600)" : "var(--fg-1)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            <I.refresh size={19} />
          </button>
        }
      />
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px 96px" }} className="no-scrollbar">
        {error && <div style={{ ...cardS, color: "var(--danger-700, #a32020)", fontSize: 13.5 }}>{error}</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {board?.shifts.map((s) => (
            <div key={s.meal_time_id} style={{ ...cardS, borderColor: s.window_open ? "var(--fd-wd-solid)" : "var(--fd-wd-line)", boxShadow: s.window_open ? "inset 0 0 0 1px var(--fd-wd-solid), var(--shadow-xs)" : "var(--shadow-xs)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 10, borderBottom: "1px solid var(--border-subtle)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 32, height: 32, borderRadius: 9, background: s.window_open ? "var(--teal-500)" : "var(--teal-50)", color: s.window_open ? "#fff" : "var(--teal-700)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <I.clock size={17} />
                  </span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                      {s.meal_time_name}
                      {s.window_open && <span style={{ marginLeft: 8, fontSize: 10.5, fontWeight: 700, color: "var(--teal-700)", background: "var(--teal-50)", padding: "2px 7px", borderRadius: 999, textTransform: "uppercase" }}>Đang phát</span>}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--fg-3)" }}>Phát cơm {s.serve_window}</div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 800, fontSize: 16, fontFamily: "var(--font-display)", color: "var(--teal-700)" }}>{s.registered} suất</div>
                  <div style={{ fontSize: 11.5, color: "var(--fg-3)" }}>đã phát {s.picked_up}</div>
                </div>
              </div>
              <div style={{ marginTop: 10 }}>
                <Bar done={s.picked_up} total={s.registered} />
              </div>
              {s.dishes.length === 0 && <div style={{ fontSize: 13, color: "var(--fg-3)", paddingTop: 10 }}>Chưa có suất đăng ký.</div>}
              {s.dishes.map((d) => (
                <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 11, paddingTop: 11 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: d.picked_up >= d.registered && d.registered > 0 ? "var(--success-500)" : "var(--teal-300)", flexShrink: 0 }} />
                  <div style={{ flex: 1, fontWeight: 600, fontSize: 14, lineHeight: 1.3 }}>{d.name}</div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <span style={{ fontWeight: 700, fontSize: 15, fontFamily: "var(--font-display)" }}>×{d.registered}</span>
                    <span style={{ fontSize: 11.5, color: "var(--fg-3)", marginLeft: 6 }}>{d.picked_up}/{d.registered}</span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function KitchenPage() {
  return (
    <StaffGuard need="canKitchen">
      <KitchenScreen />
    </StaffGuard>
  );
}
