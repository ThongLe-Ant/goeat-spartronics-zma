// GoEat ZMA — chọn NGƯỜI trước khi làm thay họ (đặt hộ / sửa đăng ký).
//
// Đặt nhầm người là mất một suất cơm thật và rất khó lần lại dấu, nên hai quy
// tắc ở đây không thương lượng: (1) chưa chọn được ai thì màn sau không hiện,
// (2) khi đã chọn thì tên người đó DÍNH trên đầu màn hình cho tới lúc thoát.
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { scanQRCode } from "zmp-sdk/apis";
import { I } from "@/components/icons";
import { Btn, Field, cardS } from "@/components/ui";
import { searchStaffEmployees } from "@/api/hr";
import type { StaffEmployeeHit } from "@/api/types";

/**
 * `search` để đổi ĐƯỜNG tra cứu, không phải để đổi kết quả: mỗi màn đi đúng
 * endpoint mà quyền của mình mở (cấp thẻ tạm đi `/temp-card?q=`, nhân sự đi
 * `/employees?q=`) — dùng chung một đường thì người chỉ có một quyền sẽ ăn 403.
 */
export function EmployeePicker({ hint, onPick, search = searchStaffEmployees, bare, placeholder = "Mã nhân viên hoặc tên", scan }: { hint?: string; onPick: (e: StaffEmployeeHit) => void; search?: (q: string) => Promise<StaffEmployeeHit[]>; bare?: boolean; placeholder?: string; scan?: boolean }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<StaffEmployeeHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Gõ tới đâu tìm tới đó, chờ 350ms cho người dùng gõ xong mã.
  useEffect(() => {
    const t = q.trim();
    if (t.length < 2) {
      setHits([]);
      setErr(null);
      return;
    }
    setSearching(true);
    const id = setTimeout(async () => {
      try {
        setHits(await search(t));
        setErr(null);
      } catch (e: any) {
        setHits([]);
        setErr(e?.message ?? "Không tra cứu được");
      }
      setSearching(false);
    }, 350);
    return () => clearTimeout(id);
  }, [q, search]);

  // Quét QR chỉ ĐIỀN vào ô tìm kiếm chứ không chọn luôn người: mã quét được vẫn
  // phải ra đúng một người trong danh sách thì người đứng quầy mới đối chiếu được tên.
  const openCamera = async () => {
    try {
      const { content } = await scanQRCode();
      if (content) setQ(content.trim());
    } catch {
      toast("Không mở được camera — nhập mã tay bên dưới");
    }
  };

  return (
    // `bare` = màn hình tự lo khung; bọc thêm một thẻ trắng nữa chỉ tạo ra
    // hai lớp viền lồng nhau mà không thêm thông tin gì.
    <div style={bare ? { display: "flex", flexDirection: "column", gap: 10 } : { ...cardS, padding: 14 }}>
      <Field
        value={q}
        onChange={setQ}
        placeholder={placeholder}
        icon={<I.search size={17} />}
        right={
          scan ? (
            <Btn size="sm" variant="soft" onClick={openCamera} icon={<I.scan size={15} />}>
              Quét
            </Btn>
          ) : undefined
        }
        hint={q.trim().length > 0 && q.trim().length < 2 ? "Nhập ít nhất 2 ký tự" : hint}
        error={err ?? undefined}
      />
      {searching && <div style={{ fontSize: 13, color: "var(--fg-3)" }}>Đang tìm…</div>}
      {!searching && !err && q.trim().length >= 2 && hits.length === 0 && <div style={{ fontSize: 13, color: "var(--fg-3)" }}>Không tìm thấy nhân viên nào.</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {hits.map((h) => (
          <button
            key={h.id}
            type="button"
            onClick={() => onPick(h)}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, border: "1px solid var(--border-subtle)", background: "var(--bg-surface)", textAlign: "left", cursor: "pointer", font: "inherit" }}
          >
            <span style={{ width: 34, height: 34, borderRadius: 10, background: "var(--bg-page)", color: "var(--fg-3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <I.user size={18} />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontWeight: 700, fontSize: 14 }}>{h.full_name}</span>
              <span style={{ display: "flex", gap: 10, fontSize: 12.5, color: "var(--fg-3)" }}>
                <span className="tnum">{h.employee_code}</span>
                {h.department && <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.department}</span>}
              </span>
            </span>
            <I.chevR size={17} />
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Dải "đang làm thay ai" — DÍNH trên đầu vùng cuộn.
 * Không phải trang trí: cuộn xuống ngày thứ năm của tuần mà không còn thấy tên
 * ai thì rất dễ tưởng đang đặt cho chính mình.
 *
 * Nền NHẠT, không phải nền xanh đặc: đây là BỐI CẢNH, không phải việc để bấm.
 * Tô đặc thì nó tranh chỗ đậm với nút chính ngay bên dưới (nút Quét / nút Lưu)
 * và hai khối xanh chồng nhau thành một mảng, mắt không biết bấm vào đâu.
 */
export function TargetBanner({ name, sub, verb, onChange }: { name: string; sub?: string | null; verb: string; onChange: () => void }) {
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 5,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        marginBottom: 10,
        borderRadius: 14,
        background: "var(--fd-wd-slot)",
        border: "1px solid var(--fd-wd-line-strong)",
        color: "var(--fg-1)",
      }}
    >
      <span style={{ width: 34, height: 34, borderRadius: 10, background: "var(--fd-wd-solid)", color: "var(--fd-wd-on-solid)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <I.user size={18} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--fg-3)" }}>{verb}</span>
        <span style={{ display: "block", fontWeight: 800, fontSize: 15, fontFamily: "var(--font-display)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>
        {sub && <span style={{ display: "block", fontSize: 11.5, color: "var(--fg-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</span>}
      </span>
      <Btn size="sm" variant="secondary" onClick={onChange} icon={<I.swap size={15} />} style={{ flexShrink: 0 }}>
        Đổi
      </Btn>
    </div>
  );
}
