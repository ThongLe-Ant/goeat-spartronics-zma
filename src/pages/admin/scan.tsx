// GoEat ZMA — quầy phát suất ăn: quét QR thẻ NV bằng camera Zalo hoặc nhập mã
// tay ➝ POST /api/zma/staff/scan. Cùng luật/mã kết quả với màn quầy web spartronics.
import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { scanQRCode } from "zmp-sdk/apis";
import { Btn, Field, ScreenHeader } from "@/components/ui";
import { I } from "@/components/icons";
import StaffGuard from "@/components/staff-guard";
import { LatestResult, ResultLog, type ResultView } from "@/components/admin/dispense-result";
import { scanCard } from "@/api/staff";
import { useBootstrap } from "@/state/ordering";
import type { ScanDeniedResult, ScanOutcome } from "@/api/types";

const DENIED_TITLE: Record<ScanDeniedResult, string> = {
  already_picked: "Đã nhận rồi",
  no_order: "Không có suất",
  out_of_window: "Ngoài giờ phát",
  unknown_user: "Không tìm thấy NV",
  inactive: "NV ngừng hoạt động",
  wrong_category: "Sai quầy",
  extra_quota_exhausted: "Hết suất phát sinh",
};

type Entry = { id: number; value: string; at: string; outcome: ScanOutcome };

/** Đổi một lượt quét thành dạng để hiện, xem `dispense-result.tsx`. */
function viewOf(e: Entry): ResultView & { id: number } {
  const o = e.outcome;
  const d = o.kind === "served" ? o.data : o.details;
  const base = { id: e.id, at: e.at, name: d?.employee_name, code: d?.employee_code ?? e.value, dept: d?.department, shift: d?.meal_time_name, dish: d?.food_name };
  if (o.kind === "served") return { ...base, tone: "ok", title: o.duplicate ? "Quẹt đúp, đã phát trước đó" : o.data.is_extra ? "Đã phát suất phát sinh" : "Đã phát" };
  return { ...base, tone: o.result === "already_picked" ? "warn" : "bad", title: DENIED_TITLE[o.result], detail: o.message };
}

function ScanScreen() {
  const navigate = useNavigate();
  const boot = useBootstrap();
  const [manual, setManual] = useState("");
  const [busy, setBusy] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const seq = useRef(0);

  const submit = useCallback(
    async (value: string) => {
      const v = value.trim();
      if (!v || busy) return;
      setBusy(true);
      try {
        const outcome = await scanCard(v);
        const at = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Ho_Chi_Minh" });
        setEntries((list) => [{ id: ++seq.current, value: v, at, outcome }, ...list].slice(0, 30));
        setManual("");
        if (outcome.kind === "served") toast.success(outcome.data.employee_name ?? "Đã phát");
        else toast.error(DENIED_TITLE[outcome.result]);
      } catch (e) {
        toast.error((e as Error)?.message ?? "Không gửi được lượt quét");
      } finally {
        setBusy(false);
      }
    },
    [busy],
  );

  const openCamera = useCallback(async () => {
    try {
      const { content } = await scanQRCode();
      if (content) await submit(content);
    } catch {
      toast("Không mở được camera — nhập mã tay bên dưới");
    }
  }, [submit]);

  const [latest, ...rest] = entries;
  const served = entries.filter((e) => e.outcome.kind === "served").length;

  return (
    <div style={{ height: "100%", background: "var(--bg-page)", display: "flex", flexDirection: "column" }}>
      <ScreenHeader
        title="Quét thẻ phát suất ăn"
        subtitle={served ? `Phiên này đã phát ${served} suất` : "Quét thẻ nhân viên hoặc mã QR trong app"}
        onBack={() => navigate("/profile")}
        right={
          boot?.staff?.canKitchen ? (
            <button
              onClick={() => navigate("/admin/kitchen")}
              style={{ width: 38, height: 38, borderRadius: 11, border: "1px solid var(--border-subtle)", background: "var(--bg-surface)", color: "var(--fg-1)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              <I.bowl size={19} />
            </button>
          ) : undefined
        }
      />
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px calc(var(--safe-bottom) + 24px)" }} className="no-scrollbar">
        <button
          onClick={openCamera}
          disabled={busy}
          className="ge-dots"
          style={{ ["--ge-dot-ink" as string]: "#ffffff", ["--ge-dot-alpha" as string]: "20%", width: "100%", height: 150, borderRadius: 20, border: "none", background: "var(--fd-wd-solid)", color: "var(--fd-wd-on-solid)", boxShadow: "0 14px 30px -16px color-mix(in srgb, var(--fd-wd-solid) 70%, transparent)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", position: "relative", overflow: "hidden" }}
        >
          <span style={{ width: 62, height: 62, borderRadius: 18, border: "3px solid rgba(255,255,255,0.85)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <I.scan size={32} />
          </span>
          <span style={{ fontWeight: 700, fontSize: 15 }}>{busy ? "Đang xử lý…" : "Bấm để quét mã QR"}</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.75)" }}>Mã QR trên thẻ nhận cơm của nhân viên</span>
        </button>

        <div style={{ marginTop: 12 }}>
          <Field
            value={manual}
            onChange={setManual}
            placeholder="Nhập số thẻ hoặc mã NV"
            icon={<I.ticket size={17} />}
            right={
              <Btn size="sm" disabled={busy || !manual.trim()} onClick={() => submit(manual)} icon={<I.check size={15} />}>
                Phát
              </Btn>
            }
          />
        </div>

        {latest && (
          <div style={{ marginTop: 16 }}>
            <LatestResult v={viewOf(latest)} />
          </div>
        )}

        {rest.length > 0 && (
          <>
            <div style={{ fontWeight: 700, fontSize: 14.5, fontFamily: "var(--font-display)", margin: "20px 2px 4px", color: "var(--fg-1)" }}>Lượt quét trước</div>
            <ResultLog items={rest.map(viewOf)} />
          </>
        )}
        {entries.length === 0 && (
          <div style={{ textAlign: "center", color: "var(--fg-3)", padding: "28px 16px", fontSize: 13.5, lineHeight: 1.5 }}>
            Kết quả mỗi lượt quét hiện ở đây: tên, món đã đăng ký, hoặc lý do từ chối (đã nhận, ngoài giờ, không có suất…).
          </div>
        )}
      </div>
    </div>
  );
}

export default function ScanPage() {
  return (
    <StaffGuard need="canScan">
      <ScanScreen />
    </StaffGuard>
  );
}
