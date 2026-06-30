/** Application controller — wires UI events to engines and store */

import { MAX_UNIVERSE_SIZE } from '../config/constants.js';
import { auditPosition, runPortfolioAudit } from '../engines/portfolioAudit.js';
import { getTopBuyCandidates, getTopHoldCandidates, scanUniverse } from '../engines/scanEngine.js';
import { getActiveStrategies } from '../strategies/index.js';
import { store } from '../state/store.js';
import { calculateRSI, getCloses } from '../utils/technical.js';
import { clamp } from '../utils/math.js';
import { renderer } from './render.js';

async function refreshPortfolio() {
  if (store.lastScanResults.length > 0) {
    const audits = await runPortfolioAudit(store.myPositions, store.lastScanResults);
    renderer.renderPortfolio(audits, handleRemovePosition);
    return;
  }

  const preScanAudits = store.myPositions.map((pos) => {
    const stock = store.findStock(pos.ticker);
    const scanResult = stock
      ? {
          price: stock.currentPrice,
          score: 0,
          classification: 'HOLD',
          rsi: calculateRSI(getCloses(stock.history)),
        }
      : null;
    return { position: pos, audit: auditPosition(pos, scanResult) };
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

  renderer.setScanning(true);

  const universe = store.ensureUniverseSize(totalStocks);
  renderer.setUniverseCount(universe.length);

  await new Promise((r) => setTimeout(r, 30));

  const results = scanUniverse(universe.slice(0, totalStocks), activeStrategies);
  store.setScanResults(results);

  const buys = getTopBuyCandidates(results, topBuys);
  const holds = getTopHoldCandidates(results, topHolds);
  const totalBuyCount = results.filter((r) => r.classification === 'BUY').length;
  const totalHoldCount = results.filter((r) => r.classification === 'HOLD').length;

  renderer.renderBuyDesk(buys, totalBuyCount);
  renderer.renderHoldDesk(holds, totalHoldCount);

  const audits = await runPortfolioAudit(store.myPositions, results);
  renderer.renderPortfolio(audits, handleRemovePosition);

  renderer.setLastScanTime(new Date().toLocaleTimeString());
  renderer.setScanning(false);
}

function handleAddPosition() {
  const { ticker, buyPrice } = renderer.getPositionInput();

  if (!ticker) {
    renderer.setPortfolioMessage('Enter a valid ticker symbol.', 'error');
    return;
  }
  if (!buyPrice || buyPrice <= 0) {
    renderer.setPortfolioMessage('Enter a valid buy price greater than zero.', 'error');
    return;
  }

  const { updated } = store.addOrUpdatePosition(ticker, buyPrice);
  renderer.setPortfolioMessage(
    updated ? `Updated position for ${ticker}.` : `Added ${ticker} @ $${buyPrice.toFixed(2)}.`,
    'success'
  );
  renderer.clearPositionInputs();
  refreshPortfolio();
}

function handleRemovePosition(ticker) {
  store.removePosition(ticker);
  refreshPortfolio();
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

export function initApp() {
  const universe = store.initUniverse(MAX_UNIVERSE_SIZE);
  store.seedDemoPositions();

  renderer.setUniverseCount(universe.length);
  bindEvents();
  refreshPortfolio();
}
