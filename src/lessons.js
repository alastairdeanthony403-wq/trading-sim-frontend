// Each lesson is a short sequence of teach -> question steps.
// step.type: "teach" (just an explanation, tap to continue) or "question" (multiple choice)

export const LESSONS = {
  how_markets_work: {
    title: "How markets work",
    steps: [
      {
        type: "teach",
        text: "A market is just buyers and sellers agreeing on a price. Every trade needs someone on the other side — to buy, someone must sell to you, and vice versa.",
      },
      {
        type: "teach",
        text: "At any moment a price quote has two sides: the bid (highest price buyers will pay) and the ask (lowest price sellers will accept). The gap between them is the spread.",
      },
      {
        type: "question",
        prompt: "You want to buy right now. Which price do you typically pay?",
        options: ["The bid", "The ask", "The midpoint always", "Yesterday's close"],
        correctIndex: 1,
        explanation: "Buyers pay the ask (the lowest price a seller is currently offering). Sellers receive the bid. The difference is the spread — a real cost on every trade.",
      },
      {
        type: "teach",
        text: "The spread is a hidden cost. A wide spread means you start each trade at a bigger loss and need a larger move just to break even. Liquid markets have tight spreads; thin ones don't.",
      },
      {
        type: "question",
        prompt: "Why does a wider spread make trading harder?",
        options: [
          "It doesn't affect anything",
          "You start each trade further underwater and need a bigger move to break even",
          "It guarantees a loss every time",
          "It only matters for long-term investors",
        ],
        correctIndex: 1,
        explanation: "You buy at the ask and sell at the bid, so the spread is an immediate cost. Wider spread = bigger hole to climb out of before you're in profit.",
      },
    ],
  },

  order_types: {
    title: "Order types & execution",
    steps: [
      {
        type: "teach",
        text: "An order is your instruction to the market. The three you'll use most: market orders, limit orders, and stop orders. Choosing the right one is a real skill most beginners overlook.",
      },
      {
        type: "teach",
        text: "A market order fills immediately at the best available price. Fast and near-guaranteed to fill — but you don't control the exact price, and in fast markets you can get 'slippage'.",
      },
      {
        type: "question",
        prompt: "You need to exit a losing trade RIGHT NOW, price is secondary. Which order?",
        options: ["Limit order", "Market order", "No order", "Wait and see"],
        correctIndex: 1,
        explanation: "A market order prioritizes speed of execution over price — the right tool when getting out immediately matters more than the exact fill.",
      },
      {
        type: "teach",
        text: "A limit order fills only at your specified price or better. You control the price, but there's no guarantee it fills — price might never reach your level, and you miss the move.",
      },
      {
        type: "question",
        prompt: "You want to buy only if price drops to a specific support level, not a penny higher. Which order?",
        options: ["Market order", "Limit order", "Neither works", "Whichever is faster"],
        correctIndex: 1,
        explanation: "A buy limit set at your support level only fills at that price or better. You trade price control for the risk that it never fills.",
      },
      {
        type: "teach",
        text: "A stop order stays dormant until price hits your trigger, then becomes a market order. Its most important use: the stop-loss, which exits you automatically if price moves against you. Once triggered it fills at the next available price, so in gaps it can slip.",
      },
      {
        type: "question",
        prompt: "What's the most important everyday use of a stop order?",
        options: [
          "Guaranteeing you never lose",
          "A stop-loss that exits you automatically if price moves against you",
          "Making trades fill faster",
          "Avoiding the spread",
        ],
        correctIndex: 1,
        explanation: "The stop-loss is the essential risk-management order — it caps your loss by exiting automatically, even when you're not watching. It guarantees you're out, not the exact price.",
      },
    ],
  },

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

  core_indicators: {
    title: "Core indicators",
    steps: [
      {
        type: "teach",
        text: "Indicators are calculations plotted on your chart to summarize price behavior. They don't predict the future — they organize what price has already done. Treat them as context, not signals to blindly obey.",
      },
      {
        type: "teach",
        text: "A moving average smooths price into a single line, helping you see trend direction. Price above a rising moving average suggests an uptrend; below a falling one suggests a downtrend.",
      },
      {
        type: "question",
        prompt: "What does a moving average primarily help you see?",
        options: [
          "Exact future price",
          "The smoothed trend direction of price",
          "Guaranteed entry points",
          "The spread",
        ],
        correctIndex: 1,
        explanation: "A moving average smooths noise to reveal underlying trend direction — it's a context tool, not a crystal ball.",
      },
      {
        type: "teach",
        text: "RSI (Relative Strength Index) measures momentum on a 0–100 scale. Readings above 70 are often called 'overbought' and below 30 'oversold' — but in strong trends these can persist for a long time.",
      },
      {
        type: "question",
        prompt: "RSI has been above 70 for a while in a strong uptrend. What's the sensible read?",
        options: [
          "Short immediately — it must reverse",
          "Overbought can persist in strong trends; it's not an automatic sell",
          "The indicator is broken",
          "Buy more with no other consideration",
        ],
        correctIndex: 1,
        explanation: "'Overbought' doesn't mean 'about to fall.' In strong trends RSI can stay elevated — using it as a standalone reversal signal is a classic trap.",
      },
      {
        type: "teach",
        text: "The key discipline with all indicators: they lag price and work best confirming what structure and price action already suggest — not as standalone reasons to trade.",
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

  chart_reading_basics: {
    title: "Reading a candlestick chart",
    steps: [
      {
        type: "teach",
        text: "Each candle shows four prices for its time period: open, high, low, and close. The thick body spans open-to-close; the thin wicks show the high and low.",
      },
      {
        type: "teach",
        text: "A green (or hollow) candle means the close was higher than the open — buyers won that period. A red (filled) candle means the close was lower than the open — sellers won.",
      },
      {
        type: "question",
        prompt: "A candle closes below where it opened. What color/type is it typically shown as?",
        options: ["Green — bullish", "Red — bearish", "Always neutral", "Depends on volume"],
        correctIndex: 1,
        explanation: "Closing below the open means sellers pushed price down over that period — shown as a red/bearish candle.",
      },
      {
        type: "teach",
        text: "Long wicks matter. A long upper wick means price pushed higher but got rejected and sold back down — often a sign of resistance. A long lower wick shows the opposite.",
      },
      {
        type: "question",
        prompt: "A candle has a long lower wick and closes near its high. What does that usually suggest?",
        options: [
          "Sellers are firmly in control",
          "Buyers stepped in and rejected lower prices",
          "The market is closed",
          "Nothing — wicks are meaningless",
        ],
        correctIndex: 1,
        explanation: "A long lower wick with a strong close shows price was pushed down, then bought back up — buyers defended that level.",
      },
    ],
  },

  support_resistance: {
    title: "Support and resistance",
    steps: [
      {
        type: "teach",
        text: "Support is a price level where falling prices have tended to stop and bounce — buyers step in. Resistance is the opposite: a level where rising prices have tended to stall as sellers step in.",
      },
      {
        type: "teach",
        text: "These levels form because market participants remember them. A price that reversed before is watched by everyone, so orders cluster there, making the level self-reinforcing.",
      },
      {
        type: "question",
        prompt: "Price has bounced up off the $50 level three separate times. What is $50 acting as?",
        options: ["Resistance", "Support", "A random number", "A moving average"],
        correctIndex: 1,
        explanation: "A level that repeatedly halts falling prices and produces bounces is support — buyers reliably show up there.",
      },
      {
        type: "teach",
        text: "A key idea: once broken, support often becomes resistance and vice versa. If price finally breaks below support, that old floor frequently becomes a ceiling on any bounce back up.",
      },
      {
        type: "question",
        prompt: "Price breaks down through a long-standing support level, then rallies back up to it. What's likely at that old level?",
        options: [
          "It will act as support again automatically",
          "It often flips to become resistance",
          "It becomes meaningless",
          "Price always blasts straight through",
        ],
        correctIndex: 1,
        explanation: "Broken support commonly flips to resistance (and broken resistance to support). This 'role reversal' is one of the most useful S/R concepts.",
      },
    ],
  },

  trends_conditions: {
    title: "Trends & market conditions",
    steps: [
      {
        type: "teach",
        text: "Markets are in one of a few conditions at any time: trending (moving directionally), ranging (bouncing between levels), or reversing. Your strategy should match the condition in front of you.",
      },
      {
        type: "teach",
        text: "Trend-following setups work well in trending markets but get chopped up in ranges. Range setups (buy support, sell resistance) work in ranges but get run over when a strong trend begins.",
      },
      {
        type: "question",
        prompt: "You keep getting stopped out taking breakout trades — price keeps reversing back into a band. What condition are you likely in?",
        options: ["A strong trend", "A range", "A reversal", "Impossible to tell"],
        correctIndex: 1,
        explanation: "Repeated failed breakouts that snap back into a band is the signature of a ranging market — breakout/trend strategies struggle here.",
      },
      {
        type: "teach",
        text: "The mistake usually isn't the strategy itself — it's using one that doesn't fit current conditions. Reading the condition first tells you which tools even apply.",
      },
      {
        type: "question",
        prompt: "What's the first thing to assess before picking a setup?",
        options: [
          "How much you want to make",
          "Whether the market is trending, ranging, or reversing",
          "What other traders are posting online",
          "The exact time of day only",
        ],
        correctIndex: 1,
        explanation: "Identify the condition first — it determines whether trend, range, or reversal tactics are appropriate at all.",
      },
    ],
  },

  market_structure: {
    title: "Market structure",
    steps: [
      {
        type: "teach",
        text: "An uptrend is defined by a series of higher highs and higher lows. A downtrend is the reverse: lower highs and lower lows. This is the foundation everything else builds on.",
      },
      {
        type: "teach",
        text: "A 'break of structure' (BOS) is when price breaks the most recent significant high (in an uptrend) or low (in a downtrend), confirming the trend is continuing.",
      },
      {
        type: "question",
        prompt: "Price makes a higher high, then a higher low, then breaks above the prior high again. What does this confirm?",
        options: [
          "A reversal is imminent",
          "The uptrend is continuing (break of structure)",
          "The market is ranging",
          "Nothing can be concluded",
        ],
        correctIndex: 1,
        explanation: "That sequence — higher high, higher low, then a break above the prior high — is a textbook continuation signal in an uptrend.",
      },
      {
        type: "teach",
        text: "A 'change of character' (CHoCH) is different: it's the first sign a trend may be reversing, when price breaks structure in the opposite direction of the prevailing trend.",
      },
      {
        type: "question",
        prompt: "In a clear downtrend, price suddenly breaks above the most recent lower high. What is this called?",
        options: ["A break of structure", "A change of character (CHoCH)", "A liquidity sweep", "A retracement"],
        correctIndex: 1,
        explanation: "Breaking structure against the prevailing trend is a change of character — an early signal the trend may be shifting.",
      },
    ],
  },

  supply_demand_zones: {
    title: "Supply and demand zones",
    steps: [
      {
        type: "teach",
        text: "A demand zone is a price area where buying pressure previously overwhelmed selling, causing a sharp move up. A supply zone is the opposite — where selling overwhelmed buying.",
      },
      {
        type: "teach",
        text: "These zones matter because unfilled orders often remain there. Price frequently returns to retest a zone before continuing in its original direction.",
      },
      {
        type: "question",
        prompt: "Price rallies sharply away from a zone, then returns to retest it before continuing higher. What does that zone likely represent?",
        options: ["A supply zone", "A demand zone", "A random price level", "A stop-loss cluster only"],
        correctIndex: 1,
        explanation: "A zone that launches a rally and gets successfully retested before continuing up is acting as demand.",
      },
      {
        type: "teach",
        text: "Fresh zones (not yet retested) tend to be more reliable than zones that have already been tested multiple times — each retest uses up some of the resting orders there.",
      },
      {
        type: "question",
        prompt: "Which zone is generally considered more reliable?",
        options: [
          "One that's been retested five times already",
          "A fresh zone that hasn't been retested",
          "It makes no difference",
          "Older zones are always better",
        ],
        correctIndex: 1,
        explanation: "Fresh, untested zones still have their original resting orders intact, making the reaction there more likely to hold.",
      },
    ],
  },

  liquidity_concepts: {
    title: "Liquidity and stop hunts",
    steps: [
      {
        type: "teach",
        text: "Liquidity pools form where many traders place stop-losses or pending orders at similar levels — typically just beyond obvious swing highs/lows.",
      },
      {
        type: "teach",
        text: "Price is often drawn to these pools before reversing, because large orders need that liquidity to fill. This is sometimes called a 'stop hunt' or 'liquidity sweep'.",
      },
      {
        type: "question",
        prompt: "Why might price briefly spike beyond an obvious swing high before reversing sharply?",
        options: [
          "Random noise with no explanation",
          "To sweep resting liquidity (stops/orders) before reversing",
          "It's always a sign of a stronger uptrend",
          "The chart is broken",
        ],
        correctIndex: 1,
        explanation: "Obvious highs/lows attract resting stop orders. A sweep clears that liquidity, often just before a reversal.",
      },
      {
        type: "teach",
        text: "This is why entering right at an obvious level can be risky — your stop may sit exactly where a sweep is likely to reach. Give yourself room beyond the obvious level.",
      },
      {
        type: "question",
        prompt: "What's a practical takeaway from understanding liquidity sweeps?",
        options: [
          "Always place your stop exactly at the obvious swing point",
          "Give your stop room beyond the obvious level to avoid being swept",
          "Ignore swing highs and lows entirely",
          "Liquidity concepts don't affect stop placement",
        ],
        correctIndex: 1,
        explanation: "Since obvious levels are prime sweep targets, placing stops with some buffer beyond them can avoid getting caught in normal noise.",
      },
    ],
  },

  fundamentals_news: {
    title: "Fundamentals & news",
    steps: [
      {
        type: "teach",
        text: "Technical analysis studies price; fundamentals study what drives it — economic data, earnings, interest rates, and news. Even pure chart traders need to know when major events are due.",
      },
      {
        type: "teach",
        text: "Scheduled events (central bank decisions, jobs reports, earnings) cause sharp, fast moves and wide spreads. Price can gap right through your stop, so many traders reduce size or stand aside around them.",
      },
      {
        type: "question",
        prompt: "A major central bank rate decision is due in five minutes. What's a common risk-aware approach?",
        options: [
          "Load up on maximum size to catch the move",
          "Reduce size or stand aside — volatility and gaps make stops unreliable",
          "It makes no difference to how you trade",
          "Remove your stop-loss entirely",
        ],
        correctIndex: 1,
        explanation: "Scheduled high-impact events cause violent, gappy moves where stops can slip badly. Reducing exposure or waiting is a common, sensible response.",
      },
      {
        type: "teach",
        text: "You don't have to trade the news to respect it. Knowing the economic calendar tells you when the character of the market is about to change, even if your edge is purely technical.",
      },
      {
        type: "question",
        prompt: "Why should a purely technical trader still check the economic calendar?",
        options: [
          "To predict exact prices",
          "To know when volatility and gap risk will spike, changing market character",
          "It's not necessary at all",
          "To copy other traders' positions",
        ],
        correctIndex: 1,
        explanation: "The calendar flags when conditions will shift. Even without trading the event, knowing it's coming protects you from getting blindsided.",
      },
    ],
  },

  trade_journaling: {
    title: "Journaling your trades",
    steps: [
      {
        type: "teach",
        text: "A trade journal isn't just a P&L log — it's how you find your actual edge (or lack of one). Record the setup, your reasoning, entry/exit, and how you felt during the trade.",
      },
      {
        type: "teach",
        text: "Review your journal periodically, grouped by setup type. You're looking for patterns: which setups consistently work, which don't, and where you break your own rules.",
      },
      {
        type: "question",
        prompt: "What's the main purpose of grouping journal entries by setup type?",
        options: [
          "To make the journal look organized",
          "To identify which specific setups actually perform well for you",
          "It has no real purpose",
          "To calculate total trading fees",
        ],
        correctIndex: 1,
        explanation: "Grouping by setup reveals which patterns are genuinely profitable for you versus which just feel good to trade.",
      },
      {
        type: "teach",
        text: "Be honest about rule-breaks. A trade that worked out despite ignoring your plan is still a process failure — the outcome doesn't retroactively make the decision correct.",
      },
      {
        type: "question",
        prompt: "You broke your own trading rules but the trade still made money. How should you log it?",
        options: [
          "As a win — the result is what matters",
          "As a rule violation, regardless of the outcome",
          "Don't log it since it worked out",
          "Delete the rule since it 'cost you' a good trade",
        ],
        correctIndex: 1,
        explanation: "Good process and good outcomes aren't the same thing. Logging the violation honestly protects your discipline long-term.",
      },
    ],
  },

  trading_plan: {
    title: "Building a trading plan",
    steps: [
      {
        type: "teach",
        text: "A trading plan turns scattered knowledge into repeatable rules. Without one, every trade is an improvised decision — which makes it impossible to know if you have an edge or just got lucky.",
      },
      {
        type: "teach",
        text: "A basic plan answers: what setups do I take, what conditions must be present, how do I size, where's my stop, where's my target, and what's my max risk per trade and per day?",
      },
      {
        type: "question",
        prompt: "What's the main reason a written plan matters?",
        options: [
          "It looks professional",
          "It makes your process repeatable, so you can tell skill from luck",
          "It guarantees profits",
          "It replaces the need to manage risk",
        ],
        correctIndex: 1,
        explanation: "Repeatable rules let you evaluate whether your approach actually works. Improvised trades can't be measured or improved systematically.",
      },
      {
        type: "teach",
        text: "A plan is only useful if you follow it and then review it. Your journal feeds back into the plan: keep the rules that work, cut the ones that don't, and only change rules based on evidence, not emotion.",
      },
      {
        type: "question",
        prompt: "After a losing streak, how should you change your trading plan?",
        options: [
          "Scrap it entirely and start fresh each time",
          "Only adjust based on reviewed evidence from your journal, not emotion",
          "Immediately double your risk to recover",
          "Never change anything ever",
        ],
        correctIndex: 1,
        explanation: "Plans evolve through evidence-based review, not knee-jerk reactions. A losing streak alone isn't proof a rule is broken — the data tells you.",
      },
    ],
  },

  psychology_discipline: {
    title: "Trading psychology",
    steps: [
      {
        type: "teach",
        text: "Revenge trading — increasing size or frequency after a loss to 'win it back' — is one of the most reliable ways to turn a small loss into a large one.",
      },
      {
        type: "teach",
        text: "Emotional state affects decision quality. Trading while angry, tired, or desperate to make back a loss almost always leads to abandoning your normal process.",
      },
      {
        type: "question",
        prompt: "After two losing trades, you feel the urge to double your position size on the next one to 'make it back'. What should you do?",
        options: [
          "Do it — you're due for a win",
          "Recognize this as revenge trading and stick to your normal plan",
          "Trade even bigger to recover faster",
          "Switch to a completely different strategy immediately",
        ],
        correctIndex: 1,
        explanation: "The urge to size up after losses is a classic revenge-trading trap. Sticking to your predefined risk plan is what actually protects you.",
      },
      {
        type: "teach",
        text: "A losing trade taken correctly, within your rules, is not a mistake — it's an expected cost of doing business. A winning trade taken outside your rules is still a mistake.",
      },
      {
        type: "question",
        prompt: "Which of these should you judge as a 'good' trading decision?",
        options: [
          "Any trade that ends in profit",
          "A trade taken according to your rules, regardless of outcome",
          "A trade based on a strong gut feeling",
          "Any trade that avoids a loss",
        ],
        correctIndex: 1,
        explanation: "Process, not outcome, is what you control and what should define a 'good' decision. Outcomes have randomness baked in even with a real edge.",
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
