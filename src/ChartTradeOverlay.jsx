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

export default function ChartTradeOverlay({ seriesRef, positions, currentPrice, onCommit, plan }) {
  const layerRef = useRef(null);
  const rowsRef = useRef(new Map());   // key -> { line, badge, price, kind }
  const dragRef = useRef(null);        // { tradeId|plan, kind, price } while dragging
  const posRef = useRef(positions);
  const priceRef = useRef(currentPrice);
  const planRef = useRef(plan);        // pre-entry staged plan (or null)
  posRef.current = positions;
  priceRef.current = currentPrice;
  planRef.current = plan;

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

  // ── Pre-entry plan (staged stop / target before a position exists) ──────
  const planActive = (kind) => {
    const d = dragRef.current;
    if (d && d.plan && d.kind === kind) return d.price;
    const p = planRef.current;
    const v = kind === "sl" ? p?.stop : p?.target;
    return v != null ? v : null;
  };
  const planLevel = (kind) => {
    const a = planActive(kind);
    if (a != null) return a;
    const cur = priceRef.current ?? 0;          // ghost default around current price
    return kind === "sl" ? cur * (1 - OFFSET) : cur * (1 + OFFSET);
  };
  const planBadge = (kind) => {
    const cur = priceRef.current ?? 0;
    const size = planRef.current?.size ?? 0;
    if (kind === "entry") {
      const sl = planActive("sl"), tp = planActive("tp");
      if (sl == null || tp == null) return "PLAN · drag stop & target to plan the trade";
      const risk = Math.abs(cur - sl) * size;
      const reward = Math.abs(tp - cur) * size;
      const rr = risk > 0 ? (reward / risk).toFixed(2) : "∞";
      return `PLAN · risk ${fmtAbs(risk)} / reward ${fmtAbs(reward)} · R:R ${rr}`;
    }
    const level = planLevel(kind);
    const amt = Math.abs(kind === "sl" ? cur - level : level - cur) * size;
    return `${kind === "sl" ? "risk" : "reward"} ${fmtAbs(amt)}`;
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
            if (kind === "entry") {
              row.badge.textContent = entryBadge(pos);           // live P&L (+ R:R)
              if (row.axis) row.axis.textContent = pos.entry_price.toFixed(2);
            } else {
              row.badge.textContent = fmtMoney(pnlAt(pos, level));
              const ghost = activeLevel(pos, kind) == null;
              if (row.axis) row.axis.textContent = `${kind === "sl" ? "SL" : "TP"} ${level.toFixed(2)}${ghost ? " ⇕" : ""}`;
            }
          }
        }
        if (planRef.current) {
          for (const kind of ["entry", "sl", "tp"]) {
            const row = rowsRef.current.get(`plan:${kind}`);
            if (!row) continue;
            const level = kind === "entry" ? (priceRef.current ?? 0) : planLevel(kind);
            const y = series.priceToCoordinate(level);
            if (y == null) { row.line.style.display = "none"; continue; }
            row.line.style.display = "";
            row.line.style.top = `${y}px`;
            row.badge.textContent = planBadge(kind);
            if (kind !== "entry" && row.axis) {
              const ghost = planActive(kind) == null;
              row.axis.textContent = `${kind === "sl" ? "SL" : "TP"} ${level.toFixed(2)}${ghost ? " ⇕" : ""}`;
            } else if (row.axis) {
              row.axis.textContent = (priceRef.current ?? 0).toFixed(2);
            }
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

  // Drag a staged plan line. No direction yet, so placement is free; the entry
  // handler validates the side once you press LONG/SHORT.
  const startPlanDrag = (kind) => (e) => {
    e.preventDefault();
    const layer = layerRef.current;
    const move = (ev) => {
      const series = seriesRef.current;
      const rect = layer.getBoundingClientRect();
      const raw = series?.coordinateToPrice(ev.clientY - rect.top);
      if (raw == null) return;
      dragRef.current = { plan: true, kind, price: raw };
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      const d = dragRef.current;
      dragRef.current = null;
      if (d && d.plan && d.kind === kind) {
        planRef.current?.onChange(kind === "sl" ? "stop" : "target", Number(d.price.toFixed(4)));
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
              {kind === "entry" ? (
                <>
                  <span className={`to-tag to-tag-${pos.direction}`}>{pos.direction === "long" ? "LONG" : "SHORT"}</span>
                  <span className={`to-axis to-axis-${kind}`} ref={bind(key, "axis")} />
                </>
              ) : (
                <span
                  className={`to-axis to-axis-${kind} to-grip`}
                  ref={bind(key, "axis")}
                  onPointerDown={startDrag(pos, kind)}
                  title={`Drag to move ${kind === "sl" ? "stop-loss" : "take-profit"}`}
                />
              )}
            </div>
          );
        })
      ))}
      {plan && ["entry", "sl", "tp"].map((kind) => {
        const key = `plan:${kind}`;
        const ghost = kind !== "entry" && (kind === "sl" ? plan.stop : plan.target) == null;
        return (
          <div
            key={key}
            ref={bind(key, "line")}
            className={`to-line to-${kind}${ghost ? " to-ghost" : ""}`}
          >
            <span className={`to-badge to-badge-${kind}`} ref={bind(key, "badge")} />
            {kind === "entry" ? (
              <>
                <span className="to-tag to-tag-plan">PLAN</span>
                <span className={`to-axis to-axis-${kind}`} ref={bind(key, "axis")} />
              </>
            ) : (
              <span
                className={`to-axis to-axis-${kind} to-grip`}
                ref={bind(key, "axis")}
                onPointerDown={startPlanDrag(kind)}
                title={`Drag to set the ${kind === "sl" ? "stop-loss" : "take-profit"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
