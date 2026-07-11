import { useEffect, useRef, useState, useCallback } from "react";
import { createChart, CandlestickSeries } from "lightweight-charts";
import {
  listScenarios,
  startSession,
  getBars,
  openTrade,
  closeTrade,
  endSession,
} from "./api";
import "./App.css";

const SPEEDS = [
  { label: "1x", ms: 900 },
  { label: "4x", ms: 250 },
  { label: "Max", ms: 40 },
];

export default function App() {
  const [screen, setScreen] = useState("select"); // select | playing | results
  const [scenarios, setScenarios] = useState([]);
  const [session, setSession] = useState(null);
  const [allBars, setAllBars] = useState([]);
  const [visibleCount, setVisibleCount] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(SPEEDS[0]);
  const [openTradeState, setOpenTradeState] = useState(null); // {trade_id, direction, size, entry_price}
  const [tradeSize, setTradeSize] = useState(10);
  const [balance, setBalance] = useState(10000);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    listScenarios().then(setScenarios);
  }, []);

  // set up chart once when entering playing screen
  useEffect(() => {
    if (screen !== "playing" || !containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: "#0b0e11" },
        textColor: "#9aa5b1",
        fontFamily: "'JetBrains Mono', monospace",
      },
      grid: {
        vertLines: { color: "#161a1f" },
        horzLines: { color: "#161a1f" },
      },
      timeScale: { borderColor: "#232830", timeVisible: false },
      rightPriceScale: { borderColor: "#232830" },
      width: containerRef.current.clientWidth,
      height: 420,
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#3fb68b",
      downColor: "#d9534f",
      borderVisible: false,
      wickUpColor: "#3fb68b",
      wickDownColor: "#d9534f",
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const handleResize = () => {
      chart.applyOptions({ width: containerRef.current.clientWidth });
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [screen]);

  // push visible bars to chart whenever visibleCount changes
  useEffect(() => {
    if (!seriesRef.current || allBars.length === 0) return;
    const slice = allBars.slice(0, visibleCount).map((b) => ({
      time: b.bar_sequence,
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
    }));
    seriesRef.current.setData(slice);
    chartRef.current?.timeScale().fitContent();
  }, [visibleCount, allBars]);

  // playback loop
  useEffect(() => {
    if (!playing) return;
    if (visibleCount >= allBars.length) {
      setPlaying(false);
      return;
    }
    const id = setTimeout(() => {
      setVisibleCount((c) => Math.min(c + 1, allBars.length));
    }, speed.ms);
    return () => clearTimeout(id);
  }, [playing, visibleCount, allBars, speed]);

  const handleSelectScenario = useCallback(async (scenarioId) => {
    setLoading(true);
    const s = await startSession(scenarioId);
    const bars = await getBars(s.session_id);
    setSession(s);
    setAllBars(bars);
    setVisibleCount(Math.min(10, bars.length));
    setBalance(s.starting_balance);
    setOpenTradeState(null);
    setResults(null);
    setScreen("playing");
    setLoading(false);
  }, []);

  const currentBar = allBars[visibleCount - 1];

  const handleOpenTrade = async (direction) => {
    if (!currentBar || openTradeState) return;
    const res = await openTrade(session.session_id, {
      direction,
      size: tradeSize,
      barSequence: currentBar.bar_sequence,
    });
    setOpenTradeState({ ...res, direction, size: tradeSize });
  };

  const handleCloseTrade = async () => {
    if (!currentBar || !openTradeState) return;
    const res = await closeTrade(openTradeState.trade_id, currentBar.bar_sequence);
    setBalance((b) => b + res.pnl);
    setOpenTradeState(null);
  };

  const handleEndSession = async () => {
    if (openTradeState) await handleCloseTrade();
    const res = await endSession(session.session_id);
    setResults(res);
    setScreen("results");
  };

  const unrealizedPnl = () => {
    if (!openTradeState || !currentBar) return 0;
    const diff = currentBar.close - openTradeState.entry_price;
    return openTradeState.direction === "long"
      ? diff * openTradeState.size
      : -diff * openTradeState.size;
  };

  // ---------- SCREENS ----------

  if (screen === "select") {
    return (
      <div className="app">
        <header className="header">
          <div className="logo">TAPE//RUN</div>
          <div className="tagline">Trade blind. Score on discipline, not luck.</div>
        </header>
        <main className="scenario-grid">
          {scenarios.length === 0 && <p className="muted">Loading scenarios…</p>}
          {scenarios.map((s) => (
            <button
              key={s.id}
              className="scenario-card"
              onClick={() => handleSelectScenario(s.id)}
              disabled={loading}
            >
              <div className="scenario-tier">TIER {s.difficulty_tier}</div>
              <div className="scenario-meta">{s.asset_class.toUpperCase()} · {s.timeframe}</div>
              <div className="scenario-bars">{s.bar_count} bars</div>
            </button>
          ))}
        </main>
      </div>
    );
  }

  if (screen === "results" && results) {
    return (
      <div className="app">
        <header className="header">
          <div className="logo">TAPE//RUN</div>
        </header>
        <main className="results">
          <h2>Session complete</h2>
          <div className="results-grid">
            <Stat label="Ending balance" value={`$${results.ending_balance.toFixed(2)}`} />
            <Stat label="Return" value={`${results.total_return_pct.toFixed(2)}%`} accent={results.total_return_pct >= 0} />
            <Stat label="Sharpe" value={results.sharpe_ratio.toFixed(2)} />
            <Stat label="Max drawdown" value={`${results.max_drawdown_pct.toFixed(2)}%`} />
            <Stat label="Win rate" value={`${results.win_rate.toFixed(1)}%`} />
            <Stat label="Composite score" value={results.score_composite.toFixed(1)} highlight />
          </div>
          <button className="primary-btn" onClick={() => setScreen("select")}>
            Run another scenario
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="logo">TAPE//RUN</div>
        <div className="balance">
          BALANCE <span>${balance.toFixed(2)}</span>
          {openTradeState && (
            <span className={unrealizedPnl() >= 0 ? "pnl-pos" : "pnl-neg"}>
              {" "}({unrealizedPnl() >= 0 ? "+" : ""}{unrealizedPnl().toFixed(2)})
            </span>
          )}
        </div>
      </header>

      <div className="chart-container" ref={containerRef} />

      <div className="controls">
        <div className="control-row">
          <div className="speed-group">
            {SPEEDS.map((s) => (
              <button
                key={s.label}
                className={speed.label === s.label ? "speed-btn active" : "speed-btn"}
                onClick={() => setSpeed(s)}
              >
                {s.label}
              </button>
            ))}
          </div>
          <button className="speed-btn" onClick={() => setPlaying((p) => !p)}>
            {playing ? "Pause" : "Play"}
          </button>
          <div className="progress">
            {visibleCount} / {allBars.length}
          </div>
        </div>

        <div className="control-row">
          <input
            type="number"
            className="size-input"
            value={tradeSize}
            onChange={(e) => setTradeSize(Number(e.target.value))}
            min="1"
          />
          {!openTradeState ? (
            <>
              <button className="long-btn" onClick={() => handleOpenTrade("long")}>
                LONG
              </button>
              <button className="short-btn" onClick={() => handleOpenTrade("short")}>
                SHORT
              </button>
            </>
          ) : (
            <button className="close-btn" onClick={handleCloseTrade}>
              CLOSE {openTradeState.direction.toUpperCase()}
            </button>
          )}
          <button className="end-btn" onClick={handleEndSession}>
            End session
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent, highlight }) {
  let cls = "stat";
  if (highlight) cls += " stat-highlight";
  return (
    <div className={cls}>
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${accent === true ? "pnl-pos" : accent === false ? "pnl-neg" : ""}`}>
        {value}
      </div>
    </div>
  );
}
