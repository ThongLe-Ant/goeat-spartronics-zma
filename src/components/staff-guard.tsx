// GoEat ZMA — chặn màn quầy/bếp khi tài khoản không có quyền tương ứng.
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useBootstrap } from "@/state/ordering";
import type { StaffAccess } from "@/api/types";
import { Btn } from "./ui";
import { I } from "./icons";

export default function StaffGuard({ need, children }: { need: keyof StaffAccess; children: ReactNode }) {
  const boot = useBootstrap();
  const navigate = useNavigate();
  if (!boot) return <div style={{ padding: 40, textAlign: "center", color: "var(--fg-3)", fontSize: 14 }}>Đang tải…</div>;
  if (boot.staff?.[need]) return <>{children}</>;
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, textAlign: "center", background: "var(--bg-page)" }}>
      <span style={{ color: "var(--fg-4)" }}>
        <I.lock size={40} />
      </span>
      <div style={{ fontWeight: 700, fontSize: 16, marginTop: 14 }}>Chưa được cấp quyền</div>
      <div style={{ fontSize: 13.5, color: "var(--fg-3)", marginTop: 6, lineHeight: 1.5 }}>
        Tài khoản web gắn với hồ sơ của bạn cần quyền <b>{need === "canScan" ? "Phát suất ăn (pickup:process)" : "Xem nhận suất (pickup:view)"}</b>. Liên hệ quản trị nhà máy.
      </div>
      <Btn variant="soft" style={{ marginTop: 18 }} onClick={() => navigate("/profile")} icon={<I.arrowL size={16} />}>
        Về trang cá nhân
      </Btn>
    </div>
  );
}
