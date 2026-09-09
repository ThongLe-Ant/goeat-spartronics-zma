// GoEat ZMA — trạng thái ĐẶT MÓN HỘ (nhân sự đặt cho nhân viên khác).
//
// VÌ SAO KHÔNG DÙNG LẠI `useWeekMenu`: hook đó ghi vào atom jotai ở tầm MODULE,
// tức là một kho duy nhất cho cả app, mặc định gắn với người đang đăng nhập.
// Nếu màn đặt hộ dùng chung kho đó thì mở lịch của công nhân A xong, trang
// "Đặt món" của chính nhân sự sẽ hiện đơn của A — và cú chạm tiếp theo lưu
// nhầm người. Nên ở đây state là CỤC BỘ của màn hình: mở ai thì chỉ màn này
// biết, thoát ra là hết.
//
// Luật đặt món thì KHÔNG chép lại: mọi lần chạm vẫn đi qua BFF
// `/api/zma/staff/proxy-order` ➝ `batchPlaceOrUpdateOrders` như nhân viên tự
// đặt, nên hạn chốt 48h, chân trời đăng ký, trần 2 suất/ngày đều do server nói.
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { fetchProxyWeekMenu, proxyBatchOrder } from "@/api/hr";
import type { OrderingFoodItem, WeeklyDay, WeeklyMenuData } from "@/api/types";
import { NO_PORTION_MSG, cellKey } from "./ordering";

type Status = "idle" | "loading" | "ready" | "error";

function patchDay(data: WeeklyMenuData, date: string, fn: (d: WeeklyDay) => WeeklyDay): WeeklyMenuData {
  const map = (days: WeeklyDay[]) => days.map((d) => (d.date === date ? fn(d) : d));
  return { ...data, thisWeek: map(data.thisWeek), nextWeek: map(data.nextWeek) };
}

export function useProxyWeek(employeeId: number | null) {
  const [data, setData] = useState<WeeklyMenuData | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<Record<string, true>>({});
  const [savedFlash, setSavedFlash] = useState<Record<string, number>>({});

  // Hàng đợi ghi tuần tự: server có unique (employee, date, meal_time) nên hai
  // lần chạm nhanh vào cùng ô phải đến server theo đúng thứ tự.
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  const load = useCallback(
    async (silent = false) => {
      if (!employeeId) return;
      if (!silent) setStatus("loading");
      try {
        const d = await fetchProxyWeekMenu(employeeId);
        setData(d);
        setStatus("ready");
        setError(null);
      } catch (e: any) {
        if (!silent) {
          setStatus("error");
          setError(e?.message ?? "Không tải được thực đơn của nhân viên này");
        }
      }
    },
    [employeeId],
  );

  // Đổi người là đổi hẳn dữ liệu — xoá sạch trước khi nạp, đừng để lịch của
  // người trước còn nằm trên màn hình dù chỉ một nhịp.
  useEffect(() => {
    setData(null);
    setSaving({});
    setSavedFlash({});
    setStatus(employeeId ? "loading" : "idle");
    if (employeeId) void load();
  }, [employeeId, load]);

  const isCellLocked = useCallback((day: WeeklyDay, shiftId: number) => day.isLocked || !!day.lockedShifts[shiftId], []);

  const persist = useCallback(
    (day: WeeklyDay, shiftId: number, next: number | null) => {
      if (!employeeId) return;
      const k = cellKey(day.date, shiftId);

      setData((cur) =>
        cur
          ? patchDay(cur, day.date, (d) => {
              const orders = { ...d.orders };
              const entitlements = { ...(d.entitlements ?? {}) };
              if (next == null) {
                delete orders[shiftId];
                delete entitlements[shiftId];
              } else {
                orders[shiftId] = next;
                delete entitlements[shiftId];
              }
              return { ...d, orders, entitlements };
            })
          : cur,
      );
      setSaving((s) => ({ ...s, [k]: true }));

      const run = async () => {
        try {
          const res = await proxyBatchOrder(
            employeeId,
            next == null
              ? { ordersToSave: [], ordersToDelete: [{ meal_date: day.date, meal_time_id: shiftId }] }
              : { ordersToSave: [{ meal_date: day.date, meal_time_id: shiftId, menu_line_id: next }], ordersToDelete: [] },
          );
          if (res.noPortion?.some((c) => c.meal_date === day.date && c.meal_time_id === shiftId)) {
            setData((cur) => (cur ? patchDay(cur, day.date, (d) => ({ ...d, entitlements: { ...(d.entitlements ?? {}), [shiftId]: "none" } })) : cur));
            toast(NO_PORTION_MSG, { icon: "ℹ️", duration: 5000 });
          }
          setSavedFlash((f) => ({ ...f, [k]: Date.now() }));
          setTimeout(() => setSavedFlash((f) => (f[k] ? { ...f, [k]: 0 } : f)), 2200);
        } catch (e: any) {
          toast.error(e?.message ?? "Lưu không thành công");
          // Nạp lại là nguồn đúng duy nhất — hoàn tay bằng giá trị cũ trong
          // closure sẽ xoá mất lựa chọn mới nếu người dùng đã bấm tiếp.
          void load(true);
        }
        setSaving((s) => {
          const n = { ...s };
          delete n[k];
          return n;
        });
      };
      queue.current = queue.current.then(run, run);
    },
    [employeeId, load],
  );

  const toggleDish = useCallback(
    (day: WeeklyDay, shiftId: number, dish: OrderingFoodItem) => {
      if (isCellLocked(day, shiftId)) return;
      const cur = day.orders[shiftId];
      if (cur == null || cur !== dish.menu_line_id) {
        const others = Object.keys(day.orders).filter((sid) => Number(sid) !== shiftId && day.entitlements?.[Number(sid)] !== "none").length;
        if (others >= 2) {
          toast.error("Mỗi ngày chỉ được đăng ký tối đa 2 suất ăn (1 ca chính + 1 tăng ca). Bỏ chọn ca khác trước.");
          return;
        }
      }
      persist(day, shiftId, cur === dish.menu_line_id ? null : dish.menu_line_id);
    },
    [isCellLocked, persist],
  );

  const clearCell = useCallback(
    (day: WeeklyDay, shiftId: number) => {
      if (isCellLocked(day, shiftId) || day.orders[shiftId] == null) return;
      persist(day, shiftId, null);
    },
    [isCellLocked, persist],
  );

  return { data, status, error, reload: load, isCellLocked, toggleDish, clearCell, saving, savedFlash };
}
