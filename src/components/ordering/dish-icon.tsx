// GoEat ZMA — màu và biểu tượng theo LOẠI MÓN. Port từ spartronics
// ordering/_components/dish-icon.tsx: hình chỉ là nhãn NHÓM (không tả món),
// màu là thông tin thật — mặn đỏ gạch, nước hổ phách, chay xanh, thay thế xám.
// Không dùng ảnh: bếp không chụp ảnh món.
import { I } from "@/components/icons";
import type { OrderingFoodItem } from "@/api/types";

export type DishToneKey = "man" | "nuoc" | "chay" | "sub" | "khac";

export interface DishTone {
  key: DishToneKey;
  icon: keyof typeof I;
  /** Màu nét của hình đại diện. */
  ink: string;
}

const tone = (key: DishToneKey, icon: keyof typeof I): DishTone => ({ key, icon, ink: `var(--fd-cat-${key}-ink)` });

export const DISH_TONE: Record<DishToneKey, DishTone> = {
  man: tone("man", "utensils"),
  nuoc: tone("nuoc", "soup"),
  chay: tone("chay", "leaf"),
  sub: tone("sub", "swap"),
  khac: tone("khac", "circleDashed"),
};

/** Ưu tiên `category`, rồi tên cột thực đơn, cuối cùng dò tên món. */
export function dishLook(dish: OrderingFoodItem): DishTone {
  if (dish.kind === "substitute") return DISH_TONE.sub;

  const c = (dish.category || "").toLowerCase();
  const col = (dish.columnName || "").toLowerCase();
  const name = (dish.name || "").toLowerCase();

  if (dish.isVegetarian || c === "chay" || col.includes("chay")) return DISH_TONE.chay;
  if (c === "banh" || col.includes("tráng miệng")) return DISH_TONE.khac;
  if (c === "nuoc" || col.includes("canh")) return DISH_TONE.nuoc;
  if (c === "man" || c === "man1" || c === "man2") return DISH_TONE.man;
  if (col.includes("mặn") || col.includes("cá")) return DISH_TONE.man;
  if (col.includes("rau")) return DISH_TONE.chay;

  if (/(bún|phở|hủ tiếu|miến|mì|cháo|canh|súp)/.test(name)) return DISH_TONE.nuoc;
  if (/(cá|tôm|mực|nghêu|gà|heo|bò|sườn|thịt|vịt|trứng|chả)/.test(name)) return DISH_TONE.man;
  return DISH_TONE.khac;
}

/** Thứ tự đọc của một ca: mặn ➝ thay thế ➝ chay ➝ nước ➝ còn lại. */
const RANK: Record<DishToneKey, number> = { man: 0, sub: 1, chay: 2, nuoc: 3, khac: 4 };

export function sortDishes(dishes: OrderingFoodItem[]): OrderingFoodItem[] {
  return dishes
    .map((dish, i) => ({ dish, i, rank: RANK[dishLook(dish).key] }))
    .sort((a, b) => a.rank - b.rank || Number(b.dish.isDefault ?? false) - Number(a.dish.isDefault ?? false) || a.i - b.i)
    .map((x) => x.dish);
}

/** Nhãn loại suất — một chữ, đứng dưới tên món. */
export function kindLabel(dish: OrderingFoodItem): string | null {
  if (dish.kind === "substitute") return "Món thay thế";
  if (dish.isVegetarian) return "Chay";
  return null;
}

export function DishGlyph({ dish, size = 18, muted = false }: { dish: OrderingFoodItem; size?: number; muted?: boolean }) {
  const look = dishLook(dish);
  const Ic = I[look.icon];
  return (
    <span
      aria-hidden
      style={{
        flex: "0 0 auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 20,
        color: muted ? "var(--fg-3)" : look.ink,
        opacity: muted ? 0.75 : 1,
        transition: "color 160ms var(--ease-out), opacity 160ms var(--ease-out)",
      }}
    >
      <Ic size={size} sw={2.2} />
    </span>
  );
}
