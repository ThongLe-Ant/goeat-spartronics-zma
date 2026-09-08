// GoEat ZMA — Thông tin cá nhân (chỉ xem: hồ sơ do HR nhà máy quản lý,
// liên kết Zalo là thứ duy nhất NV tự làm).
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { AppImg, Btn, Field, ScreenHeader } from "@/components/ui";
import { I } from "@/components/icons";
import { useBootstrap } from "@/state/ordering";

export default function EditProfilePage() {
  const navigate = useNavigate();
  const emp = useBootstrap()?.employee;
  const noop = () => {};

  return (
    <div style={{ height: "100%", background: "var(--bg-page)", display: "flex", flexDirection: "column" }}>
      <ScreenHeader title="Thông tin cá nhân" onBack={() => navigate(-1)} />
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 18px" }} className="no-scrollbar">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 22 }}>
          <AppImg src={emp?.avatar_url ?? ""} radius={999} style={{ width: 84, height: 84 }} />
        </div>
        <Field label="Họ và tên" value={emp?.full_name ?? ""} onChange={noop} icon={<I.user size={18} />} />
        <Field label="Mã nhân viên" value={emp?.employee_code ?? ""} onChange={noop} hint="Mã do nhà máy cấp, không chỉnh sửa trong app" />
        <Field label="Bộ phận / Phân xưởng" value={emp?.department ?? ""} onChange={noop} icon={<I.store size={18} />} />
        <Field label="Chức danh" value={emp?.position ?? ""} onChange={noop} />
        <Field label="Mã thẻ nhận cơm" value={emp?.card_number ?? ""} onChange={noop} icon={<I.ticket size={18} />} />
        <Field label="Số Zalo liên kết" value={emp?.zalo_phone ?? "Chưa liên kết"} onChange={noop} icon={<I.phone size={18} />} />
        <div style={{ fontSize: 12.5, color: "var(--fg-4)", lineHeight: 1.5, marginTop: 4 }}>
          Sai thông tin? Báo HR để cập nhật trên hệ thống nhà máy — app sẽ tự đồng bộ.
        </div>
      </div>
      <div style={{ padding: "14px 18px 22px", borderTop: "1px solid var(--border-subtle)", background: "var(--bg-surface)" }}>
        <Btn full size="lg" variant="soft" icon={<I.phone size={18} />} onClick={() => toast("Liên kết lại số Zalo — cần BFF /api/zma/auth")}>
          Liên kết lại số Zalo
        </Btn>
      </div>
    </div>
  );
}
