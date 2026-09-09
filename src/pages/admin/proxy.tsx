// GoEat ZMA — ĐẶT MÓN HỘ (nhân sự đặt cả tuần thay nhân viên).
//
// Đây là đường "đặt món thường", chỉ khác ở chỗ người bấm không phải người ăn:
// mọi cú chạm vẫn qua `batchPlaceOrUpdateOrders` nên HẠN CHỐT 48h của nhân viên
// vẫn giữ nguyên. Việc phát sinh SAU hạn chốt (điều tăng ca, nghỉ đột xuất) là
// việc của màn "Sửa đăng ký" — cố ý tách, không gộp.
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { I } from "@/components/icons";
import { ScreenHeader } from "@/components/ui";
import StaffGuard from "@/components/staff-guard";
import { EmployeePicker, TargetBanner } from "@/components/admin/employee-picker";
import { ProxyDayCard } from "@/components/admin/proxy-day-card";
import { ErrorBlock, LoadingBlock } from "@/components/ordering/status";
import { useProxyWeek } from "@/state/proxy-ordering";
import { dayKind, weekdayVN, weekRangeLabel, ymdVN } from "@/lib/date-vn";
import { countPortions, useBootstrap } from "@/state/ordering";
import type { StaffEmployeeHit } from "@/api/types";

type WeekTab = "this" | "next";

function ProxyScreen() {
  const navigate = useNavigate();
  const boot = useBootstrap();
  const [target, setTarget] = useState<StaffEmployeeHit | null>(null);
  const { data, status, error, reload, isCellLocked, toggleDish, clearCell, saving, savedFlash } = useProxyWeek(target?.id ?? null);
  const [tab, setTab] = useState<WeekTab>("this");
  const [activeDate, setActiveDate] = useState("");

  const rawDays = useMemo(() => (data ? (tab === "this" ? data.thisWeek : data.nextWeek) : []), [data, tab]);
  const days = useMemo(
    () =>
      rawDays.filter((d) => {
        if (dayKind(d.date) !== "sun") return true;
        return Object.values(d.menus).some((m) => m && m.length > 0) || Object.keys(d.orders).length > 0;
      }),
    [rawDays],
  );

  useEffect(() => {
    if (days.length === 0) return;
    if (days.some((d) => d.date === activeDate)) return;
    const today = ymdVN();
    const firstOpen = days.find((d) => !(data?.shifts ?? []).every((s) => isCellLocked(d, s.id)));
    setActiveDate(days.some((d) => d.date === today) ? today : (firstOpen?.date ?? days[0].date));
  }, [days, data, activeDate, isCellLocked]);

  // Đổi người thì quay về tuần này — người mới, lịch mới.
  useEffect(() => {
    setTab("this");
    setActiveDate("");
  }, [target?.id]);

  const idx = days.findIndex((d) => d.date === activeDate);
  const day = days[idx >= 0 ? idx : 0];

  return (
    <div style={{ height: "100%", background: "var(--bg-page)", display: "flex", flexDirection: "column" }}>
      <ScreenHeader
        title="Đặt món hộ"
        subtitle={target ? "Mọi thay đổi lưu ngay cho nhân viên" : "Chọn nhân viên cần đặt hộ"}
        onBack={() => navigate("/profile")}
        right={
          boot?.staff?.canRegEdit ? (
            <button
              onClick={() => navigate("/admin/registrations")}
              title="Sửa đăng ký"
              style={{ width: 38, height: 38, borderRadius: 11, border: "1px solid var(--border-subtle)", background: "var(--bg-surface)", color: "var(--fg-1)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              <I.edit size={18} />
            </button>
          ) : undefined
        }
      />

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px calc(var(--safe-bottom) + 24px)" }} className="no-scrollbar">
        {!target ? (
          <>
            <EmployeePicker hint="Tìm theo mã nhân viên cho chắc — trùng tên là chuyện thường." onPick={setTarget} />
            <p style={{ margin: "16px 4px 0", fontSize: 13, lineHeight: 1.55, color: "var(--fg-3)" }}>
              Đặt hộ đi đúng đường nhân viên tự đặt, nên vẫn theo <b>hạn chốt 48h</b>. Nếu ca đã quá hạn mà vẫn phải thêm/bỏ suất (điều tăng ca, nghỉ đột xuất) thì dùng <b>Sửa đăng ký</b>.
            </p>
          </>
        ) : (
          <>
            <TargetBanner name={target.full_name} sub={target.department ?? target.employee_code} verb="Đang đặt hộ" onChange={() => setTarget(null)} />

            {status === "loading" && <LoadingBlock />}
            {status === "error" && <ErrorBlock message={error ?? "Không tải được thực đơn"} onRetry={() => reload()} />}

            {status === "ready" && data && (
              <>
                {/* Tuần này / Tuần sau */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
                  <div role="tablist" style={{ display: "inline-flex", gap: 2, padding: 2, borderRadius: 999, background: "var(--fd-wd-track)" }}>
                    {(["this", "next"] as WeekTab[]).map((t) => {
                      const on = tab === t;
                      const n = countPortions(t === "this" ? data.thisWeek : data.nextWeek);
                      return (
                        <button
                          key={t}
                          role="tab"
                          aria-selected={on}
                          onClick={() => setTab(t)}
                          style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 12px", borderRadius: 999, border: "none", font: "inherit", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", background: on ? "var(--fd-wd-solid)" : "transparent", color: on ? "var(--fd-wd-on-solid)" : "var(--fg-2)", cursor: "pointer" }}
                        >
                          {t === "this" ? "Tuần này" : "Tuần sau"}
                          {n > 0 && (
                            <span className="tnum" style={{ fontSize: 9.5, fontWeight: 800, padding: "0 5px", borderRadius: 999, background: on ? "rgba(255,255,255,0.25)" : "var(--bg-surface)", color: on ? "#fff" : "var(--fd-wd-deep)" }}>
                              {n}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <span className="tnum" style={{ fontSize: 11.5, fontWeight: 600, color: "var(--fg-3)", whiteSpace: "nowrap" }}>{weekRangeLabel(days)}</span>
                </div>

                {/* Dải ngày T2…CN */}
                <div className="no-scrollbar" style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 10 }}>
                  {days.map((d) => {
                    const on = d.date === day?.date;
                    const n = Object.keys(d.orders).length;
                    return (
                      <button
                        key={d.date}
                        type="button"
                        onClick={() => setActiveDate(d.date)}
                        style={{
                          flex: "0 0 auto",
                          width: 52,
                          padding: "7px 0 6px",
                          borderRadius: 14,
                          border: `1px solid ${on ? "var(--fd-wd-solid)" : "var(--border-subtle)"}`,
                          background: on ? "var(--fd-wd-solid)" : "var(--bg-surface)",
                          color: on ? "var(--fd-wd-on-solid)" : "var(--fg-2)",
                          cursor: "pointer",
                          font: "inherit",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 1,
                        }}
                      >
                        <span style={{ fontSize: 10.5, fontWeight: 700, opacity: on ? 0.9 : 0.7 }}>{weekdayVN(d.date)}</span>
                        <span className="tnum" style={{ fontSize: 15, fontWeight: 800, fontFamily: "var(--font-display)" }}>{d.date.slice(8, 10)}</span>
                        <span style={{ width: 5, height: 5, borderRadius: 999, background: n > 0 ? (on ? "#fff" : "var(--fd-wd-solid)") : "transparent" }} />
                      </button>
                    );
                  })}
                </div>

                {day ? (
                  <ProxyDayCard day={day} shifts={data.shifts} saving={saving} savedFlash={savedFlash} isCellLocked={isCellLocked} onToggle={toggleDish} onClear={clearCell} />
                ) : (
                  <div style={{ textAlign: "center", color: "var(--fg-3)", fontSize: 13.5, padding: "26px 12px" }}>Tuần này chưa có thực đơn nào.</div>
                )}

                <p style={{ margin: "14px 4px 0", display: "flex", gap: 6, fontSize: 12.5, lineHeight: 1.5, color: "var(--fg-3)" }}>
                  <I.info size={14} style={{ flex: "0 0 auto", marginTop: 2 }} />
                  <span>Suất đặt hộ ghi tên bạn là người thao tác. Ca đã quá hạn chốt thì phải sang <b>Sửa đăng ký</b>.</span>
                </p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function ProxyPage() {
  return (
    <StaffGuard need="canProxy">
      <ProxyScreen />
    </StaffGuard>
  );
}
