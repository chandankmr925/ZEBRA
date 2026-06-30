/** Seeded PRNG and distribution helpers */

export function createRNG(seed) {
  let s = seed >>> 0;
  return function next() {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function gaussianRandom(rng) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function tickerSeed(ticker, index) {
  return ticker.split('').reduce((a, c) => a + c.charCodeAt(0), 0) + index * 997;
}
