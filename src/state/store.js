/**
 * Central application state store — isolated state per market dashboard.
 */

import { getMarketConfig, MARKET_IDS } from '../config/markets.js';
import { generateSyntheticUniverse } from '../data/dataGenerator.js';
import {
  applyQuotesToUniverse,
  fetchLiveQuotes,
  fetchUniverseStocks,
  mergeLiveWithSynthetic,
} from '../data/marketClient.js';
import { buildUniqueTickerList } from '../config/universeTickers.js';
import { loadAllMarketPositions, savePositions } from './portfolioStorage.js';

const MARKET_STORAGE_PREFIX = 'zebra:market';

/** @type {string|null} */
let currentUserId = null;

/**
 * @param {string} userId
 */
function marketStorageKey(userId) {
  return `${MARKET_STORAGE_PREFIX}:${userId}`;
}

/**
 * @typedef {object} DashboardSlice
 * @property {import('../types.js').Stock[]} stockUniverse
 * @property {import('../types.js').ScanResult[]} lastScanResults
 * @property {import('../types.js').Position[]} myPositions
 * @property {import('../types.js').StrategyEngine[]} lastActiveStrategies
 * @property {'synthetic'|'live'|'mixed'} dataSource
 * @property {string|null} lastQuoteTime
 * @property {string|null} lastScanTime
 * @property {{ totalStocks: number, topBuys: number, strategies: Record<string, boolean> }|null} scanConfig
 * @property {{ buys: import('../types.js').ScanResult[], totalBuyCount: number }|null} buyDeskCache
 * @property {{ aiPicks: import('../types.js').ScanResult[], aiResponse: object|null }|null} aiDeskCache
 */

/** @returns {DashboardSlice} */
function createEmptySlice() {
  return {
    stockUniverse: [],
    lastScanResults: [],
    myPositions: [],
    lastActiveStrategies: [],
    dataSource: 'synthetic',
    lastQuoteTime: null,
    lastScanTime: null,
    scanConfig: null,
    buyDeskCache: null,
    aiDeskCache: null,
  };
}

/** @type {Record<string, DashboardSlice>} */
const slices = Object.fromEntries(MARKET_IDS.map((id) => [id, createEmptySlice()]));

/** @type {string} */
let activeMarket = 'US';

function activeSlice() {
  return slices[activeMarket];
}

export const store = {
  get stockUniverse() {
    return activeSlice().stockUniverse;
  },

  get lastScanResults() {
    return activeSlice().lastScanResults;
  },

  get lastActiveStrategies() {
    return activeSlice().lastActiveStrategies;
  },

  get myPositions() {
    return activeSlice().myPositions;
  },

  get dataSource() {
    return activeSlice().dataSource;
  },

  get lastQuoteTime() {
    return activeSlice().lastQuoteTime;
  },

  get lastScanTime() {
    return activeSlice().lastScanTime;
  },

  get scanConfig() {
    return activeSlice().scanConfig;
  },

  get buyDeskCache() {
    return activeSlice().buyDeskCache;
  },

  get aiDeskCache() {
    return activeSlice().aiDeskCache;
  },

  get activeMarket() {
    return activeMarket;
  },

  get currentUserId() {
    return currentUserId;
  },

  /**
   * Reset all dashboard state and bind to a user account.
   * @param {string|null} userId
   */
  setCurrentUser(userId) {
    currentUserId = userId;
    for (const id of MARKET_IDS) {
      slices[id] = createEmptySlice();
    }
    if (!userId) {
      activeMarket = 'US';
      return;
    }
    const saved = typeof localStorage !== 'undefined'
      ? localStorage.getItem(marketStorageKey(userId))
      : null;
    activeMarket = saved && getMarketConfig(saved) ? saved : 'US';
  },

  getMarketConfig() {
    return getMarketConfig(activeMarket);
  },

  /**
   * Switch dashboard — preserves each market's universe, scan, and portfolio.
   * @param {string} marketId
   */
  setActiveMarket(marketId) {
    const next = getMarketConfig(marketId).id;
    if (next === activeMarket) return;

    activeMarket = next;
    if (typeof localStorage !== 'undefined' && currentUserId) {
      localStorage.setItem(marketStorageKey(currentUserId), activeMarket);
    }
  },

  getUniverse() {
    const s = activeSlice();
    const config = getMarketConfig(activeMarket);
    if (s.stockUniverse.length === 0) {
      s.stockUniverse = generateSyntheticUniverse(config.maxUniverse, activeMarket);
      s.dataSource = 'synthetic';
    }
    return s.stockUniverse;
  },

  /**
   * @param {import('../types.js').Stock[]} stocks
   * @param {'synthetic'|'live'|'mixed'} source
   */
  setUniverse(stocks, source = 'live') {
    const s = activeSlice();
    s.stockUniverse = stocks;
    s.dataSource = source;
  },

  setScanResults(results, activeStrategies = []) {
    const s = activeSlice();
    s.lastScanResults = results;
    s.lastActiveStrategies = activeStrategies;
  },

  setScanConfig(config) {
    activeSlice().scanConfig = config;
  },

  setLastScanTime(time) {
    activeSlice().lastScanTime = time;
  },

  setBuyDeskCache(buys, totalBuyCount) {
    activeSlice().buyDeskCache = { buys, totalBuyCount };
  },

  setAIDeskCache(aiPicks, aiResponse) {
    activeSlice().aiDeskCache = { aiPicks, aiResponse };
  },

  async setPositions(positions) {
    activeSlice().myPositions = positions;
    await savePositions(positions, activeMarket);
  },

  async initPortfolio() {
    const all = await loadAllMarketPositions();
    for (const id of MARKET_IDS) {
      slices[id].myPositions = all[id] ?? [];
    }
    return activeSlice().myPositions;
  },

  async persistPortfolio() {
    await savePositions(activeSlice().myPositions, activeMarket);
  },

  async addOrUpdatePosition(ticker, buyPrice, quantity) {
    const s = activeSlice();
    const normalized = ticker.toUpperCase();
    const qty = quantity > 0 ? quantity : 1;
    const existing = s.myPositions.find((p) => p.ticker === normalized);

    if (existing) {
      existing.buyPrice = buyPrice;
      existing.quantity = qty;
      await savePositions(s.myPositions, activeMarket);
      return { updated: true, position: existing };
    }

    const position = {
      ticker: normalized,
      buyPrice,
      quantity: qty,
      addedAt: new Date().toISOString(),
    };
    s.myPositions.push(position);
    await savePositions(s.myPositions, activeMarket);
    return { updated: false, position };
  },

  async removePosition(ticker) {
    const s = activeSlice();
    const normalized = ticker.toUpperCase();
    s.myPositions = s.myPositions.filter((p) => p.ticker !== normalized);
    await savePositions(s.myPositions, activeMarket);
  },

  findStock(ticker) {
    const key = ticker.toUpperCase();
    return activeSlice().stockUniverse.find((s) => s.ticker.toUpperCase() === key);
  },

  getMarketPrice(ticker) {
    const stock = this.findStock(ticker);
    return stock ? stock.currentPrice : null;
  },

  async refreshPortfolioQuotes() {
    const s = activeSlice();
    const tickers = s.myPositions.map((p) => p.ticker);
    if (tickers.length === 0) return { quotes: {}, failed: [] };

    this.getUniverse();
    const { quotes, failed, fetchedAt } = await fetchLiveQuotes(tickers, activeMarket);
    applyQuotesToUniverse(s.stockUniverse, quotes);
    s.lastQuoteTime = fetchedAt;
    if (Object.keys(quotes).length > 0) {
      s.dataSource = s.stockUniverse.some((st) => st.isLive) ? 'mixed' : s.dataSource;
    }
    return { quotes, failed };
  },

  /**
   * @param {number} count
   * @param {(progress: { done: number, total: number }) => void} [onProgress]
   */
  async loadLiveUniverse(count, onProgress) {
    const s = activeSlice();
    const config = getMarketConfig(activeMarket);
    const tickers = buildUniqueTickerList(count, activeMarket).slice(0, count);
    const fetchTickers = [...new Set([...tickers, config.benchmark])];
    const synthetic = generateSyntheticUniverse(count, activeMarket);

    onProgress?.({ done: 0, total: fetchTickers.length });

    const { stocks, failed, fetchedAt } = await fetchUniverseStocks(fetchTickers, 6, activeMarket);

    onProgress?.({ done: fetchTickers.length, total: fetchTickers.length });

    s.stockUniverse = mergeLiveWithSynthetic(stocks, synthetic);
    s.lastQuoteTime = fetchedAt;
    s.dataSource = failed.length === 0 ? 'live' : 'mixed';

    return { loaded: stocks.length, failed, fetchedAt };
  },
};
