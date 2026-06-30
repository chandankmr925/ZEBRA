/** Portfolio audit and exit recommendation engine */

import { CONSENSUS_THRESHOLDS, PORTFOLIO_RULES } from '../config/constants.js';

/**
 * @param {import('../types.js').Position} position
 * @param {import('../types.js').ScanResult|null} scanResult
 * @returns {import('../types.js').PortfolioAudit}
 */
export function auditPosition(position, scanResult) {
  const marketPrice = scanResult
    ? scanResult.price
    : position.lastKnownPrice || position.buyPrice;

  const returnPct = ((marketPrice - position.buyPrice) / position.buyPrice) * 100;
  const score = scanResult ? scanResult.score : 0;
  const classification = scanResult ? scanResult.classification : 'HOLD';
  const rsi = scanResult ? scanResult.rsi : null;

  const { STOP_LOSS_PCT, TAKE_PROFIT_PCT, TAKE_PROFIT_RSI, ALGORITHMIC_EXIT_MAX_RETURN_PCT, STRONG_HOLD_MIN_RETURN_PCT } =
    PORTFOLIO_RULES;

  let action;

  if (returnPct <= STOP_LOSS_PCT) {
    action = 'STOP LOSS / CUT';
  } else if (returnPct > TAKE_PROFIT_PCT && (classification === 'SELL' || (rsi !== null && rsi > TAKE_PROFIT_RSI))) {
    action = 'TAKE PROFIT';
  } else if (score <= CONSENSUS_THRESHOLDS.SELL && returnPct <= ALGORITHMIC_EXIT_MAX_RETURN_PCT) {
    action = 'ALGORITHMIC EXIT';
  } else if (returnPct >= 0 && classification === 'BUY') {
    action = 'STRONG HOLD';
  } else if (returnPct >= STRONG_HOLD_MIN_RETURN_PCT && classification === 'BUY') {
    action = 'STRONG HOLD';
  } else if (score <= CONSENSUS_THRESHOLDS.SELL) {
    action = 'ALGORITHMIC EXIT';
  } else if (returnPct > TAKE_PROFIT_PCT) {
    action = 'TAKE PROFIT';
  } else {
    action = classification === 'SELL' ? 'ALGORITHMIC EXIT' : 'STRONG HOLD';
  }

  return { marketPrice, returnPct, score, classification, action, rsi };
}

/**
 * @param {import('../types.js').Position[]} positions
 * @param {import('../types.js').ScanResult[]} scanResults
 * @returns {Promise<Array<{position: import('../types.js').Position, audit: import('../types.js').PortfolioAudit, scanResult: import('../types.js').ScanResult|null}>>}
 */
export function runPortfolioAudit(positions, scanResults) {
  const resultMap = new Map(scanResults.map((r) => [r.ticker.toUpperCase(), r]));

  return new Promise((resolve) => {
    setTimeout(() => {
      const audits = positions.map((pos) => {
        const scanResult = resultMap.get(pos.ticker.toUpperCase()) ?? null;
        const audit = auditPosition(pos, scanResult);
        pos.lastKnownPrice = audit.marketPrice;
        return { position: pos, audit, scanResult };
      });
      resolve(audits);
    }, 50);
  });
}
