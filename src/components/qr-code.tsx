// GoEat — pseudo-realistic QR code renderer (deterministic from a string, no library).
// Ported from prototype app/qr.jsx.

export function QRCode({
  value = "",
  size = 200,
  fg = "#0B4228",
  bg = "#fff",
  quiet = 2,
}: {
  value?: string;
  size?: number;
  fg?: string;
  bg?: string;
  quiet?: number;
}) {
  const N = 29; // modules
  // deterministic PRNG from string
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const rand = () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 1000) / 1000;
  };

  const isFinder = (r: number, c: number) => {
    const inBox = (br: number, bc: number) => r >= br && r < br + 7 && c >= bc && c < bc + 7;
    return inBox(0, 0) || inBox(0, N - 7) || inBox(N - 7, 0);
  };
  const finderOn = (r: number, c: number) => {
    const local = (br: number, bc: number) => {
      const rr = r - br,
        cc = c - bc;
      if (rr === 0 || rr === 6 || cc === 0 || cc === 6) return true; // outer ring
      if (rr >= 2 && rr <= 4 && cc >= 2 && cc <= 4) return true; // inner block
      return false;
    };
    if (r < 7 && c < 7) return local(0, 0);
    if (r < 7 && c >= N - 7) return local(0, N - 7);
    if (r >= N - 7 && c < 7) return local(N - 7, 0);
    return false;
  };

  const cells: JSX.Element[] = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      let on: boolean;
      if (isFinder(r, c)) on = finderOn(r, c);
      else if (r === 6 || c === 6) on = (r + c) % 2 === 0; // timing lines
      else on = rand() > 0.52;
      if (on)
        cells.push(
          <rect key={r + "-" + c} x={c} y={r} width={1.02} height={1.02} fill={fg} rx={0.18} />
        );
    }
  }
  const vb = N + quiet * 2;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`${-quiet} ${-quiet} ${vb} ${vb}`}
      style={{ display: "block", background: bg, borderRadius: 12 }}
      shapeRendering="crispEdges"
    >
      {cells}
    </svg>
  );
}
