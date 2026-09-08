// GoEat ZMA — khối tải / lỗi dùng chung cho các trang đọc dữ liệu server.
import { Btn } from "@/components/ui";
import { I } from "@/components/icons";

export function LoadingBlock({ rows = 3 }: { rows?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ height: 132, borderRadius: 20, background: "linear-gradient(90deg, var(--bg-soft) 25%, var(--bg-muted) 50%, var(--bg-soft) 75%)", backgroundSize: "200% 100%", animation: "ge-shimmer 1.4s infinite" }} />
      ))}
    </div>
  );
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--fg-3)" }}>
      <I.info size={28} style={{ color: "var(--danger-500)" }} />
      <div style={{ marginTop: 10, fontSize: 14, color: "var(--fg-2)" }}>{message}</div>
      <div style={{ marginTop: 16 }}>
        <Btn variant="soft" size="sm" icon={<I.refresh size={16} />} onClick={onRetry}>
          Thử lại
        </Btn>
      </div>
    </div>
  );
}
