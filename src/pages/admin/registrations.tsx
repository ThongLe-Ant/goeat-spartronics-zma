// GoEat ZMA — SỬA ĐĂNG KÝ MỘT NGÀY của một nhân viên (nhân sự).
//
// Đơn vị làm việc là NGÀY của MỘT NGƯỜI, không phải một dòng: việc hay gặp là
// "hôm đó được điều tăng ca" — tức là bỏ suất ca 1 và thêm suất ca 3 cùng lúc.
// Nhìn cả ngày mới sửa đúng, nên màn này đọc cả ba ca và ghi cả ba ca bằng một
// lần PUT, giống hệt hộp thoại /ordering/registrations trên web.
//
// HẠN SỬA CỦA NHÂN SỰ ≠ HẠN CHỐT CỦA NHÂN VIÊN: quá 48h chỉ là CẢNH BÁO (bếp đã
// nấu theo số cũ, phải báo bếp), khoá cứng chỉ khi bữa đã xong hoặc đã nhận cơm.
// Đó là lý do màn này tồn tại tách khỏi "Đặt món hộ".
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { I } from "@/components/icons";
import { Btn, ScreenHeader, cardS } from "@/components/ui";
import StaffGuard from "@/components/staff-guard";
import { EmployeePicker, TargetBanner } from "@/components/admin/employee-picker";
import { DishSlot } from "@/components/ordering/dish-slot";
import { sortDishes } from "@/components/ordering/dish-icon";
import { ErrorBlock, LoadingBlock } from "@/components/ordering/status";
import { fetchRegistrationBoard, saveRegistrations } from "@/api/hr";
import { useBootstrap } from "@/state/ordering";
import { addDays, weekdayVN, ymdVN } from "@/lib/date-vn";
import type { RegistrationBoard, RegistrationPick, StaffEmployeeHit } from "@/api/types";

/** Cửa sổ ngày nhân sự hay đụng tới: 3 ngày đã qua + hôm nay + 10 ngày tới. */
const DAY_WINDOW = Array.from({ length: 14 }, (_, i) => addDays(ymdVN(), i - 3));

/** Dải cảnh báo — KHÔNG chặn, chỉ nói rõ hệ quả để nhân sự còn báo bếp. */
function Warn({ tone, children }: { tone: "amber" | "red"; children: React.ReactNode }) {
  const c = tone === "red" ? { bg: "var(--danger-50, #fdecec)", bd: "var(--danger-500, #d33)", fg: "var(--danger-700, #a32020)" } : { bg: "var(--gold-50, #fff7e0)", bd: "var(--gold-bright)", fg: "var(--gold-deep)" };
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "flex-start", padding: "8px 10px", borderRadius: 10, background: c.bg, border: `1px solid ${c.bd}`, color: c.fg, fontSize: 12, fontWeight: 600, lineHeight: 1.45 }}>
      <I.info size={13} style={{ flex: "0 0 auto", marginTop: 1 }} />
      <span>{children}</span>
    </div>
  );
}

function RegistrationsScreen() {
  const navigate = useNavigate();
  const boot = useBootstrap();
  const canEdit = !!boot?.staff?.canRegEdit;

  const [target, setTarget] = useState<StaffEmployeeHit | null>(null);
  const [date, setDate] = useState(ymdVN());
  const [board, setBoard] = useState<RegistrationBoard | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Bản nháp: meal_time_id ➝ menu_line_id (null = bỏ suất ca đó).
  const [draft, setDraft] = useState<Record<number, number | null>>({});

  const load = useCallback(async () => {
    if (!target) return;
    setStatus("loading");
    setBoard(null);
    setDraft({});
    try {
      const b = await fetchRegistrationBoard(target.id, date);
      setBoard(b);
      setStatus("ready");
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Không tải được đăng ký của ngày này");
      setStatus("error");
    }
  }, [target, date]);

  useEffect(() => {
    if (!target) {
      setStatus("idle");
      setBoard(null);
      setDraft({});
      return;
    }
    void load();
  }, [target, date, load]);

  /** Món đang chọn của một ca = bản nháp nếu đã đụng, còn không thì đơn hiện có. */
  const pickOf = (shiftId: number): number | null => (shiftId in draft ? draft[shiftId] : (board?.orders[shiftId]?.menu_line_id ?? null));

  const dirty = useMemo(() => {
    if (!board) return false;
    return Object.keys(draft).some((k) => {
      const id = Number(k);
      return draft[id] !== (board.orders[id]?.menu_line_id ?? null);
    });
  }, [draft, board]);

  const submit = async () => {
    if (!board || !target || saving) return;
    // Ca nào có món thì gửi; đơn cũ chưa gắn dòng thực đơn (`menu_line_id` null)
    // KHÔNG diễn đạt được bằng picks — server cố tình bỏ qua chúng, đừng gửi.
    const picks: RegistrationPick[] = [];
    for (const s of board.shifts) {
      const p = pickOf(s.id);
      if (p != null) picks.push({ meal_time_id: s.id, menu_line_id: p });
    }
    setSaving(true);
    try {
      const res = await saveRegistrations(target.id, board.date, picks);
      setBoard(res.board);
      setDraft({});
      toast.success(res.summary);
    } catch (e: any) {
      toast.error(e?.message ?? "Lưu không thành công");
      void load();
    }
    setSaving(false);
  };

  return (
    <div style={{ height: "100%", background: "var(--bg-page)", display: "flex", flexDirection: "column" }}>
      <ScreenHeader
        title="Sửa đăng ký"
        subtitle={target ? (canEdit ? "Sửa được tới khi bữa ăn kết thúc" : "Chỉ xem — bạn không có quyền sửa") : "Chọn nhân viên cần sửa đăng ký"}
        onBack={() => navigate("/profile")}
        right={
          boot?.staff?.canProxy ? (
            <button
              onClick={() => navigate("/admin/proxy")}
              title="Đặt món hộ"
              style={{ width: 38, height: 38, borderRadius: 11, border: "1px solid var(--border-subtle)", background: "var(--bg-surface)", color: "var(--fg-1)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              <I.calendar size={18} />
            </button>
          ) : undefined
        }
      />

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px calc(var(--safe-bottom) + 24px)" }} className="no-scrollbar">
        {!target ? (
          <>
            <EmployeePicker hint="Tìm theo mã nhân viên cho chắc — trùng tên là chuyện thường." onPick={setTarget} />
            <p style={{ margin: "16px 4px 0", fontSize: 13, lineHeight: 1.55, color: "var(--fg-3)" }}>
              Dùng khi việc phát sinh <b>sau</b> hạn chốt 48h: điều tăng ca, nghỉ đột xuất, đổi ca. Suất đã nhận cơm hoặc bữa đã xong thì không sửa được nữa.
            </p>
          </>
        ) : (
          <>
            <TargetBanner name={target.full_name} sub={target.department ?? target.employee_code} verb={canEdit ? "Đang sửa đăng ký cho" : "Đang xem đăng ký của"} onChange={() => setTarget(null)} />

            {/* Chọn ngày */}
            <div className="no-scrollbar" style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 10 }}>
              {DAY_WINDOW.map((d) => {
                const on = d === date;
                const today = d === ymdVN();
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDate(d)}
                    style={{
                      flex: "0 0 auto",
                      width: 52,
                      padding: "7px 0 6px",
                      borderRadius: 14,
                      border: `1px solid ${on ? "var(--fd-wd-solid)" : today ? "#8FD3B0" : "var(--border-subtle)"}`,
                      background: on ? "var(--fd-wd-solid)" : "var(--bg-surface)",
                      color: on ? "var(--fd-wd-on-solid)" : d < ymdVN() ? "var(--fg-3)" : "var(--fg-2)",
                      cursor: "pointer",
                      font: "inherit",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <span style={{ fontSize: 10.5, fontWeight: 700, opacity: on ? 0.9 : 0.7 }}>{weekdayVN(d)}</span>
                    <span className="tnum" style={{ fontSize: 15, fontWeight: 800, fontFamily: "var(--font-display)" }}>{d.slice(8, 10)}</span>
                  </button>
                );
              })}
            </div>

            {status === "loading" && <LoadingBlock rows={2} />}
            {status === "error" && <ErrorBlock message={error ?? "Không tải được"} onRetry={() => void load()} />}

            {status === "ready" && board && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "2px 4px 10px", fontSize: 12.5, fontWeight: 700, color: "var(--fg-2)" }}>
                  <I.calendar size={14} />
                  <span className="tnum">{board.dateLabel}</span>
                </div>

                {board.shifts.length === 0 && <div style={{ textAlign: "center", color: "var(--fg-3)", fontSize: 13.5, padding: "26px 12px", lineHeight: 1.55 }}>Ngày này bếp không lên thực đơn và nhân viên cũng chưa có suất nào.</div>}

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {board.shifts.map((s) => {
                    const st = board.shiftStates[s.id];
                    const cur = board.orders[s.id];
                    const picked = pickOf(s.id);
                    const dishes = sortDishes(board.menus[s.id] ?? []);
                    const locked = !canEdit || !!st?.locked;
                    const legacy = cur != null && cur.menu_line_id === null;
                    return (
                      <section key={s.id} style={{ ...cardS, padding: 13, display: "flex", flexDirection: "column", gap: 8 }}>
                        <header style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15 }}>{s.name}</div>
                            <div className="tnum" style={{ fontSize: 11.5, color: "var(--fg-3)" }}>
                              {s.start_time}–{s.end_time}
                            </div>
                          </div>
                          {cur && (
                            <span style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: cur.entitlement === "none" ? "var(--bg-muted)" : "var(--fd-wd-solid)", color: cur.entitlement === "none" ? "var(--fg-3)" : "var(--fd-wd-on-solid)" }}>
                              {cur.picked_up ? "Đã nhận cơm" : cur.entitlement === "ot" ? "Suất tăng ca" : cur.entitlement === "none" ? "Không tính suất" : "Đã đăng ký"}
                            </span>
                          )}
                        </header>

                        {st?.locked && st.lockReason && <Warn tone="red">{st.lockReason}</Warn>}
                        {!st?.locked && st?.overCookLock && <Warn tone="red">Bếp đã chốt số ca này{st.cookLockLabel ? ` (${st.cookLockLabel})` : ""} — thêm suất lúc này là bếp phải nấu thêm thật, nhớ báo bếp.</Warn>}
                        {!st?.locked && !st?.overCookLock && st?.overCutoff && <Warn tone="amber">Đã qua hạn chốt của nhân viên{st.cutoffLabel ? ` (${st.cutoffLabel})` : ""} — bếp nấu theo số cũ, sửa xong nhớ báo bếp.</Warn>}
                        {legacy && <Warn tone="amber">Suất này là đơn cũ chưa gắn dòng thực đơn ({cur?.dish_name}) — sửa trên web, màn này giữ nguyên.</Warn>}

                        {dishes.length === 0 ? (
                          <div style={{ fontSize: 13, color: "var(--fg-3)" }}>Không có thực đơn cho ca này{cur ? `; suất đang đăng ký: ${cur.dish_name}` : ""}.</div>
                        ) : (
                          <>
                            <div role={locked ? undefined : "radiogroup"} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                              {dishes.map((d) => (
                                <DishSlot
                                  key={d.menu_line_id}
                                  dish={d}
                                  chosen={picked === d.menu_line_id}
                                  locked={locked}
                                  entitlement={picked === d.menu_line_id ? cur?.entitlement : undefined}
                                  onPick={() => setDraft((x) => ({ ...x, [s.id]: picked === d.menu_line_id ? null : d.menu_line_id }))}
                                />
                              ))}
                            </div>
                            {picked != null && !locked && (
                              <button
                                type="button"
                                onClick={() => setDraft((x) => ({ ...x, [s.id]: null }))}
                                style={{ alignSelf: "flex-start", fontSize: 11.5, fontWeight: 700, color: "var(--fd-lock)", background: "transparent", border: "none", padding: "2px", cursor: "pointer", font: "inherit" }}
                              >
                                Bỏ suất ca này
                              </button>
                            )}
                          </>
                        )}
                      </section>
                    );
                  })}
                </div>

                {canEdit && board.shifts.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <Btn full size="lg" disabled={!dirty || saving} onClick={submit} icon={<I.checkCircle size={18} />}>
                      {saving ? "Đang lưu…" : dirty ? "Lưu thay đổi" : "Chưa có thay đổi"}
                    </Btn>
                    <p style={{ margin: "10px 4px 0", fontSize: 12, lineHeight: 1.5, color: "var(--fg-3)", textAlign: "center" }}>Cả ngày được ghi trong một lần — một ca sai thì không ca nào được lưu.</p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function RegistrationsPage() {
  return (
    <StaffGuard need="canRegView">
      <RegistrationsScreen />
    </StaffGuard>
  );
}
