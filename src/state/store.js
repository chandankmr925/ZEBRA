/**
 * Central application state store.
 * Single source of truth for universe, scan results, and open positions.
 */

import { DEMO_POSITIONS, MAX_UNIVERSE_SIZE } from '../config/constants.js';
import { generateSP500Universe } from '../data/dataGenerator.js';

/** @type {import('../types.js').Stock[]} */
let stockUniverse = [];

/** @type {import('../types.js').ScanResult[]} */
let lastScanResults = [];

/** @type {import('../types.js').Position[]} */
let myPositions = [];

export const store = {
  get stockUniverse() {
    return stockUniverse;
  },

  get lastScanResults() {
    return lastScanResults;
  },

  get myPositions() {
    return myPositions;
  },

  /**
   * @param {number} count
   */
  initUniverse(count = MAX_UNIVERSE_SIZE) {
    stockUniverse = generateSP500Universe(count);
    return stockUniverse;
  },

  /**
   * @param {number} count
   */
  ensureUniverseSize(count) {
    if (stockUniverse.length !== count) {
      stockUniverse = generateSP500Universe(count);
    }
    return stockUniverse;
  },

  /**
   * @param {import('../types.js').ScanResult[]} results
   */
  setScanResults(results) {
    lastScanResults = results;
  },

  /**
   * @param {import('../types.js').Position[]} positions
   */
  setPositions(positions) {
    myPositions = positions;
  },

  seedDemoPositions() {
    myPositions = DEMO_POSITIONS.map((p) => ({
      ...p,
      addedAt: new Date().toISOString(),
    }));
    return myPositions;
  },

  /**
   * @param {string} ticker
   * @param {number} buyPrice
   */
  addOrUpdatePosition(ticker, buyPrice) {
    const normalized = ticker.toUpperCase();
    const existing = myPositions.find((p) => p.ticker === normalized);

    if (existing) {
      existing.buyPrice = buyPrice;
      return { updated: true, position: existing };
    }

    const position = {
      ticker: normalized,
      buyPrice,
      addedAt: new Date().toISOString(),
    };
    myPositions.push(position);
    return { updated: false, position };
  },

  /**
   * @param {string} ticker
   */
  removePosition(ticker) {
    const normalized = ticker.toUpperCase();
    myPositions = myPositions.filter((p) => p.ticker !== normalized);
  },

  /**
   * @param {string} ticker
   * @returns {import('../types.js').Stock|undefined}
   */
  findStock(ticker) {
    return stockUniverse.find((s) => s.ticker === ticker.toUpperCase());
  },
};
