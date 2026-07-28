import { useEffect, useRef } from "react";

// Minimal drawing layer (chart pass 4): trendline, horizontal ray, rectangle.
// lightweight-charts has no drawing primitives, so this is a canvas over the
// chart. Shapes are stored in DATA space — { logical: bar index, price } — and
// reprojected to pixels every frame, so they stay pinned as the chart scrolls,
// zooms and autoscales (same approach as the trade overlay).

const COLORS = { line: "#45d8ff", fill: "rgba(69,216,255,0.10)", preview: "rgba(69,216,255,0.55)" };

export default function ChartDrawings({ chartRef, seriesRef, tool, drawings, setDrawings, onToolConsumed }) {
  const canvasRef = useRef(null);
  const pendingRef = useRef(null);   // first point of a 2-point shape
  const cursorRef = useRef(null);    // live cursor for the preview
  const toolRef = useRef(tool);
  const drawingsRef = useRef(drawings);
  toolRef.current = tool;
  drawingsRef.current = drawings;

  const project = (pt) => {
    const ts = chartRef.current?.timeScale();
    const s = seriesRef.current;
    if (!ts || !s) return null;
    const x = ts.logicalToCoordinate(pt.logical);
    const y = s.priceToCoordinate(pt.price);
    if (x == null || y == null) return null;
    return { x, y };
  };

  const toData = (ev) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ts = chartRef.current?.timeScale();
    const s = seriesRef.current;
    const logical = ts?.coordinateToLogical(ev.clientX - rect.left);
    const price = s?.coordinateToPrice(ev.clientY - rect.top);
    if (logical == null || price == null) return null;
    return { logical, price };
  };

  useEffect(() => {
    const dot = (ctx, x, y, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill(); };
    const drawShape = (ctx, d, w) => {
      const color = d.preview ? COLORS.preview : COLORS.line;
      ctx.lineWidth = 1.5; ctx.strokeStyle = color;
      if (d.type === "ray") {
        const a = project(d.p1); if (!a) return;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(w, a.y); ctx.stroke();
        dot(ctx, a.x, a.y, color);
      } else if (d.type === "trendline") {
        const a = project(d.p1), b = project(d.p2); if (!a || !b) return;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        dot(ctx, a.x, a.y, color); dot(ctx, b.x, b.y, color);
      } else if (d.type === "rect") {
        const a = project(d.p1), b = project(d.p2); if (!a || !b) return;
        const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
        ctx.fillStyle = COLORS.fill;
        ctx.fillRect(x, y, Math.abs(b.x - a.x), Math.abs(b.y - a.y));
        ctx.strokeRect(x, y, Math.abs(b.x - a.x), Math.abs(b.y - a.y));
      }
    };
    let raf = 0;
    const frame = () => {
      const canvas = canvasRef.current;
      const wrap = canvas?.parentElement;
      if (canvas && wrap) {
        const dpr = window.devicePixelRatio || 1;
        const w = wrap.clientWidth, h = wrap.clientHeight;
        if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
          canvas.width = w * dpr; canvas.height = h * dpr;
          canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
        }
        const ctx = canvas.getContext("2d");
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        const all = [...drawingsRef.current];
        if (pendingRef.current && cursorRef.current && toolRef.current !== "none") {
          all.push({ type: toolRef.current, p1: pendingRef.current, p2: cursorRef.current, preview: true });
        }
        for (const d of all) drawShape(ctx, d, w);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [chartRef, seriesRef]);

  // Cancel any half-placed shape when the tool is put down.
  useEffect(() => {
    if (tool === "none") { pendingRef.current = null; cursorRef.current = null; }
  }, [tool]);

  const onDown = (ev) => {
    if (toolRef.current === "none") return;
    const pt = toData(ev); if (!pt) return;
    ev.preventDefault();
    if (toolRef.current === "ray") {
      setDrawings((ds) => [...ds, { type: "ray", p1: pt }]);
      onToolConsumed();
      return;
    }
    if (!pendingRef.current) {
      pendingRef.current = pt; cursorRef.current = pt;
    } else {
      const p1 = pendingRef.current; pendingRef.current = null;
      setDrawings((ds) => [...ds, { type: toolRef.current, p1, p2: pt }]);
      onToolConsumed();
    }
  };
  const onMove = (ev) => {
    if (toolRef.current === "none" || !pendingRef.current) return;
    const pt = toData(ev); if (pt) cursorRef.current = pt;
  };

  return (
    <canvas
      ref={canvasRef}
      className={`draw-layer${tool !== "none" ? " active" : ""}`}
      onPointerDown={onDown}
      onPointerMove={onMove}
    />
  );
}
