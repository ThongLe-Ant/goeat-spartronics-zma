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
  pad = 12,
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
    <div
      style={{
        position: "relative",
        flexShrink: 0,
        background: deep ? "var(--ge-header-deep)" : "var(--ge-header)",
        color: "#fff",
        overflow: "hidden",
      }}
    >
      {/* Hoa văn chấm góc trên bên phải chuẩn phong cách thẻ ngày Spartronics (chiều sâu & sang trọng) */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: -15,
          right: -15,
          width: 200,
          height: 200,
          pointerEvents: "none",
          backgroundImage:
            "radial-gradient(circle at center, rgba(255, 255, 255, 0.35) 1.5px, transparent 1.6px)",
          backgroundSize: "12px 12px",
          WebkitMaskImage:
            "radial-gradient(circle at 75% 25%, #000 0%, rgba(0, 0, 0, 0.4) 48%, transparent 72%)",
          maskImage:
            "radial-gradient(circle at 75% 25%, #000 0%, rgba(0, 0, 0, 0.4) 48%, transparent 72%)",
          zIndex: 1,
        }}
      />

      {/* Chừa chỗ bên phải cho capsule của Zalo (nút … / thoát) và đệm chừa độ lượn sóng chìm dưới nội dung */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          padding: `calc(max(var(--safe-top, 0px), 38px) + 8px) 16px ${wave ? pad + 38 : pad}px`,
        }}
      >
        {children}
      </div>

      {wave && (
        <svg
          viewBox="0 0 390 56"
          preserveAspectRatio="none"
          aria-hidden
          style={{
            display: "block",
            position: "absolute",
            left: 0,
            right: 0,
            bottom: -1,
            width: "100%",
            height: 56,
            pointerEvents: "none",
            zIndex: 1,
          }}
        >
          {/* Lớp sóng lụa mờ tạo chiều sâu 3D sang trọng */}
          <path
            d="M 0 16 C 110 16, 160 38, 250 38 C 320 38, 355 24, 390 24 L 390 56 L 0 56 Z"
            fill="rgba(255, 255, 255, 0.08)"
          />
          {/* Lớp sóng chính đơn nhịp mượt mà, tiếp tuyến êm ái hoà vào nền trang */}
          <path
            d="M 0 24 C 110 24, 160 46, 250 46 C 320 46, 355 32, 390 32 L 390 56 L 0 56 Z"
            fill={waveFill}
          />
        </svg>
      )}
    </div>
  );
}
