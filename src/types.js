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
 * @property {number} [trailingPE]
 * @property {number} [dividendYield]
 * @property {number} [pegRatio]
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
 * @property {(history: OHLCVBar[], context?: object) => StrategyResult} execute
 */

/**
 * @typedef {Object} AIRecommendation
 * @property {number} aiScore
 * @property {number} confidence
 * @property {string} recommendation
 * @property {string} summary
 * @property {string[]} bullFactors
 * @property {string[]} bearFactors
 * @property {string[]} conflicts
 * @property {Record<string, number>} categoryScores
 * @property {'local'|'llm'|'hybrid'} source
 * @property {string} [llmHeadline]
 * @property {string} [llmRationale]
 * @property {string} [llmRisk]
 */

/**
 * @typedef {Object} PortfolioAIAdvice
 * @property {string} advice
 * @property {string} summary
 * @property {AIRecommendation|null} ai
 */

/**
 * @typedef {Object} ScanResult
 * @property {string} ticker
 * @property {string} name
 * @property {string} sector
 * @property {number} price
 * @property {number} score
 * @property {Signal} classification
 * @property {Array<StrategyResult & {id?: string, name: string}>} strategyResults
 * @property {number|null} rsi
 * @property {AIRecommendation} [ai]
 */

/**
 * @typedef {Object} Position
 * @property {string} ticker
 * @property {number} buyPrice
 * @property {number} quantity
 * @property {string} [addedAt]
 * @property {number} [lastKnownPrice]
 */

/**
 * @typedef {Object} PortfolioAudit
 * @property {number} marketPrice
 * @property {number} returnPct
 * @property {number} quantity
 * @property {number} costBasis
 * @property {number} marketValue
 * @property {number} pnlDollars
 * @property {number} score
 * @property {Signal} classification
 * @property {string} action
 * @property {number|null} rsi
 * @property {number|null} [riskReward]
 * @property {number|null} [atrStopPrice]
 */

/**
 * @typedef {Object} TickerExplanation
 * @property {string} ticker
 * @property {string} name
 * @property {string} sector
 * @property {number} price
 * @property {AIRecommendation} ai
 * @property {{ classification: Signal, score: number, rsi: number|null }} consensus
 * @property {{ buy: number, sell: number, hold: number, total: number }} signalTally
 * @property {Array<{ category: string, score: number, bias: string }>} categoryBreakdown
 * @property {{ BUY: object[], SELL: object[], HOLD: object[] }} strategiesBySignal
 * @property {string[]} conflicts
 * @property {string[]} bullFactors
 * @property {string[]} bearFactors
 * @property {string} verdict
 * @property {string[]} actionPlan
 * @property {string|null} portfolioNote
 * @property {'local'|'hybrid'} source
 * @property {object|null} [llm]
 * @property {boolean} [llmEnabled]
 */

export {};
