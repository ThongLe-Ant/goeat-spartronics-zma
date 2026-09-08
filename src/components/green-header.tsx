// GoEat ZMA — dải header xanh thương hiệu, port đúng EmpHome của bản mẫu
// docs/GoEat-zma.html: nền radial-gradient xanh rừng + gợn sóng SVG ở đáy
// hoà vào nền trang. Dùng cho Hôm nay / Mã QR / Cá nhân (KHÔNG dùng cho
// trang Đăng ký — trang đó giữ nền trắng như bản web spartronics).
import type { CSSProperties, ReactNode } from "react";

/** Viên thông tin nền kính mờ trên header xanh. */
export const glassTag: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  padding: "5px 10px",
  borderRadius: 999,
  background: "var(--ge-glass)",
  border: "1px solid var(--ge-glass-line)",
  color: "#fff",
  fontSize: 12,
  fontWeight: 600,
  whiteSpace: "nowrap",
};

export function GreenHeader({
  children,
  waveFill = "var(--ge-sage)",
  deep = false,
  wave = true,
  pad = 14,
}: {
  children: ReactNode;
  /** Màu nền trang bên dưới — gợn sóng phải cùng màu mới liền mạch. */
  waveFill?: string;
  /** Nền xanh sẫm hơn (màn Mã QR phủ kín). */
  deep?: boolean;
  wave?: boolean;
  pad?: number;
}) {
  return (
    <div style={{ position: "relative", flexShrink: 0, background: deep ? "var(--ge-header-deep)" : "var(--ge-header)", color: "#fff" }}>
      {/* Chừa chỗ bên phải cho capsule của Zalo (nút … / thoát) và đệm đủ sâu để nội dung ở TRÊN đường lượn sóng. */}
      <div style={{ padding: `calc(max(var(--safe-top, 0px), 38px) + 8px) 16px ${wave ? pad + 28 : pad}px` }}>{children}</div>
      {wave && (
        <svg viewBox="0 0 390 28" preserveAspectRatio="none" aria-hidden style={{ display: "block", position: "absolute", left: 0, right: 0, bottom: -1, width: "100%", height: 28, pointerEvents: "none" }}>
          <path d="M0 22 C 140 28, 260 4, 390 8 L390 28 L0 28 Z" fill={waveFill} />
        </svg>
      )}
    </div>
  );
}
