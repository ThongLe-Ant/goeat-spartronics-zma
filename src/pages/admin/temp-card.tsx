// GoEat ZMA — CẤP THẺ TẠM (§12.5).
//
// Vì sao việc này lên điện thoại: người cấp đang ĐỨNG CẠNH người quên thẻ, cầm
// luôn thẻ nhựa trong tay — quét mã tại chỗ nhanh hơn chạy về máy tính gõ mã.
//
// Hai việc, nhưng KHÔNG phải hai chế độ song song:
//   NHÂN VIÊN quên thẻ — gần như toàn bộ số lần dùng. Mở màn là làm được ngay,
//                        không phải chọn gì trước.
//   SUẤT PHÁT SINH     — công nhân mới chưa có mã / khách tham quan. Hiếm, nên
//                        nằm sau MỘT dòng ở cuối màn, mở ra như một bước tiếp.
// Bản trước đặt hai nút gạt trên đầu: bắt 95% số lần dùng trả phí cho 5% còn
// lại, và dựng lại đúng cái "chế độ" mà cả app vừa bỏ.
//
// Hạn dùng do SERVER đặt (luật hiện hành +1 giờ). Màn này không tự cộng giờ —
// chỉ hiện `expires_at` server trả về, để app không bao giờ nói sai hạn thẻ.
//
// KHÔNG có nhập kho thẻ ở đây (PLAN.md §12.5): việc hàng loạt đó ở trang web.
import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { scanQRCode } from "zmp-sdk/apis";
import toast from "react-hot-toast";
import StaffGuard from "@/components/staff-guard";
import {
  EmployeePicker,
  TargetBanner,
} from "@/components/admin/employee-picker";
import { Btn, Field, ScreenHeader } from "@/components/ui";
import { I } from "@/components/icons";
import { issueTempCard, searchTempCardEmployees } from "@/api/temp-card";
import type { StaffEmployeeHit, TempCard } from "@/api/types";

type Step = "employee" | "extra";

const hhmm = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const KIND_LABEL: Record<string, string> = {
  employee: "Nhân viên",
  "extra:new_worker": "Công nhân mới",
  "extra:guest": "Khách",
};

/**
 * Thẻ vừa cấp — bằng chứng công việc đã xong, đọc được từ xa một tay.
 * Mã thẻ là nội dung chính nên nó to nhất; giờ hết hạn đứng sát bên vì đó là
 * câu người trực quầy sẽ bị hỏi ("thẻ này còn dùng được tới mấy giờ?").
 */
function IssuedCard({ c }: { c: TempCard }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 10,
        padding: "11px 0",
        borderBottom: "1px solid var(--fd-wd-line)",
      }}
    >
      <span
        className="tnum"
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize: 19,
          letterSpacing: "-0.01em",
          flexShrink: 0,
        }}
      >
        {c.code}
      </span>
      <span
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: 12.5,
          color: "var(--fg-3)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {c.label || KIND_LABEL[c.kind ?? ""] || c.kind || ""}
      </span>
      <span className="tnum" style={{ fontSize: 13, color: "var(--fg-2)", flexShrink: 0 }}>
        hết hạn {hhmm(c.expires_at)}
      </span>
    </div>
  );
}

/** Nhãn ô nhập — chữ thường, đúng cỡ đọc được; không IN HOA giãn chữ. */
const Lab = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--fg-2)", marginBottom: 7 }}>{children}</div>
);

function TempCardScreen() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("employee");
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState<TempCard[]>([]);

  // ---- nhân viên quên thẻ ----
  const [target, setTarget] = useState<StaffEmployeeHit | null>(null);
  const [code, setCode] = useState("");

  // ---- suất phát sinh ----
  const [kind, setKind] = useState<"new_worker" | "guest">("new_worker");
  const [label, setLabel] = useState("");
  const [dept, setDept] = useState("");
  const [count, setCount] = useState(1);
  const [codes, setCodes] = useState<string[]>([]);

  async function run(
    body: Parameters<typeof issueTempCard>[0],
    after: () => void,
  ) {
    setBusy(true);
    try {
      const r = await issueTempCard(body);
      // Mới nhất lên đầu; giữ 12 lượt gần nhất cho một phiên đứng quầy.
      setIssued((prev) => [...r.cards, ...prev].slice(0, 12));
      toast.success(r.message);
      after();
    } catch (e: any) {
      toast.error(e?.message ?? "Không cấp được thẻ");
    }
    setBusy(false);
  }

  const assignToEmployee = (value: string) => {
    const c = value.trim();
    if (!target || !c) return;
    run({ mode: "employee", code: c, employee_id: target.id }, () => {
      setCode("");
      // Cấp xong là xong một người — trả màn về ô tra cứu để không cấp nhầm
      // thẻ thứ hai cho người vừa rồi.
      setTarget(null);
    });
  };

  const scanInto = useCallback(async (onCode: (c: string) => void) => {
    try {
      const { content } = await scanQRCode();
      if (content) onCode(content.trim());
    } catch {
      toast("Không mở được camera — nhập mã tay bên dưới");
    }
  }, []);

  const issueExtra = () =>
    run(
      {
        mode: "extra",
        kind,
        // Có mã đã quét thì cấp ĐÚNG những thẻ đó; không có thì để server tự
        // lấy N thẻ khả dụng trong kho.
        codes: codes.length ? codes : undefined,
        count: codes.length ? undefined : count,
        label: label.trim() || null,
        department: dept.trim() || null,
      },
      () => {
        setCodes([]);
        setLabel("");
      },
    );

  return (
    <div
      style={{
        height: "100%",
        background: "var(--bg-page)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <ScreenHeader
        title="Cấp thẻ tạm"
        subtitle={
          issued.length
            ? `Phiên này đã cấp ${issued.length} thẻ`
            : "Thẻ nhựa dùng tạm, hết hạn sau 1 giờ"
        }
        onBack={() => navigate("/profile")}
      />

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 16px calc(var(--safe-bottom) + 24px)",
        }}
        className="no-scrollbar"
      >
        {step === "employee" ? (
          !target ? (
            <>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20, letterSpacing: "-0.015em", marginBottom: 12 }}>
                Ai cần thẻ?
              </div>
              <EmployeePicker
                hint="Chọn người, rồi quét mã trên thẻ nhựa."
                search={searchTempCardEmployees}
                onPick={setTarget}
                bare
              />
              {/* Đường ít dùng — một dòng, cuối màn, không tranh chỗ với ô tìm. */}
              <button
                type="button"
                onClick={() => setStep("extra")}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginTop: 18,
                  padding: "13px 14px",
                  borderRadius: 14,
                  border: "1px dashed var(--fd-wd-line-strong)",
                  background: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  font: "inherit",
                }}
              >
                <I.plus size={18} style={{ color: "var(--fd-wd-solid)", flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: "var(--fg-1)" }}>
                  Công nhân mới hoặc khách chưa có mã
                </span>
                <I.chevR size={17} style={{ color: "var(--fg-4)", flexShrink: 0 }} />
              </button>
            </>
          ) : (
            <>
              <TargetBanner
                name={target.full_name}
                sub={target.department ?? target.employee_code}
                verb="Cấp thẻ tạm cho"
                onChange={() => setTarget(null)}
              />
              {/* Chỗ đậm DUY NHẤT của màn: việc tiếp theo chỉ có một, quét thẻ. */}
              <button
                onClick={() => scanInto(assignToEmployee)}
                disabled={busy}
                style={{
                  width: "100%",
                  height: 148,
                  borderRadius: 20,
                  border: "none",
                  background: "var(--fd-wd-solid)",
                  color: "var(--fd-wd-on-solid)",
                  boxShadow: "0 16px 32px -20px rgba(20, 114, 76, 0.95)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  cursor: "pointer",
                  font: "inherit",
                }}
              >
                <I.scan size={38} />
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 17 }}>
                  {busy ? "Đang cấp…" : "Quét mã trên thẻ nhựa"}
                </span>
              </button>
              <div style={{ marginTop: 14 }}>
                <Lab>Không quét được?</Lab>
                <Field
                  value={code}
                  onChange={setCode}
                  placeholder="Nhập mã thẻ, ví dụ TC-0001"
                  icon={<I.ticket size={17} />}
                  right={
                    <Btn
                      size="sm"
                      disabled={busy || !code.trim()}
                      onClick={() => assignToEmployee(code)}
                      icon={<I.check size={15} />}
                    >
                      Cấp
                    </Btn>
                  }
                />
              </div>
            </>
          )
        ) : (
          <>
            <button
              type="button"
              onClick={() => setStep("employee")}
              style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, padding: 0, border: "none", background: "none", color: "var(--fd-wd-solid)", fontWeight: 700, fontSize: 13.5, cursor: "pointer", font: "inherit" }}
            >
              <I.chevL size={16} />
              Nhân viên quên thẻ
            </button>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20, letterSpacing: "-0.015em", marginBottom: 14 }}>
              Thẻ cho suất phát sinh
            </div>

            {/* Cùng một trục màu xanh với cả app — chip vàng ở đây không đại
                diện cho thứ gì, chỉ là màu lạ chen vào. */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {(
                [
                  ["new_worker", "Công nhân mới"],
                  ["guest", "Khách / đoàn"],
                ] as ["new_worker" | "guest", string][]
              ).map(([k, t]) => {
                const on = kind === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKind(k)}
                    style={{
                      flex: 1,
                      padding: "11px 8px",
                      borderRadius: 13,
                      border: on ? "1.5px solid var(--fd-wd-solid)" : "1px solid var(--border-subtle)",
                      background: on ? "var(--fd-wd-slot)" : "var(--bg-surface)",
                      color: on ? "var(--fd-wd-solid)" : "var(--fg-3)",
                      fontWeight: 700,
                      fontSize: 13.5,
                      cursor: "pointer",
                      font: "inherit",
                    }}
                  >
                    {t}
                  </button>
                );
              })}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Field
                label="Ghi chú trên thẻ"
                value={label}
                onChange={setLabel}
                placeholder={kind === "guest" ? "Đoàn khách Nhật" : "CN mới xưởng 2"}
                icon={<I.tag size={17} />}
              />
              <Field
                label="Bộ phận"
                value={dept}
                onChange={setDept}
                placeholder="Để trống nếu chưa rõ"
                icon={<I.store size={17} />}
              />

              {/* Hai cách cấp, KHÔNG trộn: quét từng thẻ (biết chính xác mã nào)
                  hoặc lấy nhanh N thẻ trong kho. Có mã quét thì số lượng tự tắt. */}
              <div>
                <Lab>{codes.length ? "Thẻ đã quét" : "Lấy mấy thẻ trong kho?"}</Lab>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Btn
                    size="sm"
                    variant="soft"
                    disabled={codes.length > 0 || count <= 1}
                    onClick={() => setCount((n) => Math.max(1, n - 1))}
                    icon={<I.minus size={15} />}
                  />
                  <span
                    className="tnum"
                    style={{
                      minWidth: 46,
                      textAlign: "center",
                      fontFamily: "var(--font-display)",
                      fontWeight: 800,
                      fontSize: 26,
                      lineHeight: 1,
                      color: codes.length ? "var(--fd-wd-solid)" : "var(--fg-1)",
                    }}
                  >
                    {codes.length || count}
                  </span>
                  <Btn
                    size="sm"
                    variant="soft"
                    disabled={codes.length > 0 || count >= 30}
                    onClick={() => setCount((n) => Math.min(30, n + 1))}
                    icon={<I.plus size={15} />}
                  />
                  <span style={{ flex: 1 }} />
                  <Btn
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={() =>
                      scanInto((c) =>
                        setCodes((prev) => (prev.includes(c) ? prev : [...prev, c])),
                      )
                    }
                    icon={<I.scan size={15} />}
                  >
                    Quét thẻ
                  </Btn>
                </div>
                {codes.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                    {codes.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCodes((prev) => prev.filter((x) => x !== c))}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          padding: "5px 9px",
                          borderRadius: 999,
                          border: "1px solid var(--fd-wd-line-strong)",
                          background: "var(--fd-wd-slot)",
                          color: "var(--fd-wd-solid)",
                          fontSize: 12.5,
                          fontWeight: 700,
                          cursor: "pointer",
                          font: "inherit",
                        }}
                      >
                        <span className="tnum">{c}</span>
                        <I.x size={13} />
                      </button>
                    ))}
                  </div>
                )}
                <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 9, lineHeight: 1.45 }}>
                  {codes.length
                    ? "Cấp đúng những thẻ đã quét ở trên."
                    : "Hệ thống tự lấy số thẻ khả dụng trong kho."}
                </div>
              </div>

              <Btn full disabled={busy} onClick={issueExtra} icon={<I.check size={17} />}>
                {busy ? "Đang cấp…" : `Cấp ${codes.length || count} thẻ`}
              </Btn>
            </div>
          </>
        )}

        {issued.length > 0 && (
          <div style={{ marginTop: 26 }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15.5, marginBottom: 4, color: "var(--fg-1)" }}>
              Đã cấp trong phiên này
            </div>
            {issued.map((c) => (
              <IssuedCard key={c.code + c.expires_at} c={c} />
            ))}
          </div>
        )}

        <div style={{ fontSize: 12, color: "var(--fg-4)", lineHeight: 1.55, marginTop: 22 }}>
          Nhập thêm thẻ vào kho là việc trên trang web.
        </div>
      </div>
    </div>
  );
}

export default function TempCardPage() {
  return (
    <StaffGuard need="canTempCard">
      <TempCardScreen />
    </StaffGuard>
  );
}
