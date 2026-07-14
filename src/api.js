const API_BASE = import.meta.env.VITE_API_BASE;

export async function listScenarios() {
  const res = await fetch(`${API_BASE}/scenarios`);
  return res.json();
}

export async function startSession(scenarioId, userId = "guest") {
  const res = await fetch(`${API_BASE}/scenarios/${scenarioId}/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, starting_balance: 10000 }),
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

export async function getLeaderboard(scenarioId) {
  const res = await fetch(`${API_BASE}/scenarios/${scenarioId}/leaderboard`);
  return res.json();
}

export async function getProgress(userId) {
  const res = await fetch(`${API_BASE}/progress/${userId}`);
  return res.json();
}

// Server-authoritative list of unlocked simulator tools for this user.
export async function getTools(userId) {
  const res = await fetch(`${API_BASE}/config/tools/${userId}`);
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
