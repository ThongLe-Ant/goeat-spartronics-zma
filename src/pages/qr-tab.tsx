// GoEat ZMA — tab Thẻ cơm: QR = mã thẻ/mã NV, kèm suất hôm nay và khung giờ phát.
// Nền xanh rừng phủ kín màn (như bản mẫu) để tấm vé trắng nổi hẳn lên và hai
// khuyết bán nguyệt trông như vé bị bấm lỗ thật.
import { useNavigate } from "react-router-dom";
import { PickupCardBody } from "@/components/qr-ticket";
import { ErrorBlock } from "@/components/ordering/status";
import { dayMonth, weekdayFullVN, ymdVN } from "@/lib/date-vn";
import { usePickupCard } from "@/state/pickup";

export default function QrTabPage() {
  const navigate = useNavigate();
  const { data, error, loading, reload } = usePickupCard();
  const today = ymdVN();
  return (
    <div style={{ height: "100%", background: "var(--teal-700)", display: "flex", flexDirection: "column" }}>
      {/* Chừa chỗ bên phải cho capsule của Zalo (nút … / thoát). */}
      <div style={{ flexShrink: 0, padding: "calc(var(--safe-top) + 12px) 16px 6px", paddingRight: 96 }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 21, letterSpacing: "-0.01em", color: "#fff" }}>Thẻ nhận cơm</div>
        <div className="tnum" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ge-on-header)", marginTop: 2 }}>
          {weekdayFullVN(today)} · {dayMonth(today)}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 24px", display: "flex", flexDirection: "column", alignItems: "center" }} className="no-scrollbar">
        {data ? (
          <PickupCardBody card={data} onDark onGoWeekly={() => navigate("/weekly")} />
        ) : error ? (
          <div style={{ background: "var(--bg-surface)", borderRadius: 20, width: "100%", maxWidth: 320, boxShadow: "var(--ge-shadow-ticket)" }}>
            <ErrorBlock message={error} onRetry={reload} />
          </div>
        ) : loading ? (
          <div style={{ color: "var(--ge-on-header)", padding: 40 }}>Đang tải thẻ…</div>
        ) : null}
      </div>
    </div>
  );
}
