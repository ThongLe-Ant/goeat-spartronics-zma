// GoEat — Bottom Navigation: Ultra-Crisp Floating Island Dock
// Thiết kế nâng cấp siêu nét (High Clarity) & ấn tượng:
// - Dock nổi kính pha lê với viền emerald sắc cạnh và bóng đổ đa tầng sang trọng
// - Nút QR trung tâm: 3D Jewel Squircle vươn nổi (elevated) với viền trắng 3.5px và gradient ngọc lục bảo rực rỡ
// - Các tab: Badge icon chuẩn Material 3 / iOS 18 (sắc nét, không lem màu, bỏ chấm rời rạc)
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
        padding: "8px 14px calc(var(--safe-bottom) + 8px)",
        background: "transparent",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          height: 62,
          borderRadius: 26,
          background: "rgba(255, 255, 255, 0.98)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          border: "1.5px solid rgba(16, 185, 129, 0.22)",
          boxShadow:
            "0 16px 36px -6px rgba(15, 23, 42, 0.12), 0 4px 14px -2px rgba(16, 185, 129, 0.1), inset 0 1px 1px rgba(255, 255, 255, 0.95)",
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
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  position: "relative",
                  WebkitTapHighlightColor: "transparent",
                  transform: isPressed ? "scale(0.92)" : on ? "scale(1.03)" : "scale(1)",
                  transition: "transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
              >
                {/* 3D Elevated Jewel Squircle Button */}
                <div
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 16,
                    marginTop: -20,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: on
                      ? "linear-gradient(135deg, #059669 0%, #047857 50%, #064e3b 100%)"
                      : "linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)",
                    color: "#ffffff",
                    border: "3.5px solid #ffffff",
                    boxShadow: on
                      ? "0 10px 24px -2px rgba(4, 120, 87, 0.55), 0 4px 10px rgba(0, 0, 0, 0.12), inset 0 1.5px 1.5px rgba(255, 255, 255, 0.6)"
                      : "0 10px 24px -2px rgba(16, 185, 129, 0.45), 0 4px 10px rgba(0, 0, 0, 0.08), inset 0 1.5px 1.5px rgba(255, 255, 255, 0.6)",
                    transition: "all 200ms ease",
                  }}
                >
                  <Ico size={24} sw={2.2} />
                </div>
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: on ? 800 : 700,
                    lineHeight: 1,
                    letterSpacing: "-0.01em",
                    marginTop: 3,
                    color: on ? "#047857" : "#334155",
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
                height: 54,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "2px 0",
                position: "relative",
                WebkitTapHighlightColor: "transparent",
                transform: isPressed ? "scale(0.92)" : "scale(1)",
                transition: "transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1)",
              }}
            >
              {/* Material 3 / iOS 18 Crisp Icon Capsule */}
              <div
                style={{
                  width: 46,
                  height: 26,
                  borderRadius: 13,
                  background: on ? "rgba(16, 185, 129, 0.16)" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: on ? "#047857" : "#64748b",
                  transition: "all 200ms cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              >
                <Ico size={20} sw={on ? 2.35 : 1.85} />
              </div>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: on ? 800 : 600,
                  lineHeight: 1,
                  letterSpacing: "-0.01em",
                  whiteSpace: "nowrap",
                  color: on ? "#047857" : "#64748b",
                  transition: "color 180ms ease",
                }}
              >
                {t.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
