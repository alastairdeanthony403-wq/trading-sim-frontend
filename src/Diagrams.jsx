// On-theme SVG diagram library. Each diagram uses the app's CSS variables
// so imagery always matches the terminal palette.

const T = { mut: "#7d8896", txt: "#e2e9f0", line: "#2b3646" };
const F = { fontFamily: "'JetBrains Mono', monospace", fontSize: 11 };
const FS = { ...F, fontSize: 10 };

function Frame({ children, h = 240 }) {
  return (
    <svg viewBox={`0 0 560 ${h}`} className="diagram-svg" role="img">
      <rect x="0" y="0" width="560" height={h} fill="transparent" />
      {children}
    </svg>
  );
}

function Candle({ x, o, c, hi, lo, w = 14 }) {
  const up = c < o ? false : true; // y-axis: lower y = higher price, so pass y coords
  return null;
}

// simple price-coordinate candle: y values are pixel positions
function C({ x, yO, yC, yH, yL, w = 16 }) {
  const bull = yC < yO;
  const col = bull ? "var(--green)" : "var(--red)";
  const top = Math.min(yO, yC), h = Math.max(Math.abs(yC - yO), 2);
  return (
    <g>
      <line x1={x} y1={yH} x2={x} y2={yL} stroke={col} strokeWidth="2" />
      <rect x={x - w / 2} y={top} width={w} height={h} fill={col} rx="1" />
    </g>
  );
}

function Label({ x, y, children, fill = T.mut, anchor = "start", size }) {
  return (
    <text x={x} y={y} fill={fill} textAnchor={anchor} style={size === "s" ? FS : F}>
      {children}
    </text>
  );
}

function Dash({ x1, y1, x2, y2, stroke = T.line }) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth="1.5" strokeDasharray="5 4" />;
}

/* ---------- individual diagrams ---------- */

function CandleAnatomy() {
  return (
    <Frame>
      <C x={280} yO={155} yC={70} yH={32} yL={205} w={42} />
      <Dash x1={300} y1={32} x2={400} y2={32} /><Label x={408} y={36}>HIGH — top of wick</Label>
      <Dash x1={300} y1={70} x2={400} y2={70} /><Label x={408} y={74}>CLOSE</Label>
      <Dash x1={260} y1={155} x2={160} y2={155} /><Label x={152} y={159} anchor="end">OPEN</Label>
      <Dash x1={260} y1={205} x2={160} y2={205} /><Label x={152} y={209} anchor="end">LOW — bottom of wick</Label>
      <path d="M 330 76 L 330 149" stroke="var(--amber)" strokeWidth="1.5" />
      <Label x={338} y={116} fill="var(--amber)">BODY = open→close</Label>
      <path d="M 230 34 L 230 66" stroke={T.mut} strokeWidth="1.5" />
      <Label x={222} y={52} anchor="end">WICK</Label>
      <Label x={280} y={232} fill="var(--green)" anchor="middle">Close above open → bullish candle</Label>
    </Frame>
  );
}

function BidAsk() {
  const rows = [
    { y: 40, p: "100.15", side: "ask" }, { y: 64, p: "100.10", side: "ask" }, { y: 88, p: "100.05", side: "ask", best: true },
    { y: 140, p: "99.95", side: "bid", best: true }, { y: 164, p: "99.90", side: "bid" }, { y: 188, p: "99.85", side: "bid" },
  ];
  return (
    <Frame>
      {rows.map((r, i) => (
        <g key={i}>
          <rect x={190} y={r.y - 14} width={180} height={20} rx="2"
            fill={r.side === "ask" ? "var(--red-soft)" : "var(--green-soft)"}
            stroke={r.best ? (r.side === "ask" ? "var(--red)" : "var(--green)") : "transparent"} />
          <Label x={280} y={r.y} anchor="middle" fill={r.side === "ask" ? "var(--red)" : "var(--green)"}>${r.p}</Label>
        </g>
      ))}
      <Label x={382} y={84} size="s">← ASK: sellers' best price</Label>
      <Label x={382} y={98} size="s" fill="var(--red)">you BUY here</Label>
      <Label x={382} y={138} size="s">← BID: buyers' best price</Label>
      <Label x={382} y={152} size="s" fill="var(--green)">you SELL here</Label>
      <path d="M 176 88 L 176 140" stroke="var(--amber)" strokeWidth="2" />
      <Label x={168} y={110} anchor="end" fill="var(--amber)">SPREAD</Label>
      <Label x={168} y={124} anchor="end" fill="var(--amber)">$0.10 cost</Label>
    </Frame>
  );
}

function OrderMap() {
  return (
    <Frame>
      <Dash x1={60} y1={60} x2={500} y2={60} stroke="var(--amber)" />
      <Label x={64} y={50} fill="var(--amber)">BUY STOP $105 — dormant, triggers only on strength (breakout)</Label>
      <line x1={60} y1={120} x2={500} y2={120} stroke={T.txt} strokeWidth="2" />
      <Label x={64} y={112} fill={T.txt}>PRICE NOW $100 — market order fills here instantly</Label>
      <Dash x1={60} y1={185} x2={500} y2={185} stroke="var(--green)" />
      <Label x={64} y={176} fill="var(--green)">BUY LIMIT $97 — rests below, fills only if price comes down</Label>
      <path d="M 520 112 L 520 66 M 515 72 L 520 66 L 525 72" stroke="var(--amber)" strokeWidth="1.5" fill="none" />
      <path d="M 530 128 L 530 179 M 525 173 L 530 179 L 535 173" stroke="var(--green)" strokeWidth="1.5" fill="none" />
    </Frame>
  );
}

function StopBracket() {
  return (
    <Frame>
      <rect x={60} y={40} width={440} height={50} fill="var(--green-soft)" rx="2" />
      <Dash x1={60} y1={40} x2={500} y2={40} stroke="var(--green)" />
      <Label x={64} y={32} fill="var(--green)">TARGET $46 — sell limit (+3R)</Label>
      <line x1={60} y1={130} x2={500} y2={130} stroke={T.txt} strokeWidth="2" />
      <Label x={64} y={122} fill={T.txt}>ENTRY $40</Label>
      <rect x={60} y={130} width={440} height={30} fill="var(--red-soft)" rx="2" />
      <Dash x1={60} y1={160} x2={500} y2={160} stroke="var(--red)" />
      <Label x={64} y={178} fill="var(--red)">STOP $38 — sell stop (-1R) = where the idea is WRONG</Label>
      <path d="M 516 128 L 516 44" stroke="var(--green)" strokeWidth="1.5" />
      <Label x={512} y={88} fill="var(--green)" anchor="end">reward $6</Label>
      <path d="M 516 132 L 516 158" stroke="var(--red)" strokeWidth="1.5" />
      <Label x={512} y={149} fill="var(--red)" anchor="end">risk $2</Label>
      <Label x={280} y={215} anchor="middle" fill="var(--amber)">Risk $2 to make $6 → 3:1 — plan expressed as a bracket of orders</Label>
    </Frame>
  );
}

function SrZone() {
  return (
    <Frame>
      <rect x={40} y={150} width={480} height={26} fill="var(--amber-soft)" stroke="var(--amber)" strokeDasharray="5 4" rx="2" />
      <Label x={46} y={196} fill="var(--amber)">SUPPORT ZONE — a band, not a line</Label>
      <polyline points="40,60 110,150 160,95 230,158 290,90 360,152 430,70 520,40"
        fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx={110} cy={150} r="5" fill="var(--green)" />
      <circle cx={230} cy={158} r="5" fill="var(--green)" />
      <circle cx={360} cy={152} r="5" fill="var(--green)" />
      <Label x={110} y={140} anchor="middle" size="s">bounce 1</Label>
      <Label x={230} y={148} anchor="middle" size="s">bounce 2</Label>
      <Label x={360} y={142} anchor="middle" size="s">bounce 3</Label>
    </Frame>
  );
}

function RoleReversal() {
  return (
    <Frame>
      <rect x={40} y={118} width={480} height={22} fill="var(--amber-soft)" stroke="var(--amber)" strokeDasharray="5 4" rx="2" />
      <polyline points="40,70 100,120 150,80 210,122 260,200 330,205 390,142 440,205 520,220"
        fill="none" stroke="var(--red)" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx={100} cy={120} r="5" fill="var(--green)" />
      <Label x={100} y={110} anchor="middle" size="s" fill="var(--green)">held as support</Label>
      <Label x={250} y={175} size="s" fill="var(--red)">breaks through ↓</Label>
      <circle cx={390} cy={142} r="5" fill="var(--red)" />
      <Label x={390} y={132} anchor="middle" size="s" fill="var(--red)">retest → rejected</Label>
      <Label x={46} y={158} fill="var(--amber)">SAME LEVEL: support → resistance after the break</Label>
    </Frame>
  );
}

function TrendStructure() {
  return (
    <Frame>
      <polyline points="40,210 130,120 190,165 300,75 360,125 500,35"
        fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx={130} cy={120} r="5" fill="var(--green)" /><Label x={130} y={108} anchor="middle" size="s">HIGH</Label>
      <circle cx={190} cy={165} r="5" fill="var(--amber)" /><Label x={190} y={185} anchor="middle" size="s" fill="var(--amber)">HL — higher low</Label>
      <circle cx={300} cy={75} r="5" fill="var(--green)" /><Label x={300} y={63} anchor="middle" size="s">HH — higher high</Label>
      <circle cx={360} cy={125} r="5" fill="var(--amber)" /><Label x={368} y={143} size="s" fill="var(--amber)">HL</Label>
      <Dash x1={130} y1={120} x2={330} y2={120} stroke={T.mut} />
      <Label x={336} y={112} size="s" fill="var(--green)">break above prior high = BOS ✓</Label>
      <Label x={280} y={228} anchor="middle" fill={T.mut}>Uptrend skeleton: rising highs AND rising lows</Label>
    </Frame>
  );
}

function Choch() {
  return (
    <Frame>
      <polyline points="40,200 120,110 180,155 270,70 330,120 420,195"
        fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinejoin="round" />
      <polyline points="330,120 420,195" fill="none" stroke="var(--red)" strokeWidth="2.5" />
      <circle cx={330} cy={120} r="5" fill="var(--amber)" />
      <Label x={330} y={108} anchor="middle" size="s" fill="var(--amber)">last HL</Label>
      <Dash x1={180} y1={155} x2={460} y2={155} stroke={T.mut} />
      <Label x={300} y={148} size="s">prior higher low level</Label>
      <circle cx={382} cy={163} r="6" fill="none" stroke="var(--red)" strokeWidth="2" />
      <Label x={394} y={172} fill="var(--red)" size="s">CHoCH — structure broken</Label>
      <Label x={394} y={186} fill="var(--red)" size="s">AGAINST the trend</Label>
      <Label x={280} y={228} anchor="middle" fill={T.mut}>A warning shot, not proof: reassess, don't auto-reverse</Label>
    </Frame>
  );
}

function SupplyDemand() {
  return (
    <Frame>
      <rect x={40} y={150} width={130} height={40} fill="var(--green-soft)" stroke="var(--green)" strokeDasharray="5 4" rx="2" />
      <Label x={44} y={210} fill="var(--green)" size="s">DEMAND ZONE — base where buying built up</Label>
      <polyline points="45,172 70,165 95,175 120,168 150,170 175,120 210,60 250,42"
        fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinejoin="round" />
      <Label x={196} y={90} size="s" fill="var(--green)">explosive departure ↑</Label>
      <polyline points="250,42 320,70 370,58 440,110 495,158"
        fill="none" stroke={T.mut} strokeWidth="2" strokeDasharray="6 5" strokeLinejoin="round" />
      <circle cx={495} cy={158} r="6" fill="none" stroke="var(--amber)" strokeWidth="2" />
      <Label x={352} y={182} fill="var(--amber)" size="s">first return =</Label>
      <Label x={352} y={196} fill="var(--amber)" size="s">highest-probability reaction</Label>
    </Frame>
  );
}

function LiquiditySweep() {
  return (
    <Frame>
      <Dash x1={60} y1={150} x2={500} y2={150} stroke={T.mut} />
      <Label x={64} y={142}>swing low — obvious to everyone</Label>
      {[150, 190, 230, 270, 310].map((x) => (
        <circle key={x} cx={x} cy={168} r="3.5" fill="var(--red)" />
      ))}
      <Label x={330} y={172} size="s" fill="var(--red)">← stop cluster resting just below</Label>
      <polyline points="60,60 150,140 220,100 300,150 330,185 360,140 420,80 500,50"
        fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx={330} cy={185} r="6" fill="none" stroke="var(--amber)" strokeWidth="2" />
      <Label x={330} y={210} anchor="middle" fill="var(--amber)">SWEEP: poke below → stops harvested → sharp reclaim</Label>
    </Frame>
  );
}

function RangeVsTrend() {
  return (
    <Frame>
      <rect x={30} y={30} width={230} height={160} fill="var(--panel-raised)" stroke={T.line} rx="3" />
      <Dash x1={40} y1={60} x2={250} y2={60} stroke="var(--red)" />
      <Dash x1={40} y1={160} x2={250} y2={160} stroke="var(--green)" />
      <polyline points="40,110 70,158 100,66 130,156 160,64 195,158 230,70 250,120"
        fill="none" stroke={T.txt} strokeWidth="2" strokeLinejoin="round" />
      <Label x={145} y={215} anchor="middle" fill="var(--amber)">RANGE — fade the edges</Label>
      <rect x={300} y={30} width={230} height={160} fill="var(--panel-raised)" stroke={T.line} rx="3" />
      <polyline points="310,180 355,110 385,140 435,75 465,102 520,45"
        fill="none" stroke="var(--green)" strokeWidth="2" strokeLinejoin="round" />
      <circle cx={385} cy={140} r="4" fill="var(--amber)" />
      <circle cx={465} cy={102} r="4" fill="var(--amber)" />
      <Label x={415} y={215} anchor="middle" fill="var(--amber)">TREND — buy the pullbacks</Label>
    </Frame>
  );
}

function MaPullback() {
  return (
    <Frame>
      <path d="M 40 200 C 150 185, 260 140, 380 95 S 500 55, 520 48"
        fill="none" stroke="var(--amber)" strokeWidth="2.5" />
      <Label x={452} y={40} size="s" fill="var(--amber)">moving average</Label>
      <polyline points="40,185 110,140 160,172 240,105 290,132 370,70 420,92 520,30"
        fill="none" stroke="var(--green)" strokeWidth="2" strokeLinejoin="round" />
      <circle cx={160} cy={172} r="5" fill="none" stroke="var(--green)" strokeWidth="2" />
      <circle cx={290} cy={132} r="5" fill="none" stroke="var(--green)" strokeWidth="2" />
      <circle cx={420} cy={92} r="5" fill="none" stroke="var(--green)" strokeWidth="2" />
      <Label x={280} y={225} anchor="middle" fill={T.mut}>Pullbacks keep finding buyers near the rising MA — a map, not magic</Label>
    </Frame>
  );
}

function RsiDivergence() {
  return (
    <Frame h={260}>
      <Label x={40} y={26} size="s">PRICE</Label>
      <polyline points="40,95 120,55 190,90 300,40 380,80"
        fill="none" stroke="var(--green)" strokeWidth="2" strokeLinejoin="round" />
      <circle cx={120} cy={55} r="4" fill="var(--green)" />
      <circle cx={300} cy={40} r="4" fill="var(--green)" />
      <Dash x1={120} y1={55} x2={300} y2={40} stroke="var(--green)" />
      <Label x={310} y={38} size="s" fill="var(--green)">higher high</Label>
      <line x1={40} y1={130} x2={520} y2={130} stroke={T.line} />
      <Label x={40} y={152} size="s">RSI</Label>
      <polyline points="40,215 120,170 190,210 300,185 380,225"
        fill="none" stroke="var(--violet)" strokeWidth="2" strokeLinejoin="round" />
      <circle cx={120} cy={170} r="4" fill="var(--violet)" />
      <circle cx={300} cy={185} r="4" fill="var(--violet)" />
      <Dash x1={120} y1={170} x2={300} y2={185} stroke="var(--violet)" />
      <Label x={310} y={192} size="s" fill="var(--violet)">lower high — momentum fading</Label>
      <Label x={280} y={252} anchor="middle" fill="var(--amber)">DIVERGENCE: new price high, weaker thrust behind it — a caution flag</Label>
    </Frame>
  );
}


function WickRejection() {
  return (
    <Frame>
      <rect x={40} y={168} width={480} height={24} fill="var(--green-soft)" stroke="var(--green)" strokeDasharray="5 4" rx="2" />
      <Label x={46} y={210} fill="var(--green)" size="s">SUPPORT ZONE</Label>
      <C x={160} yO={80} yC={120} yH={70} yL={130} />
      <C x={220} yO={120} yC={150} yH={112} yL={160} />
      <C x={280} yO={150} yC={140} yH={135} yL={188} w={18} />
      <C x={340} yO={138} yC={95} yH={88} yL={145} />
      <Dash x1={280} y1={150} x2={280} y2={188} stroke="var(--amber)" />
      <path d="M 306 185 L 288 183 M 296 176 L 288 183 L 297 189" stroke="var(--amber)" strokeWidth="1.5" fill="none" />
      <Label x={312} y={188} size="s" fill="var(--amber)">long lower wick = dip bought back up</Label>
      <Label x={280} y={228} anchor="middle" fill={T.mut}>Sellers pushed into support — buyers rejected the lows and won the candle</Label>
    </Frame>
  );
}

function Doji() {
  return (
    <Frame>
      <C x={100} yO={190} yC={150} yH={144} yL={196} />
      <C x={160} yO={150} yC={110} yH={104} yL={156} />
      <C x={220} yO={110} yC={72} yH={66} yL={116} />
      <g>
        <line x1={290} y1={40} x2={290} y2={125} stroke={T.txt} strokeWidth="2" />
        <rect x={281} y={78} width={18} height={5} fill={T.txt} rx="1" />
      </g>
      <Dash x1={310} y1={80} x2={392} y2={80} />
      <Label x={398} y={76} size="s">DOJI: tiny body,</Label>
      <Label x={398} y={90} size="s">long wicks both sides</Label>
      <Label x={290} y={150} anchor="middle" size="s" fill="var(--amber)">indecision — the one-way buying paused</Label>
      <Label x={280} y={225} anchor="middle" fill={T.mut}>After a strong run, a doji = both sides fought to a draw. Watch the NEXT candle.</Label>
    </Frame>
  );
}

function DowntrendStructure() {
  return (
    <Frame>
      <polyline points="40,40 130,130 190,85 300,175 360,125 500,215"
        fill="none" stroke="var(--red)" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx={130} cy={130} r="5" fill="var(--red)" /><Label x={130} y={150} anchor="middle" size="s">LOW</Label>
      <circle cx={190} cy={85} r="5" fill="var(--amber)" /><Label x={190} y={73} anchor="middle" size="s" fill="var(--amber)">LH — lower high</Label>
      <circle cx={300} cy={175} r="5" fill="var(--red)" /><Label x={300} y={195} anchor="middle" size="s">LL — lower low</Label>
      <circle cx={360} cy={125} r="5" fill="var(--amber)" /><Label x={372} y={120} size="s" fill="var(--amber)">LH</Label>
      <Label x={280} y={232} anchor="middle" fill={T.mut}>Downtrend skeleton: falling highs AND falling lows</Label>
    </Frame>
  );
}

function VolumeConviction() {
  return (
    <Frame>
      <Dash x1={40} y1={90} x2={520} y2={90} stroke="var(--amber)" />
      <Label x={44} y={82} size="s" fill="var(--amber)">resistance</Label>
      <C x={150} yO={140} yC={60} yH={50} yL={148} w={20} />
      <rect x={132} y={165} width={36} height={40} fill="var(--green)" rx="2" />
      <Label x={150} y={222} anchor="middle" size="s" fill="var(--green)">3× volume</Label>
      <Label x={150} y={40} anchor="middle" size="s" fill="var(--green)">real breakout ✓</Label>
      <C x={390} yO={130} yC={78} yH={68} yL={138} w={20} />
      <rect x={378} y={193} width={24} height={12} fill="var(--red)" rx="2" />
      <Label x={390} y={222} anchor="middle" size="s" fill="var(--red)">thin volume</Label>
      <Label x={390} y={54} anchor="middle" size="s" fill="var(--red)">suspect — easy to fade</Label>
      <Label x={280} y={236} anchor="middle" size="s" fill={T.mut}>Same candle, different conviction — volume is the participation meter</Label>
    </Frame>
  );
}

function GapRisk() {
  return (
    <Frame>
      <polyline points="40,90 100,110 160,95 220,105" fill="none" stroke={T.txt} strokeWidth="2.5" />
      <Dash x1={40} y1={140} x2={520} y2={140} stroke="var(--red)" />
      <Label x={44} y={134} size="s" fill="var(--red)">your stop $48</Label>
      <circle cx={220} cy={105} r="4" fill={T.txt} />
      <Label x={228} y={100} size="s">last close $50</Label>
      <rect x={250} y={60} width={70} height={150} fill="var(--panel-raised)" rx="2" />
      <Label x={285} y={130} anchor="middle" size="s" fill="var(--amber)">overnight</Label>
      <Label x={285} y={144} anchor="middle" size="s" fill="var(--amber)">news</Label>
      <polyline points="340,195 420,185 500,200" fill="none" stroke="var(--red)" strokeWidth="2.5" />
      <circle cx={340} cy={195} r="5" fill="var(--red)" />
      <Label x={348} y={212} size="s" fill="var(--red)">opens $45 — fill happens HERE,</Label>
      <Label x={348} y={226} size="s" fill="var(--red)">not at the stop</Label>
      <Dash x1={220} y1={105} x2={340} y2={195} stroke="var(--red)" />
      <Label x={280} y={40} anchor="middle" fill={T.mut}>Stops cap normal losses — gaps jump straight past them</Label>
    </Frame>
  );
}

function ExpectancyBars() {
  return (
    <Frame>
      <Label x={40} y={30} size="s" fill={T.txt}>100 trades · 40% win rate · winners +2.5R · losers -1R</Label>
      <rect x={60} y={60} width={200} height={44} fill="var(--green-soft)" stroke="var(--green)" rx="2" />
      <Label x={160} y={86} anchor="middle" fill="var(--green)">40 wins × 2.5R = +100R</Label>
      <rect x={60} y={120} width={300} height={44} fill="var(--red-soft)" stroke="var(--red)" rx="2" />
      <Label x={210} y={146} anchor="middle" fill="var(--red)">60 losses × 1R = -60R</Label>
      <Label x={60} y={196} fill="var(--amber)">NET: +40R — losing MOST trades, solidly profitable</Label>
      <Label x={60} y={222} size="s" fill={T.mut}>Expectancy = (win% × avg win) − (loss% × avg loss) — the only scoreboard</Label>
    </Frame>
  );
}

function SessionClock() {
  return (
    <Frame>
      <rect x={40} y={80} width={140} height={70} fill="var(--panel-raised)" stroke={T.line} rx="3" />
      <Label x={110} y={70} anchor="middle" size="s" fill="var(--cyan)">ASIA</Label>
      <polyline points="50,115 75,108 100,120 125,110 150,118 170,112" fill="none" stroke="var(--cyan)" strokeWidth="2" />
      <Label x={110} y={168} anchor="middle" size="s">quiet range</Label>
      <rect x={200} y={60} width={150} height={110} fill="var(--panel-raised)" stroke={T.line} rx="3" />
      <Label x={275} y={50} anchor="middle" size="s" fill="var(--amber)">LONDON</Label>
      <polyline points="210,120 235,140 255,75 285,100 315,80 340,95" fill="none" stroke="var(--amber)" strokeWidth="2" />
      <Label x={275} y={188} anchor="middle" size="s">volume arrives — sweeps &amp; breaks</Label>
      <rect x={370} y={45} width={150} height={140} fill="var(--panel-raised)" stroke="var(--green)" rx="3" />
      <Label x={445} y={36} anchor="middle" size="s" fill="var(--green)">NEW YORK</Label>
      <polyline points="380,150 405,90 430,120 460,60 490,85 510,55" fill="none" stroke="var(--green)" strokeWidth="2" />
      <Label x={445} y={202} anchor="middle" size="s" fill="var(--green)">biggest moves — overlap window</Label>
      <Label x={280} y={230} anchor="middle" size="s" fill={T.mut}>Volatility follows the session clock — WHEN you trade is a filter</Label>
    </Frame>
  );
}

function ConfluenceStack() {
  return (
    <Frame>
      <rect x={60} y={140} width={440} height={26} fill="var(--green-soft)" stroke="var(--green)" strokeDasharray="5 4" rx="2" />
      <polyline points="60,50 150,85 230,65 330,145 365,178 400,138 470,80 520,55"
        fill="none" stroke={T.txt} strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx={365} cy={178} r="6" fill="none" stroke="var(--amber)" strokeWidth="2" />
      <Label x={70} y={40} size="s" fill="var(--green)">✓ uptrend context</Label>
      <Label x={220} y={40} size="s" fill="var(--green)">✓ fresh demand zone</Label>
      <Label x={380} y={40} size="s" fill="var(--green)">✓ sweep + reclaim trigger</Label>
      <Label x={68} y={158} size="s" fill="var(--green)">zone</Label>
      <Label x={300} y={205} size="s" fill="var(--amber)">all three agree HERE — that's a trade</Label>
      <Label x={280} y={232} anchor="middle" size="s" fill={T.mut}>Independent evidence stacking at one place. No stack, no trade.</Label>
    </Frame>
  );
}

function NewsSpike() {
  return (
    <Frame>
      <polyline points="40,120 90,115 140,122 190,116 230,120" fill="none" stroke={T.txt} strokeWidth="2" />
      <Dash x1={250} y1={30} x2={250} y2={210} stroke="var(--amber)" />
      <Label x={250} y={24} anchor="middle" size="s" fill="var(--amber)">RELEASE</Label>
      <polyline points="250,120 262,55 274,170 288,75 305,150 330,100 380,110 450,95 520,102"
        fill="none" stroke="var(--red)" strokeWidth="2" strokeLinejoin="round" />
      <rect x={250} y={60} width={80} height={120} fill="var(--red-soft)" rx="2" />
      <Label x={260} y={198} size="s" fill="var(--red)">machine-speed whipsaw, blown-out spreads</Label>
      <Label x={356} y={70} size="s" fill="var(--green)">trade the structure AFTER</Label>
      <Label x={356} y={84} size="s" fill="var(--green)">the dust settles</Label>
      <Label x={280} y={228} anchor="middle" size="s" fill={T.mut}>Know the calendar: the storm window is scheduled in advance</Label>
    </Frame>
  );
}

function PlanLoop() {
  return (
    <Frame>
      <rect x={60} y={90} width={120} height={54} fill="var(--green-soft)" stroke="var(--green)" rx="4" />
      <Label x={120} y={112} anchor="middle" fill="var(--green)">PLAN</Label>
      <Label x={120} y={128} anchor="middle" size="s">written rules</Label>
      <rect x={220} y={90} width={120} height={54} fill="var(--amber-soft)" stroke="var(--amber)" rx="4" />
      <Label x={280} y={112} anchor="middle" fill="var(--amber)">EXECUTE</Label>
      <Label x={280} y={128} anchor="middle" size="s">journal every trade</Label>
      <rect x={380} y={90} width={120} height={54} fill="var(--violet-soft)" stroke="var(--violet)" rx="4" />
      <Label x={440} y={112} anchor="middle" fill="var(--violet)">REVIEW</Label>
      <Label x={440} y={128} anchor="middle" size="s">evidence, scheduled</Label>
      <path d="M 182 117 L 216 117 M 210 111 L 216 117 L 210 123" stroke={T.mut} strokeWidth="1.5" fill="none" />
      <path d="M 342 117 L 376 117 M 370 111 L 376 117 L 370 123" stroke={T.mut} strokeWidth="1.5" fill="none" />
      <path d="M 440 148 C 440 195, 120 195, 120 148 M 114 156 L 120 148 L 127 155" stroke={T.mut} strokeWidth="1.5" fill="none" />
      <Label x={280} y={205} anchor="middle" size="s" fill={T.mut}>rules evolve only here — one change at a time, by data</Label>
      <Label x={280} y={232} anchor="middle" size="s" fill={T.mut}>The closed improvement loop IS the skill of trading</Label>
    </Frame>
  );
}

function TiltSpiral() {
  return (
    <Frame>
      <polyline points="40,80 90,95 130,85 170,100 210,92" fill="none" stroke={T.txt} strokeWidth="2" />
      <Label x={60} y={64} size="s">normal variance — planned -1R losses</Label>
      <polyline points="210,92 250,110 280,105 320,145 350,138 400,190 440,185 500,225"
        fill="none" stroke="var(--red)" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx={250} cy={110} r="4" fill="var(--red)" />
      <Label x={258} y={106} size="s" fill="var(--red)">stop-out → re-enter angry</Label>
      <circle cx={320} cy={145} r="4" fill="var(--red)" />
      <Label x={328} y={141} size="s" fill="var(--red)">double size "to get it back"</Label>
      <circle cx={400} cy={190} r="4" fill="var(--red)" />
      <Label x={408} y={186} size="s" fill="var(--red)">rules abandoned</Label>
      <Label x={280} y={232} anchor="middle" size="s" fill="var(--amber)">The tilt cascade — what daily loss limits and cooldowns exist to interrupt</Label>
    </Frame>
  );
}

const DIAGRAMS = {
  "candle-anatomy": CandleAnatomy,
  "bid-ask": BidAsk,
  "order-map": OrderMap,
  "stop-bracket": StopBracket,
  "sr-zone": SrZone,
  "role-reversal": RoleReversal,
  "trend-structure": TrendStructure,
  "choch": Choch,
  "supply-demand": SupplyDemand,
  "liquidity-sweep": LiquiditySweep,
  "range-vs-trend": RangeVsTrend,
  "ma-pullback": MaPullback,
  "rsi-divergence": RsiDivergence,
  "wick-rejection": WickRejection,
  "doji": Doji,
  "downtrend-structure": DowntrendStructure,
  "volume-conviction": VolumeConviction,
  "gap-risk": GapRisk,
  "expectancy-bars": ExpectancyBars,
  "session-clock": SessionClock,
  "confluence-stack": ConfluenceStack,
  "news-spike": NewsSpike,
  "plan-loop": PlanLoop,
  "tilt-spiral": TiltSpiral,
};

export default function Diagram({ id }) {
  const D = DIAGRAMS[id];
  if (!D) return null;
  return (
    <div className="diagram-frame">
      <D />
    </div>
  );
}
