// GoEat — Bottom Navigation: Floating Island Dock (Đảo nổi lơ lửng)
// Thiết kế lấy cảm hứng từ iOS Dynamic Island / Grab Food:
// - Dock nổi lơ lửng cách 2 bên 14px, bo cong 26px, kính mờ frosted glass cao cấp
// - Nút QR trung tâm thiết kế Squircle 3D hiện đại, gradient ngọc lục bảo sâu, viền sáng và bóng đổ glow
// - Các tab xung quanh có hiệu ứng capsule chuyển động mượt mà khi chọn, phản hồi chạm trực quan
import { useState } from "react";
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

export default function Footer() {
  const [handle] = useRouteHandle();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [pressedId, setPressedId] = useState<string | null>(null);

  if (!handle.nav) return null;
  const tabs = handle.nav === "admin" ? ADMIN_TABS : EMP_TABS;
  const isActive = (path: string) =>
    path === "/" || path === "/admin"
      ? pathname === path
      : pathname === path || pathname.startsWith(path + "/");

  return (
    <nav
      aria-label="Thanh điều hướng chính"
      style={{
        flexShrink: 0,
        position: "relative",
        zIndex: 50,
        padding: "4px 14px calc(var(--safe-bottom) + 8px)",
        background: "transparent",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          height: 64,
          borderRadius: 26,
          background: "rgba(255, 255, 255, 0.94)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          border: "1px solid rgba(214, 232, 222, 0.9)",
          boxShadow:
            "0 12px 32px -4px rgba(20, 114, 76, 0.16), 0 3px 12px rgba(0, 0, 0, 0.04), inset 0 1px 1px rgba(255, 255, 255, 0.95)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 6px",
          gap: 2,
        }}
      >
        {tabs.map((t) => {
          const Ico = I[t.icon];
          const on = isActive(t.path);
          const isPressed = pressedId === t.id;

          if (t.center) {
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
                  padding: 0,
                  position: "relative",
                  WebkitTapHighlightColor: "transparent",
                  transform: isPressed ? "scale(0.92)" : on ? "scale(1.02)" : "scale(1)",
                  transition: "transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
              >
                {/* 3D Squircle QR Button */}
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: on
                      ? "linear-gradient(145deg, #116a44 0%, #073a24 100%)"
                      : "linear-gradient(145deg, #189865 0%, #0d593b 100%)",
                    color: "#ffffff",
                    border: on
                      ? "1.5px solid rgba(255, 255, 255, 0.6)"
                      : "1.5px solid rgba(255, 255, 255, 0.35)",
                    boxShadow: on
                      ? "0 4px 14px rgba(13, 89, 59, 0.5), inset 0 1px 1.5px rgba(255, 255, 255, 0.55)"
                      : "0 6px 16px -2px rgba(20, 114, 76, 0.42), 0 2px 6px rgba(0, 0, 0, 0.06), inset 0 1px 1.5px rgba(255, 255, 255, 0.45)",
                    transition: "all 200ms ease",
                  }}
                >
                  <Ico size={22} sw={2.1} />
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    lineHeight: 1,
                    letterSpacing: "-0.01em",
                    color: on ? "var(--fd-wd-solid)" : "var(--fg-3)",
                    transition: "color 180ms ease",
                  }}
                >
                  {t.label}
                </span>
              </button>
            );
          }

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
                height: 52,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
                background: on ? "rgba(20, 114, 76, 0.09)" : "transparent",
                borderRadius: 18,
                border: "none",
                cursor: "pointer",
                padding: "4px 2px",
                position: "relative",
                WebkitTapHighlightColor: "transparent",
                color: on ? "var(--fd-wd-solid)" : "var(--fg-3)",
                transform: isPressed ? "scale(0.93)" : "scale(1)",
                transition: "all 180ms cubic-bezier(0.34, 1.56, 0.64, 1)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: on ? "translateY(-1px)" : "none",
                  transition: "transform 180ms ease",
                }}
              >
                <Ico size={20} sw={on ? 2.3 : 1.85} />
              </div>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: on ? 750 : 550,
                  lineHeight: 1,
                  letterSpacing: "-0.01em",
                  whiteSpace: "nowrap",
                }}
              >
                {t.label}
              </span>
              {on && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 4,
                    width: 4,
                    height: 4,
                    borderRadius: 999,
                    background: "var(--fd-wd-solid)",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
