// GoEat ZMA — trạng thái đặt suất ăn (jotai) + lưu ghi-thẳng (write-through).
// Port từ spartronics ordering-client-page.tsx: mỗi lần chạm là một lần lưu,
// lạc quan (optimistic), xếp hàng tuần tự, lỗi thì hoàn về giá trị cũ.
import { atom, useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect } from "react";
import toast from "react-hot-toast";
import { batchOrder, fetchBootstrap, fetchWeekMenu } from "@/api/ordering";
import type { Bootstrap, OrderingFoodItem, WeeklyDay, WeeklyMenuData, WeeklyShift } from "@/api/types";

export const cellKey = (date: string, shiftId: number) => `${date}|${shiftId}`;

export const NO_PORTION_MSG = "Đã ghi nhận món — suất ăn chỉ được phục vụ khi có tên trong danh sách ca được nhà máy phê duyệt.";

type Status = "idle" | "loading" | "ready" | "error";
const weekMenuAtom = atom<WeeklyMenuData | null>(null);
const weekStatusAtom = atom<Status>("idle");
const weekErrorAtom = atom<string | null>(null);
/** Ô đang lưu (cellKey). */
const savingAtom = atom<Record<string, true>>({});
/** Ô vừa lưu xong — hiện "Đã lưu" một lúc. */
const savedFlashAtom = atom<Record<string, number>>({});
const bootstrapAtom = atom<Bootstrap | null>(null);

// Hàng đợi ghi tuần tự: server có unique (employee, date, meal_time) nên hai
// lần chạm nhanh vào cùng ô phải đến server theo đúng thứ tự.
let writeQueue: Promise<unknown> = Promise.resolve();
const enqueue = <T,>(fn: () => Promise<T>) => {
  const p = writeQueue.then(fn, fn);
  writeQueue = p.catch(() => undefined);
  return p;
};

/** Tìm ngày trong cả hai tuần. */
function patchDay(data: WeeklyMenuData, date: string, fn: (d: WeeklyDay) => WeeklyDay): WeeklyMenuData {
  const map = (days: WeeklyDay[]) => days.map((d) => (d.date === date ? fn(d) : d));
  return { ...data, thisWeek: map(data.thisWeek), nextWeek: map(data.nextWeek) };
}

export function useBootstrap() {
  const [boot, setBoot] = useAtom(bootstrapAtom);
  useEffect(() => {
    if (boot) return;
    let alive = true;
    fetchBootstrap()
      .then((b) => alive && setBoot(b))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [boot, setBoot]);
  return boot;
}

export function useWeekMenu() {
  const [data, setData] = useAtom(weekMenuAtom);
  const [status, setStatus] = useAtom(weekStatusAtom);
  const [error, setError] = useAtom(weekErrorAtom);
  const saving = useAtomValue(savingAtom);
  const setSaving = useSetAtom(savingAtom);
  const [savedFlash, setSavedFlash] = useAtom(savedFlashAtom);
  const load = useCallback(
    async (silent = false) => {
      if (!silent) setStatus("loading");
      try {
        const d = await fetchWeekMenu();
        setData(d);
        setStatus("ready");
        setError(null);
      } catch (e: any) {
        if (!silent) {
          setStatus("error");
          setError(e?.message ?? "Không tải được thực đơn");
        }
      }
    },
    [setData, setStatus, setError],
  );

  useEffect(() => {
    if (status === "idle") void load();
  }, [status, load]);

  const isCellLocked = useCallback((day: WeeklyDay, shiftId: number) => day.isLocked || !!day.lockedShifts[shiftId], []);
  const pickedOf = useCallback((day: WeeklyDay, shiftId: number): number | undefined => day.orders[shiftId], []);

  /** Ghi một ô: lạc quan ➝ server ➝ lỗi thì hoàn. */
  const persist = useCallback(
    (day: WeeklyDay, shiftId: number, next: number | null) => {
      const k = cellKey(day.date, shiftId);

      setData((cur) =>
        cur &&
        patchDay(cur, day.date, (d) => {
          const orders = { ...d.orders };
          const entitlements = { ...(d.entitlements ?? {}) };
          if (next == null) {
            delete orders[shiftId];
            delete entitlements[shiftId];
          } else {
            orders[shiftId] = next;
            // Chưa biết server gắn nhãn gì — bỏ nhãn cũ, chờ kết quả.
            delete entitlements[shiftId];
          }
          return { ...d, orders, entitlements };
        }),
      );
      setSaving((s) => ({ ...s, [k]: true }));

      return enqueue(async () => {
        try {
          const res = await batchOrder(
            next == null
              ? { ordersToSave: [], ordersToDelete: [{ meal_date: day.date, meal_time_id: shiftId }] }
              : { ordersToSave: [{ meal_date: day.date, meal_time_id: shiftId, menu_line_id: next }], ordersToDelete: [] },
          );
          const noPortion = !!res.noPortion?.some((c) => c.meal_date === day.date && c.meal_time_id === shiftId);
          if (noPortion) {
            setData((cur) => cur && patchDay(cur, day.date, (d) => ({ ...d, entitlements: { ...(d.entitlements ?? {}), [shiftId]: "none" } })));
            toast(NO_PORTION_MSG, { icon: "ℹ️", duration: 5000 });
          }
          setSavedFlash((f) => ({ ...f, [k]: Date.now() }));
          setTimeout(() => setSavedFlash((f) => (f[k] ? { ...f, [k]: 0 } : f)), 2200);
        } catch (e: any) {
          toast.error(e?.message ?? "Lưu không thành công");
          // Không hoàn tay bằng giá trị cũ trong closure: nếu NV đã bấm sang món khác,
          // lệnh hoàn của request cũ sẽ xoá mất lựa chọn mới. Nạp lại là nguồn đúng duy nhất.
          void load(true);
        } finally {
          setSaving((s) => {
            const n = { ...s };
            delete n[k];
            return n;
          });
        }
      });
    },
    [setData, setSaving, setSavedFlash, load],
  );

  /** Chạm món: đang chọn thì bỏ, chưa thì chọn (radio: 1 món/ca). Mỗi ngày tối đa 2 suất. */
  const toggleDish = useCallback(
    (day: WeeklyDay, shiftId: number, dish: OrderingFoodItem) => {
      if (isCellLocked(day, shiftId)) return;
      const cur = day.orders[shiftId];
      // Mỗi ngày tối đa 2 suất: nếu ca này chưa chọn và đã có 2 ca khác có suất -> báo lỗi
      if (cur == null || cur !== dish.menu_line_id) {
        const otherOrdersCount = Object.keys(day.orders).filter((sid) => Number(sid) !== shiftId && day.entitlements?.[Number(sid)] !== "none").length;
        if (otherOrdersCount >= 2) {
          toast.error("Mỗi ngày chỉ được chọn tối đa 2 suất ăn (1 ca chính + 1 tăng ca). Vui lòng bỏ chọn ca khác trước.");
          return;
        }
      }
      void persist(day, shiftId, cur === dish.menu_line_id ? null : dish.menu_line_id);
    },
    [isCellLocked, persist],
  );

  const clearCell = useCallback(
    (day: WeeklyDay, shiftId: number) => {
      if (isCellLocked(day, shiftId) || day.orders[shiftId] == null) return;
      void persist(day, shiftId, null);
    },
    [isCellLocked, persist],
  );

  /** Xoá mọi ô còn mở của một danh sách ngày. */
  const clearDays = useCallback(
    (days: WeeklyDay[]) => {
      for (const day of days) for (const sid of Object.keys(day.orders).map(Number)) clearCell(day, sid);
    },
    [clearCell],
  );

  return { data, status, error, reload: load, isCellLocked, pickedOf, toggleDish, clearCell, clearDays, saving, savedFlash };
}

// ---- Helper thuần cho trang -------------------------------------------------

/** Số suất đã chọn (bỏ ô "none" — có ghi nhận nhưng không thành suất). */
export function countPortions(days: WeeklyDay[]): number {
  let n = 0;
  for (const d of days) for (const sid of Object.keys(d.orders)) if (d.entitlements?.[Number(sid)] !== "none") n++;
  return n;
}

/** Tuần còn ô nào mở để chọn/đổi không. */
export function hasOpenCell(days: WeeklyDay[], shifts: WeeklyShift[]): boolean {
  return days.some((d) => !d.isLocked && shifts.some((s) => (d.menus[s.id]?.length ?? 0) > 0 && !d.lockedShifts[s.id]));
}

/** Suất NV sẽ nhận nếu không chọn: món có cờ isDefault, hoặc món Mặn 1 đầu tiên, hoặc món đầu tiên. */
export function autoDishOf(dishes: OrderingFoodItem[] | undefined): OrderingFoodItem | null {
  if (!dishes || dishes.length === 0) return null;
  if (dishes.length === 1) return dishes[0];
  return dishes.find((d) => d.isDefault) ?? dishes.find((d) => d.columnName === "Mặn 1" || d.columnName === "Mặn" || d.category === "man1") ?? dishes[0];
}
