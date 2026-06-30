/**
 * Strategy registry — add new strategies here to plug them into the screener.
 */

import { maCrossoverStrategy } from './maCrossover.js';
import { rsiStrategy } from './rsi.js';
import { macdStrategy } from './macd.js';
import { bollingerBandsStrategy } from './bollingerBands.js';
import { stochasticStrategy } from './stochastic.js';

/** @type {import('../types.js').StrategyEngine[]} */
export const strategyRegistry = [
  maCrossoverStrategy,
  rsiStrategy,
  macdStrategy,
  bollingerBandsStrategy,
  stochasticStrategy,
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
