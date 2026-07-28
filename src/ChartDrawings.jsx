import { useEffect, useRef, useState } from "react";

// Drawing layer (chart pass 4 + editing pass): trendline, horizontal ray and
// translucent rectangle, each selectable, movable, resizable, recolourable and
// labellable.
//
// lightweight-charts has no drawing primitives, so this is a canvas over the
// chart. Shapes live in DATA space — { logical: bar index, price } — and are
// reprojected to pixels every frame, so they stay pinned as the chart scrolls,
// zooms and autoscales.
//
// Pointer handling runs in the CAPTURE phase on the chart wrapper: that lets us
// claim a click that lands on a shape (stopping it before the chart's own
// handler sees it) while letting every other click fall through to the chart,
// so panning and zooming keep working normally.

export const DRAW_COLORS = ["#45d8ff", "#2ef2a0", "#ff5f5c", "#ffc258", "#a78bfa", "#e2e9f0"];

const HIT = 7;         // px tolerance for hitting a line
const GRAB = 9;        // px tolerance for grabbing a resize handle

const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

const distToSeg = (px, py, a, b) => {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / len)) : 0;
  return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy));
};

export default function ChartDrawings({
  chartRef, seriesRef, wrapRef, tool, drawings, setDrawings, onToolConsumed,
}) {
  const canvasRef = useRef(null);
  const boxRef = useRef(null);          // floating settings box
  const pendingRef = useRef(null);      // first point of a 2-point shape
  const cursorRef = useRef(null);       // live cursor for the preview
  const dragRef = useRef(null);         // { id, mode, from, orig }
  const liveRef = useRef(null);         // in-flight shape while dragging
  const colorRef = useRef(DRAW_COLORS[0]);
  const [selectedId, setSelectedId] = useState(null);
  const selRef = useRef(null);
  const toolRef = useRef(tool);
  const drawingsRef = useRef(drawings);
  selRef.current = selectedId;
  toolRef.current = tool;
  drawingsRef.current = drawings;

  const selected = drawings.find((d) => d.id === selectedId) || null;

  // ── data ↔ pixel ────────────────────────────────────────────────────────
  const project = (pt) => {
    const ts = chartRef.current?.timeScale();
    const s = seriesRef.current;
    if (!ts || !s || !pt) return null;
    const x = ts.logicalToCoordinate(pt.logical);
    const y = s.priceToCoordinate(pt.price);
    return x == null || y == null ? null : { x, y };
  };
  const toData = (clientX, clientY) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    const ts = chartRef.current?.timeScale();
    const s = seriesRef.current;
    if (!rect || !ts || !s) return null;
    const logical = ts.coordinateToLogical(clientX - rect.left);
    const price = s.coordinateToPrice(clientY - rect.top);
    return logical == null || price == null ? null : { logical, price };
  };
  const localPt = (clientX, clientY) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    return rect ? { x: clientX - rect.left, y: clientY - rect.top } : { x: 0, y: 0 };
  };

  // The shape as currently rendered (mid-drag override wins).
  const shapeOf = (d) => (liveRef.current && liveRef.current.id === d.id ? liveRef.current : d);

  // Resize handles for a shape, in pixels.
  const handlesOf = (d) => {
    const a = project(d.p1);
    if (!a) return [];
    if (d.type === "ray") return [{ id: "p1", x: a.x, y: a.y }];
    const b = project(d.p2);
    if (!b) return [];
    if (d.type === "trendline") return [{ id: "p1", ...a }, { id: "p2", ...b }];
    return [                                   // rectangle corners
      { id: "c11", x: a.x, y: a.y }, { id: "c21", x: b.x, y: a.y },
      { id: "c12", x: a.x, y: b.y }, { id: "c22", x: b.x, y: b.y },
    ];
  };

  // What's under the cursor: a handle of the selected shape, or a shape body.
  const hitTest = (p, width) => {
    const sel = drawingsRef.current.find((d) => d.id === selRef.current);
    if (sel) {
      for (const h of handlesOf(shapeOf(sel))) {
        if (Math.hypot(p.x - h.x, p.y - h.y) <= GRAB) return { id: sel.id, mode: h.id };
      }
    }
    for (let i = drawingsRef.current.length - 1; i >= 0; i--) {
      const d = shapeOf(drawingsRef.current[i]);
      const a = project(d.p1);
      if (!a) continue;
      if (d.type === "ray") {
        if (Math.abs(p.y - a.y) <= HIT && p.x >= a.x - HIT) return { id: d.id, mode: "move" };
      } else {
        const b = project(d.p2);
        if (!b) continue;
        if (d.type === "trendline") {
          if (distToSeg(p.x, p.y, a, b) <= HIT) return { id: d.id, mode: "move" };
        } else {
          const x1 = Math.min(a.x, b.x), x2 = Math.max(a.x, b.x);
          const y1 = Math.min(a.y, b.y), y2 = Math.max(a.y, b.y);
          if (p.x >= x1 - HIT && p.x <= x2 + HIT && p.y >= y1 - HIT && p.y <= y2 + HIT) {
            return { id: d.id, mode: "move" };
          }
        }
      }
    }
    return null;
  };

  // ── render loop ─────────────────────────────────────────────────────────
  useEffect(() => {
    let raf = 0;
    const drawHandle = (ctx, x, y, color) => {
      ctx.fillStyle = "#0b0e11"; ctx.strokeStyle = color; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.rect(x - 3.5, y - 3.5, 7, 7); ctx.fill(); ctx.stroke();
    };
    const label = (ctx, text, x, y, color) => {
      if (!text) return;
      ctx.font = "600 11px 'JetBrains Mono', monospace";
      const w = ctx.measureText(text).width;
      ctx.fillStyle = "rgba(11,14,17,0.75)";
      ctx.fillRect(x - 3, y - 12, w + 6, 15);
      ctx.fillStyle = color;
      ctx.fillText(text, x, y);
    };
    const drawShape = (ctx, d, w, isSel) => {
      const color = d.color || DRAW_COLORS[0];
      const a = project(d.p1);
      if (!a) return;
      ctx.lineWidth = isSel ? 2 : 1.5;
      ctx.strokeStyle = d.preview ? rgba(color, 0.6) : color;
      if (d.type === "ray") {
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(w, a.y); ctx.stroke();
        label(ctx, d.text, a.x + 6, a.y - 6, color);
      } else {
        const b = project(d.p2);
        if (!b) return;
        if (d.type === "trendline") {
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          label(ctx, d.text, Math.min(a.x, b.x) + 6, Math.min(a.y, b.y) - 6, color);
        } else {
          const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
          const rw = Math.abs(b.x - a.x), rh = Math.abs(b.y - a.y);
          ctx.fillStyle = rgba(color, 0.13);          // translucent fill
          ctx.fillRect(x, y, rw, rh);
          ctx.strokeRect(x, y, rw, rh);
          label(ctx, d.text, x + 6, y - 6, color);
        }
      }
      if (isSel && !d.preview) for (const h of handlesOf(d)) drawHandle(ctx, h.x, h.y, color);
    };

    const frame = () => {
      const canvas = canvasRef.current;
      const wrap = canvas?.parentElement;
      if (canvas && wrap) {
        const dpr = window.devicePixelRatio || 1;
        const w = wrap.clientWidth, h = wrap.clientHeight;
        if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
          canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
          canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
        }
        const ctx = canvas.getContext("2d");
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        for (const raw of drawingsRef.current) {
          const d = shapeOf(raw);
          drawShape(ctx, d, w, d.id === selRef.current);
        }
        if (pendingRef.current && cursorRef.current && toolRef.current !== "none") {
          drawShape(ctx, {
            type: toolRef.current, p1: pendingRef.current, p2: cursorRef.current,
            color: colorRef.current, preview: true,
          }, w, false);
        }
        // Park the settings box above the selected shape.
        const box = boxRef.current;
        const sel = drawingsRef.current.find((d) => d.id === selRef.current);
        if (box && sel) {
          const pts = [project(shapeOf(sel).p1), shapeOf(sel).p2 ? project(shapeOf(sel).p2) : null]
            .filter(Boolean);
          if (pts.length) {
            const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
            const top = Math.min(...pts.map((p) => p.y));
            box.style.display = "";
            box.style.left = `${Math.max(96, Math.min(w - 96, cx))}px`;
            box.style.top = `${Math.max(38, top - 12)}px`;
          } else box.style.display = "none";
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [chartRef, seriesRef]);

  // ── pointer handling (capture phase on the chart wrapper) ───────────────
  useEffect(() => {
    const wrap = wrapRef?.current;
    if (!wrap) return;

    const commit = () => {
      const live = liveRef.current;
      liveRef.current = null;
      if (live) setDrawings((ds) => ds.map((d) => (d.id === live.id ? live : d)));
    };

    const onDown = (ev) => {
      // Let the settings panel and the SL/TP drag grips keep their own clicks.
      if (ev.target.closest?.(".draw-settings, .to-grip")) return;
      const p = localPt(ev.clientX, ev.clientY);
      const pt = toData(ev.clientX, ev.clientY);
      if (!pt) return;
      const t = toolRef.current;

      if (t !== "none") {                                  // placing a new shape
        ev.stopPropagation(); ev.preventDefault();
        const base = { id: `d${Date.now()}`, color: colorRef.current, text: "" };
        if (t === "ray") {
          setDrawings((ds) => [...ds, { ...base, type: "ray", p1: pt }]);
          setSelectedId(base.id); onToolConsumed();
          return;
        }
        if (!pendingRef.current) { pendingRef.current = pt; cursorRef.current = pt; return; }
        const p1 = pendingRef.current; pendingRef.current = null;
        setDrawings((ds) => [...ds, { ...base, type: t, p1, p2: pt }]);
        setSelectedId(base.id); onToolConsumed();
        return;
      }

      const hit = hitTest(p, wrap.clientWidth);            // cursor tool: select/drag
      if (!hit) { setSelectedId(null); return; }           // fall through → chart pans
      ev.stopPropagation(); ev.preventDefault();
      setSelectedId(hit.id);
      const orig = drawingsRef.current.find((d) => d.id === hit.id);
      dragRef.current = { id: hit.id, mode: hit.mode, from: pt, orig };

      const move = (e2) => {
        const now = toData(e2.clientX, e2.clientY);
        const dr = dragRef.current;
        if (!now || !dr) return;
        const o = dr.orig;
        if (dr.mode === "move") {
          const dl = now.logical - dr.from.logical, dp = now.price - dr.from.price;
          liveRef.current = {
            ...o,
            p1: { logical: o.p1.logical + dl, price: o.p1.price + dp },
            ...(o.p2 ? { p2: { logical: o.p2.logical + dl, price: o.p2.price + dp } } : {}),
          };
        } else if (dr.mode === "p1") {
          liveRef.current = { ...o, p1: now };
        } else if (dr.mode === "p2") {
          liveRef.current = { ...o, p2: now };
        } else {                                           // rectangle corner
          const [, cl, cp] = dr.mode.split("");            // c11 / c21 / c12 / c22
          liveRef.current = {
            ...o,
            p1: { logical: cl === "1" ? now.logical : o.p1.logical, price: cp === "1" ? now.price : o.p1.price },
            p2: { logical: cl === "2" ? now.logical : o.p2.logical, price: cp === "2" ? now.price : o.p2.price },
          };
        }
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        dragRef.current = null;
        commit();
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    };

    const onMove = (ev) => {
      if (toolRef.current !== "none") {
        if (pendingRef.current) {
          const pt = toData(ev.clientX, ev.clientY);
          if (pt) cursorRef.current = pt;
        }
        return;
      }
      if (dragRef.current) return;
      const hit = hitTest(localPt(ev.clientX, ev.clientY), wrap.clientWidth);
      wrap.style.cursor = hit ? (hit.mode === "move" ? "move" : "nwse-resize") : "";
    };

    wrap.addEventListener("pointerdown", onDown, true);
    wrap.addEventListener("pointermove", onMove, true);
    return () => {
      wrap.removeEventListener("pointerdown", onDown, true);
      wrap.removeEventListener("pointermove", onMove, true);
      wrap.style.cursor = "";
    };
  }, [wrapRef, setDrawings, onToolConsumed]);

  // Putting the tool down cancels a half-placed shape.
  useEffect(() => {
    if (tool !== "none") setSelectedId(null);
    pendingRef.current = null; cursorRef.current = null;
  }, [tool]);

  const patch = (changes) =>
    setDrawings((ds) => ds.map((d) => (d.id === selectedId ? { ...d, ...changes } : d)));

  return (
    <>
      <canvas
        ref={canvasRef}
        className={`draw-layer${tool !== "none" ? " placing" : ""}`}
      />
      {selected && (
        <div className="draw-settings" ref={boxRef}>
          <div className="ds-swatches">
            {DRAW_COLORS.map((c) => (
              <button
                key={c}
                className={`ds-swatch${(selected.color || DRAW_COLORS[0]) === c ? " active" : ""}`}
                style={{ background: c }}
                onClick={() => { colorRef.current = c; patch({ color: c }); }}
                title="Colour"
              />
            ))}
          </div>
          <input
            className="ds-text"
            value={selected.text || ""}
            placeholder="Add text…"
            onChange={(e) => patch({ text: e.target.value })}
          />
          <button
            className="ds-del"
            onClick={() => {
              setDrawings((ds) => ds.filter((d) => d.id !== selected.id));
              setSelectedId(null);
            }}
            title="Delete drawing"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
