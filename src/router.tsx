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

        // ── Quầy phát / bếp (nhân sự có quyền pickup:*) ──
        { path: "/admin", element: <Navigate to="/admin/scan" replace /> },
        { path: "/admin/scan", element: <ScanPage />, handle: { nav: "admin" } },
        { path: "/admin/kitchen", element: <KitchenPage />, handle: { nav: "admin" } },

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
