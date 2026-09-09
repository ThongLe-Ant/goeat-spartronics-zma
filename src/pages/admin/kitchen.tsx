// GoEat ZMA — bảng bếp hôm nay: số suất đăng ký / đã phát theo ca và theo món
// (GET /api/zma/staff/kitchen). Tự làm mới mỗi 30 giây.
//
// THIẾT KẾ (§12.10): ba ca KHÔNG bằng vai nhau. Lúc 11:35 thì ca trưa là toàn
// bộ công việc, còn ca chiều và ca đêm là chuyện để biết trước — bản cũ vẽ cả
// ba thành ba thẻ y hệt nên ca đang phát chìm giữa hai ca chưa tới.
//
// Con số lớn nhất trên màn cũng đổi: đang phát thì bếp hỏi "CÒN bao nhiêu chưa
// nhận", chưa tới giờ thì hỏi "cần NẤU bao nhiêu". `registered` là số kế hoạch,
// để nó làm tiêu đề giữa giờ phát là trả lời sai câu hỏi.
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScreenHeader, cardS } from "@/components/ui";
import { I } from "@/components/icons";
import StaffGuard from "@/components/staff-guard";
import { fetchKitchenBoard } from "@/api/staff";
import { staffDishTone } from "@/lib/dish-tone";
import { DayLeaf } from "@/components/admin/day-leaf";
import type { KitchenBoard, KitchenShift } from "@/api/types";

const REFRESH_MS = 30_000;

/** Một dòng món: hình + tên bên trái, số bên phải, gạch chân mảnh.
 *  Hình mang MÀU LOẠI MÓN của trang đặt món (mặn đỏ gạch, canh hổ phách, chay
 *  xanh, thay thế xám) — đó là thông tin, khác hẳn cái chấm tròn xanh y hệt
 *  nhau trước đây, chấm nào cũng như chấm nào thì nó chẳng nói lên điều gì. */
function DishRow({ name, done, total, showDone }: { name: string; done: number; total: number; showDone: boolean }) {
  const full = showDone && done >= total && total > 0;
  const look = staffDishTone(name);
  const Glyph = I[look.icon];
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 11, padding: "10px 0", borderBottom: "1px solid var(--fd-wd-line)" }}>
      <span aria-hidden style={{ flex: "0 0 auto", width: 20, color: look.ink, transform: "translateY(3px)" }}>
        <Glyph size={17} sw={2.2} />
      </span>
      <div style={{ flex: 1, minWidth: 0, fontSize: 14, lineHeight: 1.35, color: "var(--fg-1)" }}>{name}</div>
      <div
        className="tnum"
        style={{
          flexShrink: 0,
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize: 15.5,
          color: full ? "var(--gold-deep)" : "var(--fg-1)",
          ...(full ? { background: "color-mix(in srgb, var(--gold) 14%, var(--bg-surface))", border: "1px solid color-mix(in srgb, var(--gold) 42%, transparent)", borderRadius: 999, padding: "2px 10px" } : null),
        }}
      >
        {showDone ? (
          <>
            {done}
            <span style={{ fontWeight: 600, color: full ? "color-mix(in srgb, var(--gold-deep) 60%, transparent)" : "var(--fg-4)" }}>/{total}</span>
          </>
        ) : (
          total
        )}
      </div>
    </div>
  );
}

/**
 * Ca CHÍNH — khối đặc duy nhất của màn.
 * `live` = đang trong khung phát: nền xanh đặc, số lớn là suất chưa nhận.
 * Ngược lại (ca sắp tới): nền nhạt, số lớn là suất cần nấu.
 */
function LeadShift({ s, live }: { s: KitchenShift; live: boolean }) {
  const left = Math.max(0, s.registered - s.picked_up);
  const pct = s.registered ? Math.min(100, Math.round((s.picked_up / s.registered) * 100)) : 0;
  const ink = live ? "var(--fd-wd-on-solid)" : "var(--fg-1)";
  const dim = live ? "rgba(255,255,255,0.75)" : "var(--fg-3)";
  return (
    <div
      className="ge-dots"
      style={{
        ["--ge-dot-ink" as string]: live ? "#ffffff" : "var(--fd-wd-ink)",
        ["--ge-dot-alpha" as string]: live ? "20%" : "34%",
        borderRadius: 20,
        padding: "16px 18px 18px",
        background: live ? "var(--fd-wd-solid)" : "var(--fd-wd-slot)",
        border: live ? "none" : "1px solid var(--fd-wd-line-strong)",
        boxShadow: live ? "0 16px 32px -22px rgba(20, 114, 76, 0.95)" : "none",
        color: ink,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16.5, letterSpacing: "-0.01em" }}>{s.meal_time_name}</span>
        <span className="tnum" style={{ fontSize: 13, fontWeight: 600, color: dim }}>{s.serve_window}</span>
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 9, marginTop: 12 }}>
        <span className="tnum" style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 46, lineHeight: 1, letterSpacing: "-0.03em" }}>
          {live ? left : s.registered}
        </span>
        <span style={{ fontSize: 14, fontWeight: 600, color: dim }}>{live ? "suất chưa nhận" : "suất cần nấu"}</span>
      </div>

      {live && (
        <>
          <div style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,0.24)", overflow: "hidden", marginTop: 14 }}>
            <div style={{ width: `${pct}%`, height: "100%", background: "#fff", transition: "width .3s" }} />
          </div>
          <div className="tnum" style={{ fontSize: 12.5, fontWeight: 600, color: dim, marginTop: 7 }}>
            đã phát {s.picked_up} trên {s.registered}
          </div>
        </>
      )}
    </div>
  );
}

/** Ca còn lại — chỉ nét và mực: không thẻ, không bóng, không thanh tiến độ 0%. */
function QuietShift({ s }: { s: KitchenShift }) {
  const showDone = s.picked_up > 0;
  return (
    <div
      className="ge-dots"
      style={{
        ["--ge-dot-ink" as string]: "var(--fd-wd-ink)",
        ["--ge-dot-alpha" as string]: "15%",
        marginTop: 14,
        borderRadius: 20,
        padding: "14px 15px 12px",
        background: "var(--fd-wd-card)",
        border: "1px solid var(--border-subtle)",
        boxShadow: "var(--ge-shadow-card)",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, paddingBottom: 8, borderBottom: "1.5px solid var(--fg-1)" }}>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15.5, color: "var(--fg-1)" }}>{s.meal_time_name}</span>
        <span className="tnum" style={{ fontSize: 12.5, color: "var(--fg-3)" }}>{s.serve_window}</span>
        <span className="tnum" style={{ marginLeft: "auto", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15.5 }}>
          {showDone ? `${s.picked_up}/${s.registered}` : `${s.registered} suất`}
        </span>
      </div>
      {s.dishes.length === 0 ? (
        <div style={{ fontSize: 13.5, color: "var(--fg-3)", paddingTop: 10 }}>Chưa có ai đăng ký ca này.</div>
      ) : (
        s.dishes.map((d) => <DishRow key={d.name} name={d.name} done={d.picked_up} total={d.registered} showDone={showDone} />)
      )}
    </div>
  );
}

function KitchenScreen() {
  const navigate = useNavigate();
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

  const shifts = board?.shifts ?? [];
  // Ca được tô đậm: ca đang mở quầy; ngoài giờ thì ca gần nhất chưa phát suất
  // nào (bếp còn phải nấu). Hết cả ngày thì không tô ca nào — cả màn im lặng
  // đúng với việc không còn gì phải làm.
  const openIdx = shifts.findIndex((s) => s.window_open);
  const leadIdx = openIdx >= 0 ? openIdx : shifts.findIndex((s) => s.picked_up === 0 && s.registered > 0);
  const lead = leadIdx >= 0 ? shifts[leadIdx] : null;
  const live = openIdx >= 0;

  return (
    <div style={{ height: "100%", background: "var(--bg-page)", display: "flex", flexDirection: "column" }}>
      <ScreenHeader
        title="Bếp hôm nay"
        subtitle={board ? `${shifts.length} ca phát trong ngày` : "Đang tải…"}
        onBack={() => navigate("/profile")}
        right={
          <button
            onClick={reload}
            style={{ width: 38, height: 38, borderRadius: 11, border: "1px solid var(--border-subtle)", background: "var(--bg-surface)", color: refreshing ? "var(--teal-600)" : "var(--fg-1)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            <I.refresh size={19} />
          </button>
        }
      />
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px calc(var(--safe-bottom) + 24px)" }} className="no-scrollbar">
        {error && <div style={{ ...cardS, color: "var(--danger-700)", fontSize: 13.5, marginBottom: 14 }}>{error}</div>}

        {board && (
          <div style={{ marginBottom: 14 }}>
            <DayLeaf date={board.date} sub={live ? "Đang trong giờ phát" : "Ngoài giờ phát"} />
          </div>
        )}

        {lead && (
          <>
            <LeadShift s={lead} live={live} />
            <div style={{ marginTop: -14, padding: "24px 15px 10px", borderRadius: "0 0 20px 20px", background: "var(--fd-wd-card)", border: "1px solid var(--fd-wd-line-strong)", borderTop: "none" }}>
              {lead.dishes.map((d) => (
                <DishRow key={d.name} name={d.name} done={d.picked_up} total={d.registered} showDone={live} />
              ))}
            </div>
          </>
        )}

        {shifts.map((s, i) => (i === leadIdx ? null : <QuietShift key={s.meal_time_id} s={s} />))}

        {board && shifts.length === 0 && (
          <div style={{ fontSize: 14, color: "var(--fg-3)", paddingTop: 8 }}>Hôm nay không có ca phát cơm nào.</div>
        )}

        {board && (
          <div className="tnum" style={{ display: "flex", justifyContent: "space-between", marginTop: 28, paddingTop: 12, borderTop: "1.5px solid var(--fg-1)", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15 }}>
            <span>Cả ngày</span>
            <span>
              {board.total_picked_up}
              <span style={{ fontWeight: 600, color: "var(--fg-4)" }}>/{board.total_registered}</span>
            </span>
          </div>
        )}
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
