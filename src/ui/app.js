/** Application controller — wires UI events to engines and store */

import { MAX_UNIVERSE_SIZE } from '../config/constants.js';
import { fetchStockHistory } from '../data/marketClient.js';
import { auditPosition, runPortfolioAudit } from '../engines/portfolioAudit.js';
import { getTopBuyCandidates, getTopHoldCandidates, scanUniverse } from '../engines/scanEngine.js';
import { getActiveStrategies } from '../strategies/index.js';
import { store } from '../state/store.js';
import { clamp } from '../utils/math.js';
import { renderer } from './render.js';

function updateStatusBar() {
  renderer.setUniverseCount(store.stockUniverse.length);
  renderer.setDataSource(store.dataSource, store.lastQuoteTime);
}

async function refreshPortfolio() {
  if (store.myPositions.length > 0) {
    try {
      renderer.setScanning(true, 'Updating live quotes…');
      await store.refreshPortfolioQuotes();
      updateStatusBar();
    } catch (err) {
      console.warn('Live quote refresh failed:', err);
      renderer.setPortfolioMessage('Live quotes unavailable — using cached/synthetic prices.', 'error');
    } finally {
      renderer.setScanning(false);
    }
  }

  const universe = store.getUniverse();
  const strategies = store.lastActiveStrategies;

  if (store.lastScanResults.length > 0) {
    const audits = await runPortfolioAudit(
      store.myPositions,
      store.lastScanResults,
      universe,
      strategies
    );
    renderer.renderPortfolio(audits, handleRemovePosition);
    return;
  }

  const preScanAudits = store.myPositions.map((pos) => {
    const stock = store.findStock(pos.ticker);
    return {
      position: pos,
      audit: auditPosition(pos, null, stock),
    };
  });
  renderer.renderPortfolio(preScanAudits, handleRemovePosition);
}

async function executeBulkScan() {
  const config = renderer.getScanConfig();
  const totalStocks = clamp(config.totalStocks, 10, MAX_UNIVERSE_SIZE);
  const topBuys = clamp(config.topBuys, 1, 100);
  const topHolds = clamp(config.topHolds, 1, 100);
  const activeStrategies = getActiveStrategies(config.strategies);

  if (activeStrategies.length === 0) {
    alert('Please select at least one strategy engine.');
    return;
  }

  renderer.setScanning(true, `Fetching live data (0/${totalStocks})…`);

  try {
    const { loaded, failed } = await store.loadLiveUniverse(totalStocks, ({ total }) => {
      renderer.setScanning(true, `Fetching live data…`);
    });

    updateStatusBar();

    if (failed.length > 0) {
      console.warn('Some tickers failed live fetch:', failed);
    }

    renderer.setScanning(true, 'Running technical scan…');

    const universe = store.getUniverse();
    await store.refreshPortfolioQuotes();

    const results = scanUniverse(universe.slice(0, totalStocks), activeStrategies);
    store.setScanResults(results, activeStrategies);

    const buys = getTopBuyCandidates(results, topBuys);
    const holds = getTopHoldCandidates(results, topHolds);
    const totalBuyCount = results.filter((r) => r.classification === 'BUY').length;
    const totalHoldCount = results.filter((r) => r.classification === 'HOLD').length;

    renderer.renderBuyDesk(buys, totalBuyCount);
    renderer.renderHoldDesk(holds, totalHoldCount);

    const audits = await runPortfolioAudit(
      store.myPositions,
      results,
      universe,
      activeStrategies
    );
    renderer.renderPortfolio(audits, handleRemovePosition);

    renderer.setLastScanTime(new Date().toLocaleTimeString());
    renderer.setPortfolioMessage(
      `Scan complete — ${loaded} live tickers loaded${failed.length ? `, ${failed.length} fallback` : ''}.`,
      'success'
    );
  } catch (err) {
    console.error('Scan failed:', err);
    alert(`Market scan failed: ${err.message}\n\nEnsure you are running via npm run dev (not opening HTML directly).`);
  } finally {
    renderer.setScanning(false);
  }
}

async function handleAddPosition() {
  const { ticker, buyPrice } = renderer.getPositionInput();

  if (!ticker) {
    renderer.setPortfolioMessage('Enter a valid ticker symbol.', 'error');
    return;
  }
  if (!buyPrice || buyPrice <= 0) {
    renderer.setPortfolioMessage('Enter a valid buy price greater than zero.', 'error');
    return;
  }

  let stock = store.findStock(ticker);

  if (!stock) {
    try {
      renderer.setScanning(true, 'Fetching live quote…');
      stock = await fetchStockHistory(ticker);
      const universe = store.getUniverse();
      universe.push(stock);
      store.setUniverse(universe, 'mixed');
      updateStatusBar();
    } catch {
      renderer.setPortfolioMessage(
        `${ticker} could not be loaded from live market data. Check the symbol and try again.`,
        'error'
      );
      renderer.setScanning(false);
      return;
    } finally {
      renderer.setScanning(false);
    }
  }

  const { updated } = await store.addOrUpdatePosition(ticker, buyPrice);
  renderer.setPortfolioMessage(
    updated
      ? `Updated position for ${ticker}.`
      : `Added ${ticker} @ $${buyPrice.toFixed(2)} (live market: $${stock.currentPrice.toFixed(2)}).`,
    'success'
  );
  renderer.clearPositionInputs();
  await refreshPortfolio();
}

async function handleRemovePosition(ticker) {
  await store.removePosition(ticker);
  await refreshPortfolio();
}

function bindEvents() {
  document.getElementById('btnScan').addEventListener('click', executeBulkScan);
  document.getElementById('btnAddPosition').addEventListener('click', handleAddPosition);

  const onEnter = (e) => {
    if (e.key === 'Enter') handleAddPosition();
  };
  document.getElementById('inputTicker').addEventListener('keydown', onEnter);
  document.getElementById('inputBuyPrice').addEventListener('keydown', onEnter);
}

export async function initApp() {
  store.getUniverse();
  await store.initPortfolio();
  updateStatusBar();
  bindEvents();
  await refreshPortfolio();
}
