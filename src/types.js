/** @typedef {'BUY'|'SELL'|'HOLD'} Signal */

/**
 * @typedef {Object} OHLCVBar
 * @property {number} date
 * @property {number} open
 * @property {number} high
 * @property {number} low
 * @property {number} close
 * @property {number} volume
 */

/**
 * @typedef {Object} Stock
 * @property {string} ticker
 * @property {string} name
 * @property {string} sector
 * @property {number} beta
 * @property {OHLCVBar[]} history
 * @property {number} currentPrice
 */

/**
 * @typedef {Object} StrategyResult
 * @property {Signal} signal
 * @property {number} weight
 * @property {string} metricDisplay
 */

/**
 * @typedef {Object} StrategyEngine
 * @property {string} id
 * @property {string} name
 * @property {(history: OHLCVBar[]) => StrategyResult} execute
 */

/**
 * @typedef {Object} ScanResult
 * @property {string} ticker
 * @property {string} name
 * @property {string} sector
 * @property {number} price
 * @property {number} score
 * @property {Signal} classification
 * @property {Array<StrategyResult & {name: string}>} strategyResults
 * @property {number|null} rsi
 */

/**
 * @typedef {Object} Position
 * @property {string} ticker
 * @property {number} buyPrice
 * @property {string} [addedAt]
 * @property {number} [lastKnownPrice]
 */

/**
 * @typedef {Object} PortfolioAudit
 * @property {number} marketPrice
 * @property {number} returnPct
 * @property {number} score
 * @property {Signal} classification
 * @property {string} action
 * @property {number|null} rsi
 */

export {};
