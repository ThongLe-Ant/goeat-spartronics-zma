// GoEat ZMA — một dòng món (chế độ radio). Port đúng DishSlot của spartronics:
// mỗi món là một DÒNG DANH SÁCH không viền, không nền; chỉ dòng ĐANG CHỌN nổi
// lên bằng khung vàng đứt nét và viên "Đã chọn". Dòng khác đeo viên xanh đặc
// "Thay đổi". Dòng đang chọn không bấm được — bỏ chọn nằm ở nút riêng dưới
// danh sách (xem DayCard).
import { I } from "@/components/icons";
import type { Entitlement, OrderingFoodItem } from "@/api/types";
import { splitDishName } from "@/lib/date-vn";
import { DishGlyph, kindLabel } from "./dish-icon";

function DishName({ name, muted }: { name: string; muted: boolean }) {
  const { main, side } = splitDishName(name);
  const head = { fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em", fontFamily: "var(--font-display)", lineHeight: 1.25, transition: "color 160ms var(--ease-out)" } as const;
  return (
    <span style={{ display: "block", minWidth: 0 }}>
      <span style={{ ...head, color: muted ? "var(--fg-3)" : "var(--fg-1)" }}>{main}</span>
      {side && (
        <span style={{ ...head, display: "block", marginTop: 1, fontSize: 12, fontWeight: 600, color: muted ? "var(--fg-4)" : "var(--fg-2)" }}>
          + {side}
        </span>
      )}
    </span>
  );
}

const PILL = {
  flex: "0 0 auto",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 5,
  minWidth: 84,
  height: 38,
  padding: "0 18px",
  borderRadius: 999,
  fontSize: 14,
  fontWeight: 700,
  lineHeight: 1,
  whiteSpace: "nowrap",
  boxSizing: "border-box",
} as const;

export function DishSlot({
  dish,
  chosen,
  auto,
  locked,
  entitlement,
  saving,
  onPick,
}: {
  dish: OrderingFoodItem;
  chosen: boolean;
  /** Ca chưa chọn gì và món này là suất mặc định — đã là suất của họ. */
  auto?: boolean;
  locked: boolean;
  entitlement?: Entitlement;
  saving?: boolean;
  onPick: () => void;
}) {
  const tag = kindLabel(dish);
  const isNone = chosen && entitlement === "none";
  const autoMark = !!auto && !chosen && !locked;
  const isChosen = chosen || autoMark;

  const shell: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    textAlign: "left",
    padding: "8px 10px",
    borderRadius: 14,
    border: isNone ? "1.5px dashed var(--fg-4)" : isChosen ? "1.5px dashed var(--gold)" : "1.5px solid transparent",
    background: isChosen ? "var(--bg-surface)" : "transparent",
    boxShadow: isChosen ? "0 1px 3px rgba(0, 0, 0, 0.04)" : "none",
    transition: "background 160ms var(--ease-out), border-color 160ms var(--ease-out), box-shadow 160ms var(--ease-out)",
    opacity: (locked && !isChosen) || isNone ? 0.65 : 1,
    font: "inherit",
  };

  const body = (
    <>
      <DishGlyph dish={dish} muted={!isChosen} />
      <span style={{ minWidth: 0, flex: 1 }}>
        <DishName name={dish.name} muted={!isChosen} />
        {tag && (
          <span style={{ display: "block", marginTop: 1, fontSize: 11, fontWeight: 600, letterSpacing: "0.02em", color: isChosen ? (dish.isVegetarian ? "var(--fd-cat-chay-ink)" : "var(--fg-3)") : "var(--fg-4)" }}>
            {tag}
          </span>
        )}
      </span>
    </>
  );

  const goldPill = (label: string, key: string) => (
    <span
      key={key}
      className="ge-pickbtn ge-pickbtn--pop"
      style={{
        ...PILL,
        minWidth: 92,
        height: 38,
        padding: "0 14px",
        border: "1.5px solid color-mix(in srgb, var(--gold) 55%, transparent)",
        background: "color-mix(in srgb, var(--gold) 14%, var(--bg-surface))",
        color: "var(--gold-deep)",
        fontSize: 13.5,
        fontWeight: 700,
      }}
    >
      <I.check size={15} sw={2.8} />
      {label}
    </span>
  );

  const nonePill = (
    <span key="none" className="ge-pickbtn" style={{ ...PILL, minWidth: 0, height: 32, fontWeight: 600, fontSize: 11.5, padding: "0 10px", border: "1.5px solid var(--border-default)", background: "var(--bg-muted)", color: "var(--fg-3)" }}>
      Ngoài ca làm việc
    </span>
  );

  if (locked) {
    return (
      <div style={shell}>
        {body}
        {chosen ? (isNone ? nonePill : goldPill("Đã chọn", "locked")) : null}
      </div>
    );
  }

  if (isChosen) {
    return (
      <button type="button" role="radio" aria-checked disabled style={{ ...shell, cursor: "default" }}>
        {body}
        {isNone ? nonePill : saving ? goldPill("Đang lưu…", "saving") : autoMark ? goldPill("Mặc định", "auto") : goldPill("Đã chọn", "on")}
      </button>
    );
  }

  return (
    <button type="button" role="radio" aria-checked={false} onClick={onPick} style={{ ...shell, cursor: "pointer" }}>
      {body}
      <span
        key="pick"
        className="ge-pickbtn ge-pickbtn--pop"
        style={{
          ...PILL,
          minWidth: 84,
          height: 38,
          border: "none",
          background: "var(--fd-wd-solid)",
          color: "var(--fd-wd-on-solid)",
          boxShadow: "0 3px 10px -2px rgba(20, 114, 76, 0.45)",
          fontSize: 14,
          fontWeight: 800,
          letterSpacing: "0.01em",
        }}
      >
        Chọn
      </span>
    </button>
  );
}
