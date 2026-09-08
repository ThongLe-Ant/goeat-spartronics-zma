// GoEat ZMA — cổng đăng nhập. Mock: cho qua ngay. Live: phải có bearer token,
// không có thì đăng nhập Zalo; BFF báo NEED_LINK thì hỏi mã NV để liên kết.
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { authErrorCode, isLive, linkEmployee, loginWithZalo } from "@/api/auth";
import { UNAUTHORIZED_EVENT } from "@/api/client";
import { getToken } from "@/api/config";
import { Btn, Field } from "./ui";
import { I } from "./icons";

type Phase = "ok" | "login" | "link" | "error";

const LINK_HINT: Partial<Record<string, string>> = {
  EMPLOYEE_NOT_FOUND: "Không tìm thấy mã nhân viên này. Kiểm tra lại mã trên thẻ.",
  PHONE_MISMATCH: "Hồ sơ này đã có số điện thoại khác. Liên hệ HR để cập nhật.",
  ALREADY_LINKED: "Mã nhân viên này đã liên kết với một tài khoản Zalo khác.",
  ZALO_PHONE_UNAVAILABLE: "Không lấy được số điện thoại Zalo. Thử lại và bấm Cho phép.",
  ZALO_TOKEN_INVALID: "Phiên Zalo không hợp lệ. Đóng Mini App và mở lại.",
  DEV_LOGIN_DISABLED: "Máy chủ chưa bật đăng nhập thử (ZMA_DEV_LOGIN).",
};

export default function AuthGate({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>(() => (!isLive || getToken() ? "ok" : "login"));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");

  const login = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await loginWithZalo();
      setPhase("ok");
    } catch (e) {
      const c = authErrorCode(e);
      if (c === "NEED_LINK") setPhase("link");
      else {
        setPhase("error");
        setError(LINK_HINT[c ?? ""] ?? (e as Error)?.message ?? "Không đăng nhập được.");
      }
    } finally {
      setBusy(false);
    }
  }, []);

  const link = useCallback(async () => {
    if (!code.trim()) return setError("Nhập mã nhân viên.");
    setBusy(true);
    setError(null);
    try {
      await linkEmployee(code);
      setPhase("ok");
    } catch (e) {
      const c = authErrorCode(e);
      setError(LINK_HINT[c ?? ""] ?? (e as Error)?.message ?? "Không liên kết được.");
    } finally {
      setBusy(false);
    }
  }, [code]);

  // Tự đăng nhập lần đầu; đăng nhập lại khi BFF trả 401 (token hết hạn / thu hồi).
  useEffect(() => {
    if (phase === "login" && !busy && !error) login();
  }, [phase, busy, error, login]);
  useEffect(() => {
    if (!isLive) return;
    const onUnauthorized = () => {
      setError(null);
      setPhase("login");
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  if (phase === "ok") return <>{children}</>;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--bg-page)", color: "var(--fg-1)", padding: "calc(var(--safe-top) + 48px) 24px 32px" }}>
      <div style={{ width: 64, height: 64, borderRadius: 20, background: "var(--fd-wd-solid)", color: "var(--fd-wd-on-solid)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 24px -12px color-mix(in srgb, var(--fd-wd-solid) 70%, transparent)" }}>
        <I.bowl size={34} />
      </div>
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 28, letterSpacing: "-0.02em", marginTop: 18, color: "var(--fd-wd-deep)" }}>GoEat</div>
      <div style={{ fontSize: 14.5, color: "var(--fg-3)", marginTop: 6, lineHeight: 1.45 }}>Suất ăn nhà máy — đăng ký, nhận cơm bằng thẻ Zalo.</div>

      <div style={{ marginTop: "auto", background: "var(--fd-wd-card)", color: "var(--fg-1)", borderRadius: 22, padding: 18, border: "1px solid var(--fd-wd-line)", boxShadow: "inset 0 0 0 2px var(--fd-wd-solid), 0 14px 32px -18px color-mix(in srgb, var(--fd-wd-solid) 60%, transparent)" }}>
        {phase === "link" ? (
          <>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Liên kết hồ sơ nhân viên</div>
            <div style={{ fontSize: 13.5, color: "var(--fg-3)", marginTop: 4, lineHeight: 1.45 }}>Số Zalo của bạn chưa có trong hồ sơ nhân sự. Nhập mã nhân viên trên thẻ để liên kết lần đầu.</div>
            <div style={{ marginTop: 14 }}>
              <Field label="Mã nhân viên" value={code} onChange={(v) => setCode(v.toUpperCase())} placeholder="VD: SP04821" icon={<I.user size={17} />} error={error} />
            </div>
            <Btn full size="lg" style={{ marginTop: 12 }} disabled={busy} onClick={link} icon={<I.check size={18} />}>
              {busy ? "Đang liên kết…" : "Liên kết & đăng nhập"}
            </Btn>
          </>
        ) : (
          <>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{phase === "error" ? "Chưa đăng nhập được" : "Đang đăng nhập bằng Zalo…"}</div>
            <div style={{ fontSize: 13.5, color: phase === "error" ? "var(--fd-lock)" : "var(--fg-3)", marginTop: 4, lineHeight: 1.45 }}>
              {error ?? "Cho phép chia sẻ số điện thoại để GoEat tìm hồ sơ nhân viên của bạn."}
            </div>
            <Btn full size="lg" style={{ marginTop: 14 }} disabled={busy} onClick={login} icon={<I.phone size={18} />}>
              {busy ? "Đang xử lý…" : "Đăng nhập bằng Zalo"}
            </Btn>
          </>
        )}
      </div>
    </div>
  );
}
