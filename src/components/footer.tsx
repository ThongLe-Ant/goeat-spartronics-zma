// GoEat — bottom navigation. Switches between Employee (5 tabs, center QR) and
// Staff/quầy-bếp (3 tabs) based on the active route's handle.nav.
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

  if (!handle.nav) return null;
  const tabs = handle.nav === "admin" ? ADMIN_TABS : EMP_TABS;
  const isActive = (path: string) => (path === "/" || path === "/admin" ? pathname === path : pathname === path);

  return (
    <div
      style={{
        flexShrink: 0,
        display: "flex",
        background: "var(--bg-surface)",
        borderTop: "1px solid var(--ge-sage-line)",
        borderRadius: "18px 18px 0 0",
        padding: "8px 6px calc(var(--safe-bottom) + 8px)",
        zIndex: 50,
        boxShadow: "var(--ge-shadow-nav)",
      }}
    >
      {tabs.map((t) => {
        const Ico = I[t.icon];
        const on = isActive(t.path);
        if (t.center) {
          return (
            <button
              key={t.id}
              onClick={() => navigate(t.path)}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 5,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                position: "relative",
              }}
            >
              <span
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 999,
                  marginTop: -26,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "linear-gradient(160deg, var(--teal-400), var(--teal-600))",
                  color: "#fff",
                  border: "4px solid var(--bg-surface)",
                  boxShadow: "0 8px 20px rgba(20,114,76,0.35)",
                  transform: on ? "scale(1.04)" : "none",
                  transition: "transform 180ms var(--ease-spring)",
                }}
              >
                <Ico size={24} />
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: on ? 700 : 600,
                  color: on ? "var(--fd-wd-solid)" : "var(--fg-3)",
                  marginTop: -2,
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
            onClick={() => navigate(t.path)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px 0",
              position: "relative",
              color: on ? "var(--fd-wd-solid)" : "var(--fg-3)",
            }}
          >
            <span style={{ position: "relative" }}>
              <Ico size={23} />
            </span>
            <span style={{ fontSize: 11, fontWeight: on ? 700 : 500 }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
