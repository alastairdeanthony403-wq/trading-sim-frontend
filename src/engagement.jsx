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

      <MilestoneUnlocks items={feedback?.milestones_unlocked} />

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


/* ── milestones ────────────────────────────────────────────────────────────
   The gallery states every milestone's real criteria, locked or not. There are
   deliberately no "???" cards, no teasers and no mystery unlocks — a learner
   can always read exactly what a milestone asks for and how far in they are.
   Progress is shown for every entry because every criterion is a bounded,
   reachable count or percentage.                                            */

const CATEGORY_ORDER = ["discipline", "craft", "learning", "consistency"];
const CATEGORY_LABELS = {
  discipline: "Discipline",
  craft: "Craft",
  learning: "Learning",
  consistency: "Consistency",
};

const fmtMetric = (value, isPercent) => {
  if (value == null) return "0";
  if (isPercent) return `${Math.round(value * 100)}%`;
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
};

export function MilestoneCard({ item }) {
  const pct = item.target > 0
    ? Math.min(((item.current || 0) / item.target) * 100, 100) : 0;
  return (
    <div className={`milestone-card${item.unlocked ? " unlocked" : ""}`}>
      <div className="milestone-head">
        <span className="milestone-name">{item.name}</span>
        {item.unlocked && <span className="milestone-tick">✓</span>}
      </div>
      <div className="milestone-desc">{item.description}</div>
      <div className="milestone-criteria">{item.criteria}</div>
      {!item.unlocked && (
        <>
          <div className="milestone-bar">
            <div className="milestone-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="milestone-progress">
            {fmtMetric(item.current, item.is_percent)} of{" "}
            {fmtMetric(item.target, item.is_percent)} · {item.metric_label}
          </div>
        </>
      )}
    </div>
  );
}

export function MilestoneGallery({ data }) {
  if (!data) return <div className="muted">Loading milestones…</div>;
  const cats = CATEGORY_ORDER.filter((c) => (data.categories?.[c] || []).length);
  return (
    <div className="milestone-gallery">
      <div className="milestone-count">
        {data.unlocked_count} of {data.total_count} unlocked
      </div>
      {cats.map((cat) => (
        <div key={cat} className="milestone-group">
          <div className="section-label">{CATEGORY_LABELS[cat] || cat}</div>
          <div className="milestone-grid">
            {data.categories[cat].map((m) => (
              <MilestoneCard key={m.code} item={m} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Unlocks earned by the action just completed. Rarer than XP, so it gets more
 *  than a toast — but it still never blocks, and it never nags. */
export function MilestoneUnlocks({ items }) {
  if (!items || !items.length) return null;
  return (
    <div className="milestone-unlocks">
      <div className="section-label">
        {items.length === 1 ? "Milestone unlocked" : `${items.length} milestones unlocked`}
      </div>
      {items.map((m) => (
        <div key={m.code} className="milestone-unlock-row">
          <span className="milestone-unlock-name">{m.name}</span>
          <span className="milestone-unlock-criteria">{m.criteria}</span>
        </div>
      ))}
    </div>
  );
}


/* ── consistency ───────────────────────────────────────────────────────────
   The streak, rendered the way Phase 4 defines it: weekly, display-only, and
   never phrased around what a miss would cost. Everything here states what HAS
   happened — there is no countdown, no days-remaining and no "don't lose it".
   Rest days are reported AFTER they were spent, as a fact, not dangled
   beforehand as something to protect.                                       */

export function StreakCard({ streak }) {
  if (!streak) return null;
  const {
    current_count: count, best_count: best, label, best_label,
    active_days_this_period: active, target_days: target, period_met: met,
    freezes_available: rest, freezes_used: used = [],
  } = streak;

  const pct = target > 0 ? Math.min((active / target) * 100, 100) : 0;
  const lastRest = used.length ? used[used.length - 1] : null;

  return (
    <div className="streak-card">
      <div className="goal-head">
        <div className="section-label">Consistency</div>
        {best > 0 && <div className="streak-best">best {best}</div>}
      </div>

      <div className="streak-count">{count}</div>
      <div className="streak-label">{label}</div>

      <div className="goal-bar" style={{ marginTop: 14 }}>
        <div className={`goal-fill${met ? " met" : ""}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="streak-progress">{active} of {target} active days this week</div>

      {best_label && <div className="streak-best-line">{best_label}</div>}

      <div className="streak-rest">
        {rest} rest day{rest === 1 ? "" : "s"} in hand
        {lastRest ? ` · one covered ${lastRest.period}` : ""}
      </div>
    </div>
  );
}
