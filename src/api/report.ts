// GoEat ZMA — cổng dữ liệu BÁO CÁO PHÁT MÓN (/api/zma/staff/report/meal-day).
//
// Khác `fetchKitchenBoard`: bảng bếp là HÔM NAY, tự làm mới 30 giây, để người
// đứng quầy nhìn; còn đây là số của MỘT NGÀY BẤT KỲ, đọc một lần để đối soát
// với nhà máy — nên quyền cũng khác (`report:view`, không phải `pickup:view`).
//
// KHÔNG có hàm xuất Excel: `report:export` giữ trên web.
import { api } from "./client";
import { API_MODE } from "./config";
import type { MealDayReport } from "./types";
import { mockMealDayReport } from "./mock/report.mock";

const live = API_MODE === "live";

export const fetchMealDayReport = (date: string): Promise<MealDayReport> =>
  live
    ? api<{ data: MealDayReport }>(
        `/api/zma/staff/report/meal-day?date=${date}`,
      ).then((r) => r.data)
    : mockMealDayReport(date);
