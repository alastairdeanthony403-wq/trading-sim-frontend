// Phase 2 — the loop's surfaces: goal, immediate feedback, next goal, summary.
//
// Three rules are baked into these components, not left to the caller:
//
//  * Motion is opt-out-able. Every animation checks prefers-reduced-motion (and
//    the learner's explicit override) and degrades to a static render. Nothing
//    here plays sound; that stays off until a learner turns it on in Phase 5.
//  * The confirmation is SHORT — 600ms, the budget in the phase spec — and it
//    never blocks. It cannot be clicked through because it isn't in the way.
//  * The session summary's primary action is leaving. "Run another" is still
//    there, one step down, because the learner may genuinely want it — but the
//    default, the button their thumb lands on, is a clean stop.

import { useState, useEffect, useRef } from "react";

const CONFIRM_MS = 600;

/** prefers-reduced-motion, with the learner's explicit setting winning if set. */
export function useReducedMotion(override) {
  const [system, setSystem] = useState(
    () => typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const onChange = (e) => setSystem(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return override == null ? system : override;
}

/** The reward beat. Renders once per award, gets out of the way on its own. */
export function XpToast({ award, reducedMotion }) {
  const [shown, setShown] = useState(null);
  const timer = useRef(null);

  useEffect(() => {
    if (!award || !award.xp_awarded) return;
    setShown(award);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setShown(null), CONFIRM_MS * 2);
    return () => clearTimeout(timer.current);
  }, [award]);

  if (!shown) return null;
  return (
    <div className={`xp-toast${reducedMotion ? " no-motion" : ""}`} role="status" aria-live="polite">
      <span className="xp-toast-amount">+{shown.xp_awarded} XP</span>
      {shown.goal_progress && (
        <span className="xp-toast-goal">{shown.goal_progress.label}</span>
      )}
    </div>
  );
}

/** Daily goal selector. Editable in any direction, at any time, with no friction. */
export function GoalCard({ profile, goal, onChange, saving }) {
  if (!profile) return null;
  const types = [
    { key: "lessons", label: "Lessons" },
    { key: "sessions", label: "Scenarios" },
    { key: "minutes", label: "Minutes" },
    { key: "xp", label: "XP" },
  ];
  const targets = profile.daily_goal_type === "minutes" ? [5, 10, 15, 30]
    : profile.daily_goal_type === "xp" ? [20, 50, 100, 200]
      : [1, 2, 3, 5];

  return (
    <div className="goal-card">
      <div className="goal-head">
        <div className="section-label">Today's goal</div>
        {goal && (
          <div className={`goal-state${goal.met ? " goal-met" : ""}`}>
            {goal.met ? "✓ done" : goal.label}
          </div>
        )}
      </div>

      {goal && (
        <div className="goal-bar">
          <div className="goal-fill"
               style={{ width: `${Math.min((goal.current / Math.max(goal.target, 1)) * 100, 100)}%` }} />
        </div>
      )}

      <div className="goal-controls">
        <div className="goal-row">
          {types.map((t) => (
            <button key={t.key} disabled={saving}
                    className={`goal-chip${profile.daily_goal_type === t.key ? " on" : ""}`}
                    onClick={() => onChange({ daily_goal_type: t.key })}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="goal-row">
          {targets.map((n) => (
            <button key={n} disabled={saving}
                    className={`goal-chip${profile.daily_goal_target === n ? " on" : ""}`}
                    onClick={() => onChange({ daily_goal_target: n })}>
              {n}
            </button>
          ))}
        </div>
      </div>
      <div className="goal-note">Change this whenever you like — up or down.</div>
    </div>
  );
}

/** The next concrete action, or a clean stop when the goal is already met. */
export function NextUp({ next, onGo, itemTitle }) {
  if (!next) return null;
  if (next.done_for_today) {
    return (
      <div className="nextup-card nextup-done">
        <div className="section-label">Next up</div>
        <div className="nextup-title">{next.label}</div>
      </div>
    );
  }
  const title = next.item_id ? (itemTitle?.(next.item_id) || next.label) : next.label;
  return (
    <div className="nextup-card">
      <div className="section-label">Next up</div>
      <div className="nextup-title">{title}</div>
      {onGo && <button className="primary-btn nextup-btn" onClick={() => onGo(next)}>Start</button>}
    </div>
  );
}

/** End-of-session card: what held, one thing to work on, where the XP came from. */
const SOURCE_LABELS = {
  scenario_complete: "Session finished",
  risk_discipline: "Risk process",
  plan_adherence: "Stuck to the plan",
  topic_check: "Knowledge check",
  lesson_complete: "Lesson",
};

export function SessionSummary({ engagement, onDone, onAnother, onReview }) {
  if (!engagement) return null;
  const { strengths = [], focus, xp_breakdown = [], xp_session_total = 0, feedback } = engagement;

  return (
    <div className="session-summary">
      <div className="summary-cols">
        <div className="summary-col">
          <div className="section-label">What held up</div>
          {strengths.length ? (
            <ul className="strength-list">
              {strengths.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          ) : <div className="muted">Nothing to log here yet.</div>}
        </div>

        <div className="summary-col">
          <div className="section-label">One thing to work on</div>
          {focus ? (
            <div className="focus-item">{focus.text}</div>
          ) : (
            <div className="focus-item focus-clean">
              Nothing to flag — that's the process to repeat.
            </div>
          )}
        </div>
      </div>

      {xp_breakdown.length > 0 && (
        <div className="xp-ledger">
          <div className="section-label">XP earned · {xp_session_total}</div>
          {xp_breakdown.map((e, i) => (
            <div key={i} className="xp-ledger-row">
              <span>{SOURCE_LABELS[e.source_type] || e.source_type}</span>
              <span className="xp-ledger-amount">+{e.amount}</span>
            </div>
          ))}
        </div>
      )}

      {feedback?.goal_progress && (
        <div className="summary-goal">
          {feedback.goal_progress.met
            ? "That's your goal for today."
            : feedback.goal_progress.label}
        </div>
      )}

      <div className="summary-actions">
        <button className="primary-btn" onClick={onDone}>Done for today</button>
        {onReview && <button className="menu-btn" onClick={onReview}>Review session</button>}
        {onAnother && <button className="link-btn" onClick={onAnother}>Run another scenario</button>}
      </div>
    </div>
  );
}
