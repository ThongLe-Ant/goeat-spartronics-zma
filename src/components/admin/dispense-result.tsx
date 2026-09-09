// GoEat ZMA — kết quả một lượt phát suất, dùng chung cho /admin/scan và
// /admin/manual.
//
// Hai màn này trước đây mỗi màn tự vẽ một thẻ kết quả giống hệt nhau, nên cùng
// một việc lại ra hai cách nhìn. Ở đây gom về một chỗ và tách làm hai mức:
//
//  • LƯỢT VỪA RỒI  — người đứng quầy phải liếc một cái là biết cho qua hay giữ
//    người lại, nên nó là dải màu có tên và món.
//  • LƯỢT TRƯỚC ĐÓ — chỉ để lần lại khi có tranh cãi, nên nó là dòng sổ: giờ,
//    tên, kết quả. Xếp chồng chục cái thẻ màu chỉ làm màn hình ồn mà không ai
//    đọc.
import { I } from "@/components/icons";

export type ResultTone = "ok" | "warn" | "bad";

export interface ResultView {
  tone: ResultTone;
  /** Chuyện gì đã xảy ra, viết như người nói: "Đã phát", "Đã nhận rồi". */
  title: string;
  at: string;
  name?: string | null;
  code?: string | null;
  dept?: string | null;
  shift?: string | null;
  dish?: string | null;
  /** Dòng cuối: lý do phát ngoại lệ, hoặc câu giải thích vì sao không phát được. */
  detail?: string | null;
}

const TONE: Record<ResultTone, { bg: string; bd: string; fg: string }> = {
  ok: { bg: "var(--success-50)", bd: "var(--success-500)", fg: "var(--success-700)" },
  warn: { bg: "var(--warning-50)", bd: "var(--warning-500)", fg: "var(--warning-700)" },
  bad: { bg: "var(--danger-50)", bd: "var(--danger-500)", fg: "var(--danger-700)" },
};

export function LatestResult({ v }: { v: ResultView }) {
  const t = TONE[v.tone];
  return (
    <div style={{ borderRadius: 16, background: t.bg, border: `1px solid ${t.bd}`, padding: 15 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <span style={{ width: 40, height: 40, borderRadius: 12, background: t.bd, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{v.tone === "ok" ? <I.checkCircle size={24} /> : <I.x size={22} />}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 17.5, letterSpacing: "-0.01em", color: t.fg }}>{v.title}</div>
          {v.shift && <div style={{ fontSize: 12.5, color: "var(--fg-3)" }}>{v.shift}</div>}
        </div>
        <span className="tnum" style={{ fontSize: 12.5, color: "var(--fg-3)", flexShrink: 0 }}>{v.at}</span>
      </div>

      <div style={{ marginTop: 11, display: "flex", flexDirection: "column", gap: 3 }}>
        {/* Lượt bị từ chối có thể không tra ra được ai — khi đó bỏ hẳn dòng tên
            thay vì in một gạch ngang, vì gạch ngang chỉ làm người đọc dừng lại. */}
        {(v.name || v.code) && (
          <div style={{ fontWeight: 700, fontSize: 16 }}>
            {v.name}
            {v.code && (
              <span className="tnum" style={{ color: "var(--fg-3)", fontWeight: 500, fontSize: 12.5, marginLeft: v.name ? 7 : 0 }}>
                {v.code}
              </span>
            )}
          </div>
        )}
        {v.dept && <div style={{ fontSize: 12.5, color: "var(--fg-3)" }}>{v.dept}</div>}
        {v.dish && (
          <div style={{ fontSize: 14.5, marginTop: 2 }}>
            <span style={{ color: "var(--fg-3)" }}>Món: </span>
            <b>{v.dish}</b>
          </div>
        )}
        {v.detail && <div style={{ fontSize: 13, color: t.fg, marginTop: 3, lineHeight: 1.45 }}>{v.detail}</div>}
      </div>
    </div>
  );
}

export function ResultLog({ items }: { items: (ResultView & { id: number })[] }) {
  return (
    <div>
      {items.map((v) => (
        <div key={v.id} style={{ display: "flex", alignItems: "baseline", gap: 11, padding: "11px 0", borderBottom: "1px solid var(--fd-wd-line)" }}>
          <span className="tnum" style={{ fontSize: 12.5, color: "var(--fg-3)", flexShrink: 0 }}>{v.at}</span>
          <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.name ?? v.code ?? ""}</span>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: TONE[v.tone].fg, flexShrink: 0 }}>{v.title}</span>
        </div>
      ))}
    </div>
  );
}
