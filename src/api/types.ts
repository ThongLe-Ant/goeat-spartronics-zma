// GoEat ZMA — hợp đồng dữ liệu đặt suất ăn.
// Chép NGUYÊN mẫu từ tanloc-spartronics/src/modules/ordering/types.ts để
// BFF /api/zma/* có thể trả thẳng WeeklyMenuData mà không cần map lại.

export type DishKind = "combo" | "substitute" | "single";
export type Entitlement = "main" | "ot" | "none";

export interface OrderingFoodItem {
  id: number;
  menu_line_id: number;
  name: string;
  description: string | null;
  category: string | null;
  meal_time_id: number;
  side_dishes: string | null;
  ingredients: string | null;
  image_url?: string | null;
  kind?: DishKind;
  /** Suất mặc định của NV này (ăn chay / nhóm thay thế). */
  isDefault?: boolean;
  isVegetarian?: boolean;
  date?: string;
  columnName?: string;
}

export interface WeeklyShift {
  id: number;
  name: string;
  start_time: string; // "HH:mm"
  end_time: string;
  cutoff_time: string; // giờ khoá theo lịch VN, "HH:mm"
  cutoff_days: number; // khoá trước bao nhiêu ngày (0 = cùng ngày)
  cutoff_label: string;
}

export interface WeeklyDay {
  date: string; // YYYY-MM-DD
  weekday: string; // "Thứ 2"…"Chủ nhật"
  isToday: boolean;
  isLocked: boolean;
  lockedShifts: Record<number, boolean>;
  menus: Record<number, OrderingFoodItem[]>;
  /** meal_time_id ➝ menu_line_id đã chọn */
  orders: Record<number, number>;
  entitlements?: Record<number, Entitlement>;
}

export interface WeeklyMenuData {
  shifts: WeeklyShift[];
  thisWeek: WeeklyDay[];
  nextWeek: WeeklyDay[];
  allowOrderingThisWeek: boolean;
}

export interface OrderChange {
  meal_date: string;
  meal_time_id: number;
  menu_line_id: number;
}
export interface OrderRemoval {
  meal_date: string;
  meal_time_id: number;
}
export interface BatchOrderInput {
  ordersToSave: OrderChange[];
  ordersToDelete: OrderRemoval[];
}
export interface BatchOrderResult {
  message: string;
  /** Các ô đã ghi nhận nhưng KHÔNG thành suất (chưa có tên trong ca). */
  noPortion?: { meal_date: string; meal_time_id: number }[];
}

// ---- Thẻ nhận cơm (pickup-card.service.ts) ---------------------------------
export interface PickupMeal {
  meal_time_id: number;
  meal_time_name: string;
  serve_window: string; // "11:30–12:30"
  open_from: string; // "HH:mm"
  open_to: string;
  food_name: string | null;
  entitlement: Entitlement;
  picked_up: boolean;
  pickup_time: string | null; // ISO
}
export interface PickupCardData {
  date: string;
  employee: EmployeeProfile;
  /** Giá trị mã QR: card_number || employee_code (plain). */
  scan_value: string;
  meals: PickupMeal[];
}

export interface EmployeeProfile {
  id: number;
  employee_code: string;
  full_name: string;
  department: string | null;
  position: string | null;
  card_number: string | null;
  avatar_url?: string | null;
  zalo_phone?: string | null;
}

// ---- Lịch sử suất ăn (/api/zma/orders) --------------------------------------
export interface OrderHistoryItem {
  meal_date: string;
  meal_time_id: number;
  meal_time_name: string;
  serve_window: string;
  food_name: string;
  entitlement: Entitlement;
  picked_up: boolean;
  pickup_time: string | null;
}

export interface Bootstrap {
  employee: EmployeeProfile;
  config: {
    tenant: string;
    hidePrice: boolean;
    deadlineHours: number;
    /** Số ngày tối đa được đăng ký trước. */
    futureHorizonDays: number;
  };
  /** Quyền nhân sự quầy/bếp — theo tài khoản web gắn với nhân viên (RBAC). */
  staff: StaffAccess;
}

// ---- Nhân sự quầy / bếp (/api/zma/staff/*) -----------------------------------
export interface StaffAccess {
  /** pickup:process — được quét thẻ phát suất ăn. */
  canScan: boolean;
  /** pickup:view — xem bảng bếp hôm nay. */
  canKitchen: boolean;
}

/** Kết quả một lượt quét bị từ chối — cùng bộ mã với màn quầy web spartronics. */
export type ScanDeniedResult =
  | "already_picked"
  | "no_order"
  | "out_of_window"
  | "unknown_user"
  | "inactive"
  | "wrong_category"
  | "extra_quota_exhausted";

export interface ScanServed {
  employee_name: string | null;
  employee_code: string | null;
  department?: string | null;
  meal_time_name: string | null;
  food_name: string | null;
  pickup_time: string | null;
  entitlement?: string;
  is_extra?: boolean;
}

export interface ScanDeniedDetails {
  employee_code?: string;
  employee_name?: string;
  meal_time_name?: string;
  food_name?: string;
  department?: string | null;
}

export type ScanOutcome =
  | { kind: "served"; data: ScanServed; duplicate: boolean; message: string }
  | { kind: "denied"; result: ScanDeniedResult; message: string; details?: ScanDeniedDetails; duplicate: boolean };

export interface KitchenDish {
  name: string;
  registered: number;
  picked_up: number;
}
export interface KitchenShift {
  meal_time_id: number;
  meal_time_name: string;
  serve_window: string;
  window_open: boolean;
  registered: number;
  picked_up: number;
  dishes: KitchenDish[];
}
export interface KitchenBoard {
  date: string;
  total_registered: number;
  total_picked_up: number;
  shifts: KitchenShift[];
}

// ---- Đăng nhập (/api/zma/auth/*) --------------------------------------------
export type AuthErrorCode =
  | "ZALO_TOKEN_INVALID"
  | "ZALO_PHONE_UNAVAILABLE"
  | "NEED_LINK"
  | "EMPLOYEE_NOT_FOUND"
  | "PHONE_MISMATCH"
  | "ALREADY_LINKED"
  | "DEV_LOGIN_DISABLED"
  | "UNAUTHORIZED";

export interface LoginResult {
  token: string;
  employee: EmployeeProfile;
}
