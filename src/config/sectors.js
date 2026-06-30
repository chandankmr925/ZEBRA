/** Sector profiles for synthetic price generation */

export const SECTORS = {
  Technology: { beta: 1.35, baseVol: 0.028, meanRev: 0.12, basePrice: [80, 600] },
  Healthcare: { beta: 0.95, baseVol: 0.018, meanRev: 0.10, basePrice: [40, 450] },
  Financials: { beta: 1.15, baseVol: 0.022, meanRev: 0.11, basePrice: [30, 380] },
  'Consumer Disc.': { beta: 1.20, baseVol: 0.024, meanRev: 0.10, basePrice: [50, 500] },
  'Consumer Staples': { beta: 0.70, baseVol: 0.012, meanRev: 0.14, basePrice: [40, 200] },
  Industrials: { beta: 1.05, baseVol: 0.020, meanRev: 0.11, basePrice: [60, 350] },
  Energy: { beta: 1.25, baseVol: 0.030, meanRev: 0.08, basePrice: [25, 180] },
  Utilities: { beta: 0.55, baseVol: 0.010, meanRev: 0.16, basePrice: [30, 120] },
  'Real Estate': { beta: 0.85, baseVol: 0.015, meanRev: 0.13, basePrice: [35, 150] },
  Materials: { beta: 1.10, baseVol: 0.023, meanRev: 0.09, basePrice: [40, 250] },
  Communication: { beta: 1.18, baseVol: 0.025, meanRev: 0.10, basePrice: [45, 400] },
};

export const SECTOR_KEYS = Object.keys(SECTORS);
