// Interactive lesson exercises (Phase F). Each takes a `step` and calls
// onResult(correct) once the learner submits. They render their own submit +
// feedback; the LessonPlayer handles XP and the Continue button.
import { useState, useRef } from "react";

// ── shared mini candlestick chart (dependency-free SVG) ──────────────────
export function MiniChart({ bars, width = 320, height = 200, pad = 10, overlays = [], onPick, pickable }) {
  const pmin = Math.min(...bars.map((b) => b.l));
  const pmax = Math.max(...bars.map((b) => b.h));
  const range = pmax - pmin || 1;
  const lo = pmin - range * 0.08, hi = pmax + range * 0.08;
  const y = (v) => priceToY(v, lo, hi, height, pad);
  const n = bars.length;
  const slot = (width - 2 * pad) / n;
  const bw = Math.max(2, slot * 0.6);
  const svgRef = useRef(null);

  const handlePick = (e) => {
    if (!pickable || !onPick) return;
    const rect = svgRef.current.getBoundingClientRect();
    const cy = e.clientY - rect.top;
    const price = lo + (1 - (cy - pad) / (height - 2 * pad)) * (hi - lo);
    onPick(price);
  };

  return (
    <svg ref={svgRef} width={width} height={height} className="ex-chart"
         onPointerDown={handlePick} style={pickable ? { cursor: "crosshair" } : undefined}>
      {overlays.map((ov, i) => {
        const yc = y(ov.price);
        const band = ov.tolerance ? Math.abs(y(ov.price - ov.tolerance) - y(ov.price + ov.tolerance)) : 0;
        return (
          <g key={i}>
            {band > 0 && (
              <rect x={pad} y={yc - band / 2} width={width - 2 * pad} height={band}
                    fill={ov.color} opacity="0.15" />
            )}
            <line x1={pad} y1={yc} x2={width - pad} y2={yc} stroke={ov.color}
                  strokeWidth="1.5" strokeDasharray={ov.dashed ? "5 4" : undefined} />
          </g>
        );
      })}
      {bars.map((b, i) => {
        const up = b.c >= b.o;
        const color = up ? "#2ef2a0" : "#ff5f5c";
        const x = pad + i * slot + slot / 2;
        const bodyTop = Math.min(y(b.o), y(b.c));
        const bodyH = Math.max(1.5, Math.abs(y(b.c) - y(b.o)));
        return (
          <g key={i}>
            <line x1={x} y1={y(b.h)} x2={x} y2={y(b.l)} stroke={color} strokeWidth="1" />
            <rect x={x - bw / 2} y={bodyTop} width={bw} height={bodyH} fill={color} />
          </g>
        );
      })}
    </svg>
  );
}

// ── draw-on-chart: mark a support/resistance zone ────────────────────────
// step: { type:"mark_chart", bars, target_price, tolerance?, prompt?, kind? }
export function MarkChart({ step, onResult }) {
  const bars = step.bars;
  const span = Math.max(...bars.map((b) => b.h)) - Math.min(...bars.map((b) => b.l));
  const tol = step.tolerance ?? span * 0.06;
  const [price, setPrice] = useState(null);
  const [done, setDone] = useState(false);
  const correct = price != null && Math.abs(price - step.target_price) <= tol;

  const overlays = [];
  if (price != null) overlays.push({ price, color: "#45d8ff", dashed: true });
  if (done) overlays.push({ price: step.target_price, tolerance: tol, color: "#2ef2a0" });

  return (
    <div className="exercise mark-chart">
      <p className="lesson-question">
        {step.prompt || `Click on the chart to mark the ${step.kind || "key"} level the price keeps reacting to.`}
      </p>
      <MiniChart bars={bars} overlays={overlays} pickable={!done}
                 onPick={(p) => setPrice(p)} />
      <div className="ex-hint">
        {price == null ? "Tap the chart where you see the zone." : `Marked at ${price.toFixed(1)}.`}
      </div>
      {!done && price != null && (
        <button className="primary-btn" onClick={() => { setDone(true); onResult(correct); }}>
          Submit zone
        </button>
      )}
      {done && (
        <div className="lesson-feedback">
          <p className={correct ? "feedback-correct" : "feedback-incorrect"}>
            {correct ? "Good eye — that's the zone." : "Off the mark this time."}
          </p>
          <p className="lesson-explanation">
            The green band is the zone we were looking for (around {step.target_price}). Support and
            resistance are areas, not exact lines — being inside the band is what counts.
          </p>
        </div>
      )}
    </div>
  );
}

// ── shared candle SVG ────────────────────────────────────────────────────
function priceToY(v, pmin, pmax, h, pad) {
  const span = pmax - pmin || 1;
  return pad + (1 - (v - pmin) / span) * (h - 2 * pad);
}

function Candle({ o, h, l, c, pmin, pmax, x, width, height, pad }) {
  const up = c >= o;
  const color = up ? "#2ef2a0" : "#ff5f5c";
  const yO = priceToY(o, pmin, pmax, height, pad);
  const yC = priceToY(c, pmin, pmax, height, pad);
  const yH = priceToY(h, pmin, pmax, height, pad);
  const yL = priceToY(l, pmin, pmax, height, pad);
  const bodyTop = Math.min(yO, yC);
  const bodyH = Math.max(2, Math.abs(yC - yO));
  return (
    <g>
      <line x1={x + width / 2} y1={yH} x2={x + width / 2} y2={yL} stroke={color} strokeWidth="2" />
      <rect x={x} y={bodyTop} width={width} height={bodyH} fill={color} rx="1" />
    </g>
  );
}

// ── build-a-candle ────────────────────────────────────────────────────────
// step: { type:"build_candle", target:{open,high,low,close}, tolerance?, prompt? }
export function BuildCandle({ step, onResult }) {
  const t = step.target;
  const tol = step.tolerance ?? Math.max(0.5, (t.high - t.low) * 0.08);
  const pmin = t.low - (t.high - t.low) * 0.35;
  const pmax = t.high + (t.high - t.low) * 0.35;
  const mid = (pmin + pmax) / 2;
  const stepSize = Math.max(0.1, Math.round((pmax - pmin) / 100 * 10) / 10);

  const [o, setO] = useState(mid);
  const [h, setH] = useState(mid);
  const [l, setL] = useState(mid);
  const [c, setC] = useState(mid);
  const [done, setDone] = useState(false);

  const H = 220, W = 120, pad = 16;
  const near = (a, b) => Math.abs(a - b) <= tol;
  const consistent = h >= Math.max(o, c) - 1e-9 && l <= Math.min(o, c) + 1e-9;
  const correct = near(o, t.open) && near(h, t.high) && near(l, t.low) &&
                  near(c, t.close) && consistent;

  const Slider = ({ label, val, set }) => (
    <label className="ex-slider">
      <span className="ex-slider-label">{label}<b>{val.toFixed(1)}</b></span>
      <input type="range" min={pmin} max={pmax} step={stepSize} value={val}
             disabled={done} onChange={(e) => set(parseFloat(e.target.value))} />
    </label>
  );

  return (
    <div className="exercise build-candle">
      <p className="lesson-question">
        {step.prompt || `Drag the sliders to build a candle with open ${t.open}, high ${t.high}, low ${t.low}, close ${t.close}.`}
      </p>
      <div className="ex-candle-wrap">
        <svg width={W} height={H} className="ex-candle">
          <Candle o={o} h={h} l={l} c={c} pmin={pmin} pmax={pmax} x={W / 2 - 16} width={32} height={H} pad={pad} />
        </svg>
        <div className="ex-sliders">
          <Slider label="High" val={h} set={setH} />
          <Slider label="Open" val={o} set={setO} />
          <Slider label="Close" val={c} set={setC} />
          <Slider label="Low" val={l} set={setL} />
        </div>
      </div>
      {!done && (
        <button className="primary-btn" onClick={() => { setDone(true); onResult(correct); }}>
          Submit candle
        </button>
      )}
      {done && (
        <div className="lesson-feedback">
          <p className={correct ? "feedback-correct" : "feedback-incorrect"}>
            {correct ? "That's the candle." : "Not quite — check the wicks and the body."}
          </p>
          <p className="lesson-explanation">
            {consistent
              ? `Target was O ${t.open} · H ${t.high} · L ${t.low} · C ${t.close}. The high is the top of the wick, the low the bottom; the body runs between open and close.`
              : "The high must be at or above both open and close, and the low at or below both — otherwise it isn't a valid candle."}
          </p>
        </div>
      )}
    </div>
  );
}
