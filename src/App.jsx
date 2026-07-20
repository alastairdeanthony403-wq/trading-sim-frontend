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
  getEvents,
  getScamDebrief,
  endSession,
  getLeaderboard,
  getProgress,
  getCareer,
  getTools,
  getMissions,
  getDailyMission,
  getMissionStatus,
  submitMission,
  getReplay,
  getCoachLlm,
  getCurrentContest,
  startContest,
  submitContest,
  getContestLeaderboard,
  createLeague,
  joinLeague,
  getMyLeagues,
  getLeagueLeaderboard,
} from "./api";
import { getUserId, getDisplayName, setDisplayName } from "./user";
import { addXp } from "./xp";
import Learn from "./Learn";
import ReplayChart from "./ReplayChart";
import "./App.css";

const SPEEDS = [
  { label: "1x", ms: 900 },
  { label: "4x", ms: 250 },
  { label: "Max", ms: 40 },
];

// Multi-timeframe (Phase 2): minutes per bar, mirrored from the backend
// (bar_provider.TF_MINUTES). Intraday scenarios store a 1-minute base series and
// the chart aggregates it to any coarser timeframe for display.
const TF_MINUTES = { "1m": 1, "5m": 5, "15m": 15, "30m": 30, "1h": 60, "4h": 240 };
const tfMult = (tf) => TF_MINUTES[tf] || 1;

// Aggregate a base (1m) bar slice into `mult`-minute candles for display. Same
// bucketing the server uses: bucket i = floor(base_seq / mult); open=first,
// high=max, low=min, close=last. The final bucket may be partial (the forming
// candle) — it only ever contains already-revealed bars, so nothing leaks.
function aggregateBars(bars, mult) {
  if (mult <= 1) return bars;
  const buckets = new Map();
  for (const b of bars) {
    const idx = Math.floor(b.bar_sequence / mult);
    (buckets.get(idx) || buckets.set(idx, []).get(idx)).push(b);
  }
  const out = [];
  for (const idx of [...buckets.keys()].sort((a, z) => a - z)) {
    const g = buckets.get(idx);
    out.push({
      bar_sequence: idx,
      open: g[0].open,
      high: Math.max(...g.map((x) => x.high)),
      low: Math.min(...g.map((x) => x.low)),
      close: g[g.length - 1].close,
    });
  }
  return out;
}

// Friendly labels for synthetic-market regime tags (Phase E).
const REGIME_LABELS = {
  trend_up: "Uptrend", trend_down: "Downtrend", range: "Range",
  high_vol: "High Volatility", crash: "Crash", bubble_pop: "Bubble & Pop",
};
// A scenario's headline badge: scam/news take priority over the base regime.
function scenarioBadge(tags) {
  const t = tags || [];
  if (t.includes("scam")) return { label: "Pump & Dump", cls: "badge-scam" };
  if (t.includes("news") || t.includes("scenario_mode")) return { label: "Breaking News", cls: "badge-news" };
  for (const tag of t) if (REGIME_LABELS[tag]) return { label: REGIME_LABELS[tag], cls: "scenario-regime" };
  return null;
}

export default function App() {
  const [screen, setScreen] = useState("menu"); // menu | select | playing | results | progress | learn
  const [scenarios, setScenarios] = useState([]);
  const [progressData, setProgressData] = useState(null);
  const [session, setSession] = useState(null);
  const [allBars, setAllBars] = useState([]);
  const [visibleCount, setVisibleCount] = useState(1);
  // Multi-timeframe: timeframes this scenario can be viewed on (intraday → many),
  // the currently selected one, and how many base (1m) bars a playback tick reveals
  // (the anchor timeframe's minutes for intraday, 1 otherwise).
  const [timeframes, setTimeframes] = useState([]);
  const [chartTf, setChartTf] = useState(null);
  const [playbackStep, setPlaybackStep] = useState(1);
  // Intraday trading-session context (Phase 4): the session bands + minutes-per-day
  // let us show which session (Open/London/…) the current bar sits in. Live and
  // non-leaking — the time of day is always known.
  const [sessionBands, setSessionBands] = useState([]);
  const [barsPerDay, setBarsPerDay] = useState(0);
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
  const [concentrated, setConcentrated] = useState(false);
  const [fundManager, setFundManager] = useState(false);   // client-money rules
  const [events, setEvents] = useState([]);                // scripted news events
  const [scamDebrief, setScamDebrief] = useState(null);    // pump-and-dump debrief
  const [voices, setVoices] = useState([]);                // character voices at decision points
  // ── Competitions (Phase G) ──
  const [contestMode, setContestMode] = useState(false);   // reveal-driven contest playback
  const [contest, setContest] = useState(null);            // current weekly contest
  const [contestBoard, setContestBoard] = useState([]);
  const [contestResult, setContestResult] = useState(null);
  const [leagues, setLeagues] = useState([]);
  const [leagueBoard, setLeagueBoard] = useState(null);    // { league, rows }
  const [nameInput, setNameInput] = useState(getDisplayName());
  const [savedName, setSavedName] = useState(getDisplayName());
  const [joinCode, setJoinCode] = useState("");
  const [leagueName, setLeagueName] = useState("");
  const contestBarCountRef = useRef(0);
  const [unlockedTools, setUnlockedTools] = useState([]);
  const [toolLevel, setToolLevel] = useState(1);
  const [missions, setMissions] = useState([]);
  const [daily, setDaily] = useState(null);          // { mission, date, streak }
  const [activeMission, setActiveMission] = useState(null);
  const [activeIsDaily, setActiveIsDaily] = useState(false);
  const [missionStatus, setMissionStatus] = useState(null);  // live { results, passed }
  const [missionResult, setMissionResult] = useState(null);  // submit result
  const [replayData, setReplayData] = useState(null);
  const [llmCoach, setLlmCoach] = useState(null);   // { loading, text }
  const [career, setCareer] = useState(null);
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

  // News events revealed so far: those whose bar has been reached in playback.
  const newsBarIdx = visibleCount - 1;
  const revealedEvents = events.filter((e) => e.bar_sequence <= newsBarIdx);
  const latestEvent = revealedEvents[revealedEvents.length - 1] || null;

  useEffect(() => {
    listScenarios(getUserId()).then(setScenarios);
    // Career drives which markets are unlocked and whether Fund Manager mode
    // (a level-6 skill unlock) is available on the select screen.
    getCareer(getUserId()).then(setCareer).catch(() => {});
  }, []);

  // Fund Manager mode is the level-6 "Fund Manager" career unlock.
  const fmUnlocked = (career?.level || 0) >= 6;

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

  // reset fit tracking when entering a new session OR switching timeframe, so the
  // chart re-frames once for the new view (but not on every revealed bar).
  useEffect(() => {
    hasFitRef.current = false;
  }, [session, chartTf]);

  // push visible bars to chart whenever visibleCount / timeframe changes.
  // allBars is always the BASE (1m for intraday) series; for a coarser timeframe
  // we aggregate the revealed slice for display. Trades stay keyed to the base
  // bar_sequence, so the order engine is untouched.
  useEffect(() => {
    if (!seriesRef.current || allBars.length === 0) return;
    const revealed = allBars.slice(0, visibleCount);
    const slice = aggregateBars(revealed, tfMult(chartTf)).map((b) => ({
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
  }, [visibleCount, allBars, chartTf]);

  // playback loop (normal sessions — contest sessions use the reveal-driven loop)
  useEffect(() => {
    if (!playing || contestMode) return;
    if (visibleCount >= allBars.length) {
      setPlaying(false);
      return;
    }
    const id = setTimeout(() => {
      setVisibleCount((c) => Math.min(c + playbackStep, allBars.length));
    }, speed.ms);
    return () => clearTimeout(id);
  }, [playing, contestMode, visibleCount, allBars, speed, playbackStep]);

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
      setConcentrated(!!res.concentrated);
      if (Array.isArray(res.voices)) setVoices(res.voices);
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
        setConcentrated(false);
        const r = await endSession(session.session_id);
        setResults(r);
        try { setScamDebrief(await getScamDebrief(session.session_id)); } catch { setScamDebrief(null); }
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
    if (!session || contestMode) return;
    const seq = allBars[visibleCount - 1]?.bar_sequence;
    if (seq == null) return;
    advanceTargetRef.current = seq;
    // only hit the server while there are orders that could fill/close
    if (positionsRef.current.some((p) => p.status === "open" || p.status === "pending")) {
      runAdvance();
    }
  }, [visibleCount, allBars, session, contestMode, runAdvance]);

  // ---- contest reveal-driven playback (server is the clock, one bar/tick) ----
  const finishContest = useCallback(async () => {
    const dn = getDisplayName();
    let submit = null;
    if (dn && contest) {
      try { submit = await submitContest(contest.contest_id, session.session_id, getUserId(), dn); }
      catch { submit = null; }
    } else if (session) {
      try { await endSession(session.session_id); } catch { /* ignore */ }
    }
    setContestResult(submit);
    if (contest) {
      try { setContestBoard(await getContestLeaderboard(contest.contest_id)); } catch { /* ignore */ }
    }
    setScreen("contestResult");
  }, [contest, session]);

  const contestTick = useCallback(async () => {
    if (advanceInFlightRef.current || !session) return;
    advanceInFlightRef.current = true;
    try {
      const res = await advanceSession(session.session_id, 1e9);
      if (Array.isArray(res.positions)) setPositions(res.positions);
      setMarginCall(!!res.margin_call);
      setConcentrated(!!res.concentrated);
      if (Array.isArray(res.voices)) setVoices(res.voices);
      const served = res.bars_served ?? 0;
      const bars = await getBars(session.session_id, served);
      setAllBars(bars);
      setVisibleCount(bars.length);
      const closed = (res.events || []).filter((e) => e.event === "closed" || e.event === "liquidated");
      if (closed.length) {
        const last = closed[closed.length - 1];
        setLastFill({ reason: last.reason || "liquidation", bar: last.bar_sequence, pnl: last.pnl });
      }
      const done = res.status === "blown" || res.status === "complete"
                   || served >= contestBarCountRef.current - 1;
      if (done && !endedRef.current) {
        endedRef.current = true;
        setPlaying(false);
        await finishContest();
      }
    } catch {
      /* transient — next tick retries */
    } finally {
      advanceInFlightRef.current = false;
    }
  }, [session, finishContest]);

  useEffect(() => {
    if (!playing || !contestMode || endedRef.current) return;
    const id = setTimeout(() => { contestTick(); }, speed.ms);
    return () => clearTimeout(id);
  }, [playing, contestMode, visibleCount, speed, contestTick]);

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

  const handleSelectScenario = useCallback(async (scenarioId, keepMission = false, mode = "standard") => {
    setLoading(true);
    const s = await startSession(scenarioId, getUserId(), mode);
    const bars = await getBars(s.session_id);
    try {
      const t = await getTools(getUserId());
      setUnlockedTools(t.unlocked_tools || []);
      setToolLevel(t.tool_level || 1);
      if (!(t.unlocked_tools || []).includes("leverage")) setLeverage(1);
    } catch { setUnlockedTools([]); setToolLevel(1); }
    try {
      setEvents(await getEvents(s.session_id));
    } catch { setEvents([]); }
    setScamDebrief(null);
    setVoices([]);
    setContestMode(false);
    setSession(s);
    setAllBars(bars);
    // Multi-timeframe: intraday scenarios advertise several timeframes and open on
    // their anchor (e.g. 15m); each playback tick then reveals one anchor candle's
    // worth of base (1m) bars. Single-timeframe scenarios keep 1-bar steps.
    const tfs = s.available_timeframes || [];
    const anchor = s.anchor_tf || s.base_timeframe || (tfs[0] || null);
    setTimeframes(tfs.length > 1 ? tfs : []);
    setChartTf(anchor);
    setPlaybackStep(tfs.length > 1 && s.anchor_tf ? tfMult(s.anchor_tf) : 1);
    setSessionBands(s.session_bands || []);
    setBarsPerDay(s.bars_per_day || 0);
    // Rule 0: show the pre-playback history window (server-provided) on load,
    // then playback reveals the rest one bar at a time.
    setVisibleCount(Math.min(s.history_bars || 30, bars.length));
    setPositions([]);
    setOrderType("market");
    setEntryPriceInput("");
    setStopLossInput("");
    setTakeProfitInput("");
    setTrailInput("");
    setLeverage(1);
    setOrderError("");
    setMarginCall(false);
    setConcentrated(false);
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

  // ── Competitions ──
  const openCompete = useCallback(async () => {
    setOrderError("");
    setScreen("compete");
    try {
      const c = await getCurrentContest(getUserId());
      setContest(c);
      setContestBoard(await getContestLeaderboard(c.contest_id));
    } catch { /* ignore */ }
    try { setLeagues(await getMyLeagues(getUserId())); } catch { setLeagues([]); }
    setLeagueBoard(null);
  }, []);

  const startContestPlay = useCallback(async () => {
    if (!contest) return;
    setLoading(true);
    const s = await startContest(getUserId());
    contestBarCountRef.current = contest.bar_count || 0;
    const bars = await getBars(s.session_id, s.bars_served);
    try {
      const t = await getTools(getUserId());
      setUnlockedTools(t.unlocked_tools || []);
      setToolLevel(t.tool_level || 1);
    } catch { setUnlockedTools([]); setToolLevel(1); }
    setSession({ session_id: s.session_id, scenario_id: s.scenario_id, is_contest: true, mode: "standard" });
    setContestMode(true);
    setAllBars(bars);
    setTimeframes([]); setChartTf(null); setPlaybackStep(1);   // contests are single-timeframe
    setSessionBands([]); setBarsPerDay(0);
    setVisibleCount(bars.length);
    setPositions([]);
    setOrderType("market"); setEntryPriceInput(""); setStopLossInput("");
    setTakeProfitInput(""); setTrailInput(""); setLeverage(1); setOrderError("");
    setMarginCall(false); setConcentrated(false);
    setEvents([]); setScamDebrief(null); setVoices([]);
    setActiveMission(null); setActiveIsDaily(false); setMissionStatus(null); setMissionResult(null);
    endedRef.current = false; setLastFill(null); setResults(null); setContestResult(null);
    setScreen("playing");
    setLoading(false);
  }, [contest]);

  const handleCreateLeague = async () => {
    const dn = getDisplayName();
    if (!leagueName.trim() || !dn) return;
    await createLeague(leagueName.trim(), getUserId(), dn);
    setLeagueName("");
    setLeagues(await getMyLeagues(getUserId()));
  };

  const handleJoinLeague = async () => {
    const dn = getDisplayName();
    if (!joinCode.trim() || !dn) return;
    const res = await joinLeague(joinCode.trim(), getUserId(), dn);
    setJoinCode("");
    if (res && res.error) { setOrderError(res.error); return; }
    setLeagues(await getMyLeagues(getUserId()));
  };

  const openLeagueBoard = async (league) => {
    const rows = await getLeagueLeaderboard(league.league_id);
    setLeagueBoard({ league, rows });
  };

  const currentBar = allBars[visibleCount - 1];

  // Which trading session the current bar sits in (intraday only). The session
  // bands are fractions of the day; map the bar's within-day position onto them.
  const currentSession = (() => {
    if (!sessionBands.length || !barsPerDay || !currentBar) return null;
    const frac = (currentBar.bar_sequence % barsPerDay) / barsPerDay;
    const band = sessionBands.find((b) => frac >= b.start && frac < b.end)
      || sessionBands[sessionBands.length - 1];
    return band ? band.name : null;
  })();

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
    try { setScamDebrief(await getScamDebrief(session.session_id)); } catch { setScamDebrief(null); }
    await submitActiveMission(session.session_id);
    const board = await getLeaderboard(session.scenario_id);
    setLeaderboard(board);
    setScreen("results");
  };

  const openReplay = async () => {
    if (!session) return;
    try {
      const r = await getReplay(session.session_id);
      setReplayData(r);
      setLlmCoach(null);
      setScreen("replay");
    } catch { /* ignore */ }
  };

  const getLlmTake = async () => {
    if (!session) return;
    setLlmCoach({ loading: true, text: "" });
    try {
      const r = await getCoachLlm(session.session_id);
      setLlmCoach({ loading: false, text: r.review || "The coach had nothing to add this time." });
    } catch {
      setLlmCoach({ loading: false, text: "Couldn't reach the AI coach — the rule-based notes above still apply." });
    }
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
            <button className="menu-btn" onClick={async () => {
              setCareer(await getCareer(getUserId()));
              setScreen("career");
            }}>
              Career
            </button>
            <button className="menu-btn" onClick={openCompete}>
              Compete
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

  if (screen === "compete") {
    return (
      <div className="app">
        <header className="header">
          <div className="logo">TAPE//RUN</div>
          <button className="link-btn" onClick={() => setScreen("menu")}>← Menu</button>
        </header>
        <main className="compete">
          <h2>Compete</h2>

          <div className="name-card">
            <label className="name-label">Display name (your leaderboard identity)</label>
            <div className="name-row">
              <input className="text-input" value={nameInput} maxLength={60}
                     placeholder="e.g. NightDesk"
                     onChange={(e) => setNameInput(e.target.value)} />
              <button className="primary-btn" onClick={() => { setDisplayName(nameInput); setSavedName(nameInput.trim().slice(0, 60)); }}>
                Save
              </button>
            </div>
            <p className="muted small">
              {savedName ? `Entering as "${savedName}".` : "Set a name to post scored entries — without one you can still practise."}
            </p>
          </div>

          {contest && (
            <div className="contest-card">
              <div className="contest-head">
                <div>
                  <div className="section-label">THIS WEEK'S CHALLENGE</div>
                  <div className="contest-title">{contest.title}</div>
                  <div className="muted small">
                    Week of {contest.week_start} · {contest.entry_count} entries
                    {contest.your_entry ? ` · your score ${contest.your_entry.composite_score}` : ""}
                  </div>
                </div>
                <button className="primary-btn" onClick={startContestPlay} disabled={loading}>
                  {contest.your_entry ? "Practise again" : "Play the challenge"}
                </button>
              </div>
              {contest.your_entry && (
                <p className="muted small">You've already posted a scored entry — replays are practice only (one scored attempt per week).</p>
              )}
              <div className="section-label" style={{ marginTop: 14 }}>LEADERBOARD</div>
              {contestBoard.length === 0 && <p className="muted small">No entries yet — be the first.</p>}
              {contestBoard.length > 0 && (
                <table className="board-table">
                  <tbody>
                    {contestBoard.map((e) => (
                      <tr key={e.user_id} className={e.display_name === savedName ? "board-me" : ""}>
                        <td className="board-rank">{e.rank}</td>
                        <td>{e.display_name}</td>
                        <td className="board-score">{e.composite_score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          <div className="leagues-card">
            <div className="section-label">PRIVATE LEAGUES</div>
            <div className="league-actions">
              <div className="league-action">
                <input className="text-input" value={leagueName} maxLength={80}
                       placeholder="New league name"
                       onChange={(e) => setLeagueName(e.target.value)} />
                <button className="menu-btn" onClick={handleCreateLeague} disabled={!savedName}>Create</button>
              </div>
              <div className="league-action">
                <input className="text-input" value={joinCode} maxLength={12}
                       placeholder="Invite code"
                       onChange={(e) => setJoinCode(e.target.value.toUpperCase())} />
                <button className="menu-btn" onClick={handleJoinLeague} disabled={!savedName}>Join</button>
              </div>
            </div>
            {!savedName && <p className="muted small">Set a display name above to create or join a league.</p>}
            {orderError && <p className="order-error">{orderError}</p>}

            {leagues.length > 0 && (
              <div className="league-list">
                {leagues.map((l) => (
                  <button key={l.league_id} className="league-item" onClick={() => openLeagueBoard(l)}>
                    <span className="league-item-name">{l.name}</span>
                    <span className="league-item-meta">code {l.invite_code} · {l.member_count} members</span>
                  </button>
                ))}
              </div>
            )}

            {leagueBoard && (
              <div className="league-board">
                <div className="section-label" style={{ marginTop: 12 }}>
                  {leagueBoard.league.name} — SEASON STANDINGS
                </div>
                <table className="board-table">
                  <tbody>
                    {leagueBoard.rows.map((r) => (
                      <tr key={r.user_id} className={r.display_name === getDisplayName() ? "board-me" : ""}>
                        <td className="board-rank">{r.rank}</td>
                        <td>{r.display_name}</td>
                        <td className="muted small">{r.contests_played} played</td>
                        <td className="board-score">{r.total_score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  if (screen === "contestResult") {
    const r = contestResult;
    return (
      <div className="app">
        <header className="header"><div className="logo">TAPE//RUN</div></header>
        <main className="results">
          <h2>Contest run complete</h2>
          {r && r.entry ? (
            <div className="results-grid" style={{ marginBottom: 16 }}>
              <Stat label="Your score" value={r.entry.composite_score} highlight />
              <Stat label="Rank" value={`#${r.rank}`} />
            </div>
          ) : (
            <p className="muted">
              {savedName ? "Entry recorded." : "Practice run — set a display name on the Compete screen to post a scored entry."}
            </p>
          )}
          {r && r.already_entered && (
            <p className="muted small">You'd already posted a scored entry this week — this run was practice.</p>
          )}
          <div className="section-label" style={{ marginTop: 10 }}>LEADERBOARD</div>
          <table className="board-table">
            <tbody>
              {contestBoard.map((e) => (
                <tr key={e.user_id} className={e.display_name === savedName ? "board-me" : ""}>
                  <td className="board-rank">{e.rank}</td>
                  <td>{e.display_name}</td>
                  <td className="board-score">{e.composite_score}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="primary-btn" style={{ marginTop: 18 }} onClick={openCompete}>Back to Compete</button>
          <button className="menu-btn" style={{ marginLeft: 12 }} onClick={() => setScreen("menu")}>Menu</button>
        </main>
      </div>
    );
  }

  if (screen === "career" && career) {
    const fmtReq = (r) => {
      const cur = typeof r.current === "number" && r.current < 1 && r.key.startsWith("pct")
        ? `${Math.round(r.current * 100)}%` : r.current;
      const tgt = r.key.startsWith("pct") ? `${Math.round(r.target * 100)}%` : r.target;
      return `${cur} / ${tgt}`;
    };
    return (
      <div className="app">
        <header className="header">
          <div className="logo">TAPE//RUN</div>
          <button className="link-btn" onClick={() => setScreen("menu")}>← Menu</button>
        </header>
        <main className="howto">
          <div className="section-title">Career</div>
          <h2 style={{ margin: "4px 0 6px" }}>{career.name}</h2>
          <div className="mono muted" style={{ marginBottom: 18 }}>
            Level {career.level} of 7 · advancement is earned by skill and discipline, never profit
          </div>

          {career.next ? (
            <div className="career-next">
              <div className="section-label">To reach {career.next.name}</div>
              <ul className="req-list">
                {career.next.requirements.map((r, i) => (
                  <li key={i} className={r.met ? "req-met" : "req-unmet"}>
                    <span className="req-mark">{r.met ? "✓" : "○"}</span>
                    <span className="req-label">{r.label}</span>
                    <span className="req-val">{fmtReq(r)}</span>
                  </li>
                ))}
              </ul>
              <div className="muted" style={{ fontSize: 13, marginTop: 8 }}>
                Unlocks: {[...(career.next.unlocks.tools || []), ...(career.next.unlocks.markets || [])].join(", ") || "—"}
              </div>
            </div>
          ) : (
            <div className="career-next">You've reached the top career level. 🏆</div>
          )}

          <h3 className="section-label" style={{ marginTop: 22 }}>Markets unlocked</h3>
          <div className="market-chips">
            {["stocks", "crypto", "forex", "indices", "commodities"].map((m) => (
              <span key={m} className={`market-chip ${career.unlocked_markets.includes(m) ? "on" : "off"}`}>
                {career.unlocked_markets.includes(m) ? "✓" : "🔒"} {m}
              </span>
            ))}
          </div>

          <h3 className="section-label" style={{ marginTop: 22 }}>The path</h3>
          <ol className="career-ladder">
            {career.all_levels.map((l) => (
              <li key={l.level} className={l.level === career.level ? "current" : l.level < career.level ? "done" : ""}>
                <span className="ladder-name">{l.name}</span>
                <span className="muted ladder-unlocks">
                  {[...(l.unlocks.tools || []), ...(l.unlocks.markets || [])].slice(-3).join(", ")}
                </span>
              </li>
            ))}
          </ol>
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


  if (screen === "replay" && replayData) {
    const sev = { good: "rule-ok", warn: "rule-bad", info: "rule-pending" };
    return (
      <div className="app">
        <header className="header">
          <div className="logo">TAPE//RUN</div>
          <button className="link-btn" onClick={() => setScreen("results")}>← Results</button>
        </header>
        <main className="results" style={{ maxWidth: 1100 }}>
          <h2>Session review</h2>

          <ReplayChart bars={allBars} markers={replayData.markers} trades={replayData.trades} structure={replayData.structure} />

          {replayData.coach && replayData.coach.length > 0 && (
            <div className="coach-panel">
              <div className="section-label">Coach</div>
              {replayData.coach.map((f, i) => (
                <div key={i} className="coach-finding">
                  <span className={`rule-chip ${sev[f.severity] || "rule-pending"}`}>
                    {f.severity.toUpperCase()}
                  </span>
                  <span className="coach-text">{f.text}</span>
                  <button className="link-btn coach-lesson" onClick={() => setScreen("learn")}>
                    Lesson →
                  </button>
                </div>
              ))}

              {replayData.llm_coach_enabled && (
                <div className="llm-coach">
                  {!llmCoach ? (
                    <button className="menu-btn" onClick={getLlmTake}>Get the AI coach's take</button>
                  ) : llmCoach.loading ? (
                    <div className="muted">The coach is reviewing your session…</div>
                  ) : (
                    <div className="llm-coach-text">{llmCoach.text}</div>
                  )}
                </div>
              )}
            </div>
          )}

          {replayData.equity_curve && replayData.equity_curve.length > 1 && (
            <EquitySparkline curve={replayData.equity_curve} start={replayData.starting_balance} />
          )}

          <div className="pm-section">
            <h3 className="section-label">Trade by trade</h3>
            {replayData.setup_grades && replayData.setup_grades.total > 0 && (
              <div className="setup-summary">
                Setup quality:
                {["A", "B", "C"].map((g) => (
                  <span key={g} className={`setup-badge grade-${g}`}>
                    {g} × {replayData.setup_grades[g]}
                  </span>
                ))}
                <span className="setup-hint">graded on trend · location · reward-for-risk · defined risk</span>
              </div>
            )}
            <div style={{ overflowX: "auto" }}>
              <table className="pm-table replay-table">
                <thead>
                  <tr>
                    <th>Dir</th><th>Setup</th><th>Size</th><th>Entry</th><th>Exit</th>
                    <th>Planned R</th><th>Achieved R</th><th>MFE</th><th>MAE</th><th>Reason</th><th>P&amp;L</th>
                  </tr>
                </thead>
                <tbody>
                  {replayData.trades.map((t, i) => (
                    <tr key={i}>
                      <td className={`pos-${t.direction}`}>{t.direction.toUpperCase()}</td>
                      <td>
                        {t.setup ? (
                          <span
                            className={`setup-badge grade-${t.setup.grade}`}
                            title={(t.setup.factors || [])
                              .map((f) => `${f.delta > 0 ? "+" : ""}${f.delta} ${f.note}`)
                              .join("\n")}
                          >
                            {t.setup.grade}
                          </span>
                        ) : "—"}
                      </td>
                      <td>{t.size}</td>
                      <td>{t.entry_price?.toFixed(2)}</td>
                      <td>{t.exit_price?.toFixed(2)}</td>
                      <td>{t.planned_r != null ? `${t.planned_r}R` : "—"}</td>
                      <td className={t.achieved_r >= 0 ? "pnl-pos" : "pnl-neg"}>
                        {t.achieved_r != null ? `${t.achieved_r}R` : "—"}
                      </td>
                      <td>{t.mfe_r != null ? `${t.mfe_r}R` : t.mfe}</td>
                      <td>{t.mae_r != null ? `${t.mae_r}R` : t.mae}</td>
                      <td>{(t.exit_reason || "").replace("_", " ")}</td>
                      <td className={t.pnl >= 0 ? "pnl-pos" : "pnl-neg"}>{t.pnl.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <button className="primary-btn" onClick={() => setScreen("select")}>Run another scenario</button>
          <button className="menu-btn" onClick={() => setScreen("menu")} style={{ marginLeft: 12 }}>Back to menu</button>
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
        {fmUnlocked && (
          <div className="fm-bar">
            <label className="fm-toggle">
              <input
                type="checkbox"
                checked={fundManager}
                onChange={(e) => setFundManager(e.target.checked)}
              />
              <span className="fm-toggle-label">Fund Manager mode</span>
            </label>
            <span className="fm-note">
              {fundManager
                ? "Client money: every trade needs a stop, max 1% risk each, an 8% drawdown ends the mandate."
                : "Trade client money under strict risk limits."}
            </span>
          </div>
        )}
        <main className="scenario-grid">
          {scenarios.length === 0 && <p className="muted">Loading scenarios…</p>}
          {scenarios.map((s) => {
            const locked = s.market_unlocked === false;
            return (
              <button
                key={s.id}
                className={`scenario-card${locked ? " locked" : ""}${fundManager && !locked ? " fm" : ""}`}
                onClick={() => !locked && handleSelectScenario(s.id, false, fundManager ? "fund_manager" : "standard")}
                disabled={loading || locked}
                title={locked ? "Reach a higher career level to unlock this market" : undefined}
              >
                <div className="scenario-tier">
                  {locked ? "🔒 LOCKED" : `TIER ${s.difficulty_tier}`}
                </div>
                <div className="scenario-meta">{s.asset_class.toUpperCase()} · {s.timeframe}</div>
                <div className="scenario-bars">
                  {locked ? "Unlocks with career progress" : `${s.bar_count} bars`}
                </div>
                {!locked && scenarioBadge(s.tags) && (
                  <div className={scenarioBadge(s.tags).cls}>{scenarioBadge(s.tags).label}</div>
                )}
                {fundManager && !locked && <div className="scenario-fm-tag">FUND MANAGER</div>}
              </button>
            );
          })}
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

          <ScamDebrief debrief={scamDebrief} />

          <button className="primary-btn" onClick={() => setScreen("select")} style={{ marginTop: 20 }}>
            Try again
          </button>
          <button className="menu-btn" onClick={openReplay} style={{ marginLeft: 12 }}>
            Review session
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
          <ScamDebrief debrief={scamDebrief} />
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
          <button className="menu-btn" onClick={openReplay} style={{ marginLeft: 12 }}>
            Review session
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

      {session?.mode === "fund_manager" && (
        <div className="fm-banner">
          FUND MANAGER · client money — stop required, max 1% risk/trade, 8% drawdown ends the mandate
        </div>
      )}

      {marginCall && (
        <div className="margin-call-banner">
          ⚠ MARGIN CALL — equity is close to the maintenance level. Reduce risk or
          you'll be liquidated.
        </div>
      )}

      {concentrated && (
        <div className="concentration-banner">
          ⚠ CONCENTRATED — one position holds most of your risk. Spread it out to
          protect the book.
        </div>
      )}

      {voices.length > 0 && (
        <div className="decision-voices">
          <div className="dv-tag">IN YOUR HEAD</div>
          {voices.map((v, i) => (
            <div key={i} className={`voice voice-${v.stance}`}>
              <span className="voice-who">{v.name} · {v.role}</span>
              <span className="voice-line">"{v.line}"</span>
            </div>
          ))}
        </div>
      )}

      {latestEvent && (
        <div className="news-feed">
          <div className="news-latest">
            <span className="news-badge">BREAKING</span>
            <span className={`news-headline sent-${latestEvent.sentiment}`}>
              {latestEvent.headline}
            </span>
          </div>
          {latestEvent.detail && <div className="news-detail">{latestEvent.detail}</div>}
          {latestEvent.voices && latestEvent.voices.length > 0 && (
            <div className="voices">
              {latestEvent.voices.map((v, i) => (
                <div key={i} className={`voice voice-${v.stance}`}>
                  <span className="voice-who">{v.name} · {v.role}</span>
                  <span className="voice-line">"{v.line}"</span>
                </div>
              ))}
            </div>
          )}
          {revealedEvents.length > 1 && (
            <div className="news-history">
              {revealedEvents.slice(0, -1).reverse().map((e, i) => (
                <div key={i} className="news-item">
                  <span className={`sent-dot sent-${e.sentiment}`} />
                  <span className="news-cat">{e.category.replace(/_/g, " ")}</span>
                  {e.headline}
                </div>
              ))}
            </div>
          )}
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
          {timeframes.length > 1 && (
            <div className="tf-group" title="Chart timeframe">
              {timeframes.map((tf) => (
                <button
                  key={tf}
                  className={chartTf === tf ? "tf-btn active" : "tf-btn"}
                  onClick={() => setChartTf(tf)}
                >
                  {tf}
                </button>
              ))}
            </div>
          )}
          {currentSession && (
            <div className="session-chip" title="Current trading session">
              <span className="session-dot" /> {currentSession}
            </div>
          )}
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
          <button className="end-btn" onClick={contestMode
            ? async () => { if (!endedRef.current) { endedRef.current = true; setPlaying(false); await finishContest(); } }
            : handleEndSession}>
            {contestMode ? "Submit run" : "End session"}
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

function ScamDebrief({ debrief }) {
  if (!debrief || !debrief.is_scam) return null;
  const verdict = debrief.verdict;
  const head = verdict === "took_bait"
    ? { cls: "bad", title: "You took the bait", lede: "You held a long position straight into the rug. That's exactly how a pump-and-dump catches people — the hype peaks right as the smart money is selling to you." }
    : verdict === "got_out"
    ? { cls: "ok", title: "You played the hype and got out", lede: "You were exposed during the pump but exited before the collapse. That works until it doesn't — the rug can come without warning, so recognising the setup and staying out is the durable skill." }
    : { cls: "good", title: "You didn't take the bait", lede: "You stayed out of the pump-and-dump. That is the whole lesson — the reliable edge against a scam is not trading it." };
  return (
    <div className={`scam-debrief scam-${head.cls}`}>
      <div className="scam-title">{head.title}</div>
      <p className="scam-lede">{head.lede}</p>
      <div className="section-label">How to recognise the next one</div>
      <ul className="scam-anatomy">
        {(debrief.anatomy || []).map((a, i) => <li key={i}>{a}</li>)}
      </ul>
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
