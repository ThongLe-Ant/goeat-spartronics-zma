// GoEat ZMA — quầy phát suất ăn: quét QR thẻ NV bằng camera Zalo hoặc nhập mã
// tay ➝ POST /api/zma/staff/scan. Cùng luật/mã kết quả với màn quầy web spartronics.
import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { scanQRCode } from "zmp-sdk/apis";
import { Btn, Field, ScreenHeader, cardS } from "@/components/ui";
import { I } from "@/components/icons";
import StaffGuard from "@/components/staff-guard";
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

function ResultCard({ e, big }: { e: Entry; big?: boolean }) {
  const o = e.outcome;
  const served = o.kind === "served";
  const name = served ? o.data.employee_name : o.details?.employee_name;
  const code = served ? o.data.employee_code : o.details?.employee_code ?? e.value;
  const dish = served ? o.data.food_name : o.details?.food_name;
  const shift = served ? o.data.meal_time_name : o.details?.meal_time_name;
  const dept = served ? o.data.department : o.details?.department;
  const tone = served ? { bg: "var(--success-50, #e9f8ef)", bd: "var(--success-500)", fg: "var(--success-700, #157347)" } : o.result === "already_picked" ? { bg: "var(--gold-50, #fff7e0)", bd: "var(--gold-bright)", fg: "var(--gold-deep)" } : { bg: "var(--danger-50, #fdecec)", bd: "var(--danger-500, #d33)", fg: "var(--danger-700, #a32020)" };
  return (
    <div style={{ ...cardS, borderColor: tone.bd, background: tone.bg, padding: big ? 16 : 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: big ? 44 : 34, height: big ? 44 : 34, borderRadius: 12, background: tone.bd, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {served ? <I.checkCircle size={big ? 26 : 20} /> : <I.x size={big ? 24 : 18} />}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: big ? 18 : 15, color: tone.fg }}>
            {served ? (o.data.is_extra ? "Phát suất phát sinh" : "Phát thành công") : DENIED_TITLE[o.result]}
            {o.duplicate && <span style={{ fontSize: 11.5, fontWeight: 600, marginLeft: 8, opacity: 0.8 }}>(quẹt đúp)</span>}
          </div>
          <div style={{ fontSize: 12, color: "var(--fg-3)" }}>{e.at}{shift ? ` · ${shift}` : ""}</div>
        </div>
      </div>
      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{ fontWeight: 700, fontSize: big ? 16 : 14 }}>
          {name ?? "—"} <span style={{ color: "var(--fg-3)", fontWeight: 500, fontSize: 12.5 }}>· {code}</span>
        </div>
        {dept && <div style={{ fontSize: 12.5, color: "var(--fg-3)" }}>{dept}</div>}
        {dish && <div style={{ fontSize: big ? 14.5 : 13, marginTop: 2 }}><span style={{ color: "var(--fg-3)" }}>Món: </span><b>{dish}</b></div>}
        {!served && <div style={{ fontSize: 13, color: tone.fg, marginTop: 4, lineHeight: 1.4 }}>{o.message}</div>}
      </div>
    </div>
  );
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
        subtitle={served ? `Phiên này đã phát ${served} suất` : "Quầy phát — thẻ NV hoặc mã QR trong app"}
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
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px 24px" }} className="no-scrollbar">
        <button
          onClick={openCamera}
          disabled={busy}
          style={{ width: "100%", height: 150, borderRadius: 20, border: "none", background: "var(--fd-wd-solid)", color: "var(--fd-wd-on-solid)", boxShadow: "0 14px 30px -16px color-mix(in srgb, var(--fd-wd-solid) 70%, transparent)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", position: "relative", overflow: "hidden" }}
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
            <ResultCard e={latest} big />
          </div>
        )}

        {rest.length > 0 && (
          <>
            <div style={{ fontWeight: 700, fontSize: 14, fontFamily: "var(--font-display)", margin: "20px 2px 10px", color: "var(--fg-2)" }}>Lượt quét trước</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {rest.map((e) => (
                <ResultCard key={e.id} e={e} />
              ))}
            </div>
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
