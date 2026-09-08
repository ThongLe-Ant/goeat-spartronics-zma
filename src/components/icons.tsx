// GoEat — icon set (Lucide-style line icons) + brand logo.
// Ported from prototype app/icons.jsx. All icons inherit currentColor.
import { CSSProperties, ReactNode } from "react";

export interface IconProps {
  size?: number;
  sw?: number;
  fill?: string;
  style?: CSSProperties;
  children?: ReactNode;
  vb?: string;
  d?: string;
}

export function Icon({
  d,
  size = 22,
  sw = 2,
  fill = "none",
  style = {},
  children,
  vb = "0 0 24 24",
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={vb}
      fill={fill}
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      {children || <path d={d} />}
    </svg>
  );
}

type IconFn = (p: IconProps) => JSX.Element;

export const I: Record<string, IconFn> = {
  utensils: (p) => (
    <Icon {...p}>
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
    </Icon>
  ),
  utensilsX: (p) => (
    <Icon {...p}>
      <path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8" />
      <path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7" />
      <path d="m2.1 21.8 6.4-6.3" />
      <path d="m19 5-7 7" />
    </Icon>
  ),
  soup: (p) => (
    <Icon {...p}>
      <path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z" />
      <path d="M7 21h10" />
      <path d="M19.5 12 22 6" />
      <path d="M16.25 3c.27.1.8.53.75 1.36-.06.83-.93 1.2-1 2.02-.05.78.34 1.24.73 1.62" />
      <path d="M11.25 3c.27.1.8.53.74 1.36-.05.83-.93 1.2-.98 2.02-.06.78.33 1.24.72 1.62" />
      <path d="M6.25 3c.27.1.8.53.75 1.36-.06.83-.93 1.2-1 2.02-.05.78.34 1.24.74 1.62" />
    </Icon>
  ),
  circleDashed: (p) => (
    <Icon {...p}>
      <path d="M10.1 2.18a9.93 9.93 0 0 1 3.8 0" />
      <path d="M17.6 3.71a9.95 9.95 0 0 1 2.69 2.7" />
      <path d="M21.82 10.1a9.93 9.93 0 0 1 0 3.8" />
      <path d="M20.29 17.6a9.95 9.95 0 0 1-2.7 2.69" />
      <path d="M13.9 21.82a9.94 9.94 0 0 1-3.8 0" />
      <path d="M6.4 20.29a9.95 9.95 0 0 1-2.69-2.7" />
      <path d="M2.18 13.9a9.93 9.93 0 0 1 0-3.8" />
      <path d="M3.71 6.4a9.95 9.95 0 0 1 2.7-2.69" />
    </Icon>
  ),
  party: (p) => (
    <Icon {...p}>
      <path d="M5.8 11.3 2 22l10.7-3.79" />
      <path d="M4 3h.01" />
      <path d="M22 8h.01" />
      <path d="M15 2h.01" />
      <path d="M22 20h.01" />
      <path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10" />
      <path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11c-.11.7-.72 1.22-1.43 1.22H17" />
      <path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98C9.52 4.9 9 5.52 9 6.23V7" />
      <path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z" />
    </Icon>
  ),
  heart: (p) => (
    <Icon {...p}>
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </Icon>
  ),
  home: (p) => (
    <Icon {...p}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
      <path d="M9.5 21v-6h5v6" />
    </Icon>
  ),
  calendar: (p) => (
    <Icon {...p}>
      <rect x="3" y="4.5" width="18" height="16" rx="3" />
      <path d="M3 9h18M8 2.5v4M16 2.5v4" />
    </Icon>
  ),
  receipt: (p) => (
    <Icon {...p}>
      <path d="M5 3h14v18l-2.2-1.3L14.6 21l-2.6-1.5L9.4 21l-2.2-1.3L5 21z" />
      <path d="M9 8h6M9 12h6" />
    </Icon>
  ),
  user: (p) => (
    <Icon {...p}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-3.9 3.6-7 8-7s8 3.1 8 7" />
    </Icon>
  ),
  search: (p) => (
    <Icon {...p}>
      <circle cx="11" cy="11" r="7.5" />
      <path d="m21 21-4.3-4.3" />
    </Icon>
  ),
  cart: (p) => (
    <Icon {...p}>
      <circle cx="9" cy="20" r="1.6" />
      <circle cx="18" cy="20" r="1.6" />
      <path d="M2 3h2.2l2.3 12.4a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.2L21 7H5.3" />
    </Icon>
  ),
  plus: (p) => (
    <Icon {...p} sw={2.4}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  ),
  minus: (p) => (
    <Icon {...p} sw={2.4}>
      <path d="M5 12h14" />
    </Icon>
  ),
  star: (p) => (
    <Icon {...p} fill="currentColor" sw={0}>
      <path d="M12 2.5l2.9 5.9 6.5.95-4.7 4.6 1.1 6.5L12 17.4 6.2 20.45l1.1-6.5L2.6 9.35l6.5-.95z" />
    </Icon>
  ),
  chevR: (p) => (
    <Icon {...p}>
      <path d="m9 6 6 6-6 6" />
    </Icon>
  ),
  chevL: (p) => (
    <Icon {...p}>
      <path d="m15 6-6 6 6 6" />
    </Icon>
  ),
  chevDown: (p) => (
    <Icon {...p}>
      <path d="m6 9 6 6 6-6" />
    </Icon>
  ),
  arrowL: (p) => (
    <Icon {...p}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </Icon>
  ),
  clock: (p) => (
    <Icon {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </Icon>
  ),
  pin: (p) => (
    <Icon {...p}>
      <path d="M20 10c0 5.2-8 12-8 12s-8-6.8-8-12a8 8 0 0 1 16 0z" />
      <circle cx="12" cy="10" r="2.8" />
    </Icon>
  ),
  check: (p) => (
    <Icon {...p} sw={2.6}>
      <path d="M20 6 9 17l-5-5" />
    </Icon>
  ),
  checkCircle: (p) => (
    <Icon {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.5 2.5 4.5-5" strokeWidth="2.2" />
    </Icon>
  ),
  wallet: (p) => (
    <Icon {...p}>
      <path d="M3 7a2 2 0 0 1 2-2h12.5a1.5 1.5 0 0 1 1.5 1.5V8" />
      <rect x="3" y="7" width="18" height="13" rx="2.5" />
      <circle cx="16.5" cy="13.5" r="1.4" fill="currentColor" stroke="none" />
    </Icon>
  ),
  bank: (p) => (
    <Icon {...p}>
      <path d="M3 9.5 12 4l9 5.5" />
      <path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 21h18" />
    </Icon>
  ),
  cash: (p) => (
    <Icon {...p}>
      <rect x="2.5" y="6.5" width="19" height="11" rx="2" />
      <circle cx="12" cy="12" r="2.6" />
      <path d="M6 9.5v5M18 9.5v5" />
    </Icon>
  ),
  lock: (p) => (
    <Icon {...p}>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
      <circle cx="12" cy="15.2" r="1.3" fill="currentColor" stroke="none" />
    </Icon>
  ),
  camera: (p) => (
    <Icon {...p}>
      <path d="M4 8.5h3l1.5-2h7L17 8.5h3a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 18v-8A1.5 1.5 0 0 1 4 8.5z" />
      <circle cx="12" cy="13" r="3.3" />
    </Icon>
  ),
  edit: (p) => (
    <Icon {...p}>
      <path d="M14.5 4.5 19.5 9.5 8 21H3v-5z" />
      <path d="M12.5 6.5 17.5 11.5" />
    </Icon>
  ),
  trash: (p) => (
    <Icon {...p}>
      <path d="M4 7h16M9 7V4.5h6V7M6 7l1 13a1.5 1.5 0 0 0 1.5 1.4h7A1.5 1.5 0 0 0 17 20L18 7" />
    </Icon>
  ),
  bell: (p) => (
    <Icon {...p}>
      <path d="M18 9a6 6 0 0 0-12 0c0 6-2.5 7.5-2.5 7.5h17S18 15 18 9z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </Icon>
  ),
  flame: (p) => (
    <Icon {...p} fill="currentColor" sw={0}>
      <path d="M12 2c.5 3-1.8 4.2-2.8 6.2-.8 1.5-.6 3 .4 3.9.4-1.2 1.3-2 1.6-2.3-.3 1.6.3 2.5 1.2 3.4 1.4 1.4.9 3.2-.2 4.1 2.7-.4 5.6-2.6 5.6-6.3 0-3.6-2.4-5.2-3.3-7.1-.8-1.7-.5-3.6-2.5-5.9z" />
    </Icon>
  ),
  store: (p) => (
    <Icon {...p}>
      <path d="M4 9.5 5 4h14l1 5.5" />
      <path d="M4 9.5a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" />
      <path d="M5 11v9h14v-9M9.5 20v-5h5v5" />
    </Icon>
  ),
  chart: (p) => (
    <Icon {...p}>
      <path d="M4 4v16h16" />
      <path d="M8 14v3M12.5 9v8M17 11v6" />
    </Icon>
  ),
  bag: (p) => (
    <Icon {...p}>
      <path d="M6 8h12l-.8 11.2a2 2 0 0 1-2 1.8H8.8a2 2 0 0 1-2-1.8z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </Icon>
  ),
  x: (p) => (
    <Icon {...p} sw={2.4}>
      <path d="M6 6 18 18M18 6 6 18" />
    </Icon>
  ),
  leaf: (p) => (
    <Icon {...p}>
      <path d="M11 20A7 7 0 0 1 4 13c0-4.5 4-8.5 16-9-1 9-5 12-9 12z" />
      <path d="M5 19c4-5 7-7 11-8" />
    </Icon>
  ),
  eye: (p) => (
    <Icon {...p}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="2.8" />
    </Icon>
  ),
  eyeOff: (p) => (
    <Icon {...p}>
      <path d="M4 4l16 16" />
      <path d="M9.5 5.4A9.6 9.6 0 0 1 12 5c6.5 0 10 7 10 7a16 16 0 0 1-3 3.8M6.5 7.2A16 16 0 0 0 2 12s3.5 7 10 7a9.5 9.5 0 0 0 3.2-.5" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </Icon>
  ),
  filter: (p) => (
    <Icon {...p}>
      <path d="M3 5h18M6 12h12M10 19h4" />
    </Icon>
  ),
  gift: (p) => (
    <Icon {...p}>
      <rect x="3.5" y="9" width="17" height="12" rx="1.5" />
      <path d="M3.5 13.5h17M12 9v12" />
      <path d="M12 9S10.5 4.5 8 4.5 5.5 8 8 9h4zM12 9s1.5-4.5 4-4.5 2.5 3.5 0 4.5z" />
    </Icon>
  ),
  phone: (p) => (
    <Icon {...p}>
      <path d="M5 4h3.5l1.5 4-2 1.5a12 12 0 0 0 5 5l1.5-2 4 1.5V19a2 2 0 0 1-2.2 2A16 16 0 0 1 3.3 6.2 2 2 0 0 1 5 4z" />
    </Icon>
  ),
  truck: (p) => (
    <Icon {...p}>
      <path d="M2 6.5h11v9H2zM13 9.5h4l3 3v3h-7z" />
      <circle cx="6" cy="18" r="1.7" />
      <circle cx="17" cy="18" r="1.7" />
    </Icon>
  ),
  settings: (p) => (
    <Icon {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6M18.4 18.4l-1.6-1.6M7.2 7.2 5.6 5.6" />
    </Icon>
  ),
  info: (p) => (
    <Icon {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" strokeWidth="2.2" />
    </Icon>
  ),
  tag: (p) => (
    <Icon {...p}>
      <path d="M3 12V4.5a1.5 1.5 0 0 1 1.5-1.5H12l8.5 8.5a1.5 1.5 0 0 1 0 2.1l-6.4 6.4a1.5 1.5 0 0 1-2.1 0z" />
      <circle cx="8" cy="8" r="1.3" fill="currentColor" stroke="none" />
    </Icon>
  ),
  logout: (p) => (
    <Icon {...p}>
      <path d="M9 21H5.5A1.5 1.5 0 0 1 4 19.5v-15A1.5 1.5 0 0 1 5.5 3H9" />
      <path d="M16 16l4-4-4-4M9 12h11" />
    </Icon>
  ),
  spoon: (p) => (
    <Icon {...p}>
      <path d="M12 14v7" />
      <path d="M12 14c-2.5 0-4-2-4-5s1.5-6 4-6 4 3 4 6-1.5 5-4 5z" />
    </Icon>
  ),
  qr: (p) => (
    <Icon {...p}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <path d="M14 14h2.5v2.5M20.5 14v.01M14 20.5h2.5M20 17.5v3M20.5 20.5v.01" strokeWidth="2" />
    </Icon>
  ),
  scan: (p) => (
    <Icon {...p}>
      <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
      <path d="M4 12h16" strokeWidth="2" />
    </Icon>
  ),
  cup: (p) => (
    <Icon {...p}>
      <path d="M5 8h12l-1 11.2a2 2 0 0 1-2 1.8H8a2 2 0 0 1-2-1.8z" />
      <path d="M17 8h1.8a2.2 2.2 0 0 1 0 4.4H16.6" />
      <path d="M8.5 4.5c0 1-1 1.2-1 2.2M11.5 3.5c0 1.2-1 1.4-1 2.6M14.5 4.5c0 1-1 1.2-1 2.2" opacity="0.9" />
    </Icon>
  ),
  rice: (p) => (
    <Icon {...p}>
      <path d="M3.5 12h17a8.5 8.5 0 0 1-17 0z" />
      <path d="M2.5 12h19" />
      <path d="M8 8.5c0-1.2.8-2 1.6-2.4M12 7.5c0-1.3.6-2.2 1.4-2.8M15.8 8.6c0-1 .6-1.7 1.2-2.1" opacity="0.85" />
    </Icon>
  ),
  noodle: (p) => (
    <Icon {...p}>
      <path d="M3.5 11h17a8.5 8.5 0 0 1-17 0z" />
      <path d="M3.5 11h17" />
      <path d="M8 11V5.5M11 11V4.5M14 11V5" opacity="0.85" />
      <path d="M2 21h20" opacity="0.7" />
    </Icon>
  ),
  swap: (p) => (
    <Icon {...p}>
      <path d="M4 7h13l-3-3" />
      <path d="M20 17H7l3 3" />
    </Icon>
  ),
  refresh: (p) => (
    <Icon {...p}>
      <path d="M20 12a8 8 0 1 1-2.3-5.7" />
      <path d="M20 4v5h-5" />
    </Icon>
  ),
  bowl: (p) => (
    <Icon {...p}>
      <path d="M3 11h18a9 9 0 0 1-18 0z" />
      <path d="M8 20h8" />
      <path d="M9 7c0-2 6-2 6 0" opacity="0.7" />
    </Icon>
  ),
  ticket: (p) => (
    <Icon {...p}>
      <path d="M3 9V6.5A1.5 1.5 0 0 1 4.5 5h15A1.5 1.5 0 0 1 21 6.5V9a3 3 0 0 0 0 6v2.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5V15a3 3 0 0 0 0-6z" />
      <path d="M9 5v14" strokeDasharray="2 2" />
    </Icon>
  ),
};

// ── GoEat brand logo ──────────────────────────────────────────
export function GoEatMark({ size = 40, radius }: { size?: number; radius?: number }) {
  const r = radius != null ? radius : size * 0.3;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: r,
        flexShrink: 0,
        background: "linear-gradient(150deg, var(--teal-600), var(--teal-900))",
        boxShadow: "0 6px 16px -6px rgba(10,44,27,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -size * 0.25,
          right: -size * 0.2,
          width: size * 0.7,
          height: size * 0.7,
          borderRadius: "50%",
          background: "rgba(232,201,100,0.18)",
        }}
      />
      <svg
        width={size * 0.58}
        height={size * 0.58}
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--gold-bright)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ position: "relative" }}
      >
        <path d="M3.5 11h17a8.5 8.5 0 0 1-17 0z" fill="rgba(232,201,100,0.22)" />
        <path d="M3.5 11h17" />
        <path
          d="M12 10.5c0-2.2.8-3.6 2.4-4.4-.2 1.4.3 2.2 1 2.9 1 1 .6 2.4-.4 3"
          fill="var(--gold-bright)"
          stroke="none"
        />
        <path d="M9 8.2c.6-1 1.5-1.6 2.6-1.6" opacity="0.8" />
      </svg>
    </div>
  );
}

export function GoEatLogo({
  size = 40,
  color = "var(--fg-1)",
  sub,
}: {
  size?: number;
  color?: string;
  sub?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <GoEatMark size={size} />
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: size * 0.5,
            letterSpacing: "-0.02em",
            color,
          }}
        >
          Go<span style={{ color: "var(--gold-strong)" }}>Eat</span>
        </span>
        {sub && (
          <span style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 3, fontWeight: 500 }}>
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}
