// GoEat ZMA — fetch wrapper cho BFF /api/zma/*.
import { API_BASE, getToken, setToken } from "./config";

/** Phát khi BFF trả 401 — AuthGate nghe để đăng nhập lại bằng Zalo. */
export const UNAUTHORIZED_EVENT = "goeat:unauthorized";

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export async function api<T>(path: string, init: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method: init.method ?? (init.body !== undefined ? "POST" : "GET"),
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    signal: init.signal,
    // Bearer token tự ký, không dùng cookie (WebView Zalo là origin khác).
    credentials: "omit",
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { message: text };
  }
  if (res.status === 401 && getToken()) {
    setToken(null);
    try {
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
    } catch {
      /* SSR / test */
    }
  }
  if (!res.ok) throw new ApiError(res.status, json?.message ?? json?.error ?? `HTTP ${res.status}`, json);
  return json as T;
}
