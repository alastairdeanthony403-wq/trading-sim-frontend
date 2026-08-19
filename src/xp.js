// XP is server state (Phase 1). This module is a thin client over the ledger —
// it no longer computes, stores or awards anything.
//
// Two things changed and are worth knowing before you edit this file:
//
//  * XP used to live in localStorage, which meant a cache clear or a second
//    device wiped a learner's progress. It is now an append-only server ledger.
//  * There is ONE progression ladder: career level, derived server-side from
//    process metrics (see app/routes/progress.py). The old Recruit → Market
//    Wizard rank names are gone; career tier names are the only tier names.
//
// The per-question "+10 XP" ticks are gone too. The server never saw individual
// answers, so those numbers were invented locally; the award now arrives with
// the lesson-completion response and is the real, banked figure.

import { getXpState, importLegacyXp } from "./api";

const LEGACY_KEY = "tape_run_xp";

export const EMPTY_XP = {
  total_xp: 0,
  career_level: 1,
  career_level_name: "Market Rookie",
  next_level_name: null,
  career_progress: 0,
  requirements: [],
  today: null,
};

/** Fetch the learner's XP + career standing. Never throws — falls back to zero
 *  state so a dead backend degrades the badge, not the whole Learn screen. */
export async function loadXp(userId) {
  try {
    return await getXpState(userId);
  } catch {
    return EMPTY_XP;
  }
}

/** One-shot migration of XP that only ever existed in this browser.
 *  The server clamps the value and accepts it once per learner, ever; either
 *  way the local key is retired so this can't run again on this device. */
export async function migrateLegacyXp(userId) {
  const stored = localStorage.getItem(LEGACY_KEY);
  if (stored === null) return null;
  const claimed = parseInt(stored, 10);
  try {
    if (Number.isFinite(claimed) && claimed > 0) {
      const res = await importLegacyXp(userId, claimed);
      localStorage.removeItem(LEGACY_KEY);
      return res;
    }
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    return null;   // keep the key and retry on the next load
  }
  return null;
}
