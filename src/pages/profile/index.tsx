// GoEat ZMA — Hồ sơ nhân viên (dữ liệu từ bootstrap của tenant; NV đăng nhập
// bằng Zalo nên không có mật khẩu, hồ sơ do HR quản lý — chỉ xem).
//
// Trang này có HAI phần khác hẳn nhau về nhịp dùng, nên vẽ khác hẳn nhau:
//   VIỆC  — mở nhiều lần mỗi bữa, đứng ở quầy, vội. Vẽ như bảng việc: đúng một
//           khối đậm (việc chính của người đó) + các ô nét mảnh.
//   HỒ SƠ — mở vài lần một năm. Vẽ như danh sách cài đặt, im lặng, xám.
// Vì thế bóng đổ và nền đặc CHỈ dành cho khối việc chính; đổ bóng đều cho mọi
// thẻ thì thứ bậc biến mất và cả trang thành một bức tường như nhau.
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { AppImg, Btn } from "@/components/ui";
import { GreenHeader } from "@/components/green-header";
import { I } from "@/components/icons";
import { useBootstrap, useWeekMenu } from "@/state/ordering";
import { API_MODE, TENANT } from "@/api/config";
import { logout } from "@/api/auth";
import { servingNow } from "@/lib/serving-now";
import { staffGroupsFor, type StaffGroupKey, type StaffMenuItem } from "@/lib/staff-menu";

// Mực của ô việc = TRỤC của màn nó mở ra, để nhìn màu là biết mình đi về đâu.
// Quầy cơm là việc của bữa đang diễn ra ⇒ xanh phục vụ. Ba màn nhân sự đều bắt
// đầu bằng "chọn ngày" (đặt hộ, sửa đăng ký, báo cáo) ⇒ mực lịch, đúng cái màu
// dải ngày trong chính ba màn đó.
const GROUP_INK: Record<StaffGroupKey, string> = {
  counter: "var(--fd-wd-solid)",
  hr: "var(--fd-cal-ink)",
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const boot = useBootstrap();
  const emp = boot?.employee;
  const { data: week } = useWeekMenu();

  /**
   * Việc theo quyền. KHÔNG phải một "chế độ" tách biệt: người đứng quầy vẫn là
   * nhân viên và vẫn tự đăng ký cơm của mình ở 4 tab kia — mấy khối này chỉ là
   * menu mọc thêm. Không có quyền nào thì trang này y hệt của mọi nhân viên.
   */
  const groups = staffGroupsFor(boot?.staff);
  // Đồng hồ ca, chỉ đặt cạnh nhóm QUẦY: người làm nhân sự không cần biết quầy
  // đang mở hay đóng, còn người đứng quầy thì đó là tin quan trọng nhất trang.
  const serving = servingNow(week?.shifts);

  const account = [
    { icon: "user", label: "Thông tin cá nhân", detail: emp?.employee_code, go: () => navigate("/profile/edit") },
    { icon: "phone", label: "Số Zalo đã liên kết", detail: emp?.zalo_phone ?? "Chưa liên kết", go: () => toast("Liên kết qua số điện thoại Zalo") },
    { icon: "ticket", label: "Thẻ nhận cơm", detail: emp?.card_number ?? emp?.employee_code, go: () => navigate("/qr") },
    { icon: "bell", label: "Nhắc trước giờ chốt", go: () => toast("Cài đặt thông báo") },
    { icon: "info", label: "Trợ giúp", go: () => toast("Liên hệ bếp / HR nhà máy") },
  ];

  /** Việc chính — khối đậm DUY NHẤT của cả trang. */
  const Lead = ({ m }: { m: StaffMenuItem }) => {
    const Ico = I[m.icon];
    return (
      <button
        onClick={() => navigate(m.path)}
        className="ge-dots"
        style={{
          ["--ge-dot-ink" as string]: "#ffffff",
          ["--ge-dot-alpha" as string]: "20%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "16px 16px",
          borderRadius: 18,
          border: "none",
          background: "var(--fd-wd-solid)",
          color: "var(--fd-wd-on-solid)",
          boxShadow: "0 14px 28px -18px rgba(20, 114, 76, 0.9)",
          cursor: "pointer",
          textAlign: "left",
          font: "inherit",
        }}
      >
        <span style={{ width: 44, height: 44, borderRadius: 14, background: "rgba(255,255,255,0.16)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Ico size={22} />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 17, letterSpacing: "-0.01em" }}>{m.title}</span>
          {m.hint && <span style={{ display: "block", fontSize: 12.5, opacity: 0.82, marginTop: 1 }}>{m.hint}</span>}
        </span>
        <I.chevR size={20} style={{ opacity: 0.7, flexShrink: 0 }} />
      </button>
    );
  };

  /**
   * Việc phụ — nét và mực, không nền đặc, không bóng.
   * `wide` cho ô LẺ cuối cùng: nằm một mình nửa hàng thì nửa kia thành lỗ
   * hổng, trải ngang vừa hết chỗ vừa cho ngón tay một đích rộng hơn.
   */
  const Tile = ({ m, wide }: { m: StaffMenuItem; wide?: boolean }) => {
    const Ico = I[m.icon];
    const ink = GROUP_INK[m.group];
    return (
      <button
        onClick={() => navigate(m.path)}
        style={{
          gridColumn: wide ? "span 2" : undefined,
          display: "flex",
          flexDirection: wide ? "row" : "column",
          alignItems: wide ? "center" : "flex-start",
          gap: wide ? 12 : 7,
          padding: wide ? "14px 14px" : "12px 13px 13px",
          borderRadius: 16,
          border: "1px solid var(--fd-wd-line)",
          background: "var(--bg-surface)",
          cursor: "pointer",
          textAlign: "left",
          font: "inherit",
        }}
      >
        <span
          aria-hidden
          style={{ display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, width: 34, height: 34, borderRadius: 11, color: ink, background: `color-mix(in srgb, ${ink} 13%, var(--bg-surface))`, border: `1px solid color-mix(in srgb, ${ink} 22%, transparent)` }}
        >
          <Ico size={19} />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14.5, color: "var(--fg-1)", lineHeight: 1.3 }}>{m.title}</span>
          {m.hint && <span style={{ display: "block", fontSize: 11.5, color: "var(--fg-3)", marginTop: 3, lineHeight: 1.35 }}>{m.hint}</span>}
        </span>
      </button>
    );
  };

  return (
    <div style={{ height: "100%", overflowY: "auto", background: "var(--ge-sage)" }} className="no-scrollbar">
      {/* profile header — dải xanh thương hiệu, 2 ô thống kê nền kính mờ */}
      <GreenHeader pad={4}>
        {/* Chừa chỗ bên phải cho capsule của Zalo (nút … / thoát). */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, paddingRight: 96 }}>
          <AppImg src={emp?.avatar_url ?? ""} radius={999} style={{ width: 58, height: 58, flexShrink: 0, border: "2.5px solid rgba(255,255,255,0.85)" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 19, letterSpacing: "-0.01em", color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{emp?.full_name ?? "Đang tải…"}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ge-on-header)", marginTop: 2, lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{emp?.position ?? ""}</div>
          </div>
        </div>
        {/* Hai ô, không ba: "nhà máy" là thứ ai cũng biết mình đang làm ở đâu. */}
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          {([["Bộ phận", emp?.department ?? "—"], ["Mã thẻ", emp?.card_number ?? emp?.employee_code ?? "—"]] as [string, string][]).map(([k, v]) => (
            <div key={k} style={{ flex: 1, minWidth: 0, background: "var(--ge-glass)", border: "1px solid var(--ge-glass-line)", borderRadius: 14, padding: "9px 12px" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ge-on-header)" }}>{k}</div>
              <div className="tnum" style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 13.5, lineHeight: 1.3, color: "#fff", marginTop: 2, overflowWrap: "anywhere" }}>{v}</div>
            </div>
          ))}
        </div>
      </GreenHeader>

      {/* ---- VIỆC ---- */}
      {groups.map((g, gi) => {
        // Việc chính là dòng đầu của nhóm ĐẦU TIÊN — mỗi trang đúng một khối đậm.
        const lead = gi === 0 ? g.items[0] : null;
        const rest = lead ? g.items.slice(1) : g.items;
        return (
          <div key={g.key} style={{ padding: gi === 0 ? "18px 16px 0" : "22px 16px 0" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15.5, color: "var(--fg-1)", letterSpacing: "-0.01em" }}>{g.label}</div>
              {g.key === "counter" && serving && (
                <div style={{ fontSize: 12, fontWeight: 700, color: serving.open ? "var(--fd-accent-ink)" : "var(--fg-3)", marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, ...(serving.open ? { background: "var(--fd-accent-tint)", borderRadius: 999, padding: "3px 9px 3px 7px" } : null) }}>
                  {serving.open && <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--fd-accent-solid)", display: "inline-block" }} />}
                  {serving.text}
                </div>
              )}
            </div>
            {lead && <Lead m={lead} />}
            {rest.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: lead ? 10 : 0 }}>
                {rest.map((m, i) => (
                  <Tile key={m.path} m={m} wide={rest.length % 2 === 1 && i === rest.length - 1} />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* ---- HỒ SƠ ---- */}
      <div style={{ padding: "24px 16px 0" }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15.5, color: "var(--fg-1)", letterSpacing: "-0.01em", marginBottom: 10 }}>Tài khoản</div>
        <div style={{ background: "#fff", border: "1px solid var(--ge-sage-line)", borderRadius: 16, overflow: "hidden" }}>
          {account.map((r, i) => {
            const Ico = I[r.icon as keyof typeof I];
            return (
              <button
                key={r.label}
                onClick={r.go}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 14px",
                  background: "none",
                  border: "none",
                  borderBottom: i < account.length - 1 ? "1px solid var(--ge-sage-line)" : "none",
                  cursor: "pointer",
                  textAlign: "left",
                  font: "inherit",
                }}
              >
                <Ico size={17} style={{ color: "var(--fg-4)", flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0, fontSize: 14.5, color: "var(--fg-1)" }}>{r.label}</span>
                {r.detail && <span className="tnum" style={{ fontSize: 13, color: "var(--fg-3)", flexShrink: 0 }}>{r.detail}</span>}
                <I.chevR size={16} style={{ color: "var(--fg-4)", flexShrink: 0 }} />
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ padding: "18px 16px calc(var(--safe-bottom) + 112px)" }}>
        <Btn
          full
          variant="ghost"
          icon={<I.logout size={17} style={{ color: "var(--danger-700)" }} />}
          onClick={() => {
            logout();
            toast("Đã đăng xuất");
            if (API_MODE === "live") window.location.reload();
          }}
          style={{ color: "var(--danger-700)" }}
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
