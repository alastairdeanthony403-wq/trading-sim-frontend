import { useState } from "react";
import { LESSONS } from "./lessons";
import { CHECKS } from "./checks";
import { getUserId } from "./user";
import { markComplete } from "./api";
import Diagram from "./Diagrams";
import { BuildCandle, MarkChart, Compare } from "./exercises";
import { Gloss } from "./glossary";

// Step types that are graded (award XP, count toward a perfect lesson).
const GRADABLE = new Set(["question", "build_candle", "mark_chart", "compare"]);
import { getXp, addXp, levelFor, nextLevelFor, levelProgress, XP_RULES } from "./xp";

const UNIT_ICONS = { 1: "⚙", 2: "📊", 3: "🧭", 4: "🛡", 5: "🧠" };

function itemTitle(item) {
  if (item.type === "lesson") return LESSONS[item.id]?.title || item.id;
  return CHECKS[item.id]?.title || item.id;
}

export default function Learn({ progressData, onExit, onProgressUpdate }) {
  const [view, setView] = useState("path");
  const [activeItem, setActiveItem] = useState(null);
  const [, forceRefresh] = useState(0);

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

  const xp = getXp();
  const rank = levelFor(xp);
  const next = nextLevelFor(xp);
  const prog = levelProgress(xp);

  const startItem = (item) => {
    setActiveItem(item);
    setView("player");
  };

  const handleItemComplete = async () => {
    const res = await markComplete(getUserId(), activeItem.id);
    onProgressUpdate(res);
    setView("path");
    setActiveItem(null);
    forceRefresh((n) => n + 1); // re-read XP after a session
  };

  if (view === "player" && activeItem) {
    if (activeItem.type === "lesson") {
      return (
        <LessonPlayer
          lesson={LESSONS[activeItem.id]}
          onComplete={handleItemComplete}
          onQuit={() => { setView("path"); setActiveItem(null); }}
        />
      );
    }
    return (
      <KnowledgeCheck
        check={CHECKS[activeItem.id]}
        onComplete={handleItemComplete}
        onQuit={() => { setView("path"); setActiveItem(null); }}
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
        <button className="link-btn" onClick={onExit}>← Menu</button>
      </header>
      <main className="learn">
        <div className="rank-card">
          <div className="rank-left">
            <div className="rank-badge">LVL {rank.level}</div>
            <div>
              <div className="rank-name">{rank.name}</div>
              <div className="rank-xp">{xp} XP{next ? ` · ${next.xp - xp} to ${next.name}` : " · MAX RANK"}</div>
            </div>
          </div>
          <div className="xp-bar">
            <div className="xp-fill" style={{ width: `${Math.min(prog * 100, 100)}%` }} />
          </div>
        </div>

        <div className="learn-header">
          <h2>Learn to trade</h2>
          <div className="learn-progress-summary">{doneCount} / {totalItems} COMPLETE</div>
        </div>

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

function LessonPlayer({ lesson, onComplete, onQuit }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [answer, setAnswer] = useState(null);
  const [streak, setStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [sessionXp, setSessionXp] = useState(0);
  const [summary, setSummary] = useState(null);
  const [xpFlash, setXpFlash] = useState(null);
  const [solved, setSolved] = useState(false);   // interactive exercise submitted

  const step = lesson.steps[stepIndex];
  const isLastStep = stepIndex === lesson.steps.length - 1;
  const totalGradable = lesson.steps.filter((s) => GRADABLE.has(s.type)).length;

  const finish = () => {
    let earned = sessionXp;
    let perfect = false;
    if (totalGradable > 0 && correctCount === totalGradable) {
      earned += XP_RULES.perfectLesson;
      perfect = true;
    }
    const res = addXp(earned);
    setSummary({ earned, perfect, leveledUp: res.leveledUp, newRank: levelFor(res.after) });
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

  // Award XP for a graded step (multiple-choice or interactive exercise).
  const grade = (correct) => {
    if (correct) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      setCorrectCount((c) => c + 1);
      const gained = XP_RULES.lessonCorrect + (newStreak >= 3 ? XP_RULES.streakBonus : 0);
      setSessionXp((x) => x + gained);
      setXpFlash(`+${gained} XP`);
      setTimeout(() => setXpFlash(null), 900);
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
          <div className="xp-award">+{summary.earned} XP</div>
          {summary.leveledUp && (
            <div className="levelup-banner">⬆ RANK UP — you are now <strong>{summary.newRank.name}</strong></div>
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
        {xpFlash && <div className="xp-flash">{xpFlash}</div>}
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

function KnowledgeCheck({ check, onComplete, onQuit }) {
  const [qIndex, setQIndex] = useState(0);
  const [answer, setAnswer] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [sessionXp, setSessionXp] = useState(0);
  const [finished, setFinished] = useState(false);
  const [awarded, setAwarded] = useState(null);
  const [xpFlash, setXpFlash] = useState(null);

  const q = check.questions[qIndex];
  const isLast = qIndex === check.questions.length - 1;

  const answerQ = (idx) => {
    if (answer != null) return;
    setAnswer(idx);
    if (idx === q.correctIndex) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      setCorrectCount((c) => c + 1);
      const gained = XP_RULES.checkCorrect + (newStreak >= 3 ? XP_RULES.streakBonus : 0);
      setSessionXp((x) => x + gained);
      setXpFlash(`+${gained} XP`);
      setTimeout(() => setXpFlash(null), 900);
    } else {
      setStreak(0);
    }
  };

  const next = () => {
    if (isLast) {
      const passed = correctCount >= check.passMark;
      let earned = sessionXp + (passed ? XP_RULES.checkPassed : 0);
      const res = addXp(earned);
      setAwarded({ earned, passed, leveledUp: res.leveledUp, newRank: levelFor(res.after) });
      setFinished(true);
    } else {
      setQIndex((i) => i + 1);
      setAnswer(null);
    }
  };

  if (finished && awarded) {
    return (
      <div className="app">
        <header className="header"><div className="logo">TAPE//RUN</div></header>
        <main className="lesson-player summary-screen">
          <div className="summary-emoji">{awarded.passed ? "🏆" : "🔁"}</div>
          <h2>{awarded.passed ? "Check passed" : "Almost there"}</h2>
          <p className="lesson-body">
            {correctCount} / {check.questions.length} correct.
            {awarded.passed ? " Unit cleared — bonus banked." : ` You need ${check.passMark} to pass — the XP you earned still counts. Run it back.`}
          </p>
          <div className="xp-award">+{awarded.earned} XP</div>
          {awarded.leveledUp && (
            <div className="levelup-banner">⬆ RANK UP — you are now <strong>{awarded.newRank.name}</strong></div>
          )}
          {awarded.passed && check.practice && (
            <div className="practice-directive">
              <div className="practice-label">PRACTICE IN THE SIMULATOR</div>
              <p>{check.practice}</p>
            </div>
          )}
          {awarded.passed ? (
            <button className="primary-btn" onClick={onComplete}>Continue</button>
          ) : (
            <button className="primary-btn" onClick={() => {
              setQIndex(0); setAnswer(null); setCorrectCount(0); setStreak(0);
              setSessionXp(0); setFinished(false); setAwarded(null);
            }}>
              Retry check
            </button>
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
        {xpFlash && <div className="xp-flash">{xpFlash}</div>}
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
