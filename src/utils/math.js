/** General math utilities */

export function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

export function round2(n) {
  return Math.round(n * 100) / 100;
}

export function getCloses(history) {
  return history.map((b) => b.close);
}
