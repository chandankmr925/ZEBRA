/**
 * Format prices for display by market.
 * @param {number} amount
 * @param {string} [marketId]
 */
export function formatMoney(amount, marketId = 'US') {
  if (amount == null || Number.isNaN(amount)) return '—';
  const symbol = marketId === 'IN' ? '₹' : '$';
  const formatted = amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol}${formatted}`;
}

/**
 * @param {string} marketId
 */
export function getCurrencySymbol(marketId = 'US') {
  return marketId === 'IN' ? '₹' : '$';
}
