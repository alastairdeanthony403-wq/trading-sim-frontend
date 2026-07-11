import { useState } from "react";
import { LESSONS } from "./lessons";
import { CHECKS } from "./checks";
import { getUserId } from "./user";
import { markComplete } from "./api";

// Titles for path items so the map reads nicely
function itemTitle(item) {
  if (item.type === "lesson") return LESSONS[item.id]?.title || item.id;
  return CHECKS[item.id]?.title || item.id;
}

export default function Learn({ progressData, onExit, onProgressUpdate }) {
  const [view, setView] = useState("path"); // path | player
  const [activeItem, setActiveItem] = useState(null);

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

  const handleItemComplete = async () => {
    const res = await markComplete(getUserId(), activeItem.id);
    onProgressUpdate(res); // refresh completed_lessons + next_item in parent
    setView("path");
    setActiveItem(null);
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

  // ---- PATH VIEW ----
  const totalItems = path.length;
  const doneCount = path.filter((i) => completed.has(i.id)).length;

  // group path by unit for display
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
        <div className="learn-header">
          <h2>Learn to trade</h2>
          <div className="learn-progress-summary">
            {doneCount} / {totalItems} complete
          </div>
        </div>

        {nextItem && (
          <button className="continue-btn" onClick={() => startItem(nextItem)}>
            {doneCount === 0 ? "Start learning" : "Continue"} → {itemTitle(nextItem)}
          </button>
        )}
        {!nextItem && (
          <div className="learn-done-banner">You've completed the whole path. Nice work.</div>
        )}

        {Object.keys(units).map((unitNum) => {
          const items = units[unitNum];
          return (
            <div key={unitNum} className="learn-unit">
              <div className="learn-unit-title">
                Unit {unitNum} — {unitMeta[unitNum]}
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
                        {isDone ? "✓" : item.type === "check" ? "★" : "•"}
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

// ---------- Lesson player (teach + question steps) ----------

function LessonPlayer({ lesson, onComplete, onQuit }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [answer, setAnswer] = useState(null);

  const step = lesson.steps[stepIndex];
  const isLastStep = stepIndex === lesson.steps.length - 1;

  const next = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setStepIndex((i) => i + 1);
      setAnswer(null);
    }
  };

  const answerQ = (idx) => {
    if (answer != null) return;
    setAnswer(idx);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="logo">TAPE//RUN</div>
        <div className="lesson-progress-bar">
          <div className="lesson-progress-fill" style={{ width: `${((stepIndex + 1) / lesson.steps.length) * 100}%` }} />
        </div>
        <button className="link-btn" onClick={onQuit}>✕</button>
      </header>
      <main className="lesson-player">
        <h2>{lesson.title}</h2>

        {step.type === "teach" && (
          <>
            <p className="lesson-body">{step.text}</p>
            <button className="primary-btn" onClick={next}>Continue</button>
          </>
        )}

        {step.type === "question" && (
          <>
            <p className="lesson-question">{step.prompt}</p>
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
                <p className="lesson-explanation">{step.explanation}</p>
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

// ---------- Knowledge check (all questions, needs pass mark) ----------

function KnowledgeCheck({ check, onComplete, onQuit }) {
  const [qIndex, setQIndex] = useState(0);
  const [answer, setAnswer] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);

  const q = check.questions[qIndex];
  const isLast = qIndex === check.questions.length - 1;

  const answerQ = (idx) => {
    if (answer != null) return;
    setAnswer(idx);
    if (idx === q.correctIndex) setCorrectCount((c) => c + 1);
  };

  const next = () => {
    if (isLast) {
      setFinished(true);
    } else {
      setQIndex((i) => i + 1);
      setAnswer(null);
    }
  };

  if (finished) {
    const passed = correctCount >= check.passMark;
    return (
      <div className="app">
        <header className="header"><div className="logo">TAPE//RUN</div></header>
        <main className="lesson-player">
          <h2>{passed ? "Check passed" : "Almost there"}</h2>
          <p className="lesson-body">
            {correctCount} / {check.questions.length} correct.
            {passed ? " You've cleared this unit." : ` You need ${check.passMark} to pass — give it another go.`}
          </p>
          {passed && check.practice && (
            <div className="practice-directive">
              <div className="practice-label">PRACTICE IN THE SIMULATOR</div>
              <p>{check.practice}</p>
            </div>
          )}
          {passed ? (
            <button className="primary-btn" onClick={onComplete}>Continue</button>
          ) : (
            <button className="primary-btn" onClick={() => {
              setQIndex(0); setAnswer(null); setCorrectCount(0); setFinished(false);
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
        <button className="link-btn" onClick={onQuit}>✕</button>
      </header>
      <main className="lesson-player">
        <div className="check-badge">KNOWLEDGE CHECK</div>
        <h2>{check.title}</h2>
        <p className="lesson-question">{q.prompt}</p>
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
            <p className="lesson-explanation">{q.explanation}</p>
            <button className="primary-btn" onClick={next}>
              {isLast ? "See result" : "Next question"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
