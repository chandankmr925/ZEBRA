/**
 * Central application state store.
 */

import { MAX_UNIVERSE_SIZE } from '../config/constants.js';
import { generateSP500Universe } from '../data/dataGenerator.js';
import {
  applyQuotesToUniverse,
  fetchLiveQuotes,
  fetchUniverseStocks,
  mergeLiveWithSynthetic,
} from '../data/marketClient.js';
import { buildUniqueTickerList } from '../config/universeTickers.js';
import { loadSavedPositions, savePositions } from './portfolioStorage.js';

/** @type {import('../types.js').Stock[]} */
let stockUniverse = [];

/** @type {import('../types.js').ScanResult[]} */
let lastScanResults = [];

/** @type {import('../types.js').Position[]} */
let myPositions = [];

/** @type {import('../types.js').StrategyEngine[]} */
let lastActiveStrategies = [];

/** @type {'synthetic'|'live'|'mixed'} */
let dataSource = 'synthetic';

/** @type {string|null} */
let lastQuoteTime = null;

export const store = {
  get stockUniverse() {
    return stockUniverse;
  },

  get lastScanResults() {
    return lastScanResults;
  },

  get lastActiveStrategies() {
    return lastActiveStrategies;
  },

  get myPositions() {
    return myPositions;
  },

  get dataSource() {
    return dataSource;
  },

  get lastQuoteTime() {
    return lastQuoteTime;
  },

  getUniverse() {
    if (stockUniverse.length === 0) {
      stockUniverse = generateSP500Universe(MAX_UNIVERSE_SIZE);
      dataSource = 'synthetic';
    }
    return stockUniverse;
  },

  /**
   * @param {import('../types.js').Stock[]} stocks
   * @param {'synthetic'|'live'|'mixed'} source
   */
  setUniverse(stocks, source = 'live') {
    stockUniverse = stocks;
    dataSource = source;
  },

  setScanResults(results, activeStrategies = []) {
    lastScanResults = results;
    lastActiveStrategies = activeStrategies;
  },

  async setPositions(positions) {
    myPositions = positions;
    await savePositions(myPositions);
  },

  async initPortfolio() {
    myPositions = await loadSavedPositions();
    return myPositions;
  },

  async persistPortfolio() {
    await savePositions(myPositions);
  },

  async addOrUpdatePosition(ticker, buyPrice, quantity) {
    const normalized = ticker.toUpperCase();
    const qty = quantity > 0 ? quantity : 1;
    const existing = myPositions.find((p) => p.ticker === normalized);

    if (existing) {
      existing.buyPrice = buyPrice;
      existing.quantity = qty;
      await savePositions(myPositions);
      return { updated: true, position: existing };
    }

    const position = {
      ticker: normalized,
      buyPrice,
      quantity: qty,
      addedAt: new Date().toISOString(),
    };
    myPositions.push(position);
    await savePositions(myPositions);
    return { updated: false, position };
  },

  async removePosition(ticker) {
    const normalized = ticker.toUpperCase();
    myPositions = myPositions.filter((p) => p.ticker !== normalized);
    await savePositions(myPositions);
  },

  findStock(ticker) {
    const key = ticker.toUpperCase();
    return stockUniverse.find((s) => s.ticker.toUpperCase() === key);
  },

  getMarketPrice(ticker) {
    const stock = this.findStock(ticker);
    return stock ? stock.currentPrice : null;
  },

  /**
   * Refresh live quotes for portfolio tickers (fast, ~1 min cache).
   */
  async refreshPortfolioQuotes() {
    const tickers = myPositions.map((p) => p.ticker);
    if (tickers.length === 0) return { quotes: {}, failed: [] };

    this.getUniverse();
    const { quotes, failed, fetchedAt } = await fetchLiveQuotes(tickers);
    applyQuotesToUniverse(stockUniverse, quotes);
    lastQuoteTime = fetchedAt;
    if (Object.keys(quotes).length > 0) {
      dataSource = stockUniverse.some((s) => s.isLive) ? 'mixed' : dataSource;
    }
    return { quotes, failed };
  },

  /**
   * Load live OHLCV for tickers used in a scan (slower, cached 15 min).
   * @param {number} count
   * @param {(progress: { done: number, total: number }) => void} [onProgress]
   */
  async loadLiveUniverse(count, onProgress) {
    const tickers = buildUniqueTickerList(count).slice(0, count);
    const synthetic = generateSP500Universe(count);

    onProgress?.({ done: 0, total: tickers.length });

    const { stocks, failed, fetchedAt } = await fetchUniverseStocks(tickers, 6);

    onProgress?.({ done: tickers.length, total: tickers.length });

    const merged = mergeLiveWithSynthetic(stocks, synthetic);
    stockUniverse = merged;
    lastQuoteTime = fetchedAt;
    dataSource = failed.length === 0 ? 'live' : 'mixed';

    return { loaded: stocks.length, failed, fetchedAt };
  },
};
