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
  /**
   * manual-dispense:create — được phát suất ngoại lệ.
   * Quyền RIÊNG, không dùng chung `pickup:process`: quét thẻ chỉ đóng dấu lên
   * suất đã có, còn phát ngoại lệ là TẠO suất ngoài dự báo nên phải có người
   * chịu trách nhiệm (cùng luật với màn quầy web spartronics).
   */
  canManual: boolean;
  /** ordering:proxy-order — đặt món hộ nhân viên khác (cả tuần). */
  canProxy: boolean;
  /** meal-registrations:view — xem đăng ký của người khác. */
  canRegView: boolean;
  /**
   * meal-registrations:update — SỬA đăng ký của người khác theo NGÀY.
   * Khác `canProxy`: đặt hộ đi đường đặt món thường nên vẫn chịu hạn chốt 48h,
   * còn sửa đăng ký là đường của nhân sự — mốc là chính bữa ăn, để xử lý đúng
   * những việc phát sinh SAU hạn chốt (điều tăng ca, nghỉ đột xuất).
   */
  canRegEdit: boolean;
  /**
   * report:view — báo cáo phát món theo ngày.
   * Khác `canKitchen`: bảng bếp là HÔM NAY và chạy realtime để đứng quầy, còn
   * báo cáo là số của MỘT NGÀY BẤT KỲ, đọc để đối soát với nhà máy.
   */
  canReport: boolean;
  /**
   * temp-card-issue:view — CẤP thẻ tạm cho người quên/mất thẻ.
   * Bám theo route thật của web (`/api/pickup/temporary-cards` gác quyền này
   * cho cả đọc lẫn ghi), không bám `pickup:assign-temp-card` trong bảng đăng ký
   * quyền — bảng có khai nhưng route không dùng.
   * Chỉ mở phần CẤP PHÁT; nhập kho thẻ vẫn là việc của trang web.
   */
  canTempCard: boolean;
}

// ---- Báo cáo phát món (/api/zma/staff/report/meal-day) -----------------------
/**
 * Hệ số học của báo cáo, giữ NGUYÊN như web spartronics:
 *
 *   Dự trù − Loại trừ = Thực nấu = Đã phát + Chưa nhận
 *   Phát ngoại lệ nằm NGOÀI dự trù — cộng riêng, KHÔNG trộn vào Thực nấu.
 *
 * Trộn ngoại lệ vào thực nấu là làm hỏng luôn con số đối soát với nhà máy.
 */
export interface ReportDish {
  name: string;
  /** Nhãn combo ("Món mặn", "Món chay"…). */
  label: string;
  forecast: number;
  excluded: number;
  actual: number;
  picked: number;
}

export interface ReportShift {
  meal_time_id: number;
  meal_time_name: string;
  /** "11:30 – 12:30" */
  serve_window: string;
  /** "09:45" — mốc chốt bếp: qua mốc này con số đứng yên. */
  cook_lock_clock: string;
  cook_locked: boolean;
  /** Nhà máy đã đẩy danh sách ăn của ca này chưa. */
  roster_pushed: boolean;
  forecast: number;
  confirmed: number;
  excluded: number;
  actual: number;
  picked: number;
  /** Thực nấu − Đã phát: suất đã nấu mà không ai đến lấy. */
  missed: number;
  /** Đã phát cho người CÓ đăng ký nhưng KHÔNG nằm trong dự trù. */
  exception: number;
  /** Suất phát sinh tại quầy cho người chưa có hồ sơ (công nhân mới / khách). */
  extra_total: number;
  extra_new_workers: number;
  extra_guests: number;
  /** Thực nấu + suất phát sinh — con số bếp thực sự phải ra. */
  to_cook: number;
  dishes: ReportDish[];
}

export interface MealDayReport {
  date: string;
  totals: {
    headcount: number;
    forecast: number;
    confirmed: number;
    excluded: number;
    actual: number;
    picked: number;
    missed: number;
    exception: number;
    extra_total: number;
    to_cook: number;
  };
  shifts: ReportShift[];
  reconciled_at: string | null;
  /** Tên các ca CHƯA nhận được lượt đẩy nào — bếp đang nấu theo dự trù. */
  shifts_awaiting_roster: string[];
  note: string;
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

// ---- Phát ngoại lệ (/api/zma/staff/manual) -----------------------------------
/** Một dòng trong danh mục `pickup_manual_reason` đang bật. */
export interface ManualReason {
  code: string;
  name: string;
}

/** Món quầy được phép đưa ở bữa ĐANG MỞ — dùng khi bếp hết món (§17.3). */
export interface ManualDish {
  foodItemId: number;
  name: string;
  /** Nhóm món trên thực đơn ("Mặn 1", "Chay"…). */
  columnName: string | null;
}

export interface ManualMeta {
  reasons: ManualReason[];
  dishes: ManualDish[];
}

/** Một nhân viên tra ra được — dùng chung cho phát ngoại lệ, đặt hộ, sửa đăng ký. */
export interface StaffEmployeeHit {
  id: number;
  employee_code: string;
  full_name: string;
  department: string | null;
}

/** Thân yêu cầu POST — đặt tên khoá theo snake_case đúng như BFF nhận. */
export interface ManualDispenseInput {
  /** true = suất phát sinh, không gắn nhân viên nào. */
  no_employee?: boolean;
  kind?: "new_worker" | "guest";
  label?: string | null;
  department?: string | null;
  employee_identifier?: string;
  /** Mã lý do — BẮT BUỘC. */
  manual_reason: string;
  /** Món quầy thực sự đưa; bỏ trống = giữ nguyên món của suất. */
  food_item_id?: number | null;
  /** Món GỐC bị thay khi bếp hết món. */
  substituted_from_food_item_id?: number | null;
  note?: string | null;
}

export interface ManualDispenseResult {
  employee_name: string;
  employee_code: string;
  department?: string | null;
  meal_time_name: string;
  food_name: string | null;
  pickup_time: string;
  order_id: number;
  /** true = tạo dòng suất mới, false = đóng dấu lên suất sẵn có. */
  created: boolean;
  reason_name: string;
  /** Số suất phát sinh còn lại (chỉ có ở nhánh `no_employee`). */
  remaining?: number;
  is_extra?: boolean;
}

/** Như ScanOutcome: 200 ➝ served, 409 ➝ denied; cả hai đều là kết quả nghiệp vụ. */
export type ManualOutcome =
  | { kind: "served"; data: ManualDispenseResult; message: string }
  | { kind: "denied"; result: ScanDeniedResult; message: string };

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

// ---- Sửa đăng ký một ngày (/api/zma/staff/day-registration) ------------------
// Hình dạng ĐÚNG như DayRegistrationBoard của web (khai ít trường hơn thôi) để
// BFF trả thẳng, không phải map lại — map lại là tạo chỗ để hai bên lệch nhau.

/** Suất đang có của một ca trong ngày đó. */
export interface RegistrationOrder {
  meal_time_id: number;
  /** null = đơn cũ chưa gắn dòng thực đơn; màn hình không có ô nào tick lại nó. */
  menu_line_id: number | null;
  dish_name: string;
  picked_up: boolean;
  /** "none" = đăng ký ở ca người này không làm: có món, không tính suất (§9). */
  entitlement: Entitlement;
}

/** Vì sao một ca không sửa được — hiện đúng câu của server, không tự đoán. */
export interface RegistrationShiftState {
  meal_time_id: number;
  /** Khoá cứng: bữa ăn đã xong, hoặc suất đã nhận cơm. */
  locked: boolean;
  lockReason: string | null;
  /** Quá hạn chốt 48h của NHÂN VIÊN — nhân sự vẫn sửa được, chỉ phải báo bếp. */
  overCutoff: boolean;
  cutoffLabel: string | null;
  /** Bếp đã chốt số ca này — thêm một suất là bếp phải nấu thêm thật. */
  overCookLock: boolean;
  cookLockLabel: string | null;
}

export interface RegistrationBoard {
  date: string;
  /** "dd/MM/yyyy" — server tính sẵn, đừng để trình duyệt diễn giải lại. */
  dateLabel: string;
  employee: { id: number; code: string; name: string; department: string };
  shifts: WeeklyShift[];
  menus: Record<number, OrderingFoodItem[]>;
  orders: Record<number, RegistrationOrder>;
  shiftStates: Record<number, RegistrationShiftState>;
}

export interface RegistrationPick {
  meal_time_id: number;
  menu_line_id: number;
}

export interface RegistrationSaveResult {
  created: number;
  updated: number;
  deleted: number;
  summary: string;
  board: RegistrationBoard;
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

// ---- Cấp thẻ tạm (/api/zma/staff/temp-card) ----
/**
 * Một thẻ nhựa vừa được cấp. Hạn dùng do server đặt (luật hiện hành: +1 giờ) —
 * app KHÔNG tự tính lại, chỉ hiển thị `expires_at` server trả về.
 */
export interface TempCard {
  code: string;
  /** "employee" | "extra:new_worker" | "extra:guest" */
  kind: string | null;
  label: string | null;
  department: string | null;
  expires_at: string | null;
}

export interface TempCardIssueInput {
  /** "employee" = cấp cho một NV cụ thể; "extra" = suất phát sinh (CN mới / khách). */
  mode: "employee" | "extra";
  code?: string;
  employee_id?: number;
  kind?: "new_worker" | "guest";
  codes?: string[];
  count?: number;
  label?: string | null;
  department?: string | null;
}

export interface TempCardIssueResult {
  cards: TempCard[];
  message: string;
}
