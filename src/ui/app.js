/** Application controller — wires UI events to engines and store */

import { MAX_UNIVERSE_SIZE } from '../config/constants.js';
import { fetchStockHistory } from '../data/marketClient.js';
import { auditPosition, runPortfolioAudit } from '../engines/portfolioAudit.js';
import { getTopAIRecommendations, explainTickerDeepDive, recommendPortfolioPosition } from '../engines/aiRecommender.js';
import {
  buildPortfolioSignalDesk,
  countBuyCandidates,
  getTopBuyCandidates,
  scanSingleStock,
  scanUniverse,
} from '../engines/scanEngine.js';
import { fetchAIRecommendations, fetchExplainTicker } from '../data/recommendClient.js';
import { getActiveStrategies, strategyRegistry } from '../strategies/index.js';
import { store } from '../state/store.js';
import { clamp } from '../utils/math.js';
import { renderer } from './render.js';

function updateStatusBar() {
  renderer.setUniverseCount(store.stockUniverse.length);
  renderer.setDataSource(store.dataSource, store.lastQuoteTime);
}

function attachPortfolioAI(audits) {
  return audits.map((row) => ({
    ...row,
    portfolioAi: recommendPortfolioPosition(row.position, row.scanResult ?? null, row.audit),
  }));
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
    const audits = attachPortfolioAI(
      await runPortfolioAudit(
        store.myPositions,
        store.lastScanResults,
        universe,
        strategies
      )
    );
    renderer.renderPortfolio(audits, handleRemovePosition);
    renderer.renderPortfolioSignalDesk(buildPortfolioSignalDesk(audits));
    return;
  }

  const preScanAudits = store.myPositions.map((pos) => {
    const stock = store.findStock(pos.ticker);
    const audit = auditPosition(pos, null, stock);
    return {
      position: pos,
      audit,
      scanResult: null,
      portfolioAi: recommendPortfolioPosition(pos, null, audit),
    };
  });
  renderer.renderPortfolio(preScanAudits, handleRemovePosition);
  renderer.renderPortfolioSignalDesk(buildPortfolioSignalDesk(preScanAudits));
}

async function executeBulkScan() {
  const config = renderer.getScanConfig();
  const totalStocks = clamp(config.totalStocks, 10, MAX_UNIVERSE_SIZE);
  const topBuys = clamp(config.topBuys, 1, 100);
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
    const totalBuyCount = countBuyCandidates(results);
    const aiPicks = getTopAIRecommendations(results, 10);

    renderer.setScanning(true, 'Generating AI recommendations…');
    const aiResponse = await fetchAIRecommendations(results, 10);
    renderer.renderAIDesk(aiPicks, aiResponse);

    renderer.renderBuyDesk(buys, totalBuyCount);

    const audits = attachPortfolioAI(
      await runPortfolioAudit(store.myPositions, results, universe, activeStrategies)
    );
    renderer.renderPortfolio(audits, handleRemovePosition);
    renderer.renderPortfolioSignalDesk(buildPortfolioSignalDesk(audits));

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
  const { ticker, buyPrice, quantity } = renderer.getPositionInput();

  if (!ticker) {
    renderer.setPortfolioMessage('Enter a valid ticker symbol.', 'error');
    return;
  }
  if (!buyPrice || buyPrice <= 0) {
    renderer.setPortfolioMessage('Enter a valid buy price greater than zero.', 'error');
    return;
  }
  if (!quantity || quantity <= 0) {
    renderer.setPortfolioMessage('Enter a valid quantity (shares) greater than zero.', 'error');
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

  const { updated } = await store.addOrUpdatePosition(ticker, buyPrice, quantity);
  const costBasis = buyPrice * quantity;
  renderer.setPortfolioMessage(
    updated
      ? `Updated ${ticker}: ${quantity} @ $${buyPrice.toFixed(2)} (cost basis $${costBasis.toFixed(2)}).`
      : `Added ${quantity} ${ticker} @ $${buyPrice.toFixed(2)} — cost basis $${costBasis.toFixed(2)} (live: $${stock.currentPrice.toFixed(2)}/sh).`,
    'success'
  );
  renderer.clearPositionInputs();
  await refreshPortfolio();
}

function handleEditPosition(ticker) {
  const normalized = ticker.toUpperCase();
  const position = store.myPositions.find((p) => p.ticker.toUpperCase() === normalized);
  if (!position) return;

  renderer.loadPositionForEdit(position);
  renderer.setPortfolioMessage(`Editing ${position.ticker} — update price or quantity, then click Update Position.`, 'neutral');
}

function handleCancelEdit() {
  renderer.clearPositionInputs();
  renderer.setPortfolioMessage('Edit cancelled.', 'neutral');
}

async function handleRemovePosition(ticker) {
  if (renderer.getEditingTicker() === ticker.toUpperCase()) {
    renderer.clearPositionInputs();
  }
  await store.removePosition(ticker);
  await refreshPortfolio();
}

/**
 * @param {string} ticker
 */
async function handleExplainTicker(ticker) {
  const normalized = ticker.trim().toUpperCase();
  if (!normalized) {
    renderer.setPortfolioMessage('Enter a ticker to explain.', 'error');
    return;
  }

  renderer.openExplainModal(normalized, true);

  try {
    const strategies =
      store.lastActiveStrategies.length > 0
        ? store.lastActiveStrategies
        : getActiveStrategies(renderer.getScanConfig().strategies);

    if (strategies.length === 0) {
      renderer.renderExplainContent({
        ticker: normalized,
        name: normalized,
        sector: '—',
        price: 0,
        ai: { recommendation: 'N/A', confidence: 0, aiScore: 0, summary: '', bullFactors: [], bearFactors: [], conflicts: [], categoryScores: {}, source: 'local' },
        consensus: { classification: 'HOLD', score: 0, rsi: null },
        signalTally: { buy: 0, sell: 0, hold: 0, total: 0 },
        categoryBreakdown: [],
        strategiesBySignal: { BUY: [], SELL: [], HOLD: [] },
        conflicts: [],
        bullFactors: [],
        bearFactors: [],
        verdict: 'Select at least one strategy engine before running an explanation.',
        actionPlan: ['Enable strategies in Scan Control Center, then try again.'],
        portfolioNote: null,
        source: 'local',
      });
      return;
    }

    let scanResult = store.lastScanResults.find((r) => r.ticker.toUpperCase() === normalized);

    if (!scanResult) {
      let stock = store.findStock(normalized);
      if (!stock) {
        renderer.setScanning(true, `Fetching ${normalized}…`);
        stock = await fetchStockHistory(normalized);
        const universe = store.getUniverse();
        universe.push(stock);
        store.setUniverse(universe, 'mixed');
        updateStatusBar();
        renderer.setScanning(false);
      }
      scanResult = scanSingleStock(stock, strategies, store.getUniverse());
    }

    const position = store.myPositions.find((p) => p.ticker.toUpperCase() === normalized);
    let portfolioContext = null;

    if (position) {
      const stock = store.findStock(normalized);
      const audit = auditPosition(position, scanResult, stock);
      const portfolioAi = recommendPortfolioPosition(position, scanResult, audit);
      portfolioContext = {
        buyPrice: position.buyPrice,
        quantity: position.quantity,
        costBasis: audit.costBasis,
        marketValue: audit.marketValue,
        pnlDollars: audit.pnlDollars,
        returnPct: audit.returnPct,
        action: audit.action,
        portfolioAdvice: portfolioAi.advice,
      };
    }

    let explanation = await fetchExplainTicker(scanResult, portfolioContext);
    if (!explanation) {
      explanation = explainTickerDeepDive(scanResult, portfolioContext);
    }

    renderer.renderExplainContent(explanation);
  } catch (err) {
    console.error('Explain failed:', err);
    renderer.renderExplainContent({
      ticker: normalized,
      name: normalized,
      sector: '—',
      price: 0,
      ai: { recommendation: 'ERROR', confidence: 0, aiScore: 0, summary: err.message, bullFactors: [], bearFactors: [], conflicts: [], categoryScores: {}, source: 'local' },
      consensus: { classification: 'HOLD', score: 0, rsi: null },
      signalTally: { buy: 0, sell: 0, hold: 0, total: 0 },
      categoryBreakdown: [],
      strategiesBySignal: { BUY: [], SELL: [], HOLD: [] },
      conflicts: [],
      bullFactors: [],
      bearFactors: [],
      verdict: `Could not analyze ${normalized}: ${err.message}`,
      actionPlan: ['Verify the ticker symbol and ensure npm run dev is running.'],
      portfolioNote: null,
      source: 'local',
    });
  }
}

function bindEvents() {
  document.getElementById('btnScan').addEventListener('click', executeBulkScan);
  document.getElementById('btnAddPosition').addEventListener('click', handleAddPosition);
  document.getElementById('btnCancelEdit').addEventListener('click', handleCancelEdit);
  document.getElementById('btnExplainTicker').addEventListener('click', () => {
    handleExplainTicker(renderer.getExplainTickerInput());
  });
  document.getElementById('btnCloseExplain').addEventListener('click', () => renderer.closeExplainModal());
  document.getElementById('explainBackdrop').addEventListener('click', () => renderer.closeExplainModal());

  document.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.btn-edit');
    if (editBtn?.dataset.edit) {
      e.preventDefault();
      handleEditPosition(editBtn.dataset.edit);
      return;
    }

    const btn = e.target.closest('.btn-explain');
    if (btn?.dataset.explain) {
      e.preventDefault();
      handleExplainTicker(btn.dataset.explain);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (renderer.getEditingTicker()) {
        handleCancelEdit();
        return;
      }
      renderer.closeExplainModal();
    }
  });

  const explainInput = document.getElementById('inputExplainTicker');
  if (explainInput) {
    explainInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleExplainTicker(renderer.getExplainTickerInput());
    });
  }

  const onEnter = (e) => {
    if (e.key === 'Enter') handleAddPosition();
  };
  document.getElementById('inputTicker').addEventListener('keydown', onEnter);
  document.getElementById('inputBuyPrice').addEventListener('keydown', onEnter);
  document.getElementById('inputQuantity').addEventListener('keydown', onEnter);
}

export async function initApp() {
  store.getUniverse();
  renderer.populateStrategyCheckboxes(strategyRegistry);
  await store.initPortfolio();
  updateStatusBar();
  bindEvents();
  await refreshPortfolio();
}
