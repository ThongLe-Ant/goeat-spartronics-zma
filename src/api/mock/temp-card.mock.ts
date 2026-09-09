// GoEat ZMA — mock CẤP THẺ TẠM.
//
// Kho thẻ giả lập giữ trong localStorage để thao tác thử vẫn có hậu quả: cấp
// thẻ TC-0007 xong mà quét lại ngay thì phải bị từ chối "đang kích hoạt", đúng
// như server. Mock mà cấp được vô hạn thì màn hình trông chạy tốt trong khi lỗi
// thật chỉ lộ ra ở nhà máy.
//
// Luật chép đúng `temporary-card.service` của web: thẻ phải có trong kho, thẻ
// đang kích hoạt và CHƯA hết hạn thì không cấp lại, hạn mới = +1 giờ.
import type {
  StaffEmployeeHit,
  TempCardIssueInput,
  TempCardIssueResult,
} from "../types";
import { mockSearchEmployees } from "./staff.mock";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const STORE = "goeat.zma.mock.temp_cards";
const HOUR_MS = 60 * 60 * 1000;

/** Kho thẻ nhựa của nhà máy — mã in trên thẻ. Kho là việc của web, đây chỉ là dữ liệu thử. */
const INVENTORY = Array.from(
  { length: 12 },
  (_, i) => `TC-${String(i + 1).padStart(4, "0")}`,
);

type Issued = Record<
  string,
  {
    kind: string;
    label: string | null;
    department: string | null;
    expires_at: number;
  }
>;

function load(): Issued {
  try {
    return JSON.parse(localStorage.getItem(STORE) || "{}");
  } catch {
    return {};
  }
}
function save(v: Issued) {
  try {
    localStorage.setItem(STORE, JSON.stringify(v));
  } catch {
    /* riêng tư / hết chỗ — mock không cần bền */
  }
}

const activeAt = (issued: Issued, code: string, now: number) =>
  (issued[code]?.expires_at ?? 0) > now;

export const mockTempCardEmployees = (q: string): Promise<StaffEmployeeHit[]> =>
  mockSearchEmployees(q);

export async function mockIssueTempCard(
  input: TempCardIssueInput,
): Promise<TempCardIssueResult> {
  await delay(380);
  const now = Date.now();
  const issued = load();
  const expires = now + HOUR_MS;
  const out = (
    codes: string[],
    kind: string,
    label: string | null,
    department: string | null,
  ): TempCardIssueResult => {
    for (const c of codes)
      issued[c] = { kind, label, department, expires_at: expires };
    save(issued);
    return {
      cards: codes.map((code) => ({
        code,
        kind,
        label,
        department,
        expires_at: new Date(expires).toISOString(),
      })),
      message:
        codes.length === 1
          ? `Đã cấp thẻ tạm ${codes[0]}.`
          : `Đã cấp ${codes.length} thẻ tạm.`,
    };
  };

  if (input.mode === "employee") {
    const code = (input.code ?? "").trim();
    if (!INVENTORY.includes(code))
      throw new Error("Mã thẻ tạm không tồn tại trong hệ thống.");
    if (activeAt(issued, code, now))
      throw new Error(
        `Thẻ tạm mã ${code} đang được kích hoạt và chưa hết hạn.`,
      );
    return out([code], "employee", null, null);
  }

  const kind = input.kind === "guest" ? "extra:guest" : "extra:new_worker";
  const label = input.label ?? null;
  const department = input.department ?? null;

  if (input.codes && input.codes.length > 0) {
    for (const raw of input.codes) {
      const c = raw.trim();
      if (!INVENTORY.includes(c))
        throw new Error(`Mã thẻ tạm ${c} không tồn tại trong hệ thống.`);
      if (activeAt(issued, c, now))
        throw new Error(`Thẻ tạm mã ${c} đang được kích hoạt và chưa hết hạn.`);
    }
    return out(
      input.codes.map((c) => c.trim()),
      kind,
      label,
      department,
    );
  }

  const need = input.count ?? 0;
  const free = INVENTORY.filter((c) => !activeAt(issued, c, now));
  if (free.length < need)
    throw new Error(
      `Không đủ thẻ tạm khả dụng (cần ${need}, chỉ còn ${free.length}). Vui lòng nhập thêm thẻ vào kho.`,
    );
  return out(free.slice(0, need), kind, label, department);
}
