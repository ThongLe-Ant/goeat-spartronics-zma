// GoEat ZMA — đăng nhập bằng Zalo.
// Luồng: zmp-sdk getAccessToken + getPhoneNumber().token ➝ POST /api/zma/auth/login
// ➝ BFF đổi token lấy SĐT qua Zalo Graph, khớp hồ sơ NV ➝ bearer token 30 ngày.
// Lần đầu (SĐT chưa có trong HR) BFF trả 404 NEED_LINK ➝ NV nhập mã NV để liên kết.
import { getAccessToken, getPhoneNumber } from "zmp-sdk/apis";
import { ApiError, api } from "./client";
import { API_MODE, setToken } from "./config";
import type { AuthErrorCode, LoginResult } from "./types";

/** Mã NV để đăng nhập thẳng khi thử live ngoài Zalo (BFF phải bật ZMA_DEV_LOGIN=1). */
export const DEV_EMPLOYEE_CODE: string = (import.meta.env.VITE_DEV_EMPLOYEE_CODE as string | undefined)?.trim() ?? "";

export const isLive = API_MODE === "live";

export function authErrorCode(e: unknown): AuthErrorCode | null {
  if (e instanceof ApiError) {
    const code = (e.body as { code?: string } | null)?.code;
    return (code as AuthErrorCode | undefined) ?? (e.status === 401 ? "UNAUTHORIZED" : null);
  }
  return null;
}

async function zaloCredentials(): Promise<{ access_token: string; phone_token: string }> {
  const access_token = await getAccessToken();
  const { token } = await getPhoneNumber();
  if (!token) throw new Error("Bạn cần cho phép chia sẻ số điện thoại Zalo để đăng nhập.");
  return { access_token, phone_token: token };
}

async function finish(r: LoginResult): Promise<LoginResult> {
  setToken(r.token);
  return r;
}

export async function loginWithZalo(): Promise<LoginResult> {
  if (DEV_EMPLOYEE_CODE) return finish(await api<LoginResult>("/api/zma/auth/dev-login", { body: { employee_code: DEV_EMPLOYEE_CODE } }));
  const creds = await zaloCredentials();
  return finish(await api<LoginResult>("/api/zma/auth/login", { body: creds }));
}

/** Liên kết Zalo với hồ sơ NV theo mã NV (chỉ khi hồ sơ chưa có SĐT hoặc SĐT trùng). */
export async function linkEmployee(employeeCode: string): Promise<LoginResult> {
  const creds = await zaloCredentials();
  return finish(await api<LoginResult>("/api/zma/auth/link", { body: { ...creds, employee_code: employeeCode.trim().toUpperCase() } }));
}

export function logout() {
  setToken(null);
}
