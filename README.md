<div align="center">

# TAPE//RUN — Frontend

**React 19 + Vite client for the TAPE//RUN trading simulator.**

</div>

This is the browser client: the blind replay simulator (lightweight-charts candles with multi-timeframe playback), the Duolingo-style academy, the career and contest screens, and the post-session analytics review. It talks to the Flask API over REST and holds no market seeds or unrevealed bars — reveal, execution and scoring are all server-authoritative.

For the full project write-up — the synthetic market engine, seed-only architecture, statistical validation, anti-cheat model, and screenshots — see the **[main README in `trading-sim-backend`](https://github.com/alastairdeanthony403-wq/trading-sim-backend#readme)**.

## Development

```bash
npm install
npm run dev      # local dev server (Vite)
npm run build    # production build
```

Configure the API base with the `VITE_API_BASE` environment variable (Vite env, read via `import.meta.env`).
