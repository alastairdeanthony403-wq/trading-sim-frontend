// Trading glossary: hover (or tap) any detected term in lesson text for a definition.

export const TERMS = {
  "bid-ask spread": "The gap between the highest buyer price (bid) and lowest seller price (ask). A cost paid on every round trip.",
  "break of structure": "Price breaking the most recent swing high (uptrend) or low (downtrend) — confirms the trend is continuing.",
  "change of character": "The first structure break AGAINST the prevailing trend — an early warning the trend may be ending.",
  "higher high": "A swing high above the previous swing high — one half of an uptrend's skeleton.",
  "higher low": "A swing low above the previous swing low — buyers stepping in earlier each time.",
  "lower high": "A swing high below the previous one — one half of a downtrend's skeleton.",
  "lower low": "A swing low below the previous one — sellers pushing further each time.",
  "liquidity sweep": "A quick push through an obvious level to trigger the stop orders resting there, often followed by a sharp reversal.",
  "stop hunt": "Another name for a liquidity sweep — price 'hunting' the stop cluster beyond an obvious level.",
  "stop-loss": "An order that exits your position automatically if price moves against you — caps the loss on a wrong idea.",
  "stop order": "A dormant order that triggers when price touches a level, then fills like a market order.",
  "limit order": "An order that fills only at your chosen price or better. Price control, but no guarantee it fills.",
  "market order": "An order that fills immediately at the best available price. Fill certainty, but no price control.",
  "buy stop": "A stop order placed ABOVE current price — triggers a buy when strength is confirmed (e.g. a breakout).",
  "sell stop": "A stop order placed BELOW current price — most commonly the stop-loss on a long position.",
  "buy limit": "A resting buy order BELOW current price — fills only if price comes down to your level.",
  "sell limit": "A resting sell order ABOVE current price — commonly used to take profit at a target.",
  "position size": "How many shares/units you trade — computed from your risk amount ÷ stop distance, never picked first.",
  "R-multiple": "Profit or loss expressed as a multiple of what you risked. Risk $100, make $300 = +3R.",
  "expectancy": "Average R earned per trade over many trades: (win% × avg win) − (loss% × avg loss). Positive after costs = an edge.",
  "win rate": "The percentage of trades that close profitable. Meaningless without knowing average win and loss sizes.",
  "risk-to-reward": "Planned reward divided by planned risk. Entry $40, stop $38, target $46 = 3:1.",
  "drawdown": "The decline from an equity peak. A 50% drawdown needs a 100% gain just to get back to even.",
  "slippage": "The difference between the price you expected and the price you actually got filled at.",
  "spread": "The gap between bid and ask — an immediate cost on every trade, wider in thin markets.",
  "liquidity": "How much volume is ready to trade near the current price. High liquidity = tight spreads and easy fills.",
  "support": "A price area where declines have repeatedly stopped — buyers defend it. A zone, not a line.",
  "resistance": "A price area where rallies have repeatedly stalled — sellers defend it.",
  "demand zone": "The origin of a sharp rally — where large buying built up. Unfilled orders often remain there.",
  "supply zone": "The origin of a sharp decline — where large selling built up.",
  "role reversal": "Broken support becoming resistance (or vice versa) — trapped traders and re-entries create orders at the old level.",
  "swing high": "A local peak with lower prices on both sides — a structural reference point.",
  "swing low": "A local trough with higher prices on both sides — stops cluster just beneath it.",
  "candlestick": "One time period drawn as open, high, low, close. Body = open→close; wicks = the extremes.",
  "wick": "The thin line beyond a candle's body — territory price visited but couldn't hold.",
  "doji": "A candle with a tiny body and wicks both sides — buyers and sellers fought to a draw.",
  "moving average": "The rolling average of recent closes — smooths noise to show trend direction. Lags price by design.",
  "RSI": "Relative Strength Index: momentum on a 0–100 scale. Extremes can persist in strong trends.",
  "divergence": "Price makes a new extreme but momentum doesn't confirm it — a sign the move is tiring.",
  "overbought": "RSI above ~70. Describes speed, not a ceiling — strong trends stay 'overbought' for long stretches.",
  "oversold": "RSI below ~30. Not an automatic buy — downtrends can pin it there.",
  "confluence": "Multiple INDEPENDENT pieces of evidence agreeing at the same place — structure, zone, trigger, payoff.",
  "breakout": "Price moving beyond an established level or range. Trustworthy with volume and acceptance; fadeable without.",
  "pullback": "A counter-move within a trend — often the lowest-risk entry point, at structure, with the trend.",
  "gap": "Price opening far from the prior close, skipping the prices between — jumps straight past resting stops.",
  "priced in": "Already reflected in price via expectations. Markets move on the SURPRISE versus expectations, not the headline.",
  "revenge trading": "Re-entering bigger and angrier after a loss to 'win it back' — the fastest route from small loss to blow-up.",
  "FOMO": "Fear of missing out — chasing a move with no setup, no level, and no defined invalidation.",
  "tilt": "A degraded emotional state after losses where decision quality collapses. Cooldowns and daily limits exist for it.",
  "invalidation": "The price at which your trade idea is proven wrong — where the stop-loss belongs.",
  "equity curve": "Your account balance plotted over time — the ultimate journal of your process.",
  "counterparty": "The other side of your trade — every buy needs a seller, every sell needs a buyer.",
  "volume": "How much was traded in a period — the participation and conviction meter behind a move.",
  "acceptance": "Price holding and building beyond a broken level (closes, retests) — what separates real breaks from sweeps.",
};

// Words that are too common as verbs/nouns — only match with guards
const RISKY = {
  ask: ["yourself", "for", "what", "how", "if", "a", "an", "the", "before", "why", "them", "your"],
  bid: [],
};

const RISKY_DEFS = {
  ask: "The lowest price sellers currently accept — the price you pay when buying at market.",
  bid: "The highest price buyers currently offer — the price you receive when selling at market.",
};

// Build one regex: longest terms first so multi-word terms win
const ALL_TERMS = [...Object.keys(TERMS), ...Object.keys(RISKY_DEFS)].sort((a, b) => b.length - a.length);
const PATTERN = new RegExp(
  "\\b(" + ALL_TERMS.map((t) => t.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")).join("|") + ")\\b",
  "gi"
);

function defFor(term) {
  const key = term.toLowerCase();
  for (const k of Object.keys(TERMS)) if (k.toLowerCase() === key) return TERMS[k];
  return RISKY_DEFS[key] || null;
}

export function Gloss({ children }) {
  const text = typeof children === "string" ? children : String(children ?? "");
  const parts = [];
  const seen = new Set();
  let last = 0;
  let m;
  PATTERN.lastIndex = 0;
  while ((m = PATTERN.exec(text)) !== null) {
    const term = m[1];
    const key = term.toLowerCase();

    // guard risky words: skip if the following word is in the blocklist
    if (RISKY[key]) {
      const after = text.slice(m.index + term.length).trimStart().split(/\s+/)[0]?.toLowerCase() || "";
      if (RISKY[key].includes(after.replace(/[^a-z]/g, ""))) continue;
    }

    if (seen.has(key)) continue; // only first occurrence per block
    const def = defFor(term);
    if (!def) continue;

    seen.add(key);
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      <span key={m.index} className="gloss" tabIndex={0} data-def={def}>
        {term}
      </span>
    );
    last = m.index + term.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}
