import { useEffect, useRef } from "react";

// Interactive trade overlay (Phase 3). Draws, on top of the price chart, a line
// for each OPEN position's entry / stop / target. The stop and target are
// draggable: while you drag, the badge shows the money at risk / on offer at
// that level; on release the new level is persisted server-side (modify_trade),
// so the order engine stays authoritative for the actual fill.
//
// Positioning is imperative (a rAF loop reading price→pixel from the series) so
// the lines stay glued to their price as the chart autoscales, pans or zooms,
// and so dragging is smooth without React re-render lag. React still owns which
// rows exist; the loop only writes style/text.

const OFFSET = 0.03;            // default ghost stop/target: ±3% of current price
const EPS = 0.0001;             // keep a stop/target off the wrong side of price

function pnlAt(pos, level) {
  const diff = level - pos.entry_price;
  return (pos.direction === "long" ? diff : -diff) * pos.size;
}

// Clamp a dragged level to the side of the current price that makes sense, so a
// stop/target can't be dropped where it would trigger on the very next tick.
function clampLevel(kind, direction, price, current) {
  const longStopSide = direction === "long" ? kind === "sl" : kind === "tp";
  if (longStopSide) return Math.min(price, current * (1 - EPS)); // must sit below
  return Math.max(price, current * (1 + EPS));                   // must sit above
}

function fmtMoney(v) {
  return `${v >= 0 ? "+" : "−"}$${Math.abs(v).toFixed(2)}`;
}
function fmtAbs(v) {
  return `$${Math.abs(v).toFixed(2)}`;
}

export default function ChartTradeOverlay({ seriesRef, positions, currentPrice, onCommit }) {
  const layerRef = useRef(null);
  const rowsRef = useRef(new Map());   // key -> { line, badge, price, kind }
  const dragRef = useRef(null);        // { tradeId, kind, price } while dragging
  const posRef = useRef(positions);
  const priceRef = useRef(currentPrice);
  posRef.current = positions;
  priceRef.current = currentPrice;

  // The level that's actually in force: the live dragged value, else the
  // persisted stop/target, else null (an unset stop/target — no ghost).
  const activeLevel = (pos, kind) => {
    const d = dragRef.current;
    if (d && d.tradeId === pos.trade_id && d.kind === kind) return d.price;
    if (kind === "entry") return pos.entry_price;
    const explicit = kind === "sl" ? pos.stop_loss : pos.take_profit;
    return explicit != null ? explicit : null;
  };

  // Where to draw the row: the active level, or a ghost default for an unset
  // stop/target so there's still a handle to grab.
  const levelFor = (pos, kind) => {
    const a = activeLevel(pos, kind);
    if (a != null) return a;
    const cur = priceRef.current ?? pos.entry_price;
    const longSide = pos.direction === "long" ? kind === "sl" : kind === "tp";
    return longSide ? cur * (1 - OFFSET) : cur * (1 + OFFSET);
  };

  // Entry badge text: live P&L, plus risk / reward / R:R once both a stop and a
  // target are in force (persisted or mid-drag), so it updates as you drag.
  const entryBadge = (pos) => {
    const pnl = pnlAt(pos, priceRef.current ?? pos.entry_price);
    const sl = activeLevel(pos, "sl");
    const tp = activeLevel(pos, "tp");
    if (sl == null || tp == null) return fmtMoney(pnl);
    const risk = Math.abs(pnlAt(pos, sl));
    const reward = Math.abs(pnlAt(pos, tp));
    const rr = risk > 0 ? (reward / risk).toFixed(2) : "∞";
    return `${fmtMoney(pnl)} · risk ${fmtAbs(risk)} / reward ${fmtAbs(reward)} · R:R ${rr}`;
  };

  // rAF loop: glue every row to its price and refresh its money badge.
  useEffect(() => {
    let raf = 0;
    const frame = () => {
      const series = seriesRef.current;
      if (series) {
        for (const pos of posRef.current) {
          for (const kind of ["entry", "sl", "tp"]) {
            const row = rowsRef.current.get(`${pos.trade_id}:${kind}`);
            if (!row) continue;
            const level = levelFor(pos, kind);
            const y = series.priceToCoordinate(level);
            if (y == null) { row.line.style.display = "none"; continue; }
            row.line.style.display = "";
            row.line.style.top = `${y}px`;
            row.badge.textContent = kind === "entry"
              ? entryBadge(pos)                                   // live P&L (+ R:R)
              : `${level.toFixed(2)} · ${fmtMoney(pnlAt(pos, level))}`;
          }
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [seriesRef]);

  const startDrag = (pos, kind) => (e) => {
    e.preventDefault();
    const layer = layerRef.current;
    const move = (ev) => {
      const series = seriesRef.current;
      const rect = layer.getBoundingClientRect();
      const raw = series?.coordinateToPrice(ev.clientY - rect.top);
      if (raw == null) return;
      const cur = priceRef.current ?? pos.entry_price;
      dragRef.current = { tradeId: pos.trade_id, kind, price: clampLevel(kind, pos.direction, raw, cur) };
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      const d = dragRef.current;
      dragRef.current = null;
      if (d && d.tradeId === pos.trade_id && d.kind === kind) {
        const level = Number(d.price.toFixed(4));
        onCommit(pos.trade_id, kind === "sl" ? { stop_loss: level } : { take_profit: level });
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const bind = (key, part) => (el) => {
    if (!el) { const r = rowsRef.current.get(key); if (r) delete r[part]; return; }
    const row = rowsRef.current.get(key) || {};
    row[part] = el;
    rowsRef.current.set(key, row);
  };

  return (
    <div className="trade-overlay" ref={layerRef}>
      {positions.map((pos) => (
        ["entry", "sl", "tp"].map((kind) => {
          const key = `${pos.trade_id}:${kind}`;
          const ghost = kind !== "entry" && (kind === "sl" ? pos.stop_loss : pos.take_profit) == null;
          return (
            <div
              key={key}
              ref={bind(key, "line")}
              className={`to-line to-${kind}${ghost ? " to-ghost" : ""}`}
            >
              <span className={`to-badge to-badge-${kind}`} ref={bind(key, "badge")} />
              {kind !== "entry" && (
                <span
                  className={`to-grip to-grip-${kind}`}
                  onPointerDown={startDrag(pos, kind)}
                  title={`Drag to move ${kind === "sl" ? "stop-loss" : "take-profit"}`}
                >
                  {kind === "sl" ? "SL" : "TP"}{ghost ? " ⇕" : ""}
                </span>
              )}
              {kind === "entry" && (
                <span className={`to-tag to-tag-${pos.direction}`}>{pos.direction === "long" ? "LONG" : "SHORT"}</span>
              )}
            </div>
          );
        })
      ))}
    </div>
  );
}
