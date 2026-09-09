// GoEat ZMA — DANH SÁCH VIỆC THEO QUYỀN (nguồn duy nhất).
//
// Nguyên tắc: KHÔNG có "chế độ nhân sự". Ai mở app cũng là NHÂN VIÊN và có đủ
// chức năng cơ bản (đăng ký món, thẻ nhận cơm, lịch sử suất ăn). Việc của quầy /
// bếp / nhân sự chỉ là những DÒNG MENU mọc thêm trong trang Cá nhân khi tài
// khoản web gắn với hồ sơ đó thật sự có quyền — có quyền nào thấy dòng đó.
//
// Vì sao bỏ chế độ riêng: người đứng quầy vẫn phải tự đăng ký cơm cho mình; bắt
// họ "vào/ra chế độ" là dựng một bức tường giữa hai việc của cùng một người,
// lại phải nuôi hai thanh điều hướng và một màn Trung tâm chỉ để liệt kê link.
//
// Chia NHÓM theo vai thật ở nhà máy, không gom một rổ: người trực quầy và người
// làm nhân sự là hai người khác nhau, mở app vì hai lý do khác nhau. Ai kiêm cả
// hai thì thấy cả hai nhóm, và nhóm QUẦY luôn đứng trước vì đó là việc lặp lại
// mỗi bữa.
//
// `hint` chỉ có ở những dòng mà cái tên KHÔNG tự nói được (phát ngoại lệ, sửa
// đăng ký). Viết chú thích cho cả bảy dòng chỉ tạo ra một bức tường chữ, người
// đứng quầy không đọc.
//
// Thêm việc mới = thêm một dòng ở đây (kèm cờ quyền trong `StaffAccess`), không
// phải sắp lại thanh điều hướng.
import type { StaffAccess } from "@/api/types";
import { I } from "@/components/icons";

export type StaffGroupKey = "counter" | "hr";

export interface StaffMenuItem {
  need: keyof StaffAccess;
  path: string;
  title: string;
  icon: keyof typeof I;
  group: StaffGroupKey;
  /** Chỉ viết khi tên việc dễ hiểu nhầm. Mặc định là KHÔNG có. */
  hint?: string;
}

export const STAFF_GROUP_LABEL: Record<StaffGroupKey, string> = {
  counter: "Quầy cơm",
  hr: "Nhân sự",
};

// Thứ tự trong nhóm = thứ tự dùng trong ngày. Dòng ĐẦU của nhóm đầu tiên là
// việc chính của người đó, trang Cá nhân sẽ tô đậm đúng dòng đó.
export const STAFF_MENU: StaffMenuItem[] = [
  { group: "counter", need: "canScan", path: "/admin/scan", title: "Quét thẻ phát suất", icon: "scan" },
  { group: "counter", need: "canTempCard", path: "/admin/temp-card", title: "Cấp thẻ tạm", icon: "ticket" },
  { group: "counter", need: "canManual", path: "/admin/manual", title: "Phát ngoại lệ", icon: "swap", hint: "Không có trong dự trù" },
  { group: "counter", need: "canKitchen", path: "/admin/kitchen", title: "Bảng bếp hôm nay", icon: "bowl" },
  { group: "hr", need: "canProxy", path: "/admin/proxy", title: "Đặt món hộ", icon: "calendar" },
  { group: "hr", need: "canRegView", path: "/admin/registrations", title: "Sửa đăng ký", icon: "edit", hint: "Thêm/bỏ suất sau hạn chốt" },
  { group: "hr", need: "canReport", path: "/admin/report", title: "Báo cáo phát món", icon: "chart" },
];

export interface StaffMenuGroup {
  key: StaffGroupKey;
  label: string;
  items: StaffMenuItem[];
}

/** Những việc tài khoản này được làm. Chưa tải xong quyền ⇒ rỗng (không đoán). */
export const staffMenuFor = (staff?: StaffAccess | null): StaffMenuItem[] =>
  STAFF_MENU.filter((m) => !!staff?.[m.need]);

/** Cùng danh sách trên, gom theo vai; nhóm rỗng bị bỏ hẳn (không hiện tiêu đề trống). */
export function staffGroupsFor(staff?: StaffAccess | null): StaffMenuGroup[] {
  const all = staffMenuFor(staff);
  return (["counter", "hr"] as StaffGroupKey[])
    .map((key) => ({ key, label: STAFF_GROUP_LABEL[key], items: all.filter((m) => m.group === key) }))
    .filter((g) => g.items.length > 0);
}
