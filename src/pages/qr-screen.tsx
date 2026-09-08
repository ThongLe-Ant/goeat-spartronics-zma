// GoEat ZMA — Thẻ nhận cơm mở từ trang khác (có nút quay lại).
import { useNavigate } from "react-router-dom";
import { ScreenHeader } from "@/components/ui";
import { PickupCardBody } from "@/components/qr-ticket";
import { ErrorBlock } from "@/components/ordering/status";
import { usePickupCard } from "@/state/pickup";

export default function QrScreenPage() {
  const navigate = useNavigate();
  const { data, error, reload } = usePickupCard();
  return (
    <div style={{ height: "100%", background: "var(--teal-700)", display: "flex", flexDirection: "column" }}>
      <ScreenHeader title="Thẻ nhận cơm" onBack={() => navigate(-1)} dark />
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 18px 24px", display: "flex", flexDirection: "column", alignItems: "center" }} className="no-scrollbar">
        {data ? <PickupCardBody card={data} onDark onGoWeekly={() => navigate("/weekly")} /> : error ? <ErrorBlock message={error} onRetry={reload} /> : null}
      </div>
    </div>
  );
}
