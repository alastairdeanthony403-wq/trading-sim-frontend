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
  getTools,
  getMissions,
  getDailyMission,
  getMissionStatus,
  submitMission,
} from "./api";
import { getUserId } from "./user";
import { addXp } from "./xp";
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
  const [leverage, setLeverage] = useState(1);
  const [orderError, setOrderError] = useState("");
  const [marginCall, setMarginCall] = useState(false);
  const [unlockedTools, setUnlockedTools] = useState([]);
  const [toolLevel, setToolLevel] = useState(1);
  const [missions, setMissions] = useState([]);
  const [daily, setDaily] = useState(null);          // { mission, date, streak }
  const [activeMission, setActiveMission] = useState(null);
  const [activeIsDaily, setActiveIsDaily] = useState(false);
  const [missionStatus, setMissionStatus] = useState(null);  // live { results, passed }
  const [missionResult, setMissionResult] = useState(null);  // submit result
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
  const endedRef = useRef(false);                // guard: end the session once
  const activeMissionRef = useRef(null);
  activeMissionRef.current = activeMission;
  const activeIsDailyRef = useRef(false);
  activeIsDailyRef.current = activeIsDaily;

  // Submit the active mission (if any) for a finished session; awards XP on pass.
  const submitActiveMission = async (sessionId) => {
    const m = activeMissionRef.current;
    if (!m) return;
    try {
      const r = await submitMission(m.id, sessionId, getUserId(), activeIsDailyRef.current);
      if (r.passed && r.xp_awarded) addXp(r.xp_awarded);
      setMissionResult(r);
    } catch { /* leave missionResult null */ }
  };

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
    if (activeMissionRef.current) {
      getMissionStatus(session.session_id, activeMissionRef.current.id)
        .then(setMissionStatus).catch(() => {});
    }
  }, [session]);

  // initial mission rule evaluation when a mission session opens
  useEffect(() => {
    if (session && activeMission) {
      getMissionStatus(session.session_id, activeMission.id)
        .then(setMissionStatus).catch(() => {});
    }
  }, [session, activeMission]);

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
      setMarginCall(!!res.margin_call);
      if (activeMissionRef.current) {
        getMissionStatus(session.session_id, activeMissionRef.current.id)
          .then(setMissionStatus).catch(() => {});
      }
      const closed = (res.events || []).filter((e) => e.event === "closed" || e.event === "liquidated");
      if (closed.length) {
        const last = closed[closed.length - 1];
        setLastFill({ reason: last.reason || "liquidation", bar: last.bar_sequence, pnl: last.pnl });
      }
      if (res.blown && !endedRef.current) {
        endedRef.current = true;
        setPlaying(false);
        setMarginCall(false);
        const r = await endSession(session.session_id);
        setResults(r);
        await submitActiveMission(session.session_id);
        const board = await getLeaderboard(session.scenario_id);
        setLeaderboard(board);
        setScreen("results");
        return;
      }
    } catch {
      /* transient — next tick retries */
    } finally {
      advanceInFlightRef.current = false;
      if (!endedRef.current && advanceTargetRef.current > target) runAdvance();  // catch up
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

  const handleSelectScenario = useCallback(async (scenarioId, keepMission = false) => {
    setLoading(true);
    const s = await startSession(scenarioId, getUserId());
    const bars = await getBars(s.session_id);
    try {
      const t = await getTools(getUserId());
      setUnlockedTools(t.unlocked_tools || []);
      setToolLevel(t.tool_level || 1);
      if (!(t.unlocked_tools || []).includes("leverage")) setLeverage(1);
    } catch { setUnlockedTools([]); setToolLevel(1); }
    setSession(s);
    setAllBars(bars);
    setVisibleCount(Math.min(30, bars.length));
    setPositions([]);
    setOrderType("market");
    setEntryPriceInput("");
    setStopLossInput("");
    setTakeProfitInput("");
    setTrailInput("");
    setLeverage(1);
    setOrderError("");
    setMarginCall(false);
    endedRef.current = false;
    setLastFill(null);
    setResults(null);
    if (!keepMission) {
      setActiveMission(null);
      setActiveIsDaily(false);
    }
    setMissionStatus(null);
    setMissionResult(null);
    setScreen("playing");
    setLoading(false);
  }, []);

  const handleStartMission = useCallback(async (mission, isDaily) => {
    // pick the mission's scenario if set, else the first available scenario
    const scenarioId = mission.scenario_id || (scenarios[0] && scenarios[0].id);
    if (!scenarioId) return;
    setActiveMission(mission);
    setActiveIsDaily(!!isDaily);
    await handleSelectScenario(scenarioId, true);
  }, [scenarios, handleSelectScenario]);

  const currentBar = allBars[visibleCount - 1];

  const handleOpenTrade = async (direction) => {
    if (!currentBar) return;
    if (orderType !== "market" && entryPriceInput === "") return;  // resting order needs a price
    const num = (v) => (v !== "" ? Number(v) : undefined);
    setLastFill(null);
    setOrderError("");
    const res = await openTrade(session.session_id, {
      direction,
      size: tradeSize,
      barSequence: currentBar.bar_sequence,
      stopLoss: num(stopLossInput),
      takeProfit: num(takeProfitInput),
      orderType,
      entryOrderPrice: num(entryPriceInput),
      trailDistance: num(trailInput),
      leverage,
    });
    if (res && res.error) {          // e.g. insufficient margin
      setOrderError(res.error);
      return;
    }
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
    await submitActiveMission(session.session_id);
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

  // progressive tool-gating (server-authoritative)
  const has = (tool) => unlockedTools.includes(tool);
  const liveOrders = openPositions.length + pendingOrders.length;
  const canOpenNew = has("multi_position") || liveOrders === 0;

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
              const [ms, d] = await Promise.all([getMissions(), getDailyMission(getUserId())]);
              setMissions(ms || []);
              setDaily(d || null);
              setScreen("missions");
            }}>
              Missions &amp; daily challenge
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


  if (screen === "missions") {
    const rulesText = (m) => (m.rules || []).map((r) => r.label).join(" · ");
    return (
      <div className="app">
        <header className="header">
          <div className="logo">TAPE//RUN</div>
          <button className="link-btn" onClick={() => setScreen("menu")}>← Menu</button>
        </header>
        <main className="howto">
          <h2>Missions</h2>
          <p className="muted" style={{ marginBottom: 16 }}>
            Missions score you on process — risk control and discipline — not just profit.
          </p>
          {daily && daily.mission && (
            <div className="daily-card">
              <div className="daily-tag">
                DAILY CHALLENGE · {daily.date} · streak {daily.streak} 🔥
              </div>
              <h3 style={{ margin: "6px 0" }}>{daily.mission.title}</h3>
              <p className="muted">{daily.mission.brief}</p>
              <div className="mission-rules">{rulesText(daily.mission)}</div>
              <button className="primary-btn" style={{ marginTop: 10 }}
                onClick={() => handleStartMission(daily.mission, true)} disabled={loading}>
                Play daily · +{daily.mission.xp_reward} XP
              </button>
            </div>
          )}
          <h3 className="section-label" style={{ marginTop: 24 }}>All missions</h3>
          <div className="mission-grid">
            {missions.map((m) => (
              <div key={m.id} className="mission-card">
                <div className="mission-tier">TIER {m.difficulty_tier} · +{m.xp_reward} XP</div>
                <div className="mission-title">{m.title}</div>
                <div className="muted mission-brief">{m.brief}</div>
                <div className="mission-rules">{rulesText(m)}</div>
                <button className="menu-btn" onClick={() => handleStartMission(m, false)} disabled={loading}>
                  Play
                </button>
              </div>
            ))}
          </div>
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

  if (screen === "results" && results && results.blown) {
    const pm = results.post_mortem || {};
    const curve = pm.equity_curve || [];
    const disciplined = pm.disciplined_ending_balance;
    return (
      <div className="app">
        <header className="header">
          <div className="logo">TAPE//RUN</div>
        </header>
        <main className="results blown">
          <h2 className="blown-title">ACCOUNT BLOWN</h2>
          <p className="blown-lede">
            Your equity hit zero, so the account was liquidated. This is the single
            most important thing to avoid — one over-sized, over-leveraged position can
            end a career no matter how many good trades came before it. The score for a
            blown account is <strong>zero</strong>, on purpose.
          </p>

          <div className="results-grid" style={{ marginBottom: 20 }}>
            <Stat label="Ending balance" value={`$${results.ending_balance.toFixed(2)}`} />
            <Stat label="Composite score" value="0" highlight />
          </div>

          {curve.length > 1 && <EquitySparkline curve={curve} start={startingBalance} />}

          {pm.worst_trades && pm.worst_trades.length > 0 && (
            <div className="pm-section">
              <h3 className="section-label">What did the damage</h3>
              <table className="pm-table">
                <tbody>
                  {pm.worst_trades.map((t, i) => (
                    <tr key={i}>
                      <td className={`pos-${t.direction}`}>{t.direction.toUpperCase()}</td>
                      <td>{t.size} units{t.leverage > 1 ? ` · ${t.leverage}x` : ""}</td>
                      <td>{(t.exit_reason || "").replace("_", " ")}</td>
                      <td className="pnl-neg">{t.pnl.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {disciplined != null && (
            <div className="pm-compare">
              <div className="section-label">{pm.disciplined_note}</div>
              <div className="pm-compare-row">
                <span>Your account</span>
                <span className="pnl-neg">${results.ending_balance.toFixed(2)}</span>
              </div>
              <div className="pm-compare-row">
                <span>A disciplined 1%-risk version</span>
                <span className={disciplined >= startingBalance ? "pnl-pos" : "pnl-neg"}>
                  ${disciplined.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <button className="primary-btn" onClick={() => setScreen("select")} style={{ marginTop: 20 }}>
            Try again
          </button>
          <button className="menu-btn" onClick={() => setScreen("menu")} style={{ marginLeft: 12 }}>
            Back to menu
          </button>
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
          {missionResult && (
            <div className={`mission-result ${missionResult.passed ? "passed" : "failed"}`}>
              <div className="mission-result-head">
                {missionResult.passed ? "MISSION COMPLETE" : "MISSION FAILED"}
                {missionResult.passed && missionResult.xp_awarded ? ` · +${missionResult.xp_awarded} XP` : ""}
              </div>
              <div className="rules-hud-items">
                {(missionResult.results || []).map((r, i) => (
                  <span key={i} className={`rule-chip ${r.passed ? "rule-ok" : "rule-bad"}`}>
                    {r.passed ? "✓" : "✕"} {r.label}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="results-grid">
            <Stat label="Ending balance" value={`$${results.ending_balance.toFixed(2)}`} />
            <Stat label="Return" value={`${results.total_return_pct.toFixed(2)}%`} accent={results.total_return_pct >= 0} />
            <Stat label="Sharpe" value={results.sharpe_ratio.toFixed(2)} />
            <Stat label="Max drawdown" value={`${results.max_drawdown_pct.toFixed(2)}%`} />
            <Stat label="Win rate" value={`${results.win_rate.toFixed(1)}%`} />
            {results.discipline && (
              <Stat label="Discipline" value={`${results.discipline.discipline_score.toFixed(0)} / 100`}
                accent={results.discipline.discipline_score >= 70} />
            )}
            <Stat label="Composite score" value={results.score_composite.toFixed(1)} highlight />
          </div>

          {results.discipline && results.discipline.rule_violations > 0 && (
            <div className="discipline-breakdown">
              <div className="section-label">Discipline flags</div>
              <ul className="violation-list">
                {results.discipline.no_stop_count > 0 && (
                  <li>{results.discipline.no_stop_count} trade{results.discipline.no_stop_count > 1 ? "s" : ""} with no stop-loss — you had no defined risk.</li>
                )}
                {results.discipline.oversize_count > 0 && (
                  <li>{results.discipline.oversize_count} oversized trade{results.discipline.oversize_count > 1 ? "s" : ""} — risking more than 5% of your balance.</li>
                )}
                {results.discipline.revenge_count > 0 && (
                  <li>{results.discipline.revenge_count} revenge trade{results.discipline.revenge_count > 1 ? "s" : ""} — bigger size right after a stop-out.</li>
                )}
              </ul>
              <div className="muted" style={{ fontSize: 12 }}>
                Avg risk per trade: {results.discipline.avg_risk_pct.toFixed(2)}% of balance.
              </div>
            </div>
          )}

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

      {marginCall && (
        <div className="margin-call-banner">
          ⚠ MARGIN CALL — equity is close to the maintenance level. Reduce risk or
          you'll be liquidated.
        </div>
      )}

      {activeMission && (
        <div className="rules-hud">
          <div className="rules-hud-title">
            MISSION · {activeMission.title}{activeIsDaily ? " · DAILY" : ""}
          </div>
          <div className="rules-hud-items">
            {(missionStatus?.results ||
              (activeMission.rules || []).map((r) => ({ label: r.label, passed: false }))
            ).map((r, i) => (
              <span key={i} className={`rule-chip ${r.passed ? "rule-ok" : "rule-pending"}`}>
                {r.passed ? "✓" : "○"} {r.label}
              </span>
            ))}
          </div>
        </div>
      )}

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
          {has("limit_stop") && (
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
          )}
          <label className="field-label">Size
            <input
              type="number" className="size-input" value={tradeSize}
              onChange={(e) => setTradeSize(Number(e.target.value))} min="1"
            />
          </label>
          {has("leverage") && (
            <label className="field-label">Leverage
              <select
                className="size-input" value={leverage}
                onChange={(e) => setLeverage(Number(e.target.value))}
              >
                {[1, 2, 5, 10, 25, 50, 100].map((x) => (
                  <option key={x} value={x}>{x}x</option>
                ))}
              </select>
            </label>
          )}
          {has("limit_stop") && orderType !== "market" && (
            <label className="field-label">Entry @
              <input
                type="number" className="size-input" value={entryPriceInput}
                placeholder={currentBar ? currentBar.close.toFixed(2) : "price"}
                onChange={(e) => setEntryPriceInput(e.target.value)} step="any"
              />
            </label>
          )}
          {has("sl_tp") && (
            <>
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
            </>
          )}
          {has("trailing") && (
            <label className="field-label">Trail dist.
              <input
                type="number" className="size-input" value={trailInput}
                placeholder="none" step="any"
                onChange={(e) => setTrailInput(e.target.value)}
              />
            </label>
          )}
          <button className="long-btn" onClick={() => handleOpenTrade("long")} disabled={!canOpenNew}>
            LONG
          </button>
          <button className="short-btn" onClick={() => handleOpenTrade("short")} disabled={!canOpenNew}>
            SHORT
          </button>
          <button className="end-btn" onClick={handleEndSession}>
            End session
          </button>
        </div>

        <div className="control-row">
          <div className="tool-level-hint">
            LEVEL {toolLevel}
            {!canOpenNew && " · one position at a time"}
            {toolLevel < 6 && " · more tools unlock as you complete scenarios"}
          </div>
        </div>

        {orderError && (
          <div className="control-row">
            <div className="fill-note pnl-neg" data-testid="order-error">{orderError}</div>
          </div>
        )}

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

function EquitySparkline({ curve, start }) {
  const W = 520, H = 120, pad = 8;
  const vals = curve.map((p) => p.equity);
  const min = Math.min(...vals, 0);
  const max = Math.max(...vals, start);
  const span = max - min || 1;
  const x = (i) => pad + (i / (curve.length - 1)) * (W - 2 * pad);
  const y = (v) => H - pad - ((v - min) / span) * (H - 2 * pad);
  const d = curve.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.equity).toFixed(1)}`).join(" ");
  const zeroY = y(0);
  return (
    <div className="pm-section">
      <h3 className="section-label">Equity curve</h3>
      <svg className="pm-sparkline" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        {min < 0 && (
          <line x1={pad} y1={zeroY} x2={W - pad} y2={zeroY} stroke="#3a4452" strokeDasharray="3 3" strokeWidth="1" />
        )}
        <path d={d} fill="none" stroke="#d9534f" strokeWidth="2" />
      </svg>
    </div>
  );
}
