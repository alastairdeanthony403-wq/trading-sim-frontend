const API_BASE = import.meta.env.VITE_API_BASE;

export async function listScenarios(userId) {
  // Passing a user_id lets the server flag which markets the player's career
  // level has unlocked (market_unlocked on each scenario).
  const url = userId
    ? `${API_BASE}/scenarios?user_id=${encodeURIComponent(userId)}`
    : `${API_BASE}/scenarios`;
  const res = await fetch(url);
  return res.json();
}

export async function startSession(scenarioId, userId = "guest", mode = "standard") {
  const res = await fetch(`${API_BASE}/scenarios/${scenarioId}/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, starting_balance: 10000, mode }),
  });
  return res.json();
}

export async function getBars(sessionId, upTo) {
  const url = upTo != null
    ? `${API_BASE}/sessions/${sessionId}/bars?up_to=${upTo}`
    : `${API_BASE}/sessions/${sessionId}/bars`;
  const res = await fetch(url);
  return res.json();
}

export async function getReference(sessionId) {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/reference`);
  return res.json();
}

export async function openTrade(sessionId, {
  direction, size, barSequence, stopLoss, takeProfit,
  orderType = "market", entryOrderPrice, trailDistance, leverage,
}) {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/trades`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      direction,
      size,
      bar_sequence: barSequence,
      stop_loss: stopLoss,
      take_profit: takeProfit,
      order_type: orderType,
      entry_order_price: entryOrderPrice,
      trail_distance: trailDistance,
      leverage,
    }),
  });
  return res.json();
}

// Process resting/working orders up to the current playback bar. Returns
// { events, positions } — server-authoritative, idempotent.
export async function advanceSession(sessionId, barSequence) {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/advance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bar_sequence: barSequence }),
  });
  return res.json();
}

export async function getPositions(sessionId) {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/positions`);
  return res.json();
}

// Scripted news events for the session's scenario (Scenario Mode). Revealed
// client-side as playback reaches each event's bar.
export async function getEvents(sessionId) {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/events`);
  return res.json();
}

// Post-scenario debrief for scam (pump-and-dump) scenarios. Returns
// { is_scam, verdict, took_bait, anatomy, ... }.
export async function getScamDebrief(sessionId) {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/scam-debrief`);
  return res.json();
}

export async function modifyTrade(tradeId, changes) {
  const res = await fetch(`${API_BASE}/trades/${tradeId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(changes),
  });
  return res.json();
}

export async function closeTrade(tradeId, barSequence) {
  const res = await fetch(`${API_BASE}/trades/${tradeId}/close`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bar_sequence: barSequence }),
  });
  return res.json();
}

export async function endSession(sessionId) {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/end`, {
    method: "POST",
  });
  return res.json();
}

export async function getReplay(sessionId) {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/replay`);
  return res.json();
}

export async function getCoachLlm(sessionId) {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/coach-llm`);
  return res.json();
}

export async function getLeaderboard(scenarioId) {
  const res = await fetch(`${API_BASE}/scenarios/${scenarioId}/leaderboard`);
  return res.json();
}

export async function getProgress(userId) {
  const res = await fetch(`${API_BASE}/progress/${userId}`);
  return res.json();
}

export async function getCareer(userId) {
  const res = await fetch(`${API_BASE}/career/${userId}`);
  return res.json();
}

// Server-authoritative list of unlocked simulator tools for this user.
export async function getTools(userId) {
  const res = await fetch(`${API_BASE}/config/tools/${userId}`);
  return res.json();
}

export async function getMissions() {
  const res = await fetch(`${API_BASE}/missions`);
  return res.json();
}

export async function getDailyMission(userId) {
  const res = await fetch(`${API_BASE}/missions/daily?user_id=${encodeURIComponent(userId)}`);
  return res.json();
}

export async function getMissionStatus(sessionId, missionId) {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/mission/${missionId}/status`);
  return res.json();
}

export async function submitMission(missionId, sessionId, userId, isDaily = false) {
  const res = await fetch(`${API_BASE}/missions/${missionId}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, user_id: userId, is_daily: isDaily }),
  });
  return res.json();
}

// ── Competitions & leagues (Phase G) ────────────────────────────────────
export async function getCurrentContest(userId) {
  const q = userId ? `?user_id=${encodeURIComponent(userId)}` : "";
  const res = await fetch(`${API_BASE}/contests/current${q}`);
  return res.json();
}

export async function startContest(userId) {
  const res = await fetch(`${API_BASE}/contests/current/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, starting_balance: 10000 }),
  });
  return res.json();
}

export async function submitContest(contestId, sessionId, userId, displayName) {
  const res = await fetch(`${API_BASE}/contests/${contestId}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, user_id: userId, display_name: displayName }),
  });
  return res.json();
}

export async function getContestLeaderboard(contestId) {
  const res = await fetch(`${API_BASE}/contests/${contestId}/leaderboard`);
  return res.json();
}

export async function createLeague(name, userId, displayName) {
  const res = await fetch(`${API_BASE}/leagues`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, user_id: userId, display_name: displayName }),
  });
  return res.json();
}

export async function joinLeague(inviteCode, userId, displayName) {
  const res = await fetch(`${API_BASE}/leagues/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ invite_code: inviteCode, user_id: userId, display_name: displayName }),
  });
  return res.json();
}

export async function getMyLeagues(userId) {
  const res = await fetch(`${API_BASE}/leagues/mine?user_id=${encodeURIComponent(userId)}`);
  return res.json();
}

export async function getLeagueLeaderboard(leagueId) {
  const res = await fetch(`${API_BASE}/leagues/${leagueId}/leaderboard`);
  return res.json();
}

// ── Academy practice checks (Phase 1) ──
export async function startPracticeCheck(checkId, userId) {
  const res = await fetch(`${API_BASE}/academy/practice/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ check_id: checkId, user_id: userId }),
  });
  return res.json();
}

export async function getPracticeStatus(sessionId) {
  const res = await fetch(`${API_BASE}/academy/practice/${sessionId}/status`);
  return res.json();
}

export async function gradePracticeCheck(sessionId) {
  const res = await fetch(`${API_BASE}/academy/practice/${sessionId}/grade`, { method: "POST" });
  return res.json();
}

export async function markComplete(userId, itemId) {
  const res = await fetch(`${API_BASE}/progress/${userId}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ item_id: itemId }),
  });
  return res.json();
}
