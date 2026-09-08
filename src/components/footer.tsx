// GoEat — Bottom Navigation: Scooped Notched Dock (U-Notch Cradle)
// Thiết kế lấy cảm hứng chuẩn 100% từ mẫu Dribbble reference:
// - Đảo nổi màu trắng bo góc lớn (radius 24px) với đường lõm U-notch mềm mại ở giữa (Cradle socket)
// - Nút QR trung tâm hình tròn nổi bật lọt lòng trong vết khuyết chữ U, viền bóng đổ êm
// - Các tab 2 bên phong cách tối giản thanh lịch: Icon + nhãn gọn + chấm chỉ thị xanh ngọc (Active Dot)
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useRouteHandle } from "@/hooks";
import { I } from "./icons";

interface Tab {
  id: string;
  label: string;
  icon: string;
  path: string;
  center?: boolean;
}

const EMP_TABS: Tab[] = [
  { id: "home", label: "Hôm nay", icon: "home", path: "/" },
  { id: "weekly", label: "Đăng ký", icon: "calendar", path: "/weekly" },
  { id: "qr", label: "Mã QR", icon: "qr", path: "/qr", center: true },
  { id: "orders", label: "Suất ăn", icon: "receipt", path: "/orders" },
  { id: "profile", label: "Cá nhân", icon: "user", path: "/profile" },
];

const ADMIN_TABS: Tab[] = [
  { id: "s-scan", label: "Quét thẻ", icon: "scan", path: "/admin/scan" },
  { id: "s-kitchen", label: "Bếp", icon: "bowl", path: "/admin/kitchen" },
  { id: "s-profile", label: "Cá nhân", icon: "user", path: "/profile" },
];

/** Tạo đường path SVG cho thanh dock có vết khuyết chữ U uốn cong mượt mà ở giữa */
function getNotchedDockPath(w: number, h = 62, r = 24) {
  const cx = w / 2;
  const scoopR = 33; // Bán kính vết lõm U
  const fillet = 14; // Bán kính góc uốn mềm từ mép ngang vào vết lõm
  const xLeft = cx - scoopR - fillet;
  const xRight = cx + scoopR + fillet;
  const depth = 28; // Độ sâu vết lõm

  return [
    `M ${r} 0`,
    `L ${xLeft} 0`,
    // Uốn mềm vào vết lõm
    `C ${xLeft + 8} 0, ${cx - scoopR} 5, ${cx - scoopR} 13`,
    // Đường cong lòng chữ U
    `C ${cx - scoopR} 23, ${cx - 16} ${depth}, ${cx} ${depth}`,
    `C ${cx + 16} ${depth}, ${cx + scoopR} 23, ${cx + scoopR} 13`,
    // Uốn mềm thoát ra khỏi vết lõm
    `C ${cx + scoopR} 5, ${xRight - 8} 0, ${xRight} 0`,
    `L ${w - r} 0`,
    // Góc bo trên phải
    `A ${r} ${r} 0 0 1 ${w} ${r}`,
    `L ${w} ${h - r}`,
    // Góc bo dưới phải
    `A ${r} ${r} 0 0 1 ${w - r} ${h}`,
    `L ${r} ${h}`,
    // Góc bo dưới trái
    `A ${r} ${r} 0 0 1 0 ${h - r}`,
    `L 0 ${r}`,
    // Góc bo trên trái
    `A ${r} ${r} 0 0 1 ${r} 0`,
    `Z`,
  ].join(" ");
}

export default function Footer() {
  const [handle] = useRouteHandle();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [pressedId, setPressedId] = useState<string | null>(null);

  const dockRef = useRef<HTMLDivElement>(null);
  const [dockWidth, setDockWidth] = useState<number>(360);

  useEffect(() => {
    const el = dockRef.current;
    if (!el) return;
    const update = () => {
      const w = Math.round(el.clientWidth);
      if (w > 0) setDockWidth(w);
    };
    update();
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.round(entry.contentRect.width);
        if (w > 0) setDockWidth(w);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (!handle.nav) return null;
  const isAdmin = handle.nav === "admin";
  const tabs = isAdmin ? ADMIN_TABS : EMP_TABS;
  const isActive = (path: string) =>
    path === "/" || path === "/admin"
      ? pathname === path
      : pathname === path || pathname.startsWith(path + "/");

  const isQrActive = pathname === "/qr";

  // Render Admin nav (không có center QR, dock dạng pill tròn chuẩn)
  if (isAdmin) {
    return (
      <nav
        aria-label="Thanh điều hướng quản trị"
        style={{
          flexShrink: 0,
          position: "relative",
          zIndex: 50,
          padding: "6px 16px calc(var(--safe-bottom) + 8px)",
          background: "transparent",
        }}
      >
        <div
          style={{
            height: 60,
            borderRadius: 24,
            background: "#ffffff",
            border: "1.2px solid rgba(214, 232, 222, 0.85)",
            boxShadow: "0 12px 28px rgba(15, 23, 42, 0.1), 0 3px 8px rgba(0, 0, 0, 0.04)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-around",
            padding: "0 8px",
          }}
        >
          {ADMIN_TABS.map((t) => {
            const Ico = I[t.icon];
            const on = isActive(t.path);
            const isPressed = pressedId === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => navigate(t.path)}
                onPointerDown={() => setPressedId(t.id)}
                onPointerUp={() => setPressedId(null)}
                onPointerLeave={() => setPressedId(null)}
                style={{
                  flex: 1,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 2,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px 0",
                  color: on ? "#14724c" : "#94a3b8",
                  transform: isPressed ? "scale(0.92)" : "scale(1)",
                  transition: "all 160ms ease",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <Ico size={22} sw={on ? 2.35 : 1.85} />
                <span style={{ fontSize: 10, fontWeight: on ? 750 : 550, color: on ? "#14724c" : "#94a3b8" }}>
                  {t.label}
                </span>
                <span
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: 999,
                    background: on ? "#14724c" : "transparent",
                    marginTop: 2,
                    transition: "background 160ms ease",
                  }}
                />
              </button>
            );
          })}
        </div>
      </nav>
    );
  }

  // Phân chia tab Nhân viên: 2 tab bên trái, nút QR ở giữa, 2 tab bên phải
  const leftTabs = EMP_TABS.slice(0, 2);
  const rightTabs = EMP_TABS.slice(3, 5);

  return (
    <nav
      aria-label="Thanh điều hướng chính"
      style={{
        flexShrink: 0,
        position: "relative",
        zIndex: 50,
        padding: "6px 16px calc(var(--safe-bottom) + 8px)",
        background: "transparent",
        boxSizing: "border-box",
      }}
    >
      <div
        ref={dockRef}
        style={{
          position: "relative",
          height: 62,
          width: "100%",
        }}
      >
        {/* Nền SVG U-Notch có vết khuyết cong mượt mà theo ảnh mẫu */}
        <svg
          width={dockWidth}
          height={62}
          viewBox={`0 0 ${dockWidth} 62`}
          aria-hidden
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: 62,
            pointerEvents: "none",
            filter: "drop-shadow(0 14px 28px rgba(15, 23, 42, 0.12)) drop-shadow(0 3px 8px rgba(0, 0, 0, 0.04))",
          }}
        >
          {/* Thân dock màu trắng tinh khiết */}
          <path
            d={getNotchedDockPath(dockWidth, 62, 24)}
            fill="#ffffff"
            stroke="rgba(214, 232, 222, 0.85)"
            strokeWidth={1.2}
          />
          {/* Vành bóng đổ nhẹ tạo chiều sâu cho lòng khuyết U-cradle */}
          <path
            d={`M ${dockWidth / 2 - 31} 12 C ${dockWidth / 2 - 31} 22, ${dockWidth / 2 - 16} 27, ${dockWidth / 2} 27 C ${dockWidth / 2 + 16} 27, ${dockWidth / 2 + 31} 22, ${dockWidth / 2 + 31} 12`}
            fill="none"
            stroke="rgba(0, 0, 0, 0.06)"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        </svg>

        {/* Nút QR tròn nổi bật đặt chính giữa vết lõm chữ U */}
        <button
          type="button"
          onClick={() => navigate("/qr")}
          onPointerDown={() => setPressedId("qr")}
          onPointerUp={() => setPressedId(null)}
          onPointerLeave={() => setPressedId(null)}
          aria-label="Mã QR nhận suất ăn"
          style={{
            position: "absolute",
            top: -16,
            left: "50%",
            transform: `translateX(-50%) ${pressedId === "qr" ? "scale(0.92)" : isQrActive ? "scale(1.05)" : "scale(1)"}`,
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: isQrActive
              ? "linear-gradient(145deg, #0e6342 0%, #073a24 100%)"
              : "linear-gradient(145deg, #189865 0%, #116b48 100%)",
            color: "#ffffff",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: isQrActive
              ? "0 8px 22px rgba(14, 99, 66, 0.5)"
              : "0 8px 20px -2px rgba(20, 114, 76, 0.42), 0 3px 8px rgba(0, 0, 0, 0.08)",
            transition: "transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 180ms ease, background 180ms ease",
            zIndex: 10,
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <I.qr size={25} sw={2.2} />
        </button>

        {/* Chấm xanh chỉ thị khi tab QR active — nằm dưới lòng vết khuyết U (chuẩn hàng 3 ảnh mẫu) */}
        {isQrActive && (
          <span
            style={{
              position: "absolute",
              bottom: 4.5,
              left: "50%",
              transform: "translateX(-50%)",
              width: 4,
              height: 4,
              borderRadius: 999,
              background: "#14724c",
              zIndex: 8,
            }}
          />
        )}

        {/* Các tab 2 bên sườn dock */}
        <div
          style={{
            position: "relative",
            zIndex: 5,
            height: "100%",
            display: "flex",
            alignItems: "center",
            padding: "0 4px",
          }}
        >
          {/* Nhóm tab bên trái */}
          <div style={{ flex: 1, height: "100%", display: "flex", alignItems: "center" }}>
            {leftTabs.map((t) => {
              const Ico = I[t.icon];
              const on = isActive(t.path);
              const isPressed = pressedId === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => navigate(t.path)}
                  onPointerDown={() => setPressedId(t.id)}
                  onPointerUp={() => setPressedId(null)}
                  onPointerLeave={() => setPressedId(null)}
                  style={{
                    flex: 1,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 2,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px 0",
                    color: on ? "#14724c" : "#94a3b8",
                    transform: isPressed ? "scale(0.92)" : "scale(1)",
                    transition: "all 160ms ease",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  <Ico size={22} sw={on ? 2.35 : 1.85} />
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: on ? 750 : 550,
                      lineHeight: 1,
                      letterSpacing: "-0.01em",
                      whiteSpace: "nowrap",
                      color: on ? "#14724c" : "#94a3b8",
                    }}
                  >
                    {t.label}
                  </span>
                  <span
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: 999,
                      background: on ? "#14724c" : "transparent",
                      marginTop: 2,
                      transition: "background 160ms ease",
                    }}
                  />
                </button>
              );
            })}
          </div>

          {/* Vùng đệm rỗng ở giữa tương ứng với vết khuyết chữ U (92px) */}
          <div style={{ width: 92, height: "100%", flexShrink: 0, pointerEvents: "none" }} />

          {/* Nhóm tab bên phải */}
          <div style={{ flex: 1, height: "100%", display: "flex", alignItems: "center" }}>
            {rightTabs.map((t) => {
              const Ico = I[t.icon];
              const on = isActive(t.path);
              const isPressed = pressedId === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => navigate(t.path)}
                  onPointerDown={() => setPressedId(t.id)}
                  onPointerUp={() => setPressedId(null)}
                  onPointerLeave={() => setPressedId(null)}
                  style={{
                    flex: 1,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 2,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px 0",
                    color: on ? "#14724c" : "#94a3b8",
                    transform: isPressed ? "scale(0.92)" : "scale(1)",
                    transition: "all 160ms ease",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  <Ico size={22} sw={on ? 2.35 : 1.85} />
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: on ? 750 : 550,
                      lineHeight: 1,
                      letterSpacing: "-0.01em",
                      whiteSpace: "nowrap",
                      color: on ? "#14724c" : "#94a3b8",
                    }}
                  >
                    {t.label}
                  </span>
                  <span
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: 999,
                      background: on ? "#14724c" : "transparent",
                      marginTop: 2,
                      transition: "background 160ms ease",
                    }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
