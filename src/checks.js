// Knowledge checks: end-of-unit quizzes drawing from that unit's lessons.
// Same question format as lessons, but all questions (no teach steps).
// Passing requires getting a minimum number correct.

export const CHECKS = {
  check_foundations: {
    title: "Unit 1 check: Foundations",
    passMark: 3,
    questions: [
      {
        prompt: "When you buy immediately at market, which price do you pay?",
        options: ["The bid", "The ask", "The midpoint", "The previous close"],
        correctIndex: 1,
        explanation: "Buyers pay the ask; sellers receive the bid. The gap is the spread.",
      },
      {
        prompt: "What does the spread represent?",
        options: [
          "A guaranteed profit",
          "The gap between bid and ask — a cost on every trade",
          "The daily price range",
          "A type of order",
        ],
        correctIndex: 1,
        explanation: "The spread is the bid-ask gap and an immediate cost you must overcome to profit.",
      },
      {
        prompt: "You must exit a losing position immediately. Best order type?",
        options: ["Limit order", "Market order", "No order", "Buy stop"],
        correctIndex: 1,
        explanation: "Market orders prioritize speed — right when getting out now beats getting an exact price.",
      },
      {
        prompt: "What is the primary job of a stop-loss order?",
        options: [
          "To guarantee a profit",
          "To exit automatically if price moves against you, capping the loss",
          "To fill at a better price than market",
          "To widen the spread",
        ],
        correctIndex: 1,
        explanation: "A stop-loss caps downside by exiting automatically — the core risk-management order.",
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
