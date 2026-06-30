/** Portfolio audit and exit recommendation engine */

import { CONSENSUS_THRESHOLDS, PORTFOLIO_RULES } from '../config/constants.js';
import { getReferencePrice } from '../config/referencePrices.js';
import { stockToScanResult } from './scanEngine.js';

/**
 * @param {import('../types.js').Stock[]} stockUniverse
 * @returns {Map<string, import('../types.js').Stock>}
 */
function buildStockLookup(stockUniverse) {
  const map = new Map();
  for (const stock of stockUniverse) {
    const key = stock.ticker.toUpperCase();
    const existing = map.get(key);
    if (!existing) {
      map.set(key, stock);
      continue;
    }
    if (getReferencePrice(stock.ticker) != null && getReferencePrice(existing.ticker) == null) {
      map.set(key, stock);
    }
  }
  return map;
}

/**
 * Resolve market price: universe stock is authoritative; never fall back to buy price when stock exists.
 * @param {import('../types.js').Position} position
 * @param {import('../types.js').ScanResult|null} scanResult
 * @param {import('../types.js').Stock|null} [stock]
 */
export function resolveMarketPrice(position, scanResult, stock = null) {
  if (stock) return stock.currentPrice;
  if (scanResult?.price != null) return scanResult.price;
  if (position.lastKnownPrice != null) return position.lastKnownPrice;
  return position.buyPrice;
}

/**
 * @param {import('../types.js').Position} position
 * @param {import('../types.js').ScanResult|null} scanResult
 * @param {import('../types.js').Stock|null} [stock]
 * @returns {import('../types.js').PortfolioAudit}
 */
export function auditPosition(position, scanResult, stock = null) {
  const marketPrice = resolveMarketPrice(position, scanResult, stock);
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
 * @param {import('../types.js').Stock[]} stockUniverse
 * @param {import('../types.js').StrategyEngine[]} [activeStrategies]
 */
export function runPortfolioAudit(positions, scanResults, stockUniverse, activeStrategies = []) {
  const resultMap = new Map(scanResults.map((r) => [r.ticker.toUpperCase(), r]));
  const stockMap = buildStockLookup(stockUniverse);

  return new Promise((resolve) => {
    setTimeout(() => {
      const audits = positions.map((pos) => {
        const key = pos.ticker.toUpperCase();
        const stock = stockMap.get(key) ?? null;
        let scanResult = resultMap.get(key) ?? null;

        // Portfolio tickers outside the last scan slice still get live consensus + correct price
        if (!scanResult && stock && activeStrategies.length > 0) {
          scanResult = stockToScanResult(stock, activeStrategies);
        }

        const audit = auditPosition(pos, scanResult, stock);
        pos.lastKnownPrice = audit.marketPrice;
        return { position: pos, audit, scanResult };
      });
      resolve(audits);
    }, 50);
  });
}
