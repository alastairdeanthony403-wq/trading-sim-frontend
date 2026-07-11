// Knowledge checks: end-of-unit quizzes drawing from that unit's lessons.
// Same question format as lessons, but all questions (no teach steps).
// Passing requires getting a minimum number correct.

export const CHECKS = {
  check_foundations: {
    title: "Unit 1 check: Foundations",
    passMark: 6,
    practice: "Now apply it: play one scenario in the simulator. Before EVERY trade, say out loud what the entry costs you (spread + commission are simulated). Only enter if you can state, in one sentence, at what price your idea would be proven wrong.",
    questions: [
      {
        prompt: "Bid $24.90 / ask $25.10. You buy 200 shares at market then immediately sell at market. Total cost of the round trip?",
        options: ["$4", "$40", "$400", "Nothing"],
        correctIndex: 1,
        explanation: "You pay the ask, receive the bid: $0.20 × 200 = $40 lost to the spread with zero price movement.",
      },
      {
        prompt: "Which order type guarantees your PRICE but not your FILL?",
        options: ["Market", "Limit", "Stop", "None of them"],
        correctIndex: 1,
        explanation: "A limit order only executes at your price or better — but if the market never comes to you, it never fills.",
      },
      {
        prompt: "Price is $80. You want in only if strength is confirmed by a break above $82. Which order?",
        options: ["Buy limit $82", "Buy stop $82", "Sell stop $82", "Market order now"],
        correctIndex: 1,
        explanation: "A buy stop above resistance triggers only when price trades there — entry on confirmation.",
      },
      {
        prompt: "You're long from $30, sell stop at $28. Earnings gap the open to $25. Your likely fill?",
        options: ["$28 exactly", "About $25", "$30", "The order cancels"],
        correctIndex: 1,
        explanation: "Stops don't protect through gaps — they trigger and fill at the next traded price.",
      },
      {
        prompt: "Multi-step: account $5,000. You trade a thin stock with a $0.30 average spread cost, 100 shares per trade, 10 round trips a week. Roughly what % of the account goes to spread alone in a year (50 weeks)?",
        options: ["3%", "10%", "30%", "300%"],
        correctIndex: 2,
        explanation: "$0.30 × 100 × 10 × 50 = $1,500 = 30% of the account. Execution cost compounds with frequency — most 'strategy' failures are really cost failures.",
      },
      {
        prompt: "TRAP: A trader brags they 'never use stop-losses, that's how the market takes your money'. The real risk of this approach?",
        options: [
          "There is none — stops are optional",
          "Losses have no defined cap; one bad trade can do damage that no win rate recovers from",
          "It only matters for big accounts",
          "Brokers require stops anyway",
        ],
        correctIndex: 1,
        explanation: "Occasional stop-hunts are the fee for the one thing that keeps you alive: a hard cap on how much any single wrong idea can cost.",
      },
      {
        prompt: "You plan: long at $45 support, wrong below $43.50, target $49. Express the whole plan in orders.",
        options: [
          "Buy limit $45, sell stop $43.50, sell limit $49",
          "Buy stop $45, sell limit $43.50, sell stop $49",
          "Market buy now, no exits",
          "Buy limit $49, sell stop $45, sell limit $43.50",
        ],
        correctIndex: 0,
        explanation: "Rest the entry at the level, stop below invalidation, target above — the plan translated directly into a bracket of orders.",
      },
      {
        prompt: "Why does the same strategy often perform worse on an illiquid instrument than a liquid one?",
        options: [
          "Illiquid instruments trend less",
          "Wider spreads and more slippage raise the cost of every entry and exit, eating the edge",
          "Charts render differently",
          "It doesn't — instruments are interchangeable",
        ],
        correctIndex: 1,
        explanation: "Edge is measured after costs. The same signals minus bigger execution tolls can flip a profitable system into a losing one.",
      },
    ],
  },

  check_reading: {
    title: "Unit 2 check: Reading the chart",
    passMark: 3,
    questions: [
      {
        prompt: "A candle closes well below its open with a long upper wick. What does the wick suggest?",
        options: [
          "Buyers pushed up but got rejected",
          "Nothing meaningful",
          "The market is closed",
          "Guaranteed continuation up",
        ],
        correctIndex: 0,
        explanation: "A long upper wick shows price was pushed up then sold back down — rejection at higher prices.",
      },
      {
        prompt: "Price repeatedly stalls and turns down at $80. What is $80?",
        options: ["Support", "Resistance", "A moving average", "Random"],
        correctIndex: 1,
        explanation: "A level that repeatedly halts rising prices is resistance.",
      },
      {
        prompt: "Support that gets clearly broken often becomes what?",
        options: ["Stronger support", "Resistance", "Meaningless", "A trend line"],
        correctIndex: 1,
        explanation: "Broken support commonly flips to resistance — the role-reversal principle.",
      },
      {
        prompt: "You keep getting stopped on breakouts that snap back into a band. What condition is this?",
        options: ["A strong trend", "A range", "A reversal", "Can't tell"],
        correctIndex: 1,
        explanation: "Failed breakouts snapping back is the signature of a ranging market.",
      },
    ],
  },

  check_structure: {
    title: "Unit 3 check: Structure & zones",
    passMark: 3,
    questions: [
      {
        prompt: "Higher high, then higher low, then a break above the prior high. This confirms what?",
        options: [
          "An imminent reversal",
          "Uptrend continuation (break of structure)",
          "A range",
          "Nothing",
        ],
        correctIndex: 1,
        explanation: "That sequence is a textbook uptrend continuation / break of structure.",
      },
      {
        prompt: "In a downtrend, price breaks above the most recent lower high. This is a...",
        options: ["Break of structure", "Change of character", "Liquidity sweep", "Retracement"],
        correctIndex: 1,
        explanation: "Breaking structure against the trend is a change of character — an early reversal signal.",
      },
      {
        prompt: "Which supply/demand zone is generally more reliable?",
        options: [
          "One tested five times already",
          "A fresh, untested zone",
          "It never matters",
          "The oldest one",
        ],
        correctIndex: 1,
        explanation: "Fresh zones still have their original resting orders, making reactions more likely to hold.",
      },
      {
        prompt: "Why might price spike just beyond an obvious swing high before reversing?",
        options: [
          "Random noise only",
          "To sweep resting liquidity (stops) before reversing",
          "Always signals a stronger trend",
          "The chart is broken",
        ],
        correctIndex: 1,
        explanation: "Obvious highs attract stop orders; a sweep clears that liquidity, often before a reversal.",
      },
    ],
  },

  check_risk: {
    title: "Unit 4 check: Risk & process",
    passMark: 4,
    questions: [
      {
        prompt: "You have $10,000 and risk 1% per trade. How much is at risk?",
        options: ["$1,000", "$100", "$10", "Whatever feels right"],
        correctIndex: 1,
        explanation: "1% of $10,000 is $100 — your max loss, not your position size.",
      },
      {
        prompt: "You risk $50 and make $150. What R-multiple is that?",
        options: ["1R", "2R", "3R", "5R"],
        correctIndex: 2,
        explanation: "$150 ÷ $50 = 3R.",
      },
      {
        prompt: "A strategy wins 40% of the time. Can it be profitable?",
        options: [
          "No",
          "Yes, if winners are large enough relative to losers",
          "Only with leverage",
          "Only in trends",
        ],
        correctIndex: 1,
        explanation: "With winners averaging 3R and losers -1R, 40% win rate is profitable.",
      },
      {
        prompt: "Which session typically sets a lower-volatility range?",
        options: ["New York", "London", "Asian", "It's random"],
        correctIndex: 2,
        explanation: "The Asian session's calm often forms a range later sessions react to.",
      },
      {
        prompt: "A major rate decision is 5 minutes away. Risk-aware move?",
        options: [
          "Max size to catch the move",
          "Reduce size or stand aside — gaps make stops unreliable",
          "No change",
          "Remove your stop",
        ],
        correctIndex: 1,
        explanation: "High-impact events cause gappy moves where stops slip — reduce exposure or wait.",
      },
    ],
  },

  check_discipline: {
    title: "Unit 5 check: Discipline",
    passMark: 2,
    questions: [
      {
        prompt: "You broke your rules but the trade won. How should you log it?",
        options: [
          "As a win — result is all that matters",
          "As a rule violation, regardless of outcome",
          "Don't log it",
          "Delete the rule",
        ],
        correctIndex: 1,
        explanation: "Good outcome ≠ good process. Logging the violation protects long-term discipline.",
      },
      {
        prompt: "After two losses you want to double size to 'make it back'. What is this?",
        options: [
          "Smart — you're due",
          "Revenge trading — stick to your plan",
          "Trade even bigger",
          "Switch strategies now",
        ],
        correctIndex: 1,
        explanation: "Sizing up after losses is revenge trading, a classic way to turn a small loss into a big one.",
      },
      {
        prompt: "How should you change your trading plan after a losing streak?",
        options: [
          "Scrap it entirely",
          "Only adjust based on reviewed evidence, not emotion",
          "Double your risk",
          "Never change anything",
        ],
        correctIndex: 1,
        explanation: "Plans evolve through evidence-based review — a losing streak alone isn't proof a rule is broken.",
      },
    ],
  },
};
