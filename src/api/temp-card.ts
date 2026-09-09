// GoEat ZMA — cổng dữ liệu CẤP THẺ TẠM (/api/zma/staff/temp-card).
//
// Ô tra cứu nhân viên ở đây đi đường RIÊNG chứ không dùng `searchStaffEmployees`
// của nhân sự: người trực quầy thường chỉ có `temp-card-issue:view`, gọi nhầm
// đường kia sẽ ăn 403 dù họ có đủ quyền làm việc này.
import { api } from "./client";
import { API_MODE } from "./config";
import type {
  StaffEmployeeHit,
  TempCardIssueInput,
  TempCardIssueResult,
} from "./types";
import {
  mockIssueTempCard,
  mockTempCardEmployees,
} from "./mock/temp-card.mock";

const live = API_MODE === "live";

/** Tra nhân viên cần cấp thẻ (>= 2 ký tự). */
export const searchTempCardEmployees = (
  q: string,
): Promise<StaffEmployeeHit[]> =>
  live
    ? api<{ data: StaffEmployeeHit[] }>(
        `/api/zma/staff/temp-card?q=${encodeURIComponent(q)}`,
      ).then((r) => r.data ?? [])
    : mockTempCardEmployees(q);

/**
 * Cấp thẻ. Thẻ không có trong kho / đang kích hoạt / kho không đủ đều về 400 kèm
 * `error` — `api()` đã ném ApiError với đúng câu đó, màn hình chỉ việc hiện lên.
 */
export const issueTempCard = (
  input: TempCardIssueInput,
): Promise<TempCardIssueResult> =>
  live
    ? api<{ data: TempCardIssueResult["cards"]; message: string }>(
        "/api/zma/staff/temp-card",
        { body: input },
      ).then((r) => ({ cards: r.data ?? [], message: r.message }))
    : mockIssueTempCard(input);
