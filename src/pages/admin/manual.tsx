// GoEat ZMA — PHÁT MÓN NGOẠI LỆ tại quầy (§16, §17.3, §21), bản điện thoại của
// màn `/pickup/manual` trên web spartronics.
//
// Vì sao cần: người thật đang đứng trước quầy thì phải được ăn kể cả khi hệ
// thống không dự báo cho họ (chấm công chưa về, đổi ca đột xuất, khách) — nhưng
// lối đi đó phải có NGƯỜI BẤM, có LÝ DO và để lại dấu. Khác quyền với quét thẻ:
// `manual-dispense:create`, không dùng chung `pickup:process`.
//
// Hai bước, đúng thứ tự người đứng quầy làm: chọn NGƯỜI trước, chọn LÝ DO sau.
//
// THIẾT KẾ (§12.10): bỏ cặp chip "Nhân viên / Suất phát sinh" ở đầu màn. Chín
// trên mười lượt là nhân viên có mã, bắt cả mười lượt phải chọn chế độ trước là
// bắt số đông trả phí cho số ít — và dựng lại đúng cái "chế độ" mà cả app vừa
// bỏ. Giờ ô tìm nhân viên là mặc định, suất phát sinh là một lối rẽ ở dưới.
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Btn, Field, ScreenHeader } from "@/components/ui";
import { I } from "@/components/icons";
import StaffGuard from "@/components/staff-guard";
import { EmployeePicker, TargetBanner } from "@/components/admin/employee-picker";
import { LatestResult, ResultLog, type ResultView } from "@/components/admin/dispense-result";
import { staffDishTone } from "@/lib/dish-tone";
import { dispenseManual, fetchManualMeta, searchEmployees } from "@/api/staff";
import { useBootstrap } from "@/state/ordering";
import type { ManualDish, StaffEmployeeHit, ManualOutcome, ManualReason, ScanDeniedResult } from "@/api/types";

const DENIED_TITLE: Record<ScanDeniedResult, string> = {
  already_picked: "Đã nhận rồi",
  no_order: "Không phát được",
  out_of_window: "Ngoài giờ phát",
  unknown_user: "Không tìm thấy NV",
  inactive: "NV ngừng hoạt động",
  wrong_category: "Sai quầy",
  extra_quota_exhausted: "Hết suất phát sinh",
};

type Entry = { id: number; at: string; outcome: ManualOutcome };
type Target = { kind: "employee"; hit: StaffEmployeeHit } | { kind: "extra"; extraKind: "guest" | "new_worker"; label: string; department: string };

const labelOf = (t: Target) => (t.kind === "employee" ? t.hit.full_name : t.label.trim() || (t.extraKind === "new_worker" ? "Công nhân mới" : "Khách"));
const subOf = (t: Target) => (t.kind === "employee" ? (t.hit.department ?? t.hit.employee_code) : t.department.trim() || "Suất phát sinh");

/** Đổi một lượt phát thành dạng để hiện, xem `dispense-result.tsx`. */
function viewOf(e: Entry): ResultView & { id: number } {
  const o = e.outcome;
  if (o.kind === "served") {
    const remaining = typeof o.data.remaining === "number" ? `, còn ${o.data.remaining} suất phát sinh` : "";
    return {
      id: e.id,
      tone: "ok",
      title: o.data.is_extra ? "Đã phát suất phát sinh" : o.data.created ? "Đã phát, suất mới" : "Đã phát ngoại lệ",
      at: e.at,
      name: o.data.employee_name,
      code: o.data.employee_code,
      dept: o.data.department,
      shift: o.data.meal_time_name,
      dish: o.data.food_name,
      detail: `Lý do: ${o.data.reason_name}${remaining}`,
    };
  }
  return { id: e.id, tone: o.result === "already_picked" ? "warn" : "bad", title: DENIED_TITLE[o.result], at: e.at, detail: o.message };
}

/** Ô bấm dạng chip. Chọn rồi thì TÔ NHẠT viền đậm, không tô đặc — nút "Phát
 *  suất ngoại lệ" ở cuối màn mới là chỗ duy nhất được tô đặc. */
function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "10px 14px",
        borderRadius: 12,
        border: on ? "1.5px solid var(--fd-wd-solid)" : "1px solid var(--border-subtle)",
        background: on ? "var(--fd-wd-slot)" : "var(--bg-surface)",
        color: "var(--fg-1)",
        fontSize: 13.5,
        fontWeight: on ? 700 : 500,
        textAlign: "left",
        cursor: "pointer",
        lineHeight: 1.35,
      }}
    >
      {children}
    </button>
  );
}

const Lab = ({ children }: { children: React.ReactNode }) => <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14.5, color: "var(--fg-1)", margin: "20px 2px 9px" }}>{children}</div>;

function ManualScreen() {
  const navigate = useNavigate();
  const boot = useBootstrap();

  const [reasons, setReasons] = useState<ManualReason[]>([]);
  const [dishes, setDishes] = useState<ManualDish[]>([]);

  // Bước 1 — chọn người. `extra` là lối rẽ cho người chưa có mã nhân viên.
  const [step, setStep] = useState<"employee" | "extra">("employee");
  const [extraKind, setExtraKind] = useState<"guest" | "new_worker">("guest");
  const [label, setLabel] = useState("");
  const [dept, setDept] = useState("");
  const [target, setTarget] = useState<Target | null>(null);

  // Bước 2 — lý do / món thay thế / ghi chú.
  const [reason, setReason] = useState("");
  const [dishId, setDishId] = useState<number | null>(null);
  const [note, setNote] = useState("");

  const [busy, setBusy] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const seq = useRef(0);

  useEffect(() => {
    fetchManualMeta()
      .then((m) => {
        setReasons(m.reasons);
        setDishes(m.dishes);
      })
      .catch(() => toast.error("Không tải được danh mục lý do"));
  }, []);

  const reset = useCallback(() => {
    setTarget(null);
    setReason("");
    setDishId(null);
    setNote("");
    setLabel("");
    setDept("");
    setStep("employee");
  }, []);

  const submit = useCallback(async () => {
    if (!target || !reason || busy) return;
    setBusy(true);
    try {
      const outcome = await dispenseManual(
        target.kind === "employee"
          ? { employee_identifier: target.hit.employee_code, manual_reason: reason, food_item_id: dishId, note: note.trim() || null }
          : { no_employee: true, kind: target.extraKind, label: target.label.trim() || null, department: target.department.trim() || null, manual_reason: reason, food_item_id: dishId, note: note.trim() || null },
      );
      const at = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Ho_Chi_Minh" });
      setEntries((list) => [{ id: ++seq.current, at, outcome }, ...list].slice(0, 30));
      if (outcome.kind === "served") {
        toast.success(outcome.message);
        reset();
      } else {
        toast.error(DENIED_TITLE[outcome.result]);
      }
    } catch (e) {
      toast.error((e as Error)?.message ?? "Không gửi được lượt phát");
    } finally {
      setBusy(false);
    }
  }, [target, reason, dishId, note, busy, reset]);

  const [latest, ...rest] = entries;
  const done = entries.filter((e) => e.outcome.kind === "served").length;

  return (
    <div style={{ height: "100%", background: "var(--bg-page)", display: "flex", flexDirection: "column" }}>
      <ScreenHeader
        title="Phát món ngoại lệ"
        subtitle={done ? `Phiên này đã phát ${done} suất ngoại lệ` : "Phát tay khi hệ thống không dự báo suất"}
        onBack={() => navigate("/profile")}
        right={
          boot?.staff?.canScan ? (
            <button
              onClick={() => navigate("/admin/scan")}
              style={{ width: 38, height: 38, borderRadius: 11, border: "1px solid var(--border-subtle)", background: "var(--bg-surface)", color: "var(--fg-1)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              <I.scan size={19} />
            </button>
          ) : undefined
        }
      />
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px calc(var(--safe-bottom) + 24px)" }} className="no-scrollbar">
        {/* ── Bước 1: ai nhận suất ────────────────────────────── */}
        {!target && step === "employee" && (
          <>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20, letterSpacing: "-0.015em", margin: "2px 2px 12px" }}>Ai nhận suất?</div>
            <EmployeePicker search={searchEmployees} placeholder="Mã NV, tên hoặc số thẻ" scan onPick={(h) => setTarget({ kind: "employee", hit: h })} bare />
            <button
              type="button"
              onClick={() => setStep("extra")}
              style={{ marginTop: 14, width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "13px 14px", borderRadius: 14, border: "1px dashed var(--fd-wd-line-strong)", background: "transparent", color: "var(--fg-2)", fontSize: 13.5, fontWeight: 600, textAlign: "left", cursor: "pointer", font: "inherit" }}
            >
              <I.plus size={18} />
              Khách hoặc công nhân chưa có mã
            </button>
          </>
        )}

        {!target && step === "extra" && (
          <>
            <button type="button" onClick={() => setStep("employee")} style={{ background: "none", border: "none", padding: "2px 2px 10px", color: "var(--fd-wd-solid)", fontSize: 13.5, fontWeight: 700, cursor: "pointer", font: "inherit" }}>
              ‹ Nhân viên có mã
            </button>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20, letterSpacing: "-0.015em", margin: "0 2px 12px" }}>Suất phát sinh</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <Chip on={extraKind === "guest"} onClick={() => setExtraKind("guest")}>
                Khách
              </Chip>
              <Chip on={extraKind === "new_worker"} onClick={() => setExtraKind("new_worker")}>
                Công nhân mới
              </Chip>
            </div>
            <Field label="Tên hoặc nhãn (không bắt buộc)" value={label} onChange={setLabel} placeholder={extraKind === "guest" ? "Khách nhà thầu A" : "Công nhân mới chưa cấp mã"} icon={<I.user size={17} />} />
            <Field label="Bộ phận (không bắt buộc)" value={dept} onChange={setDept} placeholder="Sản xuất, Line 3" icon={<I.store size={17} />} />
            <Btn full onClick={() => setTarget({ kind: "extra", extraKind, label, department: dept })} icon={<I.chevR size={16} />}>
              Tiếp tục
            </Btn>
          </>
        )}

        {/* ── Bước 2: lý do (bắt buộc) ────────────────────────── */}
        {target && (
          <>
            <TargetBanner name={labelOf(target)} sub={subOf(target)} verb="Phát ngoại lệ cho" onChange={reset} />

            <Lab>
              Lý do phát ngoại lệ <span style={{ color: "var(--danger-500)" }}>*</span>
            </Lab>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {reasons.map((r) => (
                <Chip key={r.code} on={reason === r.code} onClick={() => setReason(r.code)}>
                  {r.name}
                </Chip>
              ))}
              {reasons.length === 0 && <div style={{ fontSize: 13, color: "var(--fg-3)" }}>Đang tải danh mục lý do…</div>}
            </div>

            {/* Món thay thế — chỉ dùng khi bếp hết món (§17.3). */}
            {dishes.length > 0 && (
              <>
                <Lab>Món quầy đưa</Lab>
                <div style={{ fontSize: 12.5, color: "var(--fg-3)", margin: "-4px 2px 9px", lineHeight: 1.45 }}>Bỏ trống nếu đưa đúng món đã đăng ký. Chỉ chọn khi bếp hết món và phải đưa món khác.</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {dishes.map((d) => {
                    const look = staffDishTone(d.name, d.columnName);
                    const Glyph = I[look.icon];
                    return (
                      <Chip key={d.foodItemId} on={dishId === d.foodItemId} onClick={() => setDishId(dishId === d.foodItemId ? null : d.foodItemId)}>
                        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span aria-hidden style={{ flex: "0 0 auto", color: look.ink, display: "flex" }}>
                            <Glyph size={17} sw={2.2} />
                          </span>
                          <span style={{ flex: 1, minWidth: 0 }}>
                            {d.name}
                            {d.columnName ? <span style={{ color: "var(--fg-3)", fontWeight: 500, fontSize: 12, marginLeft: 8 }}>{d.columnName}</span> : null}
                          </span>
                        </span>
                      </Chip>
                    );
                  })}
                </div>
              </>
            )}

            <div style={{ marginTop: 18 }}>
              <Field label="Ghi chú (không bắt buộc)" value={note} onChange={setNote} placeholder="Ví dụ: quản đốc Line 3 xác nhận" icon={<I.edit size={17} />} />
            </div>

            <Btn full size="lg" disabled={busy || !reason} onClick={submit} icon={<I.checkCircle size={18} />}>
              {busy ? "Đang phát…" : "Phát suất ngoại lệ"}
            </Btn>
            {!reason && <div style={{ fontSize: 12.5, color: "var(--fg-3)", textAlign: "center", marginTop: 8 }}>Chọn lý do trước khi phát.</div>}
          </>
        )}

        {latest && (
          <div style={{ marginTop: 16 }}>
            <LatestResult v={viewOf(latest)} />
          </div>
        )}
        {rest.length > 0 && (
          <>
            <Lab>Lượt phát trước</Lab>
            <ResultLog items={rest.map(viewOf)} />
          </>
        )}
        {entries.length === 0 && !target && step === "employee" && (
          <div style={{ color: "var(--fg-3)", padding: "22px 2px 8px", fontSize: 13.5, lineHeight: 1.55 }}>Dùng khi người thật đứng trước quầy nhưng hệ thống không có suất: chấm công chưa về, đổi ca đột xuất, khách. Mỗi lượt phát đều ghi lý do và người bấm.</div>
        )}
      </div>
    </div>
  );
}

export default function ManualPage() {
  return (
    <StaffGuard need="canManual">
      <ManualScreen />
    </StaffGuard>
  );
}
