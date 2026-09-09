// GoEat ZMA — cổng dữ liệu NHÂN SỰ (/api/zma/staff/{employees,week-menu,
// proxy-order,day-registration}).
//
// Hai việc khác nhau, cố ý để hai đường riêng — đúng như Permission Registry của
// web spartronics tách chúng ra:
//
//   ĐẶT HỘ  (ordering:proxy-order)   — cả tuần, đi đường đặt món thường nên vẫn
//                                      chịu hạn chốt 48h của nhân viên.
//   SỬA ĐĂNG KÝ (meal-registrations) — một ngày, mốc là chính bữa ăn, để xử lý
//                                      việc phát sinh SAU hạn chốt.
//
// Gộp hai đường làm một sẽ hoặc chặn oan nhân sự, hoặc cho nhân viên đặt quá hạn.
import { api } from "./client";
import { API_MODE } from "./config";
import type {
  BatchOrderInput,
  BatchOrderResult,
  RegistrationBoard,
  RegistrationPick,
  RegistrationSaveResult,
  StaffEmployeeHit,
  WeeklyMenuData,
} from "./types";
import {
  mockProxyBatchOrder,
  mockProxyWeekMenu,
  mockRegistrationBoard,
  mockSaveRegistrations,
  mockStaffEmployees,
} from "./mock/hr.mock";

const live = API_MODE === "live";

/** Tra nhân viên theo mã / tên (>= 2 ký tự). Đủ MỘT trong hai quyền là gọi được. */
export const searchStaffEmployees = (q: string): Promise<StaffEmployeeHit[]> =>
  live ? api<{ data: StaffEmployeeHit[] }>(`/api/zma/staff/employees?q=${encodeURIComponent(q)}`).then((r) => r.data ?? []) : mockStaffEmployees(q);

// ---- Đặt hộ ------------------------------------------------------------------
export const fetchProxyWeekMenu = (employeeId: number): Promise<WeeklyMenuData> =>
  live ? api<{ data: WeeklyMenuData }>(`/api/zma/staff/week-menu?employeeId=${employeeId}`).then((r) => r.data) : mockProxyWeekMenu(employeeId);

export const proxyBatchOrder = (employeeId: number, input: BatchOrderInput): Promise<BatchOrderResult> =>
  live
    ? api<{ message: string; data?: { noPortion?: BatchOrderResult["noPortion"] } }>("/api/zma/staff/proxy-order", {
        body: { targetEmployeeId: employeeId, ...input },
      }).then((r) => ({ message: r.message, noPortion: r.data?.noPortion }))
    : mockProxyBatchOrder(employeeId, input);

// ---- Sửa đăng ký một ngày ----------------------------------------------------
export const fetchRegistrationBoard = (employeeId: number, date: string): Promise<RegistrationBoard> =>
  live
    ? api<{ data: RegistrationBoard }>(`/api/zma/staff/day-registration?employeeId=${employeeId}&date=${date}`).then((r) => r.data)
    : mockRegistrationBoard(employeeId, date);

export const saveRegistrations = (employeeId: number, date: string, picks: RegistrationPick[]): Promise<RegistrationSaveResult> =>
  live
    ? api<{ message: string; data: RegistrationSaveResult }>("/api/zma/staff/day-registration", {
        method: "PUT",
        body: { employeeId, date, picks },
      }).then((r) => r.data)
    : mockSaveRegistrations(employeeId, date, picks);
