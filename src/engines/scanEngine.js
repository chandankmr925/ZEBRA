/** Weighted consensus scanning engine */

import { CONSENSUS_THRESHOLDS, SIGNAL_MAP } from '../config/constants.js';
import { calculateRSI, getCloses } from '../utils/technical.js';

/**
 * @param {import('../types.js').Stock} stock
 * @param {import('../types.js').StrategyEngine[]} activeStrategies
 */
export function computeConsensus(stock, activeStrategies) {
  const strategyResults = activeStrategies.map((strat) => ({
    name: strat.name,
    ...strat.execute(stock.history),
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
 * @returns {import('../types.js').ScanResult}
 */
export function stockToScanResult(stock, activeStrategies) {
  const consensus = computeConsensus(stock, activeStrategies);
  return {
    ticker: stock.ticker,
    name: stock.name,
    sector: stock.sector,
    price: stock.currentPrice,
    history: stock.history,
    ...consensus,
  };
}

/**
 * @param {import('../types.js').Stock[]} stocks
 * @param {import('../types.js').StrategyEngine[]} activeStrategies
 * @returns {import('../types.js').ScanResult[]}
 */
export function scanUniverse(stocks, activeStrategies) {
  return stocks.map((stock) => stockToScanResult(stock, activeStrategies));
}

/**
 * @param {import('../types.js').ScanResult[]} results
 * @param {number} topN
 */
export function getTopBuyCandidates(results, topN) {
  return results
    .filter((r) => r.classification === 'BUY')
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
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
