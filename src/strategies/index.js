/**
 * Strategy registry — add new strategies here to plug them into the screener.
 */

import { maCrossoverStrategy } from './maCrossover.js';
import { rsiStrategy } from './rsi.js';
import { macdStrategy } from './macd.js';
import { bollingerBandsStrategy } from './bollingerBands.js';
import { stochasticStrategy } from './stochastic.js';
import { adxStrategy } from './adx.js';
import { obvStrategy } from './obv.js';
import { atrStrategy } from './atr.js';
import { vwapStrategy } from './vwap.js';
import { ichimokuStrategy } from './ichimoku.js';
import { williamsRStrategy } from './williamsR.js';
import { cciStrategy } from './cci.js';
import { psarStrategy } from './psar.js';
import { emaRibbonStrategy } from './emaRibbon.js';
import { ppoStrategy } from './ppo.js';
import { keltnerStrategy } from './keltner.js';
import { mfiStrategy } from './mfi.js';
import { rocStrategy } from './roc.js';
import { pivotStrategy } from './pivot.js';
import { sectorStrengthStrategy } from './sectorStrength.js';
import { betaFilterStrategy } from './betaFilter.js';
import { fundamentalsStrategy } from './fundamentals.js';

/** @type {import('../types.js').StrategyEngine[]} */
export const strategyRegistry = [
  maCrossoverStrategy,
  rsiStrategy,
  macdStrategy,
  bollingerBandsStrategy,
  stochasticStrategy,
  adxStrategy,
  obvStrategy,
  atrStrategy,
  vwapStrategy,
  ichimokuStrategy,
  williamsRStrategy,
  cciStrategy,
  psarStrategy,
  emaRibbonStrategy,
  ppoStrategy,
  keltnerStrategy,
  mfiStrategy,
  rocStrategy,
  pivotStrategy,
  sectorStrengthStrategy,
  betaFilterStrategy,
  fundamentalsStrategy,
];

/** @param {string} id */
export function getStrategyById(id) {
  return strategyRegistry.find((s) => s.id === id);
}

/**
 * @param {Record<string, boolean>} enabledMap
 * @returns {import('../types.js').StrategyEngine[]}
 */
export function getActiveStrategies(enabledMap) {
  return strategyRegistry.filter((s) => enabledMap[s.id]);
}
