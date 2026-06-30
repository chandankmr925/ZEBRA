/** Weighted consensus scanning engine */

import { CONSENSUS_THRESHOLDS, SIGNAL_MAP } from '../config/constants.js';
import { calculateRSI, calculateROC, getCloses } from '../utils/technical.js';
import { enrichWithAIRecommendations, generateRecommendation } from './aiRecommender.js';

/**
 * @param {import('../types.js').Stock[]} stocks
 */
function buildScanContext(stocks) {
  /** @type {Record<string, number[]>} */
  const sectorRocs = {};

  for (const stock of stocks) {
    const roc = calculateROC(getCloses(stock.history), 20);
    if (roc === null) continue;
    if (!sectorRocs[stock.sector]) sectorRocs[stock.sector] = [];
    sectorRocs[stock.sector].push(roc);
  }

  /** @type {Record<string, number>} */
  const sectorRocMedians = {};
  for (const [sector, rocs] of Object.entries(sectorRocs)) {
    const sorted = [...rocs].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    sectorRocMedians[sector] =
      sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  const spy = stocks.find((s) => s.ticker === 'SPY');

  return {
    sectorRocMedians,
    spyHistory: spy?.history ?? null,
  };
}

/**
 * @param {import('../types.js').Stock} stock
 * @param {import('../types.js').StrategyEngine[]} activeStrategies
 * @param {object} [scanContext]
 */
export function computeConsensus(stock, activeStrategies, scanContext = {}) {
  const context = { ...scanContext, stock };

  const strategyResults = activeStrategies.map((strat) => ({
    id: strat.id,
    name: strat.name,
    ...strat.execute(stock.history, context),
  }));

  const rsi = calculateRSI(getCloses(stock.history));

  if (strategyResults.length === 0) {
    return { score: 0, classification: 'HOLD', strategyResults, rsi };
  }

  let weightedSum = 0;
  let totalWeight = 0;

  for (const result of strategyResults) {
    const numeric = SIGNAL_MAP[result.signal] ?? 0;
    weightedSum += numeric * result.weight;
    totalWeight += result.weight;
  }

  const score = totalWeight > 0 ? weightedSum / totalWeight : 0;

  let classification;
  if (score >= CONSENSUS_THRESHOLDS.BUY) classification = 'BUY';
  else if (score <= CONSENSUS_THRESHOLDS.SELL) classification = 'SELL';
  else classification = 'HOLD';

  return { score, classification, strategyResults, rsi };
}

/**
 * Build a scan result row for a single stock (used when portfolio ticker was outside last scan slice).
 * @param {import('../types.js').Stock} stock
 * @param {import('../types.js').StrategyEngine[]} activeStrategies
 * @param {object} [scanContext]
 * @returns {import('../types.js').ScanResult}
 */
export function stockToScanResult(stock, activeStrategies, scanContext = {}) {
  const consensus = computeConsensus(stock, activeStrategies, scanContext);
  const result = {
    ticker: stock.ticker,
    name: stock.name,
    sector: stock.sector,
    price: stock.currentPrice,
    history: stock.history,
    ...consensus,
  };
  return { ...result, ai: generateRecommendation(result) };
}

/**
 * @param {import('../types.js').Stock[]} stocks
 * @param {import('../types.js').StrategyEngine[]} activeStrategies
 * @returns {import('../types.js').ScanResult[]}
 */
export function scanUniverse(stocks, activeStrategies) {
  const scanContext = buildScanContext(stocks);
  const results = stocks.map((stock) => stockToScanResult(stock, activeStrategies, scanContext));
  return enrichWithAIRecommendations(results);
}

/**
 * Scan a single stock with full-universe context (sector RS, SPY beta).
 * @param {import('../types.js').Stock} stock
 * @param {import('../types.js').StrategyEngine[]} activeStrategies
 * @param {import('../types.js').Stock[]} [universeForContext]
 * @returns {import('../types.js').ScanResult}
 */
export function scanSingleStock(stock, activeStrategies, universeForContext = []) {
  const contextPool = universeForContext.length > 0 ? universeForContext : [stock];
  const scanContext = buildScanContext(contextPool);
  return stockToScanResult(stock, activeStrategies, scanContext);
}

/**
 * @param {import('../types.js').Position[]} positions
 * @returns {Set<string>}
 */
export function getPortfolioTickerSet(positions) {
  return new Set(positions.map((p) => p.ticker.toUpperCase()));
}

/**
 * For owned stocks: BUY consensus means hold the position, not a new buy.
 * @param {import('../types.js').Signal} classification
 * @returns {import('../types.js').Signal}
 */
export function mapPortfolioConsensus(classification) {
  if (classification === 'BUY') return 'HOLD';
  return classification;
}

/**
 * @param {import('../types.js').ScanResult[]} results
 * @param {number} topN
 * @param {Set<string>} [excludeTickers]
 */
export function getTopBuyCandidates(results, topN, excludeTickers = new Set()) {
  return results
    .filter(
      (r) => r.classification === 'BUY' && !excludeTickers.has(r.ticker.toUpperCase())
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}

/**
 * @param {import('../types.js').ScanResult[]} results
 * @param {Set<string>} [excludeTickers]
 */
export function countBuyCandidates(results, excludeTickers = new Set()) {
  return results.filter(
    (r) => r.classification === 'BUY' && !excludeTickers.has(r.ticker.toUpperCase())
  ).length;
}

/**
 * @param {import('../types.js').ScanResult[]} results
 * @param {number} topN
 */
export function getTopHoldCandidates(results, topN) {
  return results
    .filter((r) => r.classification === 'HOLD')
    .sort((a, b) => Math.abs(a.score) - Math.abs(b.score))
    .slice(0, topN);
}

/**
 * Build hold/sell desk rows for portfolio positions (never BUY — you already own these).
 * @param {Array<{ position: import('../types.js').Position, audit: import('../types.js').PortfolioAudit, scanResult: import('../types.js').ScanResult|null, portfolioAi?: import('../types.js').PortfolioAIAdvice }>} audits
 */
export function buildPortfolioSignalDesk(audits) {
  return audits
    .map(({ position, audit, scanResult, portfolioAi }) => {
      const raw = scanResult?.classification ?? audit.classification;
      const displayClassification = mapPortfolioConsensus(raw);

      return {
        ticker: position.ticker,
        name: scanResult?.name ?? position.ticker,
        sector: scanResult?.sector ?? '—',
        price: audit.marketPrice,
        score: audit.score,
        classification: raw,
        displayClassification,
        strategyResults: scanResult?.strategyResults ?? [],
        rsi: audit.rsi,
        ai: scanResult?.ai ?? null,
        portfolioAi,
        portfolioAction: audit.action,
        returnPct: audit.returnPct,
        audit,
        position,
      };
    })
    .sort((a, b) => {
      if (a.displayClassification === 'SELL' && b.displayClassification !== 'SELL') return -1;
      if (b.displayClassification === 'SELL' && a.displayClassification !== 'SELL') return 1;
      return a.score - b.score;
    });
}
