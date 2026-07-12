// XP, levels, ranks, and streaks for the learn system.
// Stored in localStorage next to the guest user id.

const XP_KEY = "tape_run_xp";

export const RANKS = [
  { level: 1, name: "Recruit", xp: 0 },
  { level: 2, name: "Analyst", xp: 100 },
  { level: 3, name: "Operator", xp: 250 },
  { level: 4, name: "Strategist", xp: 450 },
  { level: 5, name: "Risk Manager", xp: 700 },
  { level: 6, name: "Desk Head", xp: 1000 },
  { level: 7, name: "Market Wizard", xp: 1400 },
];

export const XP_RULES = {
  lessonCorrect: 10,      // first-try correct answer in a lesson
  checkCorrect: 15,       // correct answer in a knowledge check
  streakBonus: 5,         // extra per answer while streak >= 3
  perfectLesson: 25,      // all questions right first try
  checkPassed: 50,        // passing a unit check
};

export function getXp() {
  return parseInt(localStorage.getItem(XP_KEY) || "0", 10);
}

export function addXp(points) {
  const before = getXp();
  const after = before + points;
  localStorage.setItem(XP_KEY, String(after));
  return { before, after, leveledUp: levelFor(after).level > levelFor(before).level };
}

export function levelFor(xp) {
  let current = RANKS[0];
  for (const r of RANKS) {
    if (xp >= r.xp) current = r;
  }
  return current;
}

export function nextLevelFor(xp) {
  for (const r of RANKS) {
    if (xp < r.xp) return r;
  }
  return null; // max rank
}

export function levelProgress(xp) {
  const cur = levelFor(xp);
  const next = nextLevelFor(xp);
  if (!next) return 1;
  return (xp - cur.xp) / (next.xp - cur.xp);
}
