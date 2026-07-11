// Each lesson is a short sequence of teach -> question steps.
// step.type: "teach" (just an explanation, tap to continue) or "question" (multiple choice)

export const LESSONS = {
  risk_basics: {
    title: "Risk basics",
    steps: [
      {
        type: "teach",
        text: "Before anything else, decide how much of your account you're willing to lose on a single trade — not how much you hope to make.",
      },
      {
        type: "teach",
        text: "A common starting point is 1% of your account per trade. If you have $10,000, that's $100 at risk — not $100 in position size.",
      },
      {
        type: "question",
        prompt: "You have a $10,000 account and risk 1% per trade. How much are you risking on this trade?",
        options: ["$1,000", "$100", "$10", "Whatever feels right"],
        correctIndex: 1,
        explanation: "1% of $10,000 is $100. That's your maximum loss on this trade, not your position size.",
      },
      {
        type: "teach",
        text: "Position size = (account × risk %) ÷ (entry price − stop loss price). Your stop loss comes first, from where the setup is actually invalidated — then you size around it.",
      },
      {
        type: "question",
        prompt: "What should determine where you place your stop loss?",
        options: [
          "Wherever makes the position size look good",
          "Where the trade setup is actually invalidated",
          "A fixed number of pips, always",
          "Your gut feeling in the moment",
        ],
        correctIndex: 1,
        explanation: "The stop goes where the idea is proven wrong. Sizing is worked out afterward, around that stop.",
      },
    ],
  },

  risk_management: {
    title: "Risk management: R-multiples",
    steps: [
      {
        type: "teach",
        text: "An R-multiple expresses profit or loss as a multiple of what you risked. Risk $100, make $300 — that's +3R. Risk $100, lose $100 — that's -1R.",
      },
      {
        type: "question",
        prompt: "You risk $50 on a trade and end up making $150 profit. What's the R-multiple?",
        options: ["1R", "2R", "3R", "5R"],
        correctIndex: 2,
        explanation: "$150 profit ÷ $50 risked = 3R.",
      },
      {
        type: "teach",
        text: "Thinking in R lets you compare trades fairly and forces a key question before entering: is the reward worth at least what I'm risking?",
      },
      {
        type: "question",
        prompt: "A strategy wins only 40% of the time. Can it still be profitable?",
        options: [
          "No — you need to win more than you lose",
          "Yes, if winners are large enough relative to losers",
          "Only with leverage",
          "Only in trending markets",
        ],
        correctIndex: 1,
        explanation: "If winners average 3R and losers average -1R, a 40% win rate is comfortably profitable over time.",
      },
      {
        type: "teach",
        text: "Aim for at least a 1:2 risk-to-reward setup before considering entry. If the nearest logical stop and target don't offer that, the setup isn't ready.",
      },
    ],
  },

  session_concepts: {
    title: "Trading sessions",
    steps: [
      {
        type: "teach",
        text: "Markets don't move uniformly through the day. The Asian session tends to be lower volatility and often establishes a range.",
      },
      {
        type: "teach",
        text: "London brings the first major volume of the day, often sweeping or breaking the Asian range before committing to a direction.",
      },
      {
        type: "question",
        prompt: "Which session typically establishes a lower-volatility range that later sessions react to?",
        options: ["New York", "London", "Asian", "None — it's random"],
        correctIndex: 2,
        explanation: "The Asian session's relative calm often forms a range that London and New York later interact with.",
      },
      {
        type: "teach",
        text: "New York overlaps with London for a few hours and often delivers the day's most significant moves, especially around news and the open.",
      },
      {
        type: "question",
        prompt: "A simple session framework starts by marking what?",
        options: [
          "The New York close only",
          "Yesterday's closing price",
          "The Asian session's high and low",
          "The 200-day moving average",
        ],
        correctIndex: 2,
        explanation: "Marking the Asian high/low gives you a reference range to judge how London and New York interact with it.",
      },
    ],
  },

  advanced_confluence: {
    title: "Confluence: stacking your edge",
    steps: [
      {
        type: "teach",
        text: "No single indicator or pattern should be your only reason for entering a trade. Confluence means multiple independent signals aligning at the same price level.",
      },
      {
        type: "teach",
        text: "Examples: a prior swing high/low, a round number, a session sweep, a market structure shift, volume confirmation. One alone is weak — three or four together is much stronger.",
      },
      {
        type: "question",
        prompt: "Which best describes genuine confluence?",
        options: [
          "Any single strong-looking indicator",
          "Multiple independent signals aligning at the same zone",
          "A trade idea you feel strongly about",
          "Following what other traders are doing",
        ],
        correctIndex: 1,
        explanation: "Confluence is about independent signals agreeing — not conviction, and not just one indicator.",
      },
      {
        type: "teach",
        text: "Watch for the trap: if you're listing five reasons to justify a trade you already emotionally want to take, that's rationalization, not confluence.",
      },
      {
        type: "question",
        prompt: "You catch yourself listing reason after reason to justify a trade you already want to take. What's happening?",
        options: [
          "Strong confluence",
          "Rationalization, not genuine confluence",
          "A high-probability setup",
          "Normal analysis",
        ],
        correctIndex: 1,
        explanation: "Real confluence is usually obvious without much argument. Reaching for justification is a warning sign.",
      },
    ],
  },
};
