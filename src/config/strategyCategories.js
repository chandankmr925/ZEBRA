/** Strategy → analytical category for AI meta-scoring */

/** @type {Record<string, string>} */
export const STRATEGY_CATEGORIES = {
  ma: 'trend',
  adx: 'trend',
  ichimoku: 'trend',
  psar: 'trend',
  emaRibbon: 'trend',
  rsi: 'momentum',
  macd: 'momentum',
  stoch: 'momentum',
  williamsR: 'momentum',
  cci: 'momentum',
  ppo: 'momentum',
  roc: 'momentum',
  bb: 'meanReversion',
  vwap: 'meanReversion',
  keltner: 'meanReversion',
  pivot: 'meanReversion',
  obv: 'volume',
  mfi: 'volume',
  atr: 'volatility',
  sectorStrength: 'relative',
  betaFilter: 'relative',
  fundamentals: 'fundamental',
};

/** Relative importance when blending category scores into AI score */
export const CATEGORY_WEIGHTS = {
  trend: 1.2,
  momentum: 1.0,
  volume: 0.9,
  volatility: 0.7,
  meanReversion: 0.85,
  fundamental: 1.1,
  relative: 0.95,
};
