import { useNavigate } from "react-router-dom";
import { Btn } from "@/components/ui";
import { GoEatMark } from "@/components/icons";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 32,
        textAlign: "center",
        background: "var(--bg-page)",
      }}
    >
      <GoEatMark size={64} />
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20 }}>
        Không tìm thấy trang
      </div>
      <div style={{ fontSize: 14, color: "var(--fg-3)" }}>Trang bạn tìm không tồn tại.</div>
      <Btn onClick={() => navigate("/")}>Về trang chủ</Btn>
    </div>
  );
}
