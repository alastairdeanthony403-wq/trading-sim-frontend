import { useEffect, useRef, useState, useCallback } from "react";
import { createChart, CandlestickSeries } from "lightweight-charts";
import {
  listScenarios,
  startSession,
  getBars,
  openTrade,
  closeTrade,
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
  const [openTradeState, setOpenTradeState] = useState(null); // {trade_id, direction, size, entry_price}
  const [tradeSize, setTradeSize] = useState(10);
  const [balance, setBalance] = useState(10000);
  const [results, setResults] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(false);

  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const containerRef = useRef(null);

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

  const handleSelectScenario = useCallback(async (scenarioId) => {
    setLoading(true);
    const s = await startSession(scenarioId, getUserId());
    const bars = await getBars(s.session_id);
    setSession(s);
    setAllBars(bars);
    setVisibleCount(Math.min(30, bars.length));
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
    const board = await getLeaderboard(session.scenario_id);
    setLeaderboard(board);
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

  if (screen === "menu") {
    return (
      <div className="app">
        <header className="header">
          <div className="logo">TAPE//RUN</div>
          <div className="tagline">Trade blind. Score on discipline, not luck.</div>
        </header>
        <main className="menu">
          <p className="menu-intro">
            Historical price action, dates and tickers hidden. Trade what you see,
            not what you remember happened.
          </p>
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
