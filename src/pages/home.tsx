// GoEat ZMA — Trang chủ "Hôm nay" (Redesign 2026-09-08)
// Cấu trúc 3 tầng tối ưu trải nghiệm công nhân:
//   1. Chào + Thẻ nhân viên tinh gọn
//   2. Tấm vé suất ăn hôm nay (Digital Meal Pass) — phản ứng linh hoạt theo 4 trạng thái,
//      tích hợp mini QR đọc tại quầy, CTA đúng ngữ cảnh (không hiện nút nhận cơm khi không có suất)
//   3. Cảnh báo hạn chốt động (Smart Deadline Alert) — chỉ hiện khi có ca sắp khoá cần đặt
//   4. Lịch đăng ký các ngày sắp tới — thay thế phần thực đơn hôm nay đã bị khoá
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppImg } from "@/components/ui";
import { GreenHeader, glassTag } from "@/components/green-header";
import { I } from "@/components/icons";
import { QRCode } from "@/components/qr-code";
import { DishSlot } from "@/components/ordering/dish-slot";
import { dishLook, kindLabel, sortDishes } from "@/components/ordering/dish-icon";
import { ShiftChips } from "@/components/ordering/shift-chips";
import { ErrorBlock, LoadingBlock } from "@/components/ordering/status";
import type { WeeklyDay, WeeklyShift } from "@/api/types";
import { cutoffText, dayKind, dayMonth, hmVN, splitDishName, weekdayFullVN, ymdVN } from "@/lib/date-vn";
import { usePickupCard } from "@/state/pickup";
import { autoDishOf, cellKey, useBootstrap, useWeekMenu } from "@/state/ordering";

export default function HomePage() {
  const navigate = useNavigate();
  const boot = useBootstrap();
  const { data, status, error, reload, toggleDish, clearCell, isCellLocked, saving, savedFlash } = useWeekMenu();
  const card = usePickupCard();
  const today = ymdVN();
  const emp = boot?.employee;

  const todayDay = useMemo(() => data?.thisWeek.find((d) => d.isToday) ?? null, [data]);
  const openShifts = useMemo(
    () => (data && todayDay ? data.shifts.filter((s) => (todayDay.menus[s.id]?.length ?? 0) > 0) : []),
    [data, todayDay],
  );

  // Danh sách các ca mà nhân viên CÓ SUẤT ĂN HÔM NAY (đã đặt hoặc có suất cấp từ backend)
  const registeredShifts = useMemo(() => {
    if (!todayDay || !data) return [];
    return openShifts.filter((s) => {
      const hasOrder = todayDay.orders[s.id] != null;
      const m = card.data?.meals.find((x) => x.meal_time_id === s.id);
      const hasMeal = !!m?.food_name && m.entitlement !== "none";
      return hasOrder || hasMeal;
    });
  }, [openShifts, todayDay, data, card.data?.meals]);

  // Các ca hiển thị trên tấm vé hôm nay:
  // - Nếu đã có suất (1 hoặc 2 ca): CHỈ HIỂN THỊ CÁC CA ĐÃ ĐẶT NÀY (tối đa 2 ca theo quy định nhà máy: 1 suất chính + 1 tăng ca, tuyệt đối không hiện cả 3 ca)
  // - Nếu chưa đặt ca nào:
  //    + Nếu còn ca mở: hiển thị ca mở để nhân viên chọn món (tối đa 2 ca)
  //    + Nếu đều đã khoá: hiển thị 1 ca đại diện
  const displayShifts = useMemo(() => {
    if (registeredShifts.length > 0) {
      return registeredShifts.slice(0, 2);
    }
    const openToOrder = openShifts.filter((s) => todayDay && !isCellLocked(todayDay, s.id));
    if (openToOrder.length > 0) return openToOrder.slice(0, 2);
    return openShifts.slice(0, 1);
  }, [registeredShifts, openShifts, todayDay, isCellLocked]);

  // Ca đang xem: ưu tiên ca có suất ➝ ca còn mở ➝ ca đầu.
  const preferred =
    registeredShifts[0]?.id ??
    displayShifts[0]?.id ??
    openShifts[0]?.id ??
    0;
  const [active, setActive] = useState<number>(preferred);
  useEffect(() => {
    if (!displayShifts.some((s) => s.id === active)) setActive(preferred);
  }, [displayShifts, active, preferred]);

  const shift = openShifts.find((s) => s.id === active) ?? null;
  const dishes = useMemo(() => sortDishes(todayDay?.menus[active] ?? []), [todayDay, active]);
  const picked = todayDay?.orders[active];
  const locked = todayDay && shift ? isCellLocked(todayDay, active) : true;
  const autoDish = autoDishOf(todayDay?.menus[active]);
  const entitlement = todayDay?.entitlements?.[active];
  const k = todayDay ? cellKey(todayDay.date, active) : "";
  const cellSaving = !!saving[k];
  const justSaved = !!savedFlash[k];

  // Suất hôm nay của ca đang xem (tên món, khung giờ phát, đã nhận chưa).
  const meal = card.data?.meals.find((m) => m.meal_time_id === active) ?? null;
  const pickedDish = picked != null ? dishes.find((d) => d.menu_line_id === picked) ?? null : null;
  const isPickedDish = picked != null;
  const isDefaultPortion = !isPickedDish && (!!meal?.food_name || (entitlement != null && entitlement !== "none"));
  const hasPortion = isPickedDish || isDefaultPortion || (!!meal?.food_name && meal.entitlement !== "none");
  const todayDishName = pickedDish?.name ?? meal?.food_name ?? (hasPortion || !locked ? autoDish?.name ?? null : null);
  const isPickedUp = !!meal?.picked_up;

  // Cảnh báo hạn chốt thông minh: tìm ca sắp khoá gần nhất mà nhân viên chưa chọn món
  const deadlineAlert = useMemo(() => {
    if (!data) return null;
    const allDays = [...data.thisWeek, ...data.nextWeek];
    for (const d of allDays) {
      if (d.date < today) continue;
      for (const s of data.shifts) {
        if ((d.menus[s.id]?.length ?? 0) === 0) continue;
        const cellLocked = isCellLocked(d, s.id);
        const hasOrder = d.orders[s.id] != null;
        if (!cellLocked && !hasOrder) {
          return {
            day: d,
            shift: s,
            cutoff: cutoffText(s),
          };
        }
      }
    }
    return null;
  }, [data, today, isCellLocked]);

  // Các ngày sắp tới có thực đơn — tối đa 4 ngày
  const upcoming = useMemo(() => {
    if (!data) return [];
    return [...data.thisWeek, ...data.nextWeek]
      .filter((d) => d.date > today && data.shifts.some((s) => (d.menus[s.id]?.length ?? 0) > 0))
      .slice(0, 4);
  }, [data, today]);

  // Kiểm tra xem tất cả các ngày sắp tới đã được đặt đầy đủ chưa
  const allUpcomingOrdered = useMemo(() => {
    if (!data || upcoming.length === 0) return false;
    return upcoming.every((d) =>
      data.shifts.some((s) => (d.menus[s.id]?.length ?? 0) > 0 && d.orders[s.id] != null),
    );
  }, [data, upcoming]);

  const qrScanValue = card.data?.scan_value ?? emp?.card_number ?? emp?.employee_code ?? "";

  return (
    <div style={{ height: "100%", overflowY: "auto", background: "var(--ge-sage)" }} className="no-scrollbar">
      {/* 1. Chào + Thẻ nhân viên trên header xanh thương hiệu */}
      <GreenHeader>
        <div style={{ display: "flex", alignItems: "center", gap: 12, paddingRight: 96 }}>
          <AppImg
            src={emp?.avatar_url ?? ""}
            radius={999}
            style={{ width: 48, height: 48, flexShrink: 0, border: "2.5px solid rgba(255,255,255,0.9)", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ge-on-header)" }}>Xin chào 👋</div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: 18,
                letterSpacing: "-0.01em",
                color: "#fff",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {emp?.full_name ?? "Đang tải…"}
            </div>
          </div>
        </div>
        {emp && (
          <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap", paddingRight: 96 }}>
            <span className="tnum" style={glassTag}>
              {emp.employee_code}
            </span>
            {emp.department && (
              <span style={{ ...glassTag, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>
                {emp.department}
              </span>
            )}
          </div>
        )}
      </GreenHeader>

      {status === "loading" && !data ? (
        <div style={{ position: "relative", zIndex: 2, marginTop: -34, padding: "0 16px 28px" }}>
          <LoadingBlock rows={3} />
        </div>
      ) : status === "error" && !data ? (
        <div style={{ position: "relative", zIndex: 2, marginTop: -34, padding: "0 16px 28px" }}>
          <ErrorBlock message={error ?? "Không tải được thực đơn"} onRetry={() => reload()} />
        </div>
      ) : data ? (
        <div style={{ position: "relative", zIndex: 2, marginTop: -34, padding: "0 16px calc(var(--safe-bottom) + 112px)", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* 2. TẤM VÉ SUẤT ĂN HÔM NAY (Digital Meal Pass) */}
          <section>
            <div
              style={{
                background: "#ffffff",
                border: "1px solid rgba(0, 0, 0, 0.06)",
                borderRadius: 22,
                overflow: "hidden",
                boxShadow: "0 14px 34px -6px rgba(10, 45, 30, 0.18), 0 3px 10px rgba(0, 0, 0, 0.04)",
              }}
            >
              {/* Dải tiêu đề vé — Phong cách Boarding Pass hạng sang với huy hiệu vàng kim Spartronics */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  background: "linear-gradient(135deg, #093321 0%, #0F4D33 100%)",
                  color: "#ffffff",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 26,
                      height: 26,
                      borderRadius: 8,
                      background: "rgba(226, 186, 93, 0.16)",
                      color: "#E2BA5D",
                      border: "1px solid rgba(226, 186, 93, 0.35)",
                    }}
                  >
                    <I.utensils size={14} sw={2.2} />
                  </span>
                  <div>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 13, letterSpacing: "0.05em", textTransform: "uppercase", color: "#E2BA5D" }}>
                      SPARTRONICS MEAL PASS
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="tnum" style={{ fontSize: 12, fontWeight: 700, color: "#ffffff" }}>
                    {weekdayFullVN(today)}
                  </div>
                  <div className="tnum" style={{ fontSize: 10.5, fontWeight: 500, color: "rgba(255, 255, 255, 0.75)", marginTop: 1 }}>
                    {dayMonth(today)}
                  </div>
                </div>
              </div>

              <div style={{ padding: 14 }}>
                {!todayDay || openShifts.length === 0 ? (
                  /* Bếp nghỉ hoặc hôm nay chưa có thực đơn */
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "8px 0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 52,
                          height: 52,
                          borderRadius: 16,
                          flexShrink: 0,
                          background: "var(--fd-wd-track)",
                          color: "var(--fd-wd-deep)",
                        }}
                      >
                        <I.utensilsX size={24} sw={1.8} />
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--fd-wd-deep)" }}>
                          {dayKind(today) === "sun" ? "Bếp nghỉ hôm nay" : "Hôm nay chưa có thực đơn"}
                        </p>
                        <p style={{ margin: "3px 0 0", fontSize: 12.5, color: "var(--fg-3)" }}>
                          Bạn có thể đăng ký suất ăn cho các ngày sắp tới.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate("/weekly")}
                      style={{
                        marginTop: 4,
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        padding: "11px 14px",
                        borderRadius: 14,
                        border: "none",
                        cursor: "pointer",
                        font: "inherit",
                        fontWeight: 700,
                        fontSize: 14,
                        background: "var(--fd-wd-solid)",
                        color: "#fff",
                      }}
                    >
                      <I.calendar size={17} /> Đăng ký suất ăn các ngày tới
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Bộ chuyển ca — CHỈ HIỂN THỊ KHI CÓ TỪ 2 CA TRỞ LÊN (tối đa 2 ca: Ca chính + Ca tăng ca) */}
                    {displayShifts.length > 1 && (
                      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                        {displayShifts.map((s) => {
                          const on = s.id === active;
                          const m = card.data?.meals.find((x) => x.meal_time_id === s.id);
                          const hasS = todayDay.orders[s.id] != null || (!!m?.food_name && m.entitlement !== "none");
                          const cellLocked = isCellLocked(todayDay, s.id);
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => setActive(s.id)}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 5,
                                padding: "6px 14px",
                                borderRadius: 999,
                                cursor: "pointer",
                                font: "inherit",
                                fontWeight: 700,
                                fontSize: 13,
                                whiteSpace: "nowrap",
                                background: on ? "linear-gradient(180deg, #0D4D33 0%, #0A3C28 100%)" : "#F8FAFC",
                                color: on ? "#ffffff" : "#475569",
                                border: on ? "1px solid transparent" : "1px solid #E2E8F0",
                                boxShadow: on ? "0 2px 8px rgba(10, 60, 40, 0.3)" : "none",
                                transition: "background 140ms ease, color 140ms ease",
                              }}
                            >
                              <span>{s.name}</span>
                              {hasS && (
                                <span
                                  style={{
                                    width: 5,
                                    height: 5,
                                    borderRadius: 999,
                                    background: on ? "#ffffff" : "#0D4D33",
                                  }}
                                />
                              )}
                              {cellLocked && (
                                <span style={{ display: "flex", color: on ? "#ffffff" : "var(--fd-lock)" }}>
                                  <I.lock size={11} />
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Khung giờ phát + Huy hiệu trạng thái */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                      <div className="tnum" style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-2)", display: "flex", alignItems: "center", gap: 5 }}>
                        {shift && (
                          <>
                            <span style={{ fontWeight: 700, color: "#0F172A" }}>{shift.name}</span>
                            <span>·</span>
                            <I.clock size={12} sw={2.2} style={{ color: "var(--fd-accent-ink)" }} />
                            <span>Phát cơm {meal?.serve_window ?? `${shift.start_time}–${shift.end_time}`}</span>
                          </>
                        )}
                      </div>
                      <StatusBadge state={isPickedUp ? "done" : isPickedDish ? "ordered" : isDefaultPortion ? "auto" : "none"} />
                    </div>

                    {/* TRƯỜNG HỢP 1: ĐÃ CÓ SUẤT ĂN */}
                    {hasPortion || (todayDishName && !locked) ? (
                      <>
                        {/* Chi tiết món ăn */}
                        <div
                          style={{
                            marginTop: 12,
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            padding: "12px 14px",
                            borderRadius: 16,
                            background: isPickedUp ? "var(--ge-done-bg)" : "#F8FAFC",
                            border: `1px solid ${isPickedUp ? "var(--ge-done-line)" : "#E2E8F0"}`,
                          }}
                        >
                          <span
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: 44,
                              height: 44,
                              borderRadius: 13,
                              flexShrink: 0,
                              background: "#FFFFFF",
                              color: "#0D4D33",
                              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
                              border: "1px solid #EEF2F6",
                            }}
                          >
                            <I.utensils size={21} sw={2} />
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <DishTitle name={todayDishName!} />
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                              {pickedDish && kindLabel(pickedDish) && (
                                <span
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: dishLook(pickedDish).ink,
                                    background: "var(--bg-surface)",
                                    padding: "2px 7px",
                                    borderRadius: 6,
                                  }}
                                >
                                  {kindLabel(pickedDish)}
                                </span>
                              )}
                              {picked == null && !meal?.food_name && (
                                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--fd-wd-deep)", background: "var(--fd-wd-track)", padding: "2px 7px", borderRadius: 6 }}>
                                  Suất mặc định của ca
                                </span>
                              )}
                              {meal?.entitlement === "ot" && (
                                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--fd-accent-ink)", background: "var(--fd-accent-tint)", padding: "2px 7px", borderRadius: 6 }}>
                                  Tăng ca
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Phần tương tác nhận cơm / QR */}
                        {isPickedUp ? (
                          <div
                            style={{
                              marginTop: 12,
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              padding: "10px 14px",
                              borderRadius: 12,
                              background: "var(--ge-done-bg)",
                              border: "1px solid var(--ge-done-line)",
                              color: "var(--ge-done-ink)",
                              fontSize: 12.5,
                              fontWeight: 600,
                            }}
                          >
                            <I.checkCircle size={17} sw={2.4} style={{ flexShrink: 0 }} />
                            <span>
                              Đã nhận cơm lúc <strong className="tnum">{meal?.pickup_time ? hmVN(new Date(meal.pickup_time)) : "hôm nay"}</strong>. Chúc bạn ngon miệng!
                            </span>
                          </div>
                        ) : (
                          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                            {/* Đường xé vé điện tử (Ticket Notch & Perforation) */}
                            <div
                              style={{
                                position: "relative",
                                margin: "4px -14px 6px",
                                display: "flex",
                                alignItems: "center",
                              }}
                            >
                              {/* Khuyết vé tròn bên trái */}
                              <div
                                style={{
                                  width: 16,
                                  height: 16,
                                  borderRadius: "0 999px 999px 0",
                                  background: "var(--ge-sage)",
                                  boxShadow: "inset -2px 0 3px rgba(0, 0, 0, 0.08)",
                                  flexShrink: 0,
                                }}
                              />
                              {/* Đường đục lỗ xé vé */}
                              <div
                                style={{
                                  flex: 1,
                                  height: 0,
                                  borderTop: "1.5px dashed #CBD5E1",
                                  margin: "0 8px",
                                }}
                              />
                              {/* Khuyết vé tròn bên phải */}
                              <div
                                style={{
                                  width: 16,
                                  height: 16,
                                  borderRadius: "999px 0 0 999px",
                                  background: "var(--ge-sage)",
                                  boxShadow: "inset 2px 0 3px rgba(0, 0, 0, 0.08)",
                                  flexShrink: 0,
                                }}
                              />
                            </div>

                            {/* Khung Mini QR chạm để mở toàn màn hình */}
                            <div
                              onClick={() => navigate("/qr")}
                              role="button"
                              tabIndex={0}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 14,
                                padding: "12px 14px",
                                borderRadius: 16,
                                background: "#F8FAFC",
                                border: "1px solid #E2E8F0",
                                cursor: "pointer",
                              }}
                            >
                              <div
                                style={{
                                  padding: 4,
                                  background: "#ffffff",
                                  borderRadius: 10,
                                  border: "1px solid #E2E8F0",
                                  boxShadow: "0 2px 6px rgba(0, 0, 0, 0.04)",
                                  flexShrink: 0,
                                }}
                              >
                                <QRCode value={qrScanValue} size={64} fg="#0D4D33" />
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0F172A", display: "flex", alignItems: "center", gap: 4 }}>
                                  Mã nhận cơm tại quầy <I.chevR size={14} style={{ color: "#64748B" }} />
                                </div>
                                <div className="tnum" style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                                  Mã NV: <strong style={{ color: "#0F172A" }}>{emp?.employee_code ?? "—"}</strong>
                                </div>
                                <div style={{ fontSize: 11.5, color: "#0D4D33", fontWeight: 700, marginTop: 3 }}>
                                  Chạm để mở mã QR lớn
                                </div>
                              </div>
                            </div>

                            {/* Nút chính */}
                            <button
                              type="button"
                              onClick={() => navigate("/qr")}
                              style={{
                                width: "100%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 8,
                                padding: "13px 16px",
                                borderRadius: 14,
                                border: "none",
                                cursor: "pointer",
                                font: "inherit",
                                fontWeight: 700,
                                fontSize: 14.5,
                                background: "linear-gradient(180deg, #136943 0%, #0A452B 100%)",
                                color: "#ffffff",
                                boxShadow: "0 6px 18px -3px rgba(10, 69, 43, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15)",
                              }}
                            >
                              <I.qr size={18} sw={2.2} />
                              Mở mã QR nhận cơm
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      /* TRƯỜNG HỢP 2: CHƯA ĐẶT VÀ KHÔNG CÓ SUẤT */
                      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 12,
                            padding: "13px 14px",
                            borderRadius: 16,
                            background: "#F8FAFC",
                            border: "1px solid #E2E8F0",
                          }}
                        >
                          <span
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: 42,
                              height: 42,
                              borderRadius: 12,
                              flexShrink: 0,
                              background: "#FFFFFF",
                              color: "#64748B",
                              boxShadow: "0 2px 6px rgba(0, 0, 0, 0.05)",
                            }}
                          >
                            <I.utensilsX size={20} sw={2} />
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14.5, color: "#1E293B" }}>
                              {locked ? "Hôm nay không có suất ăn" : "Chưa chọn món hôm nay"}
                            </div>
                            <div style={{ fontSize: 12, color: "#64748B", marginTop: 3, lineHeight: 1.45 }}>
                              {locked ? "Hôm nay đã qua hạn chốt suất và bạn chưa đăng ký món." : "Ca ăn hôm nay vẫn còn mở. Hãy chọn món ở bên dưới để bếp phục vụ bạn."}
                            </div>
                          </div>
                        </div>

                        {/* CTA thông minh: Thay vì nút 'Hiện mã nhận cơm' vô nghĩa, dẫn sang đặt món tuần tới! */}
                        <button
                          type="button"
                          onClick={() => navigate("/weekly")}
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8,
                            padding: "12px 14px",
                            borderRadius: 14,
                            border: "none",
                            cursor: "pointer",
                            font: "inherit",
                            fontWeight: 700,
                            fontSize: 14,
                            background: "var(--fd-wd-solid)",
                            color: "#fff",
                            boxShadow: "0 6px 16px -4px rgba(20,114,76,0.35)",
                          }}
                        >
                          <I.calendar size={17} /> Đăng ký suất ăn các ngày tới <I.chevR size={15} />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </section>

          {/* 3. CẢNH BÁO HẠN CHỐT ĐỘNG (Smart Actionable Alert) */}
          {deadlineAlert ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 14px",
                borderRadius: 16,
                background: "#ffffff",
                border: "1px solid color-mix(in srgb, var(--fd-accent-solid) 32%, transparent)",
                boxShadow: "0 2px 8px -2px rgba(226, 86, 12, 0.12), var(--shadow-xs)",
              }}
            >
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 11,
                  background: "var(--fd-accent-tint)",
                  color: "var(--fd-accent-solid)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <I.bell size={18} sw={2.2} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--fd-accent-ink)", letterSpacing: "-0.01em" }}>
                  Sắp khoá: {deadlineAlert.shift.name} · {weekdayFullVN(deadlineAlert.day.date)} ({dayMonth(deadlineAlert.day.date)})
                </div>
                <div className="tnum" style={{ fontSize: 11.5, color: "var(--fg-2)", marginTop: 2, lineHeight: 1.35 }}>
                  {deadlineAlert.cutoff} · Bạn chưa chọn món
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate("/weekly")}
                style={{
                  padding: "7px 14px",
                  borderRadius: 999,
                  border: "none",
                  background: "var(--fd-accent-solid)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 12.5,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  boxShadow: "0 3px 8px -1px rgba(226, 86, 12, 0.35)",
                }}
              >
                Đặt ngay
              </button>
            </div>
          ) : allUpcomingOrdered ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                borderRadius: 16,
                background: "var(--ge-done-bg)",
                border: "1px solid var(--ge-done-line)",
              }}
            >
              <span style={{ color: "var(--ge-done-ink)", display: "flex", flexShrink: 0 }}>
                <I.checkCircle size={18} sw={2.4} />
              </span>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ge-done-ink)", flex: 1 }}>
                Bạn đã đăng ký đủ suất ăn cho các ngày sắp tới.
              </span>
              <button
                type="button"
                onClick={() => navigate("/weekly")}
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: "var(--ge-done-ink)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 2,
                  padding: 0,
                }}
              >
                Xem lịch <I.chevR size={13} />
              </button>
            </div>
          ) : null}

          {/* 4. NẾU HÔM NAY VẪN CÒN MỞ ĐỔI MÓN (Trường hợp không bị khoá) */}
          {todayDay && shift && !locked && (
            <section>
              <SectionTitle title={`Thực đơn hôm nay · ${shift.name}`} action="Đặt cả tuần" onAction={() => navigate("/weekly")} />
              <div
                style={{
                  background: "var(--fd-wd-card)",
                  border: "1px solid var(--ge-sage-line)",
                  borderRadius: 20,
                  padding: "12px 12px 10px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  boxShadow: "var(--ge-shadow-card)",
                }}
              >
                <ShiftChips shifts={openShifts} day={todayDay} active={active} onChange={setActive} />
                <div role="radiogroup" style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {dishes.map((d) => (
                    <DishSlot
                      key={d.menu_line_id}
                      dish={d}
                      chosen={picked === d.menu_line_id}
                      auto={picked == null && autoDish?.menu_line_id === d.menu_line_id}
                      locked={false}
                      entitlement={picked === d.menu_line_id ? entitlement : undefined}
                      saving={cellSaving && picked === d.menu_line_id}
                      onPick={() => toggleDish(todayDay, active, d)}
                    />
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 22 }}>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 11, fontWeight: 600, color: "var(--fg-3)", display: "flex", alignItems: "center", gap: 4 }}>
                    {justSaved ? (
                      <span className="ge-savednote" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 700, color: "var(--fd-wd-ink)" }}>
                        <I.check size={12} sw={2.8} /> Đã lưu lựa chọn
                      </span>
                    ) : cutoffText(shift) ? (
                      <>
                        <I.clock size={11} sw={2.2} style={{ flex: "0 0 auto" }} />
                        {cutoffText(shift)}
                      </>
                    ) : null}
                  </span>
                  {picked != null && (
                    <button
                      type="button"
                      onClick={() => clearCell(todayDay, active)}
                      style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: "var(--fd-lock)",
                        background: "transparent",
                        border: "none",
                        padding: "4px 2px",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        font: "inherit",
                      }}
                    >
                      Bỏ chọn ca này
                    </button>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* 5. ĐĂNG KÝ CÁC NGÀY SẮP TỚI (Thay thế cho Thực đơn hôm nay khi đã khoá) */}
          {upcoming.length > 0 && (
            <section>
              <SectionTitle title="Đăng ký các ngày sắp tới" action="Xem cả tuần" onAction={() => navigate("/weekly")} />
              <div
                style={{
                  background: "var(--fd-wd-card)",
                  border: "1px solid var(--ge-sage-line)",
                  borderRadius: 20,
                  overflow: "hidden",
                  boxShadow: "var(--ge-shadow-card)",
                }}
              >
                {upcoming.map((d, i) => (
                  <UpcomingBookingRow
                    key={d.date}
                    day={d}
                    shifts={data.shifts}
                    isCellLocked={isCellLocked}
                    first={i === 0}
                    onClick={() => navigate("/weekly")}
                  />
                ))}
              </div>
            </section>
          )}

          <p style={{ margin: "2px 0 0", textAlign: "center", fontSize: 11.5, color: "var(--fg-4)" }}>
            Suất ăn do công ty hỗ trợ · mỗi ngày tối đa 1 suất chính + 1 tăng ca
          </p>
        </div>
      ) : null}
    </div>
  );
}

const BADGE = {
  done: { label: "Đã nhận cơm", bg: "var(--ge-done-bg)", fg: "var(--ge-done-ink)", icon: I.checkCircle },
  ordered: { label: "Đã chọn món", bg: "var(--fd-wd-track)", fg: "var(--fd-wd-deep)", icon: I.check },
  auto: { label: "Suất mặc định", bg: "var(--fd-wd-track)", fg: "var(--fd-wd-deep)", icon: I.check },
  none: { label: "Chưa có suất", bg: "#F1F5F9", fg: "#64748B", icon: I.info },
} as const;

function StatusBadge({ state }: { state: keyof typeof BADGE }) {
  const b = BADGE[state];
  const Ic = b.icon;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "4px 10px 4px 8px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        background: b.bg,
        color: b.fg,
        whiteSpace: "nowrap",
      }}
    >
      <Ic size={13} sw={2.6} />
      {b.label}
    </span>
  );
}

function DishTitle({ name }: { name: string }) {
  const { main, side } = splitDishName(name);
  const head = { fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 18, letterSpacing: "-0.018em", lineHeight: 1.22 } as const;
  return (
    <>
      <div style={{ ...head, color: "#0F172A" }}>{main}</div>
      {side && <div style={{ ...head, fontSize: 14.5, color: "#475569", marginTop: 2 }}>+ {side}</div>}
    </>
  );
}

function SectionTitle({ title, sub, action, onAction }: { title: string; sub?: string; action?: string; onAction?: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
      <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15, letterSpacing: "-0.01em", color: "var(--fg-1)" }}>
        {title}
      </span>
      {sub && (
        <span className="tnum" style={{ fontSize: 11.5, fontWeight: 600, color: "var(--fg-3)" }}>
          {sub}
        </span>
      )}
      {action && (
        <button
          onClick={onAction}
          style={{
            marginLeft: "auto",
            fontSize: 12.5,
            fontWeight: 700,
            color: "var(--fd-wd-ink)",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 2,
            font: "inherit",
            padding: 0,
          }}
        >
          {action} <I.chevR size={14} />
        </button>
      )}
    </div>
  );
}

const ROW_INK = { weekday: "var(--fd-cal-ink)", sat: "var(--fd-sat-ink)", sun: "var(--fd-sun-ink)" } as const;

/** Dòng đặt cơm ngày sắp tới: số ngày · thứ · món đã chọn / nút chọn món. */
function UpcomingBookingRow({
  day,
  shifts,
  isCellLocked,
  first,
  onClick,
}: {
  day: WeeklyDay;
  shifts: WeeklyShift[];
  isCellLocked: (d: WeeklyDay, sid: number) => boolean;
  first: boolean;
  onClick: () => void;
}) {
  const open = shifts.filter((s) => (day.menus[s.id]?.length ?? 0) > 0);
  const lines = open.map((s) => {
    const pid = day.orders[s.id];
    const dish = pid != null ? day.menus[s.id]?.find((d) => d.menu_line_id === pid) : autoDishOf(day.menus[s.id]);
    const name = dish ? splitDishName(dish.name).main : null;
    return { s, name, chosen: pid != null, locked: isCellLocked(day, s.id) };
  });

  const anyChosen = lines.some((l) => l.chosen);
  const hasOpenUnchosen = lines.some((l) => !l.chosen && !l.locked);
  const allLocked = lines.every((l) => l.locked);
  const kind = dayKind(day.date);

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        textAlign: "left",
        background: "transparent",
        border: "none",
        borderTop: first ? "none" : "1px solid var(--ge-sage-line)",
        cursor: "pointer",
        font: "inherit",
        transition: "background 140ms ease",
      }}
    >
      <span className="ge-daynum" aria-hidden style={{ flexShrink: 0 }}>
        <span className="tnum" style={{ color: ROW_INK[kind] }}>
          {day.date.slice(8, 10)}
        </span>
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--fg-1)" }}>
          {weekdayFullVN(day.date)}
        </div>
        <div className="tnum" style={{ fontSize: 12, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {anyChosen ? (
            <span style={{ color: "var(--fd-wd-deep)", fontWeight: 600 }}>
              {lines
                .filter((l) => l.chosen)
                .map((l) => `${open.length > 1 ? `${l.s.name}: ` : ""}${l.name}`)
                .join(" · ")}
            </span>
          ) : allLocked ? (
            <span style={{ color: "var(--fg-4)" }}>Đã chốt suất · Không đăng ký</span>
          ) : (
            <span style={{ color: "var(--fg-3)", fontWeight: 500 }}>
              Mặc định: <span style={{ color: "var(--fg-2)", fontWeight: 600 }}>{lines[0]?.name ?? "Món mặn 1"}</span>
            </span>
          )}
        </div>
      </div>

      {hasOpenUnchosen ? (
        <span
          style={{
            flexShrink: 0,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            minWidth: 84,
            height: 36,
            padding: "0 14px",
            borderRadius: 999,
            background: "var(--fd-wd-solid)",
            color: "#ffffff",
            fontSize: 13,
            fontWeight: 800,
            boxShadow: "0 3px 8px -1px rgba(20, 114, 76, 0.4)",
            whiteSpace: "nowrap",
          }}
        >
          Chọn món
        </span>
      ) : anyChosen ? (
        <span
          style={{
            flexShrink: 0,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            height: 32,
            padding: "0 11px",
            borderRadius: 999,
            background: "var(--fd-wd-track)",
            color: "var(--fd-wd-deep)",
            border: "1px solid var(--fd-wd-line)",
            fontSize: 12,
            fontWeight: 700,
            whiteSpace: "nowrap",
          }}
        >
          <I.check size={12} sw={2.8} />
          Đã chọn
        </span>
      ) : allLocked ? (
        <span
          style={{
            flexShrink: 0,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            height: 28,
            padding: "0 9px",
            borderRadius: 999,
            background: "var(--bg-muted)",
            color: "var(--fg-4)",
            border: "1px solid var(--border-default)",
            fontSize: 11,
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          <I.lock size={11} />
          Đã chốt
        </span>
      ) : (
        <I.chevR size={16} style={{ color: "var(--fg-4)", flexShrink: 0 }} />
      )}
    </button>
  );
}



