import { useState, useEffect } from "react";
import { LESSONS } from "./lessons";
import { CHECKS } from "./checks";
import { getUserId } from "./user";
import { markComplete } from "./api";
import Diagram from "./Diagrams";
import { BuildCandle, MarkChart, Compare } from "./exercises";
import { Gloss } from "./glossary";

// Step types that are graded (counted toward a perfect lesson).
const GRADABLE = new Set(["question", "build_candle", "mark_chart", "compare"]);
import { loadXp, migrateLegacyXp, EMPTY_XP } from "./xp";
import { XpToast, useReducedMotion } from "./engagement";

const UNIT_ICONS = { 1: "⚙", 2: "📊", 3: "🧭", 4: "🛡", 5: "🧠", 6: "💰" };

function itemTitle(item) {
  if (item.type === "lesson") return LESSONS[item.id]?.title || item.id;
  return CHECKS[item.id]?.title || item.id;
}

// Concept tags from the backend academy registry → learner-facing names.
const CONCEPT_LABELS = {
  support_resistance: "support & resistance",
  trend_following: "trend following",
  liquidity_sweeps: "liquidity & sweeps",
  risk_stops: "risk & stops",
  volatility_news: "volatility",
  discipline: "discipline",
};
const conceptLabel = (c) => CONCEPT_LABELS[c] || (c || "").replace(/_/g, " ");

export default function Learn({ progressData, onExit, onProgressUpdate,
                                onScenarioCheck, scenarioOutcome, onScenarioConsumed,
                                spotDue, onSpotCheck }) {
  const [view, setView] = useState("path");
  const [activeItem, setActiveItem] = useState(null);
  const [xpState, setXpState] = useState(EMPTY_XP);
  const [xpAward, setXpAward] = useState(null);   // the confirmation beat
  const reducedMotion = useReducedMotion();

  const refreshXp = async () => {
    const next = await loadXp(getUserId());
    setXpState(next);
    return next;
  };

  // XP moved to the server; anything left in this browser is imported once.
  useEffect(() => {
    let alive = true;
    (async () => {
      await migrateLegacyXp(getUserId());
      const next = await loadXp(getUserId());
      if (alive) setXpState(next);
    })();
    return () => { alive = false; };
  }, []);

  // A spot-check result belongs to the path view, not to a unit check.
  const spotOutcome = scenarioOutcome && scenarioOutcome.spot ? scenarioOutcome : null;

  // Returning from a unit scenario-check run: re-open that check at its result.
  useEffect(() => {
    if (!scenarioOutcome || scenarioOutcome.spot) return;
    const item = (progressData?.ordered_path || [])
      .find((i) => i.type === "check" && i.id === scenarioOutcome.check_id);
    if (item) { setActiveItem(item); setView("player"); }
  }, [scenarioOutcome]);   // eslint-disable-line react-hooks/exhaustive-deps

  // A spot check always lands back on the path so its result is visible there.
  useEffect(() => {
    if (spotOutcome) { setView("path"); setActiveItem(null); }
  }, [spotOutcome]);

  if (!progressData) {
    return (
      <div className="app">
        <header className="header"><div className="logo">TAPE//RUN</div></header>
        <main className="howto"><p className="muted">Loading your path…</p></main>
      </div>
    );
  }

  const completed = new Set(progressData.completed_lessons || []);
  const path = progressData.ordered_path || [];
  const nextItem = progressData.next_item;


  const startItem = (item) => {
    setActiveItem(item);
    setView("player");
  };

  // Bank the item server-side and report back what it actually paid, so the
  // summary shows the real award rather than a locally invented number.
  const bankItem = async () => {
    const before = xpState.career_level;
    const res = await markComplete(getUserId(), activeItem.id);
    onProgressUpdate(res);
    if (res.feedback?.xp_awarded > 0) setXpAward(res.feedback);
    const next = await refreshXp();
    return {
      xp: res.xp_awarded || 0,
      leveledUp: next.career_level > before,
      levelName: next.career_level_name,
    };
  };

  const closePlayer = () => {
    setView("path");
    setActiveItem(null);
  };

  if (view === "player" && activeItem) {
    if (activeItem.type === "lesson") {
      return (
        <LessonPlayer
          lesson={LESSONS[activeItem.id]}
          onBank={bankItem}
          onComplete={closePlayer}
          onQuit={closePlayer}
        />
      );
    }
    return (
      <KnowledgeCheck
        check={CHECKS[activeItem.id]}
        checkId={activeItem.id}
        onBank={bankItem}
        onComplete={closePlayer}
        onQuit={() => { onScenarioConsumed?.(); closePlayer(); }}
        onScenarioCheck={onScenarioCheck}
        scenarioResult={scenarioOutcome && scenarioOutcome.check_id === activeItem.id ? scenarioOutcome : null}
        onScenarioConsumed={onScenarioConsumed}
      />
    );
  }

  const totalItems = path.length;
  const doneCount = path.filter((i) => completed.has(i.id)).length;

  const units = {};
  for (const item of path) {
    if (!units[item.unit]) units[item.unit] = [];
    units[item.unit].push(item);
  }
  const unitMeta = {};
  for (const u of progressData.curriculum || []) {
    unitMeta[u.unit] = u.title;
  }

  return (
    <div className="app">
      <header className="header">
        <div className="logo">TAPE//RUN</div>
        <button className="link-btn" onClick={onExit}>← Career</button>
      </header>
      <main className="learn">
        <XpToast award={xpAward} reducedMotion={reducedMotion} />
        <div className="rank-card">
          <div className="rank-left">
            <div className="rank-badge">LVL {xpState.career_level}</div>
            <div>
              <div className="rank-name">{xpState.career_level_name}</div>
              <div className="rank-xp">
                {xpState.total_xp} XP
                {xpState.next_level_name ? ` · next: ${xpState.next_level_name}` : " · TOP TIER"}
              </div>
            </div>
          </div>
          <div className="xp-bar">
            <div className="xp-fill"
                 style={{ width: `${Math.min((xpState.career_progress || 0) * 100, 100)}%` }} />
          </div>
        </div>

        <div className="learn-header">
          <h2>Learn to trade</h2>
          <div className="learn-progress-summary">{doneCount} / {totalItems} COMPLETE</div>
        </div>

        {spotOutcome && (
          <div className={`spot-result ${spotOutcome.passed ? "pass" : "fail"}`}>
            <div className="spot-result-head">
              {spotOutcome.passed ? "✓ SPOT CHECK PASSED" : "✕ SPOT CHECK FAILED"}
            </div>
            <div className="spot-result-rules">
              {(spotOutcome.results || []).map((r, i) => (
                <span key={i} className={`rule-chip ${r.passed ? "rule-ok" : "rule-bad"}`}>
                  {r.passed ? "✓" : "✕"} {r.label}
                </span>
              ))}
            </div>
            <div className="spot-result-actions">
              {!spotOutcome.passed && spotDue && (
                <button className="primary-btn" onClick={() => { onScenarioConsumed?.(); onSpotCheck?.(); }}>
                  Try a fresh market
                </button>
              )}
              <button className="link-btn" onClick={() => onScenarioConsumed?.()}>Dismiss</button>
            </div>
          </div>
        )}

        {spotDue && !spotOutcome && (
          <div className="spot-banner">
            <div className="spot-banner-text">
              <span className="spot-tag">⚡ SPOT CHECK</span>
              Surprise market test on <b>{conceptLabel(spotDue.concept)}</b> — from
              {" "}Unit {spotDue.unit}: {spotDue.unit_title}. No warning in the real
              market either.
            </div>
            <button className="spot-btn" onClick={onSpotCheck}>Take it now</button>
          </div>
        )}

        {nextItem && (
          <button className="continue-btn" onClick={() => startItem(nextItem)}>
            {doneCount === 0 ? "▶ START LEARNING" : "▶ CONTINUE"} — {itemTitle(nextItem)}
          </button>
        )}
        {!nextItem && (
          <div className="learn-done-banner">🏆 Full curriculum complete. Replay anything to sharpen up — XP still counts.</div>
        )}

        {Object.keys(units).map((unitNum) => {
          const items = units[unitNum];
          const unitDone = items.filter((i) => completed.has(i.id)).length;
          const unitComplete = unitDone === items.length;
          return (
            <div key={unitNum} className={unitComplete ? "learn-unit unit-complete" : "learn-unit"}>
              <div className="learn-unit-title">
                <span><span className="unit-icon">{UNIT_ICONS[unitNum] || "•"}</span> Unit {unitNum} — {unitMeta[unitNum]}</span>
                <span className="unit-count">{unitComplete ? "★ COMPLETE" : `${unitDone}/${items.length}`}</span>
              </div>
              <div className="learn-items">
                {items.map((item) => {
                  const isDone = completed.has(item.id);
                  const isNext = nextItem && nextItem.id === item.id;
                  const isLocked = !isDone && !isNext;
                  let cls = "learn-item";
                  if (isDone) cls += " done";
                  if (isNext) cls += " current";
                  if (isLocked) cls += " locked";
                  return (
                    <button
                      key={item.id}
                      className={cls}
                      onClick={() => { if (!isLocked) startItem(item); }}
                      disabled={isLocked}
                    >
                      <span className="learn-item-icon">
                        {isDone ? "✓" : item.type === "check" ? "★" : "▸"}
                      </span>
                      <span className="learn-item-label">
                        {itemTitle(item)}
                        {item.type === "check" && <span className="learn-item-tag">CHECK</span>}
                      </span>
                      {isNext && <span className="learn-item-here">YOU'RE HERE</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}

// ---------- Streak display ----------

function StreakBadge({ streak }) {
  if (streak < 3) return null;
  return <div className="streak-badge">🔥 STREAK ×{streak}</div>;
}

// ---------- Lesson player ----------

function LessonPlayer({ lesson, onBank, onComplete, onQuit }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [answer, setAnswer] = useState(null);
  const [streak, setStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [summary, setSummary] = useState(null);
  const [flash, setFlash] = useState(null);
  const [solved, setSolved] = useState(false);   // interactive exercise submitted

  const step = lesson.steps[stepIndex];
  const isLastStep = stepIndex === lesson.steps.length - 1;
  const totalGradable = lesson.steps.filter((s) => GRADABLE.has(s.type)).length;

  const finish = async () => {
    const perfect = totalGradable > 0 && correctCount === totalGradable;
    const banked = await onBank();          // the server decides what it paid
    setSummary({ ...banked, perfect });
  };

  const next = () => {
    if (isLastStep) {
      finish();
    } else {
      setStepIndex((i) => i + 1);
      setAnswer(null);
      setSolved(false);
    }
  };

  // Per-answer feedback. No XP number here: the server never sees individual
  // answers, so any figure shown mid-lesson would be invented locally. The real
  // award lands once, on completion.
  const grade = (correct) => {
    if (correct) {
      setStreak((n) => n + 1);
      setCorrectCount((c) => c + 1);
      setFlash("✓ Correct");
      setTimeout(() => setFlash(null), 900);
    } else {
      setStreak(0);
    }
  };

  const answerQ = (idx) => {
    if (answer != null) return;
    setAnswer(idx);
    grade(idx === step.correctIndex);
  };

  const solveExercise = (correct) => {
    grade(correct);
    setSolved(true);
  };

  if (summary) {
    return (
      <div className="app">
        <header className="header"><div className="logo">TAPE//RUN</div></header>
        <main className="lesson-player summary-screen">
          <div className="summary-emoji">{summary.perfect ? "💎" : "✅"}</div>
          <h2>{summary.perfect ? "Perfect lesson!" : "Lesson complete"}</h2>
          <p className="lesson-body">
            {correctCount} / {totalGradable} correct{summary.perfect ? " — flawless run, bonus earned." : "."}
          </p>
          <div className="xp-award">+{summary.xp} XP</div>
          {summary.leveledUp && (
            <div className="levelup-banner">⬆ CAREER LEVEL UP — you are now <strong>{summary.levelName}</strong></div>
          )}
          <button className="primary-btn" onClick={onComplete}>Continue</button>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="logo">TAPE//RUN</div>
        <div className="lesson-progress-bar">
          <div className="lesson-progress-fill" style={{ width: `${((stepIndex + 1) / lesson.steps.length) * 100}%` }} />
        </div>
        <div className="player-stats">
          <span className="player-correct">✓ {correctCount}</span>
          <StreakBadge streak={streak} />
        </div>
        <button className="link-btn" onClick={onQuit}>✕</button>
      </header>
      <main className="lesson-player">
        {flash && <div className="xp-flash">{flash}</div>}
        <h2>{lesson.title}</h2>

        {step.type === "teach" && (
          <>
            <p className="lesson-body"><Gloss>{step.text}</Gloss></p>
            {step.image && <Diagram id={step.image} />}
            <button className="primary-btn" onClick={next}>Continue</button>
          </>
        )}

        {step.type === "build_candle" && (
          <>
            <BuildCandle key={stepIndex} step={step} onResult={solveExercise} />
            {solved && (
              <button className="primary-btn" onClick={next}>
                {isLastStep ? "Finish lesson" : "Continue"}
              </button>
            )}
          </>
        )}

        {step.type === "mark_chart" && (
          <>
            <MarkChart key={stepIndex} step={step} onResult={solveExercise} />
            {solved && (
              <button className="primary-btn" onClick={next}>
                {isLastStep ? "Finish lesson" : "Continue"}
              </button>
            )}
          </>
        )}

        {step.type === "compare" && (
          <>
            <Compare key={stepIndex} step={step} onResult={solveExercise} />
            {solved && (
              <button className="primary-btn" onClick={next}>
                {isLastStep ? "Finish lesson" : "Continue"}
              </button>
            )}
          </>
        )}

        {step.type === "question" && (
          <>
            <p className="lesson-question"><Gloss>{step.prompt}</Gloss></p>
            {step.image && <Diagram id={step.image} />}
            <div className="lesson-options">
              {step.options.map((opt, idx) => {
                let cls = "lesson-option";
                if (answer != null) {
                  if (idx === step.correctIndex) cls += " correct";
                  else if (idx === answer) cls += " incorrect";
                }
                return (
                  <button key={idx} className={cls} onClick={() => answerQ(idx)}>{opt}</button>
                );
              })}
            </div>
            {answer != null && (
              <div className="lesson-feedback">
                <p className={answer === step.correctIndex ? "feedback-correct" : "feedback-incorrect"}>
                  {answer === step.correctIndex ? "Correct." : "Not quite."}
                </p>
                <p className="lesson-explanation"><Gloss>{step.explanation}</Gloss></p>
                <button className="primary-btn" onClick={next}>
                  {isLastStep ? "Finish lesson" : "Continue"}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// ---------- Knowledge check ----------

function KnowledgeCheck({ check, checkId, onBank, onComplete, onQuit, onScenarioCheck, scenarioResult, onScenarioConsumed }) {
  const [phase, setPhase] = useState(scenarioResult ? "scenario_result" : "questions");
  const [qIndex, setQIndex] = useState(0);
  const [answer, setAnswer] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [awarded, setAwarded] = useState(null);
  const [flash, setFlash] = useState(null);
  const [bonusBanked, setBonusBanked] = useState(false);

  const q = check.questions[qIndex];
  const isLast = qIndex === check.questions.length - 1;

  // Bank the unit check once, when the live demonstration is graded a pass.
  // The server awards it; this only records what came back so the screen can
  // show the real figure.
  useEffect(() => {
    if (phase === "scenario_result" && scenarioResult?.passed && !bonusBanked) {
      setBonusBanked(true);
      onBank().then(setAwarded);
    }
  }, [phase, scenarioResult, bonusBanked, onBank]);

  const answerQ = (idx) => {
    if (answer != null) return;
    setAnswer(idx);
    if (idx === q.correctIndex) {
      setStreak((n) => n + 1);
      setCorrectCount((c) => c + 1);
      setFlash("✓ Correct");
      setTimeout(() => setFlash(null), 900);
    } else {
      setStreak(0);
    }
  };

  const next = () => {
    if (!isLast) { setQIndex((i) => i + 1); setAnswer(null); return; }
    const questionsPassed = correctCount >= check.passMark;
    if (questionsPassed) {
      setPhase("scenario_gate");            // now demonstrate it live to clear the unit
    } else {
      setPhase("questions_failed");
    }
  };

  // ── Questions failed — retry the quiz ──
  if (phase === "questions_failed") {
    return (
      <div className="app">
        <header className="header"><div className="logo">TAPE//RUN</div></header>
        <main className="lesson-player summary-screen">
          <div className="summary-emoji">🔁</div>
          <h2>Almost there</h2>
          <p className="lesson-body">
            {correctCount} / {check.questions.length} correct. You need {check.passMark} to pass.
            Run it back whenever you're ready.
          </p>
          <button className="primary-btn" onClick={() => {
            setQIndex(0); setAnswer(null); setCorrectCount(0); setStreak(0);
            setAwarded(null); setPhase("questions");
          }}>Retry check</button>
        </main>
      </div>
    );
  }

  // ── Scenario gate — prove the concept in a live market ──
  if (phase === "scenario_gate") {
    return (
      <div className="app">
        <header className="header"><div className="logo">TAPE//RUN</div></header>
        <main className="lesson-player summary-screen">
          <div className="summary-emoji">🎯</div>
          <h2>Now prove it live</h2>
          <p className="lesson-body">
            Questions cleared. The last step is to demonstrate the concept in a live market —
            trade it with discipline. A fresh market is generated for every attempt.
          </p>
          {check.practice && (
            <div className="practice-directive">
              <div className="practice-label">YOUR TASK</div>
              <p>{check.practice}</p>
            </div>
          )}
          <button className="primary-btn" onClick={() => onScenarioCheck?.(checkId)}>Enter the simulator</button>
          <button className="link-btn" onClick={onQuit}>Do this later</button>
        </main>
      </div>
    );
  }

  // ── Scenario result — after the server graded the run ──
  if (phase === "scenario_result") {
    const passed = !!scenarioResult?.passed;
    return (
      <div className="app">
        <header className="header"><div className="logo">TAPE//RUN</div></header>
        <main className="lesson-player summary-screen">
          <div className="summary-emoji">{passed ? "🏆" : "🔁"}</div>
          <h2>{passed ? "Check cleared" : "Not cleared yet"}</h2>
          <p className="lesson-body">
            {passed
              ? "You demonstrated the concept with discipline — unit cleared."
              : "The market got the better of that run. Your read may be right; the execution has to hold up. Try a fresh market."}
          </p>
          {(scenarioResult?.results || []).length > 0 && (
            <div className="scenario-rules">
              {scenarioResult.results.map((r, i) => (
                <span key={i} className={`rule-chip ${r.passed ? "rule-ok" : "rule-bad"}`}>
                  {r.passed ? "✓" : "○"} {r.label}
                </span>
              ))}
            </div>
          )}
          {passed && awarded && <div className="xp-award">+{awarded.xp} XP</div>}
          {passed && awarded?.leveledUp && (
            <div className="levelup-banner">⬆ CAREER LEVEL UP — you are now <strong>{awarded.levelName}</strong></div>
          )}
          {passed ? (
            <button className="primary-btn" onClick={() => { onScenarioConsumed?.(); onComplete(); }}>Continue</button>
          ) : (
            <>
              <button className="primary-btn" onClick={() => { onScenarioConsumed?.(); onScenarioCheck?.(checkId); }}>Run a fresh market</button>
              <button className="link-btn" onClick={() => { onScenarioConsumed?.(); onQuit(); }}>Back to path</button>
            </>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="logo">TAPE//RUN</div>
        <div className="lesson-progress-bar">
          <div className="lesson-progress-fill" style={{ width: `${((qIndex + 1) / check.questions.length) * 100}%` }} />
        </div>
        <div className="player-stats">
          <span className="player-correct">✓ {correctCount}</span>
          <StreakBadge streak={streak} />
        </div>
        <button className="link-btn" onClick={onQuit}>✕</button>
      </header>
      <main className="lesson-player">
        {flash && <div className="xp-flash">{flash}</div>}
        <div className="check-badge">KNOWLEDGE CHECK</div>
        <h2>{check.title}</h2>
        <p className="lesson-question"><Gloss>{q.prompt}</Gloss></p>
        {q.image && <Diagram id={q.image} />}
        <div className="lesson-options">
          {q.options.map((opt, idx) => {
            let cls = "lesson-option";
            if (answer != null) {
              if (idx === q.correctIndex) cls += " correct";
              else if (idx === answer) cls += " incorrect";
            }
            return <button key={idx} className={cls} onClick={() => answerQ(idx)}>{opt}</button>;
          })}
        </div>
        {answer != null && (
          <div className="lesson-feedback">
            <p className={answer === q.correctIndex ? "feedback-correct" : "feedback-incorrect"}>
              {answer === q.correctIndex ? "Correct." : "Not quite."}
            </p>
            <p className="lesson-explanation"><Gloss>{q.explanation}</Gloss></p>
            <button className="primary-btn" onClick={next}>
              {isLast ? "See result" : "Next question"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
