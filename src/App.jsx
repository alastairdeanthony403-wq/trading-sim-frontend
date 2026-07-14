import { useEffect, useRef, useState, useCallback } from "react";
import { createChart, CandlestickSeries } from "lightweight-charts";
import {
  listScenarios,
  startSession,
  getBars,
  openTrade,
  closeTrade,
  advanceSession,
  getPositions,
  endSession,
  getLeaderboard,
  getProgress,
} from "./api";
import { getUserId } from "./user";
import Learn from "./Learn";
import "./App.css";

const SPEEDS = [
  { label: "1x", ms: 900 },
  { label: "4x", ms: 250 },
  { label: "Max", ms: 40 },
];

export default function App() {
  const [screen, setScreen] = useState("menu"); // menu | select | playing | results | progress | learn
  const [scenarios, setScenarios] = useState([]);
  const [progressData, setProgressData] = useState(null);
  const [session, setSession] = useState(null);
  const [allBars, setAllBars] = useState([]);
  const [visibleCount, setVisibleCount] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(SPEEDS[0]);
  const [positions, setPositions] = useState([]);   // server-authoritative: all trades this session
  const [tradeSize, setTradeSize] = useState(10);
  const [orderType, setOrderType] = useState("market"); // market | limit | stop
  const [entryPriceInput, setEntryPriceInput] = useState("");
  const [stopLossInput, setStopLossInput] = useState("");
  const [takeProfitInput, setTakeProfitInput] = useState("");
  const [trailInput, setTrailInput] = useState("");
  const [lastFill, setLastFill] = useState(null); // {reason, bar, pnl}
  const [results, setResults] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(false);

  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const containerRef = useRef(null);
  const priceLinesRef = useRef([]);              // active chart lines
  const advanceInFlightRef = useRef(false);      // single in-flight /advance
  const advanceTargetRef = useRef(0);            // latest bar to advance to
  const positionsRef = useRef([]);               // positions for async handlers
  positionsRef.current = positions;

  const startingBalance = session?.starting_balance ?? 10000;
  // Balance (realised) is derived from the authoritative positions list — no
  // incremental counting, so the auto-close/manual-close race can't double-add.
  const realisedPnl = positions
    .filter((p) => p.status === "closed")
    .reduce((sum, p) => sum + (p.pnl || 0), 0);
  const balance = startingBalance + realisedPnl;

  useEffect(() => {
    listScenarios().then(setScenarios);
  }, []);

  const openProgress = useCallback(async () => {
    const p = await getProgress(getUserId());
    setProgressData(p);
    setScreen("progress");
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

  const hasFitRef = useRef(false);

  // reset fit tracking when entering a new session
  useEffect(() => {
    hasFitRef.current = false;
  }, [session]);

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
    if (!hasFitRef.current) {
      chartRef.current?.timeScale().fitContent();
      hasFitRef.current = true;
    }
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

  // ---- server-authoritative order processing ----
  const refreshPositions = useCallback(async () => {
    if (!session) return;
    const p = await getPositions(session.session_id);
    setPositions(Array.isArray(p) ? p : []);
  }, [session]);

  // As playback advances, ask the server to process working orders against the
  // bars that have elapsed. Coalesced to a single in-flight request (Max speed
  // ticks every 40ms) — always re-issued with the latest bar when it lands.
  const runAdvance = useCallback(async () => {
    if (advanceInFlightRef.current || !session) return;
    const target = advanceTargetRef.current;
    advanceInFlightRef.current = true;
    try {
      const res = await advanceSession(session.session_id, target);
      if (Array.isArray(res.positions)) setPositions(res.positions);
      const closed = (res.events || []).filter((e) => e.event === "closed");
      if (closed.length) {
        const last = closed[closed.length - 1];
        setLastFill({ reason: last.reason, bar: last.bar_sequence, pnl: last.pnl });
      }
    } catch {
      /* transient — next tick retries */
    } finally {
      advanceInFlightRef.current = false;
      if (advanceTargetRef.current > target) runAdvance();  // catch up
    }
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const seq = allBars[visibleCount - 1]?.bar_sequence;
    if (seq == null) return;
    advanceTargetRef.current = seq;
    // only hit the server while there are orders that could fill/close
    if (positionsRef.current.some((p) => p.status === "open" || p.status === "pending")) {
      runAdvance();
    }
  }, [visibleCount, allBars, session, runAdvance]);

  // ---- draw price lines for every working/open order ----
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    for (const line of priceLinesRef.current) {
      try { series.removePriceLine(line); } catch { /* chart torn down */ }
    }
    priceLinesRef.current = [];
    const add = (price, color, title) => {
      if (price == null) return;
      priceLinesRef.current.push(series.createPriceLine({
        price, color, lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title,
      }));
    };
    for (const p of positions) {
      const tag = p.direction === "long" ? "L" : "S";
      if (p.status === "open") {
        add(p.entry_price, "#9aa5b1", `entry ${tag}`);
        add(p.stop_loss, "#d9534f", "SL");
        add(p.take_profit, "#3fb68b", "TP");
      } else if (p.status === "pending") {
        add(p.entry_order_price, "#e0a10a", `${p.order_type} ${tag}`);
        add(p.stop_loss, "#d9534f", "SL");
        add(p.take_profit, "#3fb68b", "TP");
      }
    }
  }, [positions, screen]);

  const handleSelectScenario = useCallback(async (scenarioId) => {
    setLoading(true);
    const s = await startSession(scenarioId, getUserId());
    const bars = await getBars(s.session_id);
    setSession(s);
    setAllBars(bars);
    setVisibleCount(Math.min(30, bars.length));
    setPositions([]);
    setOrderType("market");
    setEntryPriceInput("");
    setStopLossInput("");
    setTakeProfitInput("");
    setTrailInput("");
    setLastFill(null);
    setResults(null);
    setScreen("playing");
    setLoading(false);
  }, []);

  const currentBar = allBars[visibleCount - 1];

  const handleOpenTrade = async (direction) => {
    if (!currentBar) return;
    if (orderType !== "market" && entryPriceInput === "") return;  // resting order needs a price
    const num = (v) => (v !== "" ? Number(v) : undefined);
    setLastFill(null);
    await openTrade(session.session_id, {
      direction,
      size: tradeSize,
      barSequence: currentBar.bar_sequence,
      stopLoss: num(stopLossInput),
      takeProfit: num(takeProfitInput),
      orderType,
      entryOrderPrice: num(entryPriceInput),
      trailDistance: num(trailInput),
    });
    setEntryPriceInput("");
    setStopLossInput("");
    setTakeProfitInput("");
    setTrailInput("");
    await refreshPositions();
  };

  const handleClosePosition = async (tradeId) => {
    if (!currentBar) return;
    await closeTrade(tradeId, currentBar.bar_sequence);  // cancels if still pending
    await refreshPositions();
  };

  const handleEndSession = async () => {
    // Flatten everything (close open, cancel pending) so the session scores on
    // realised results, then end + score.
    if (currentBar) {
      for (const p of positionsRef.current) {
        if (p.status === "open" || p.status === "pending") {
          await closeTrade(p.trade_id, currentBar.bar_sequence);
        }
      }
    }
    const res = await endSession(session.session_id);
    setResults(res);
    const board = await getLeaderboard(session.scenario_id);
    setLeaderboard(board);
    setScreen("results");
  };

  const positionUnrealised = (p) => {
    if (p.status !== "open" || !currentBar) return 0;
    const diff = currentBar.close - p.entry_price;
    return p.direction === "long" ? diff * p.size : -diff * p.size;
  };
  const openPositions = positions.filter((p) => p.status === "open");
  const pendingOrders = positions.filter((p) => p.status === "pending");
  const totalUnrealised = openPositions.reduce((s, p) => s + positionUnrealised(p), 0);
  const equity = balance + totalUnrealised;

  // ---------- SCREENS ----------

  if (screen === "menu") {
    return (
      <div className="app">
        <main className="menu">
          <h1 className="menu-hero">TAPE<span className="accent">//</span>RUN</h1>
          <div className="tagline">Trade blind. Score on discipline, not luck.</div>
          <div className="menu-boot">
            <div className="boot-line">market data <span className="ok">LOADED</span> — real history, tickers &amp; dates hidden</div>
            <div className="boot-line">execution engine <span className="ok">ARMED</span> — live spread, slippage &amp; commission</div>
            <div className="boot-line">scoring <span className="ok">ONLINE</span> — risk-adjusted, not raw P&amp;L</div>
            <div className="boot-line">awaiting operator input<span className="cursor" /></div>
          </div>
          <div className="menu-buttons">
            <button className="menu-btn menu-btn-primary" onClick={() => setScreen("select")}>
              Play a scenario
            </button>
            <button className="menu-btn" onClick={async () => {
              const p = await getProgress(getUserId());
              setProgressData(p);
              setScreen("learn");
            }}>
              Learn to trade
            </button>
            <button className="menu-btn" onClick={openProgress}>
              Your progress
            </button>
            <button className="menu-btn" onClick={() => setScreen("howto")}>
              How it works
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (screen === "learn") {
    return (
      <Learn
        progressData={progressData}
        onExit={() => setScreen("menu")}
        onProgressUpdate={(res) => {
          setProgressData((prev) => ({
            ...prev,
            completed_lessons: res.completed_lessons,
            next_item: res.next_item,
          }));
        }}
      />
    );
  }

  if (screen === "howto") {
    return (
      <div className="app">
        <header className="header">
          <div className="logo">TAPE//RUN</div>
        </header>
        <main className="howto">
          <h2>How it works</h2>
          <ol className="howto-list">
            <li>Pick a scenario. It's real historical price data — no dates or tickers shown.</li>
            <li>Watch bars play out one at a time. Go long or short whenever you see a setup.</li>
            <li>Set your position size, then close the trade whenever you want to lock in P&L.</li>
            <li>End the session to get scored — not on raw profit, but on risk-adjusted performance (Sharpe, drawdown, win rate).</li>
            <li>Better scores unlock harder scenarios and new lesson content.</li>
          </ol>
          <button className="menu-btn" onClick={() => setScreen("menu")}>
            Back to menu
          </button>
        </main>
      </div>
    );
  }

  if (screen === "progress" && progressData) {
    const completed = new Set(progressData.completed_lessons || []);
    const path = progressData.ordered_path || [];
    const lessonsDone = path.filter((i) => i.type === "lesson" && completed.has(i.id)).length;
    const lessonsTotal = path.filter((i) => i.type === "lesson").length;
    const checksDone = path.filter((i) => i.type === "check" && completed.has(i.id)).length;
    const checksTotal = path.filter((i) => i.type === "check").length;
    return (
      <div className="app">
        <header className="header">
          <div className="logo">TAPE//RUN</div>
          <button className="link-btn" onClick={() => setScreen("menu")}>← Menu</button>
        </header>
        <main className="howto">
          <h2>Your progress</h2>
          <div className="results-grid" style={{ marginBottom: 24 }}>
            <Stat label="Lessons completed" value={`${lessonsDone} / ${lessonsTotal}`} />
            <Stat label="Checks passed" value={`${checksDone} / ${checksTotal}`} />
            <Stat label="Scenarios completed" value={progressData.total_scenarios_completed} />
            <Stat
              label="Best composite score"
              value={progressData.best_composite_score != null ? progressData.best_composite_score.toFixed(1) : "\u2014"}
            />
          </div>

          <h3 className="section-label">Scenario tiers</h3>
          <ul className="unlock-list">
            {progressData.all_tiers.map((t) => (
              <li key={t.tier} className={progressData.unlocked_scenario_tiers.includes(t.tier) ? "unlocked" : "locked"}>
                Tier {t.tier} {progressData.unlocked_scenario_tiers.includes(t.tier) ? "\u2014 unlocked" : `\u2014 needs score ${t.threshold}`}
              </li>
            ))}
          </ul>

          <button className="primary-btn" onClick={() => setScreen("learn")} style={{ marginTop: 20 }}>
            Go to lessons
          </button>
        </main>
      </div>
    );
  }


  if (screen === "select") {
    return (
      <div className="app">
        <header className="header">
          <div className="logo">TAPE//RUN</div>
          <button className="link-btn" onClick={() => setScreen("menu")}>← Menu</button>
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

          {leaderboard.length > 0 && (
            <div className="leaderboard">
              <h3>Leaderboard — this scenario</h3>
              <table>
                <tbody>
                  {leaderboard.map((e) => (
                    <tr key={e.rank} className={e.user_id === getUserId() ? "lb-me" : ""}>
                      <td>#{e.rank}</td>
                      <td>{e.user_id === getUserId() ? "You" : e.user_id}</td>
                      <td>{e.composite_score.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button className="primary-btn" onClick={() => setScreen("select")}>
            Run another scenario
          </button>
          <button className="menu-btn" onClick={() => setScreen("menu")} style={{ marginLeft: 12 }}>
            Back to menu
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
          EQUITY <span>${equity.toFixed(2)}</span>
          {openPositions.length > 0 && (
            <span className={totalUnrealised >= 0 ? "pnl-pos" : "pnl-neg"}>
              {" "}({totalUnrealised >= 0 ? "+" : ""}{totalUnrealised.toFixed(2)})
            </span>
          )}
          <span className="balance-sub">bal ${balance.toFixed(2)}</span>
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
          <label className="field-label">Type
            <select
              className="size-input" value={orderType}
              onChange={(e) => setOrderType(e.target.value)}
            >
              <option value="market">Market</option>
              <option value="limit">Limit</option>
              <option value="stop">Stop</option>
            </select>
          </label>
          <label className="field-label">Size
            <input
              type="number" className="size-input" value={tradeSize}
              onChange={(e) => setTradeSize(Number(e.target.value))} min="1"
            />
          </label>
          {orderType !== "market" && (
            <label className="field-label">Entry @
              <input
                type="number" className="size-input" value={entryPriceInput}
                placeholder={currentBar ? currentBar.close.toFixed(2) : "price"}
                onChange={(e) => setEntryPriceInput(e.target.value)} step="any"
              />
            </label>
          )}
          <label className="field-label">Stop-loss
            <input
              type="number" className="size-input" value={stopLossInput}
              placeholder="none" step="any"
              onChange={(e) => setStopLossInput(e.target.value)}
            />
          </label>
          <label className="field-label">Take-profit
            <input
              type="number" className="size-input" value={takeProfitInput}
              placeholder="none" step="any"
              onChange={(e) => setTakeProfitInput(e.target.value)}
            />
          </label>
          <label className="field-label">Trail dist.
            <input
              type="number" className="size-input" value={trailInput}
              placeholder="none" step="any"
              onChange={(e) => setTrailInput(e.target.value)}
            />
          </label>
          <button className="long-btn" onClick={() => handleOpenTrade("long")}>
            LONG
          </button>
          <button className="short-btn" onClick={() => handleOpenTrade("short")}>
            SHORT
          </button>
          <button className="end-btn" onClick={handleEndSession}>
            End session
          </button>
        </div>

        {(openPositions.length > 0 || pendingOrders.length > 0) && (
          <div className="positions-panel">
            {openPositions.map((p) => {
              const u = positionUnrealised(p);
              return (
                <div key={p.trade_id} className="position-row">
                  <span className={`pos-dir pos-${p.direction}`}>{p.direction.toUpperCase()}</span>
                  <span className="pos-size">{p.size} @ {p.entry_price?.toFixed(2)}</span>
                  <span className="pos-levels">
                    {p.stop_loss != null && <>SL {p.stop_loss} </>}
                    {p.take_profit != null && <>TP {p.take_profit} </>}
                    {p.trail_distance != null && <>trail {p.trail_distance}</>}
                  </span>
                  <span className={u >= 0 ? "pnl-pos" : "pnl-neg"}>
                    {u >= 0 ? "+" : ""}{u.toFixed(2)}
                  </span>
                  <button className="pos-close" onClick={() => handleClosePosition(p.trade_id)}>
                    Close
                  </button>
                </div>
              );
            })}
            {pendingOrders.map((p) => (
              <div key={p.trade_id} className="position-row pending">
                <span className={`pos-dir pos-${p.direction}`}>{p.direction.toUpperCase()}</span>
                <span className="pos-size">{p.order_type} @ {p.entry_order_price}</span>
                <span className="pos-levels">working — {p.size} units</span>
                <span className="muted">pending</span>
                <button className="pos-close" onClick={() => handleClosePosition(p.trade_id)}>
                  Cancel
                </button>
              </div>
            ))}
          </div>
        )}

        {lastFill && (
          <div className="control-row">
            <div className={`fill-note ${lastFill.pnl >= 0 ? "pnl-pos" : "pnl-neg"}`}>
              Auto-closed at bar {lastFill.bar} ·{" "}
              {lastFill.reason.replace("_", " ")} ·{" "}
              {lastFill.pnl >= 0 ? "+" : ""}{lastFill.pnl.toFixed(2)}
            </div>
          </div>
        )}
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
