export const LESSONS = {
  risk_basics: {
    title: "Risk basics",
    body: `Before anything else, decide how much of your account you're willing to lose on a single trade — not how much you hope to make.

A common starting point is 1% of your account per trade. If you have $10,000, that's $100 at risk, not $100 in position size. The distance between your entry and your stop loss determines how large a position you can safely take.

Position size = (account × risk %) ÷ (entry price − stop loss price)

Get this backwards — sizing first, stop after — and you'll either take positions too large for your risk tolerance, or place your stop somewhere arbitrary just to make the math work. Always set your stop loss based on where the setup is actually invalidated, then size around that.`,
  },
  risk_management: {
    title: "Risk management: R-multiples",
    body: `An R-multiple expresses your profit or loss as a multiple of what you risked. If you risked $100 and made $300, that's a 3R win. If you risked $100 and lost $100, that's -1R.

Thinking in R rather than raw dollars does two things. First, it lets you compare trades of different sizes fairly. Second, it forces a simple question before every trade: is the reward worth at least what I'm risking? A strategy that wins 40% of the time can still be highly profitable if winners average 3R and losers average -1R — the math works out in your favor even though you're wrong more often than you're right.

Aim for setups with at least a 1:2 risk-to-reward ratio before you even consider entering. If the nearest logical stop and the nearest logical target don't offer that, the setup isn't good enough yet.`,
  },
  session_concepts: {
    title: "Trading sessions",
    body: `Markets don't move uniformly through the day — different sessions have different character, driven by which major financial centers are active.

The Asian session tends to be lower volatility and often establishes a range. The London session brings the first major volume of the day and frequently produces a directional move or a "sweep" of the Asian range's high or low before reversing. The New York session overlaps with London for a few hours and often delivers the most significant moves of the day, especially around news releases and the open.

A simple session-based framework: mark the Asian session's high and low, watch how London interacts with that range (does it break and hold, or sweep and reverse?), and use that read to inform your bias heading into New York. This isn't a guaranteed edge, but it gives structure to "when" you're looking for setups, not just "what" the setup looks like.`,
  },
  advanced_confluence: {
    title: "Confluence: stacking your edge",
    body: `No single indicator or pattern should be your only reason for entering a trade. Confluence means multiple independent signals pointing the same direction at the same price level.

Examples of things that can stack: a prior swing high/low, a round psychological number, a session high/low sweep, a shift in short-term market structure (higher low forming after a downtrend), and volume confirming the move. Any one of these alone is weak. Three or four aligning at the same zone is a meaningfully stronger case.

The discipline here is resisting the urge to force confluence that isn't really there. If you find yourself listing five reasons to justify a trade you already emotionally want to take, slow down — that's rationalization, not confluence. Genuine confluence is usually obvious without much argument.`,
  },
};
