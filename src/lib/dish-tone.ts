// GoEat ZMA — mượn TRỤC MÀU THEO LOẠI MÓN của trang đặt món cho các màn quầy/bếp.
//
// Trang đặt món đã có sẵn `dishLook()`: mặn đỏ gạch, canh hổ phách, chay xanh,
// món thay thế xám. Bảng bếp và báo cáo liệt kê ĐÚNG những món đó, nên dùng lại
// cùng một bảng màu — người đứng bếp nhìn danh sách trên điện thoại phải thấy
// cùng thứ màu như lúc nhân viên đặt món, không phải học lại lần thứ hai.
//
// Ở đây chỉ có một việc: các kiểu dữ liệu món của màn quầy (`KitchenDish`,
// `ReportDish`, `ManualDish`) nghèo trường hơn `OrderingFoodItem`, nên nắn về
// đúng ba trường mà `dishLook` thật sự đọc: tên, tên cột thực đơn, loại.
import { dishLook, type DishTone } from "@/components/ordering/dish-icon";
import type { OrderingFoodItem } from "@/api/types";

// Bảng bếp không trả về tên cột thực đơn, chỉ có tên món, nên món chay ở đó
// rơi hết vào nhóm "khác". Dò thêm bằng tên là đủ cho suất ăn nhà máy: đậu hũ,
// rau, nấm, các loại cải/bí/su su.
const VEG = /(đậu hũ|đậu phụ|tàu hũ|chay|nấm|rau |rau$|cải|bí đỏ|bí xanh|su su|đậu que|đậu cove|giá hẹ|bầu)/;
const MEAT = /(cá|tôm|mực|nghêu|gà|heo|bò|sườn|thịt|vịt|trứng|chả|xúc xích)/;

/** `column` là nhãn cột thực đơn ("Mặn 1", "Canh", "Chay", "Món thay thế"). */
export function staffDishTone(name: string, column?: string | null): DishTone {
  const col = (column ?? "").toLowerCase();
  const n = name.toLowerCase();
  // Có thịt cá thì vẫn là món mặn, dù có kèm rau: "gà rô ti + bắp cải xào".
  const veg = col.includes("chay") || (VEG.test(n) && !MEAT.test(n));
  return dishLook({
    name,
    columnName: column ?? null,
    category: null,
    kind: col.includes("thay thế") ? "substitute" : undefined,
    isVegetarian: veg,
  } as unknown as OrderingFoodItem);
}
