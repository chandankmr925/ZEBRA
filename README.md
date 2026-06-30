# S&P 500 Algorithmic Trading Screener & Portfolio Auditor

Enterprise-grade dashboard for screening S&P 500 equities with pluggable technical strategies, weighted consensus scoring, and portfolio exit auditing. Uses **live market data** (Yahoo Finance via server proxy) with synthetic fallback — no API key required.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The dev server starts automatically.

**Important:** Run the app via `npm run dev` or `npm start` — do not open `index.html` directly from the file explorer. Portfolio data is saved to disk through the local API.

### Production

```bash
npm run build
npm run start
```

Opens at [http://localhost:4173](http://localhost:4173) with portfolio API enabled.

### Portfolio persistence (on disk)

Your portfolio ledger is saved to:

```
data/portfolio.json
```

Every add, update, or remove writes to this file immediately. Reloading the browser loads from this file — data survives refresh, browser restart, and syncs via OneDrive if the project folder is on OneDrive.

```json
{
  "version": 1,
  "updatedAt": "2026-06-30T12:00:00.000Z",
  "positions": [
    { "ticker": "AAPL", "buyPrice": 170, "addedAt": "..." }
  ]
}
```

`data/portfolio.json` is gitignored (personal data). The `data/` folder is kept in the repo via `.gitkeep`.

### Live market prices

Market prices and OHLCV history are fetched from **Yahoo Finance** through a local server proxy:

| Endpoint | Purpose |
|----------|---------|
| `GET /api/market/quotes?tickers=AAPL,NVDA` | Live prices (1 min cache) |
| `GET /api/market/history?ticker=NVDA` | 1-year daily OHLCV |
| `POST /api/market/universe` | Batch load for scans |

- **Portfolio ledger** refreshes live quotes on load and after changes.
- **Bulk scan** downloads real history for each ticker (cached 15 min in `data/market-cache/`).
- Header shows **Data: Live (Yahoo)** when connected.
- Scanning 500 tickers can take several minutes; start with 50–100 for faster results.

No API key needed. Requires `npm run dev` or `npm start` (not `file://`).

## Project Structure

```
├── index.html              # Application shell (minimal markup)
├── src/
│   ├── main.js             # Entry point
│   ├── types.js            # JSDoc type definitions
│   ├── config/
│   │   ├── constants.js    # Thresholds, signal maps, demo data
│   │   ├── sectors.js      # Sector beta/volatility profiles
│   │   └── tickers.js      # S&P 500 ticker universe
│   ├── data/
│   │   └── dataGenerator.js    # OHLCV synthetic price engine (252-day history)
│   ├── utils/
│   │   ├── math.js         # clamp, round2, getCloses
│   │   ├── rng.js          # Seeded PRNG + Gaussian noise
│   │   └── technical.js    # SMA, EMA, RSI, Stochastic, etc.
│   ├── strategies/         # Pluggable strategy engines
│   │   ├── index.js        # Registry — register new strategies here
│   │   ├── maCrossover.js
│   │   ├── rsi.js
│   │   ├── macd.js
│   │   ├── bollingerBands.js
│   │   └── stochastic.js
│   ├── engines/
│   │   ├── scanEngine.js       # Weighted consensus scanner
│   │   └── portfolioAudit.js   # Exit recommendation logic
│   ├── state/
│   │   └── store.js        # Central application state
│   ├── ui/
│   │   ├── app.js          # Event handlers & orchestration
│   │   └── render.js       # DOM rendering
│   └── styles/
│       └── main.css        # Tailwind + custom styles
├── tailwind.config.js
├── vite.config.js
└── package.json
```

## Architecture

| Layer | Responsibility |
|-------|----------------|
| **config** | Tunable constants, sector profiles, ticker list |
| **data** | Synthetic 200-day OHLCV generation per stock |
| **strategies** | Each exports `{ id, name, execute(history) }` |
| **engines** | Scan consensus + portfolio audit business logic |
| **state** | Single store for universe, scan results, positions |
| **ui** | Thin controller + renderer (no business logic) |

## Strategy Interface

Every strategy must implement:

```javascript
export const myStrategy = {
  id: 'unique-id',
  name: 'Display Name',
  execute(history) {
    return {
      signal: 'BUY' | 'SELL' | 'HOLD',
      weight: 0.0 - 1.0,
      metricDisplay: 'RSI: 28.4 | ...',
    };
  },
};
```

Register in `src/strategies/index.js`:

```javascript
import { myStrategy } from './myStrategy.js';

export const strategyRegistry = [
  // ...existing strategies
  myStrategy,
];
```

Add a checkbox in `index.html` and wire its `id` in `renderer.getScanConfig()`.

## Consensus Scoring

- BUY = +1, HOLD = 0, SELL = −1
- Each signal is multiplied by strategy `weight`
- Weighted average ∈ [−1.0, +1.0]
- **BUY** if score ≥ 0.4 · **HOLD** if −0.3 to 0.39 · **SELL** if ≤ −0.4

Thresholds live in `src/config/constants.js`.

## Portfolio Audit Rules

| Action | Condition |
|--------|-----------|
| **STOP LOSS / CUT** | Return ≤ −7% |
| **TAKE PROFIT** | Return > 15% and (consensus SELL or RSI > 75) |
| **ALGORITHMIC EXIT** | Score ≤ −0.4 with flat/slight gain |
| **STRONG HOLD** | Positive/stable return with BUY consensus |

## Tech Stack

- **Vite** — dev server & production bundling
- **Vanilla JavaScript** (ES modules) — no framework lock-in
- **Tailwind CSS** — utility-first styling via PostCSS

## Disclaimer

This application generates **synthetic data** for educational and demonstration purposes. It is **not financial advice**. Do not use for live trading decisions.
