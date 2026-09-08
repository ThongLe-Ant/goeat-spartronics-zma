// GoEat ZMA — Hồ sơ nhân viên (dữ liệu từ bootstrap của tenant; NV đăng nhập
// bằng Zalo nên không có mật khẩu, hồ sơ do HR quản lý — chỉ xem).
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { AppImg, Btn } from "@/components/ui";
import { GreenHeader } from "@/components/green-header";
import { I } from "@/components/icons";
import { useBootstrap } from "@/state/ordering";
import { API_MODE, TENANT } from "@/api/config";
import { logout } from "@/api/auth";

export default function ProfilePage() {
  const navigate = useNavigate();
  const boot = useBootstrap();
  const emp = boot?.employee;
  const staff = boot?.staff;

  const groups = [
    {
      header: "Tài khoản",
      rows: [
        { icon: "user", label: "Thông tin cá nhân", detail: emp?.employee_code, go: () => navigate("/profile/edit") },
        { icon: "phone", label: "Số Zalo đã liên kết", detail: emp?.zalo_phone ?? "Chưa liên kết", go: () => toast("Liên kết qua số điện thoại Zalo") },
        { icon: "ticket", label: "Thẻ nhận cơm", detail: emp?.card_number ?? emp?.employee_code, go: () => navigate("/qr") },
      ],
    },
    {
      header: "Khác",
      rows: [
        { icon: "bell", label: "Nhắc trước giờ chốt đăng ký", go: () => toast("Cài đặt thông báo") },
        { icon: "info", label: "Trợ giúp & hỗ trợ", go: () => toast("Liên hệ bếp / HR nhà máy") },
      ],
    },
  ];

  return (
    <div style={{ height: "100%", overflowY: "auto", background: "var(--ge-sage)" }} className="no-scrollbar">
      {/* profile header — dải xanh thương hiệu, 3 ô thống kê nền kính mờ */}
      <GreenHeader pad={4}>
        {/* Chừa chỗ bên phải cho capsule của Zalo (nút … / thoát). */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, paddingRight: 96 }}>
          <AppImg src={emp?.avatar_url ?? ""} radius={999} style={{ width: 58, height: 58, flexShrink: 0, border: "2.5px solid rgba(255,255,255,0.85)" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 19, letterSpacing: "-0.01em", color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{emp?.full_name ?? "Đang tải…"}</div>
            <div className="tnum" style={{ fontSize: 13, fontWeight: 600, color: "var(--ge-on-header)", marginTop: 2, lineHeight: 1.3 }}>
              {emp ? `${emp.employee_code}${emp.position ? " · " + emp.position : ""}` : ""}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          {([["Bộ phận", emp?.department ?? "—"], ["Mã thẻ", emp?.card_number ?? "—"], ["Nhà máy", TENANT]] as [string, string][]).map(([k, v]) => (
            <div key={k} style={{ flex: 1, minWidth: 0, background: "var(--ge-glass)", border: "1px solid var(--ge-glass-line)", borderRadius: 14, padding: "9px 8px", textAlign: "center" }}>
              <div className="tnum" style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 12.5, lineHeight: 1.25, color: "#fff", overflowWrap: "anywhere" }}>{v}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ge-on-header)", marginTop: 2 }}>{k}</div>
            </div>
          ))}
        </div>
      </GreenHeader>

      {/* staff switch — chỉ nhân sự có quyền quầy/bếp (RBAC tài khoản web) */}
      {staff && (staff.canScan || staff.canKitchen) && (
        <div style={{ padding: "14px 16px 0" }}>
          <button
            onClick={() => navigate(staff.canScan ? "/admin/scan" : "/admin/kitchen")}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: 14, borderRadius: 18, border: "1px solid var(--fd-wd-line)", background: "var(--ge-card-strip)", cursor: "pointer", textAlign: "left", font: "inherit", boxShadow: "var(--ge-shadow-card)" }}
          >
            <span style={{ width: 42, height: 42, borderRadius: 12, background: "var(--teal-500)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <I.scan size={22} />
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14.5, color: "var(--teal-800)" }}>Chế độ Quầy & Bếp</div>
              <div style={{ fontSize: 12.5, color: "var(--teal-700)", marginTop: 2 }}>
                {[staff.canScan && "Quét thẻ phát suất ăn", staff.canKitchen && "Bảng bếp hôm nay"].filter(Boolean).join(" · ")}
              </div>
            </div>
            <I.chevR size={18} style={{ color: "var(--teal-600)" }} />
          </button>
        </div>
      )}

      {groups.map((g) => (
        <div key={g.header} style={{ marginTop: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--fd-wd-deep)", textTransform: "uppercase", letterSpacing: "0.07em", padding: "0 20px 8px" }}>{g.header}</div>
          <div style={{ margin: "0 16px", background: "#fff", border: "1px solid var(--ge-sage-line)", borderRadius: 18, overflow: "hidden", boxShadow: "var(--ge-shadow-card)" }}>
            {g.rows.map((r, i) => {
              const Ico = I[r.icon];
              return (
                <button
                  key={r.label}
                  onClick={r.go}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 13,
                    padding: "13px 14px",
                    background: "none",
                    border: "none",
                    borderBottom: i < g.rows.length - 1 ? "1px solid var(--ge-sage-line)" : "none",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span style={{ width: 34, height: 34, borderRadius: 10, background: "var(--fd-wd-slot)", color: "var(--fd-wd-solid)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Ico size={18} />
                  </span>
                  <span style={{ flex: 1, fontSize: 14.5, color: "var(--fg-1)", fontWeight: 500 }}>{r.label}</span>
                  {"detail" in r && r.detail && <span style={{ fontSize: 13, color: "var(--fg-3)" }}>{r.detail}</span>}
                  <I.chevR size={17} style={{ color: "var(--fg-4)" }} />
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div style={{ padding: "20px 16px 28px" }}>
        <Btn
          full
          variant="danger"
          icon={<I.logout size={18} />}
          onClick={() => {
            logout();
            toast("Đã đăng xuất");
            if (API_MODE === "live") window.location.reload();
          }}
        >
          Đăng xuất
        </Btn>
        <div style={{ textAlign: "center", fontSize: 11.5, color: "var(--fg-4)", marginTop: 14 }}>
          GoEat · {TENANT} · {API_MODE === "mock" ? "dữ liệu thử" : "kết nối máy chủ"}
        </div>
      </div>
    </div>
  );
}
