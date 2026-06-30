/**
 * Approximate market reference prices (mean-reversion anchors for synthetic OHLCV).
 * Market price = last simulated close, which drifts slightly around these levels.
 *
 * Update periodically to stay near real market levels. Last updated: Jun 30, 2026.
 * Buy price in the portfolio is user-entered and never overwritten.
 */
export const REFERENCE_PRICES = {
  AAPL: 285.76,
  MSFT: 370.17,
  AMZN: 228.5,
  NVDA: 197.7,
  GOOGL: 348.75,
  GOOG: 348.75,
  META: 555.59,
  'BRK.B': 465.0,
  UNH: 520.0,
  JNJ: 155.0,
  XOM: 118.0,
  JPM: 245.0,
  V: 318.0,
  PG: 168.0,
  MA: 528.0,
  HD: 385.0,
  CVX: 158.0,
  MRK: 98.0,
  ABBV: 178.0,
  LLY: 825.0,
  PEP: 168.0,
  KO: 68.0,
  COST: 920.0,
  AVGO: 185.0,
  WMT: 98.0,
  MCD: 298.0,
  CSCO: 58.0,
  TMO: 520.0,
  ACN: 355.0,
  ABT: 118.0,
  DHR: 265.0,
  NEE: 78.0,
  LIN: 465.0,
  ADBE: 525.0,
  CRM: 285.0,
  NKE: 72.0,
  TXN: 198.0,
  PM: 128.0,
  DIS: 118.0,
  WFC: 72.0,
  BMY: 48.0,
  RTX: 128.0,
  ORCL: 178.0,
  INTC: 22.0,
  AMD: 162.0,
  QCOM: 168.0,
  UPS: 128.0,
  HON: 218.0,
  AMGN: 288.0,
  IBM: 258.0,
  LOW: 248.0,
  SPGI: 520.0,
  CAT: 368.0,
  GE: 268.0,
  BA: 178.0,
  DE: 420.0,
  SBUX: 92.0,
  GS: 580.0,
  BLK: 980.0,
  INTU: 680.0,
  TSLA: 348.0,
  NFLX: 1180.0,
  PLTR: 78.0,
  COIN: 285.0,
  PYPL: 78.0,
  BAC: 46.0,
  C: 72.0,
  SCHW: 82.0,
  T: 28.0,
  VZ: 42.0,
  CMCSA: 38.0,
  PFE: 24.0,
  TGT: 138.0,
  F: 11.0,
  GM: 52.0,
};

/** Share-class pairs kept in sync (e.g. GOOG / GOOGL). */
export const LINKED_TICKERS = {
  GOOG: 'GOOGL',
};

/**
 * @param {string} ticker
 * @returns {number|undefined}
 */
export function getReferencePrice(ticker) {
  if (REFERENCE_PRICES[ticker] != null) return REFERENCE_PRICES[ticker];

  const linked = LINKED_TICKERS[ticker];
  if (linked && REFERENCE_PRICES[linked] != null) return REFERENCE_PRICES[linked];

  return undefined;
}
