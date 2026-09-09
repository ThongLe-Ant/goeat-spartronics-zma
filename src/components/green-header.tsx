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
  tall = false,
}: {
  children: ReactNode;
  /** Màu nền trang bên dưới — gợn sóng phải cùng màu mới liền mạch. */
  waveFill?: string;
  /** Nền xanh sẫm hơn (màn Mã QR phủ kín). */
  deep?: boolean;
  wave?: boolean;
  pad?: number;
  /** Kéo dải nền và sóng xuống sâu hơn đáng kể (cho Trang chủ). */
  tall?: boolean;
}) {
  const waveH = tall ? 136 : 90;
  const bottomPad = wave ? pad + (tall ? 130 : 76) : pad;

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
          width: tall ? 250 : 200,
          height: tall ? 250 : 200,
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

      {/* Lớp ánh sáng chéo từ dưới lên trên (Bottom-to-Top Diagonal Sheen) tạo chiều sâu quang học */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(42deg, rgba(0, 0, 0, 0.25) 0%, transparent 42%, rgba(255, 255, 255, 0.10) 78%, rgba(226, 186, 93, 0.15) 100%)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* Chừa chỗ bên phải cho capsule của Zalo (nút … / thoát) và đệm chừa độ lượn sóng chìm sâu dưới nội dung */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          padding: `calc(max(var(--safe-top, 0px), 38px) + 8px) 16px ${bottomPad}px`,
        }}
      >
        {children}
      </div>

      {wave && (
        <svg
          viewBox={`0 0 390 ${waveH}`}
          preserveAspectRatio="none"
          aria-hidden
          style={{
            display: "block",
            position: "absolute",
            left: 0,
            right: 0,
            bottom: -1,
            width: "100%",
            height: waveH,
            pointerEvents: "none",
            zIndex: 1,
          }}
        >
          {/* Lớp viền phản chiếu khúc xạ ánh sáng theo đường chữ S sâu */}
          <path
            d={
              tall
                ? "M 0 91 C 65 122, 130 122, 195 58 C 260 0, 325 0, 390 12 L 390 136 L 0 136 Z"
                : "M 0 60 C 65 80, 130 80, 195 38 C 260 2, 325 2, 390 8 L 390 90 L 0 90 Z"
            }
            fill="rgba(255, 255, 255, 0.09)"
          />
          {/* Đường lượn chữ S sâu, võng mạnh từ trái qua phải vút cao lên trên */}
          <path
            d={
              tall
                ? "M 0 105 C 65 136, 130 136, 195 72 C 260 8, 325 8, 390 22 L 390 136 L 0 136 Z"
                : "M 0 70 C 65 90, 130 90, 195 48 C 260 6, 325 6, 390 15 L 390 90 L 0 90 Z"
            }
            fill={waveFill}
          />
        </svg>
      )}
    </div>
  );
}
