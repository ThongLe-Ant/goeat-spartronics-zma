// GoEat ZMA — cấu hình API theo tenant.
// `VITE_API_MODE=live` ➝ gọi BFF `${VITE_API_BASE_URL}/api/zma/*`.
// Mặc định `mock` vì backend spartronics đang chạy bản cũ (PLAN.md §7.0).
export const API_BASE: string = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";
export const API_MODE: "mock" | "live" = (import.meta.env.VITE_API_MODE as string | undefined) === "live" ? "live" : "mock";
export const TENANT: string = (import.meta.env.VITE_TENANT as string | undefined) ?? "spartronics";

const TOKEN_KEY = "goeat.zma.token";
export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
/** Dọn mọi dữ liệu cục bộ của app (token, client_id quầy, kho đơn mock) khi đăng xuất. */
export function clearLocalData() {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith("goeat.")) localStorage.removeItem(k);
  } catch {
    /* private mode */
  }
}
export function setToken(t: string | null) {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private mode */
  }
}
