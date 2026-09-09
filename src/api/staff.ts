// GoEat ZMA — cổng dữ liệu quầy phát / bếp (/api/zma/staff/*).
import { ApiError, api } from "./client";
import { API_MODE } from "./config";
import type {
  KitchenBoard,
  ManualDispenseInput,
  ManualDispenseResult,
  StaffEmployeeHit,
  ManualMeta,
  ManualOutcome,
  ManualReason,
  ScanDeniedDetails,
  ScanDeniedResult,
  ScanOutcome,
  ScanServed,
} from "./types";
import { mockKitchenBoard, mockManualDispense, mockManualMeta, mockScan, mockSearchEmployees } from "./mock/staff.mock";

const live = API_MODE === "live";

/** Nhận diện trạm quét (một điện thoại = một client) để server gộp lượt quẹt đúp. */
const CLIENT_KEY = "goeat.zma.client_id";
function clientId(): string {
  try {
    let id = localStorage.getItem(CLIENT_KEY);
    if (!id) {
      id = `zma-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(CLIENT_KEY, id);
    }
    return id;
  } catch {
    return "zma";
  }
}

/**
 * Quét thẻ / mã NV. Server trả 200 khi phát được, 409 (kèm `result`) khi từ chối
 * — cả hai đều là kết quả nghiệp vụ nên gom về một ScanOutcome; lỗi khác ném ra.
 */
export async function scanCard(scanValue: string): Promise<ScanOutcome> {
  if (!live) return mockScan(scanValue);
  try {
    const r = await api<{ data: ScanServed; duplicate: boolean; message: string }>("/api/zma/staff/scan", {
      body: { scan_value: scanValue, client_id: clientId() },
    });
    return { kind: "served", data: r.data, duplicate: !!r.duplicate, message: r.message };
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) {
      const b = (e.body ?? {}) as { error?: string; result?: ScanDeniedResult; details?: ScanDeniedDetails; duplicate?: boolean };
      return { kind: "denied", result: b.result ?? "no_order", message: b.error ?? e.message, details: b.details, duplicate: !!b.duplicate };
    }
    throw e;
  }
}

export const fetchKitchenBoard = (): Promise<KitchenBoard> =>
  live ? api<{ data: KitchenBoard }>("/api/zma/staff/kitchen").then((r) => r.data) : mockKitchenBoard();

// ---- Phát ngoại lệ -----------------------------------------------------------
/** Danh mục lý do + món được phép đưa ở bữa đang mở. Một lượt gọi cho cả form. */
export const fetchManualMeta = (): Promise<ManualMeta> =>
  live
    ? api<{ data: ManualReason[]; dishes: ManualMeta["dishes"] }>("/api/zma/staff/manual").then((r) => ({ reasons: r.data ?? [], dishes: r.dishes ?? [] }))
    : mockManualMeta();

/** Tra cứu nhân viên theo mã / tên (>= 2 ký tự) trước khi phát. */
export const searchEmployees = (q: string): Promise<StaffEmployeeHit[]> =>
  live ? api<{ data: StaffEmployeeHit[] }>(`/api/zma/staff/manual?q=${encodeURIComponent(q)}`).then((r) => r.data ?? []) : mockSearchEmployees(q);

/**
 * Phát một suất ngoại lệ. Giống `scanCard`: 200 ➝ served, 409 (kèm `result`)
 * ➝ denied — cả hai là kết quả nghiệp vụ, lỗi khác mới ném ra.
 */
export async function dispenseManual(input: ManualDispenseInput): Promise<ManualOutcome> {
  if (!live) return mockManualDispense(input);
  try {
    const r = await api<{ data: ManualDispenseResult; message: string }>("/api/zma/staff/manual", { body: input });
    return { kind: "served", data: r.data, message: r.message };
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) {
      const b = (e.body ?? {}) as { error?: string; result?: ScanDeniedResult };
      return { kind: "denied", result: b.result ?? "no_order", message: b.error ?? e.message };
    }
    throw e;
  }
}
