// GoEat — shared UI primitives (styled against design tokens).
// Ported from prototype app/ui.jsx.
import { CSSProperties, ReactNode, useState } from "react";
import { I } from "./icons";

// Image with graceful sand placeholder + cover fit
export function AppImg({
  src,
  alt = "",
  radius = 0,
  style = {},
  children,
}: {
  src: string;
  alt?: string;
  radius?: number;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const [ok, setOk] = useState(true);
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: radius,
        background: "linear-gradient(135deg, var(--sand-100), var(--sand-200))",
        ...style,
      }}
    >
      {ok && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setOk(false)}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      )}
      {!ok && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--sand-400)",
          }}
        >
          <I.spoon size={26} />
        </div>
      )}
      {children}
    </div>
  );
}

// Buttons
export function Btn({
  children,
  variant = "primary",
  size = "md",
  full,
  icon,
  onClick,
  disabled,
  style = {},
}: {
  children?: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "soft" | "dark" | "danger";
  size?: "sm" | "md" | "lg";
  full?: boolean;
  icon?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  style?: CSSProperties;
}) {
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontFamily: "var(--font-sans)",
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    border: "1px solid transparent",
    transition: "all 160ms var(--ease-out)",
    width: full ? "100%" : undefined,
    opacity: disabled ? 0.5 : 1,
    whiteSpace: "nowrap",
  };
  const sizes: Record<string, CSSProperties> = {
    sm: { padding: "8px 14px", fontSize: 13, borderRadius: 10 },
    md: { padding: "12px 18px", fontSize: 15, borderRadius: 14 },
    lg: { padding: "15px 22px", fontSize: 16, borderRadius: 16 },
  };
  const variants: Record<string, CSSProperties> = {
    primary: { background: "var(--fd-wd-solid, var(--teal-500))", color: "#fff", boxShadow: "0 6px 16px -8px rgba(20,114,76,0.7)" },
    secondary: { background: "var(--bg-surface)", color: "var(--fg-1)", borderColor: "var(--border-default)" },
    ghost: { background: "transparent", color: "var(--fg-1)" },
    soft: { background: "var(--teal-50)", color: "var(--teal-700)" },
    dark: { background: "var(--sand-900)", color: "#fff" },
    danger: { background: "var(--danger-50)", color: "var(--danger-700)" },
  };
  const [press, setPress] = useState(false);
  return (
    <button
      onClick={disabled ? undefined : onClick}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      onMouseLeave={() => setPress(false)}
      style={{
        ...base,
        ...sizes[size],
        ...variants[variant],
        transform: press ? "translateY(1px) scale(0.99)" : "none",
        ...style,
      }}
    >
      {icon}
      {children}
    </button>
  );
}

export function Badge({
  children,
  tone = "brand",
  solid,
  style = {},
}: {
  children?: ReactNode;
  tone?: "brand" | "success" | "warning" | "danger" | "gold" | "info" | "neutral" | "dark";
  solid?: boolean;
  style?: CSSProperties;
}) {
  const tones: Record<string, { bg: string; c: string }> = {
    brand: solid ? { bg: "var(--teal-500)", c: "#fff" } : { bg: "var(--teal-50)", c: "var(--teal-700)" },
    success: solid ? { bg: "var(--success-500)", c: "#fff" } : { bg: "var(--success-50)", c: "var(--success-700)" },
    warning: solid ? { bg: "var(--warning-500)", c: "#fff" } : { bg: "var(--warning-50)", c: "var(--warning-700)" },
    danger: solid ? { bg: "var(--danger-500)", c: "#fff" } : { bg: "var(--danger-50)", c: "var(--danger-700)" },
    gold: solid ? { bg: "var(--gold)", c: "#3A2C06" } : { bg: "var(--gold-50)", c: "var(--gold-deep)" },
    info: solid ? { bg: "var(--info-500)", c: "#fff" } : { bg: "var(--info-50)", c: "var(--info-700)" },
    neutral: { bg: "var(--bg-soft)", c: "var(--fg-2)" },
    dark: { bg: "rgba(0,0,0,0.55)", c: "#fff" },
  };
  const t = tones[tone] || tones.brand;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "4px 9px",
        borderRadius: 999,
        fontSize: 11.5,
        fontWeight: 700,
        background: t.bg,
        color: t.c,
        lineHeight: 1,
        ...style,
      }}
    >
      {children}
    </span>
  );
}


// Quantity stepper
export function Stepper({
  value,
  onChange,
  min = 1,
  size = 32,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  size?: number;
}) {
  const btn = (content: ReactNode, fn: () => void, on: boolean) => (
    <button
      onClick={fn}
      disabled={!on}
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        border: "1px solid var(--border-default)",
        background: "var(--bg-surface)",
        color: on ? "var(--fg-1)" : "var(--fg-4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: on ? "pointer" : "not-allowed",
        flexShrink: 0,
      }}
    >
      {content}
    </button>
  );
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
      {btn(<I.minus size={16} />, () => onChange(Math.max(min, value - 1)), value > min)}
      <span style={{ minWidth: 18, textAlign: "center", fontWeight: 700, fontSize: 16, fontFamily: "var(--font-display)" }}>
        {value}
      </span>
      {btn(<I.plus size={16} />, () => onChange(value + 1), true)}
    </div>
  );
}

// Star rating inline
export function Rating({ value, sold, size = 13 }: { value: number; sold?: number; size?: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: size, color: "var(--fg-2)", fontWeight: 500 }}>
      <span style={{ color: "var(--gold)", display: "inline-flex" }}>
        <I.star size={size} />
      </span>
      <span style={{ color: "var(--fg-1)", fontWeight: 600 }}>{value}</span>
      {sold != null && <span style={{ color: "var(--fg-3)" }}>· {sold}+ đã bán</span>}
    </span>
  );
}

// Screen-level header (custom, sits below status bar)
export function ScreenHeader({
  title,
  onBack,
  right,
  dark,
  subtitle,
}: {
  title: ReactNode;
  onBack?: () => void;
  right?: ReactNode;
  dark?: boolean;
  subtitle?: ReactNode;
}) {
  return (
    <div
      style={{
        paddingTop: "calc(var(--safe-top) + 10px)",
        paddingBottom: 12,
        paddingLeft: 16,
        paddingRight: 16,
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: dark ? "transparent" : "var(--bg-surface)",
        borderBottom: dark ? "none" : "1px solid var(--border-subtle)",
        position: "sticky",
        top: 0,
        zIndex: 30,
      }}
    >
      {onBack && (
        <button
          onClick={onBack}
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            border: dark ? "none" : "1px solid var(--border-subtle)",
            background: dark ? "rgba(255,255,255,0.18)" : "var(--bg-surface)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
            color: dark ? "#fff" : "var(--fg-1)",
          }}
        >
          <I.arrowL size={20} />
        </button>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 19,
            color: dark ? "#fff" : "var(--fg-1)",
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: 12.5, color: dark ? "rgba(255,255,255,0.8)" : "var(--fg-3)", marginTop: 2 }}>
            {subtitle}
          </div>
        )}
      </div>
      {right}
    </div>
  );
}

// Section title row
export function SectionTitle({
  children,
  action,
  onAction,
  style = {},
}: {
  children?: ReactNode;
  action?: ReactNode;
  onAction?: () => void;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
        marginBottom: 12,
        ...style,
      }}
    >
      <h3 style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, letterSpacing: "-0.01em", color: "var(--fg-1)" }}>
        {children}
      </h3>
      {action && (
        <button
          onClick={onAction}
          style={{
            background: "none",
            border: "none",
            color: "var(--teal-600)",
            fontWeight: 600,
            fontSize: 13.5,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          {action}
          <I.chevR size={15} />
        </button>
      )}
    </div>
  );
}

// Bottom sheet
export function Sheet({
  open,
  onClose,
  children,
  title,
}: {
  open: boolean;
  onClose: () => void;
  children?: ReactNode;
  title?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, zIndex: 80, display: "flex", alignItems: "flex-end" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(27,24,20,0.42)", animation: "ge-fade 180ms ease" }} />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: "100%",
          background: "var(--bg-surface)",
          borderRadius: "26px 26px 0 0",
          padding: "10px 0 0",
          maxHeight: "82%",
          display: "flex",
          flexDirection: "column",
          animation: "ge-up 260ms var(--ease-out)",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
        }}
      >
        <div style={{ width: 40, height: 5, borderRadius: 999, background: "var(--border-default)", margin: "0 auto 8px" }} />
        {title && (
          <div style={{ padding: "6px 20px 12px", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, borderBottom: "1px solid var(--border-subtle)" }}>
            {title}
          </div>
        )}
        <div style={{ overflowY: "auto", flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}

// Toast
export function Toast({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div
      style={{
        position: "absolute",
        bottom: 96,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 95,
        background: "var(--sand-900)",
        color: "#fff",
        padding: "12px 18px",
        borderRadius: 14,
        fontSize: 14,
        fontWeight: 500,
        display: "flex",
        alignItems: "center",
        gap: 8,
        boxShadow: "0 12px 32px -8px rgba(0,0,0,0.4)",
        animation: "ge-toast 240ms var(--ease-spring)",
        maxWidth: "86%",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ color: "var(--teal-300)", display: "inline-flex" }}>
        <I.checkCircle size={18} />
      </span>
      {msg}
    </div>
  );
}

// Text field
export function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  icon,
  right,
  hint,
  error,
}: {
  label?: ReactNode;
  value: string;
  onChange?: (v: string) => void;
  type?: string;
  placeholder?: string;
  icon?: ReactNode;
  right?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && (
        <label style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: "var(--fg-1)", marginBottom: 7 }}>
          {label}
        </label>
      )}
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        {icon && <span style={{ position: "absolute", left: 13, color: "var(--fg-3)", display: "inline-flex" }}>{icon}</span>}
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange && onChange(e.target.value)}
          style={{
            width: "100%",
            padding: "13px 14px",
            paddingLeft: icon ? 42 : 14,
            paddingRight: right ? 44 : 14,
            fontFamily: "var(--font-sans)",
            fontSize: 15,
            color: "var(--fg-1)",
            border: `1px solid ${error ? "var(--danger-500)" : "var(--border-default)"}`,
            borderRadius: 14,
            background: "var(--bg-surface)",
            outline: "none",
            boxSizing: "border-box",
            transition: "border-color 140ms",
          }}
        />
        {right && <span style={{ position: "absolute", right: 13 }}>{right}</span>}
      </div>
      {(hint || error) && (
        <div style={{ fontSize: 12, marginTop: 6, color: error ? "var(--danger-700)" : "var(--fg-3)" }}>
          {error || hint}
        </div>
      )}
    </div>
  );
}

// Shared inline style objects reused across screens
export const cardS: CSSProperties = {
  background: "var(--bg-surface)",
  border: "1px solid var(--border-subtle)",
  borderRadius: 16,
  padding: 14,
  boxShadow: "var(--shadow-xs)",
};
export const iconBtnGlass: CSSProperties = {
  position: "relative",
  width: 40,
  height: 40,
  borderRadius: 12,
  border: "none",
  background: "rgba(255,255,255,0.2)",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};
export const empTag: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  padding: "5px 10px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.16)",
  color: "#fff",
  fontSize: 12,
  fontWeight: 600,
};
