import { useEffect, useRef } from "react";
import { createChart, CandlestickSeries, createSeriesMarkers } from "lightweight-charts";

// Post-session replay: full scenario candles with the player's entries/exits
// as markers and their SL/TP as price lines. Phase 3 also overlays the market
// STRUCTURE the coach read (server-derived, post-session only): horizontal
// support/resistance levels and the liquidity sweeps that hunted stops.
export default function ReplayChart({ bars, markers, trades, structure }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !bars || bars.length === 0) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: "#0b0e11" },
        textColor: "#9aa5b1",
        fontFamily: "'JetBrains Mono', monospace",
      },
      grid: { vertLines: { color: "#161a1f" }, horzLines: { color: "#161a1f" } },
      timeScale: { borderColor: "#232830", timeVisible: false },
      rightPriceScale: { borderColor: "#232830" },
      width: containerRef.current.clientWidth,
      height: 420,
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#3fb68b", downColor: "#d9534f", borderVisible: false,
      wickUpColor: "#3fb68b", wickDownColor: "#d9534f",
    });
    series.setData(bars.map((b) => ({
      time: b.bar_sequence, open: b.open, high: b.high, low: b.low, close: b.close,
    })));

    const tradeMarkers = (markers || []).map((m) => ({
      time: m.bar,
      position: m.kind === "entry" ? "belowBar" : "aboveBar",
      color: m.kind === "entry"
        ? (m.direction === "long" ? "#3fb68b" : "#d9534f")
        : "#c9d1d9",
      shape: m.kind === "entry"
        ? (m.direction === "long" ? "arrowUp" : "arrowDown")
        : "circle",
      text: m.kind === "entry"
        ? (m.direction === "long" ? "LONG" : "SHORT")
        : (m.reason ? m.reason.replace("_", " ") : "exit"),
    }));

    // Phase 3: liquidity-sweep markers (a wick hunted stops beyond a level).
    // Show only the most significant sweeps (deepest penetration) to keep the
    // review readable — the full set lives server-side and feeds the coach.
    const sweepMarkers = [...((structure && structure.sweeps) || [])]
      .sort((a, b) => (b.penetration || 0) - (a.penetration || 0))
      .slice(0, 6)
      .map((s) => ({
        time: s.bar_sequence,
        position: s.side === "high" ? "aboveBar" : "belowBar",
        color: "#e0a33e",
        shape: s.side === "high" ? "arrowDown" : "arrowUp",
        text: "sweep",
      }));

    const mk = [...tradeMarkers, ...sweepMarkers].sort((a, b) => a.time - b.time);
    createSeriesMarkers(series, mk);

    // Phase 3: the strongest support/resistance levels the market revisited
    // (top few by touch count — sorted strongest-first by the server).
    ((structure && structure.levels) || []).slice(0, 5).forEach((lv) => {
      const color = lv.kind === "support" ? "#3fb68b"
        : lv.kind === "resistance" ? "#d9534f" : "#7f8fa6";
      series.createPriceLine({
        price: lv.price, color, lineWidth: 1, lineStyle: 3,
        axisLabelVisible: false,
        title: `${lv.kind === "flip" ? "S/R" : lv.kind.slice(0, 3).toUpperCase()}·${lv.touches}`,
      });
    });

    (trades || []).forEach((t) => {
      if (t.stop_loss != null)
        series.createPriceLine({ price: t.stop_loss, color: "#d9534f", lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: "SL" });
      if (t.take_profit != null)
        series.createPriceLine({ price: t.take_profit, color: "#3fb68b", lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: "TP" });
    });

    chart.timeScale().fitContent();
    const onResize = () => chart.applyOptions({ width: containerRef.current.clientWidth });
    window.addEventListener("resize", onResize);
    return () => { window.removeEventListener("resize", onResize); chart.remove(); };
  }, [bars, markers, trades, structure]);

  return <div className="chart-container" ref={containerRef} />;
}
