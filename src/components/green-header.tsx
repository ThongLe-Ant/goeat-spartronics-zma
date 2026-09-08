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
          viewBox="0 0 390 54"
          preserveAspectRatio="none"
          aria-hidden
          style={{
            display: "block",
            position: "absolute",
            left: 0,
            right: 0,
            bottom: -1,
            width: "100%",
            height: 54,
            pointerEvents: "none",
            zIndex: 1,
          }}
        >
          {/* Lớp sóng mờ tạo hiệu ứng khúc xạ chiều sâu sang trọng */}
          <path
            d="M 0 8 C 75 38, 155 46, 235 22 C 295 6, 350 10, 390 32 L 390 54 L 0 54 Z"
            fill="rgba(255, 255, 255, 0.09)"
          />
          {/* Lớp sóng chính uốn lượn uyển chuyển hoà vào nền trang */}
          <path
            d="M 0 16 C 70 46, 150 54, 230 30 C 290 12, 345 16, 390 40 L 390 54 L 0 54 Z"
            fill={waveFill}
          />
        </svg>
      )}
    </div>
  );
}
