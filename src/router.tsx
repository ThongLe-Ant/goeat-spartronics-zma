import { Navigate, createBrowserRouter } from "react-router-dom";
import Layout from "@/components/layout";

import HomePage from "@/pages/home";
import WeeklyPage from "@/pages/weekly";
import QrTabPage from "@/pages/qr-tab";
import QrScreenPage from "@/pages/qr-screen";
import OrdersPage from "@/pages/orders";
import ProfilePage from "@/pages/profile";
import EditProfilePage from "@/pages/profile/edit";

import ScanPage from "@/pages/admin/scan";
import KitchenPage from "@/pages/admin/kitchen";
import ManualPage from "@/pages/admin/manual";
import TempCardPage from "@/pages/admin/temp-card";
import ProxyPage from "@/pages/admin/proxy";
import RegistrationsPage from "@/pages/admin/registrations";
import ReportPage from "@/pages/admin/report";

import NotFound from "@/pages/404";

const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <Layout />,
      children: [
        // ── Employee ──────────────────────────────
        { path: "/", element: <HomePage />, handle: { nav: "emp" } },
        { path: "/weekly", element: <WeeklyPage />, handle: { nav: "emp" } },
        { path: "/qr", element: <QrTabPage />, handle: { nav: "emp" } },
        { path: "/qr/:day/:shift", element: <QrScreenPage />, handle: { back: true } },
        { path: "/orders", element: <OrdersPage />, handle: { nav: "emp" } },
        { path: "/profile", element: <ProfilePage />, handle: { nav: "emp" } },
        { path: "/profile/edit", element: <EditProfilePage />, handle: { back: true } },

        // ── Việc theo quyền (quầy / bếp / nhân sự) ──
        // KHÔNG phải một "chế độ" riêng: đây là màn con mở ra từ dòng menu ở
        // trang Cá nhân (`src/lib/staff-menu.ts`), nên `back: true` — không dock
        // thứ hai, không Trung tâm, không phải vào/ra chế độ nào cả.
        { path: "/admin", element: <Navigate to="/profile" replace /> },
        { path: "/admin/scan", element: <ScanPage />, handle: { back: true } },
        { path: "/admin/kitchen", element: <KitchenPage />, handle: { back: true } },
        { path: "/admin/manual", element: <ManualPage />, handle: { back: true } },
        { path: "/admin/temp-card", element: <TempCardPage />, handle: { back: true } },
        { path: "/admin/proxy", element: <ProxyPage />, handle: { back: true } },
        { path: "/admin/registrations", element: <RegistrationsPage />, handle: { back: true } },
        { path: "/admin/report", element: <ReportPage />, handle: { back: true } },

        { path: "*", element: <NotFound /> },
      ],
    },
  ],
  { basename: getBasePath() }
);

export function getBasePath() {
  const urlParams = new URLSearchParams(window.location.search);
  const appEnv = urlParams.get("env");

  if (
    import.meta.env.PROD ||
    appEnv === "TESTING_LOCAL" ||
    appEnv === "TESTING" ||
    appEnv === "DEVELOPMENT"
  ) {
    return `/zapps/${window.APP_ID}`;
  }

  return window.BASE_PATH || "";
}

export default router;
