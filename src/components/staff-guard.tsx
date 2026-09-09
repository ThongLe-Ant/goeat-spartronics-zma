// GoEat ZMA — chặn màn quầy/bếp khi tài khoản không có quyền tương ứng.
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useBootstrap } from "@/state/ordering";
import type { StaffAccess } from "@/api/types";
import { Btn } from "./ui";
import { I } from "./icons";

/** Tên quyền như trên màn phân quyền của web — để người bị chặn biết phải xin gì. */
const PERM_LABEL: Record<keyof StaffAccess, string> = {
  canScan: "Phát suất ăn (pickup:process)",
  canKitchen: "Xem nhận suất (pickup:view)",
  canManual: "Phát ngoại lệ (manual-dispense:create)",
  canProxy: "Đặt món hộ (ordering:proxy-order)",
  canRegView: "Xem đăng ký của nhân viên (meal-registrations:view)",
  canRegEdit: "Sửa đăng ký của nhân viên (meal-registrations:update)",
  canReport: "Báo cáo căn-tin (report:view)",
  canTempCard: "Cấp thẻ tạm (temp-card-issue:view)",
};

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
        Tài khoản web gắn với hồ sơ của bạn cần quyền <b>{PERM_LABEL[need]}</b>. Liên hệ quản trị nhà máy.
      </div>
      <Btn variant="soft" style={{ marginTop: 18 }} onClick={() => navigate("/profile")} icon={<I.arrowL size={16} />}>
        Về trang cá nhân
      </Btn>
    </div>
  );
}
