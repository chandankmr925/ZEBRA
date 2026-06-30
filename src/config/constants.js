/** Shared application constants */

export const SIGNAL_MAP = { BUY: 1, HOLD: 0, SELL: -1 };

export const CONSENSUS_THRESHOLDS = {
  BUY: 0.4,
  SELL: -0.4,
};

/** ~1 trading year; must exceed longest lookback (200-day SMA + prior bar for crossover) */
export const HISTORY_DAYS = 252;

/** Minimum bars required: 200 for SMA200 on prior day + 1 current bar */
export const MIN_HISTORY_BARS = 201;

export const MAX_UNIVERSE_SIZE = 500;

export const PORTFOLIO_RULES = {
  STOP_LOSS_PCT: -7,
  TAKE_PROFIT_PCT: 15,
  TAKE_PROFIT_RSI: 75,
  ALGORITHMIC_EXIT_MAX_RETURN_PCT: 5,
  STRONG_HOLD_MIN_RETURN_PCT: -3,
  ATR_STOP_MULTIPLIER: 2,
};

export const DEMO_POSITIONS = [
  { ticker: 'AAPL', buyPrice: 170.0, quantity: 10 },
  { ticker: 'MSFT', buyPrice: 400.0, quantity: 5 },
];
