import { useEffect, useRef } from "react";
import { createChart, CandlestickSeries, createSeriesMarkers } from "lightweight-charts";

// Post-session replay: full scenario candles with the player's entries/exits
// as markers and their SL/TP as price lines.
export default function ReplayChart({ bars, markers, trades }) {
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

    const mk = (markers || []).map((m) => ({
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
    })).sort((a, b) => a.time - b.time);
    createSeriesMarkers(series, mk);

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
  }, [bars, markers, trades]);

  return <div className="chart-container" ref={containerRef} />;
}
