// Chart palette — the single source of truth for anything drawn on a canvas.
//
// lightweight-charts and our 2D-canvas layers need concrete colour values, so
// they can't read the CSS custom properties in App.css. These are the sRGB
// equivalents of those exact OKLCH tokens, kept here (not sprinkled through the
// components) so the chart can never drift from the rest of the UI. If a token
// in App.css changes, recompute the matching entry here.
export const C = {
  bg: "#04070b",           // --bg
  panel: "#0a1017",        // --panel
  raised: "#111922",       // --panel-raised
  line: "#1e2731",         // --line
  lineBright: "#313f4d",   // --line-bright
  text: "#e5ecf3",         // --text
  muted: "#94a0ac",        // --muted
  faint: "#626d78",        // --faint

  green: "#00e18d",        // --green   long / profit / pass
  red: "#f75c61",          // --red     short / loss / fail
  amber: "#ffbd47",        // --amber   pending / caution
  cyan: "#51d5ff",         // --cyan    tools / planning
  violet: "#a79aff",       // --violet
  benchmark: "#76acfc",    // --benchmark

  greenDeep: "#00a062",    // candle bodies — darker so the border reads as an edge
  redDeep: "#b93d42",
};

// Translucent helpers, so callers don't hand-roll rgba() strings.
const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
export const alpha = (hex, a) => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
};

// Shared chart layout options — identical grid/crosshair/axis styling wherever a
// chart appears (live terminal and post-session replay).
export const chartLayout = () => ({
  layout: {
    background: { color: C.bg },
    textColor: C.muted,
    fontFamily: "'JetBrains Mono', monospace",
    attributionLogo: false,
  },
  grid: {
    vertLines: { color: alpha(C.grid ?? C.muted, 0.05) },
    horzLines: { color: alpha(C.grid ?? C.muted, 0.06) },
  },
  timeScale: { borderColor: C.line },
  rightPriceScale: { borderColor: C.line },
});

export const candleColors = {
  upColor: C.greenDeep,
  downColor: C.redDeep,
  borderVisible: true,
  borderUpColor: C.green,
  borderDownColor: C.red,
  wickUpColor: C.green,
  wickDownColor: C.red,
};
