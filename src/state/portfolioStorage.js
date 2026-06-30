/** Portfolio persistence — primary storage on disk via /api/portfolio */

const API_URL = '/api/portfolio';
const LEGACY_STORAGE_KEY = 'sp500-screener:portfolio';

/**
 * @param {unknown[]} list
 * @returns {import('../types.js').Position[]}
 */
function normalizeList(list) {
  if (!Array.isArray(list)) return [];

  return list
    .filter((p) => p && typeof p.ticker === 'string' && typeof p.buyPrice === 'number')
    .map((p) => ({
      ticker: p.ticker.toUpperCase(),
      buyPrice: p.buyPrice,
      quantity: typeof p.quantity === 'number' && p.quantity > 0 ? p.quantity : 1,
      addedAt: p.addedAt || new Date().toISOString(),
    }));
}

function loadLegacyLocalStorage() {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (raw === null) return null;
    return normalizeList(JSON.parse(raw));
  } catch {
    return null;
  }
}

function clearLegacyLocalStorage() {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Load portfolio from project drive (data/portfolio.json via API).
 * @returns {Promise<import('../types.js').Position[]>}
 */
export async function loadSavedPositions() {
  try {
    const res = await fetch(API_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    if (data.exists) {
      return normalizeList(data.positions);
    }

    // One-time migration from older browser-only storage
    const legacy = loadLegacyLocalStorage();
    if (legacy !== null) {
      await savePositions(legacy);
      clearLegacyLocalStorage();
      return legacy;
    }

    return [];
  } catch (err) {
    console.warn('Disk portfolio API unavailable, using localStorage fallback:', err);
    return loadLegacyLocalStorage() ?? [];
  }
}

/**
 * Save portfolio to project drive (data/portfolio.json).
 * @param {import('../types.js').Position[]} positions
 */
export async function savePositions(positions) {
  const payload = {
    positions: positions.map(({ ticker, buyPrice, quantity, addedAt }) => ({
      ticker,
      buyPrice,
      quantity,
      addedAt,
    })),
  };

  try {
    const res = await fetch(API_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    clearLegacyLocalStorage();
  } catch (err) {
    console.warn('Could not save portfolio to disk, falling back to localStorage:', err);
    try {
      localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(payload.positions));
    } catch {
      /* ignore */
    }
  }
}
