/** Password hashing and session token generation (Node crypto only) */

import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEY_LEN = 64;

/**
 * @param {string} password
 * @returns {{ hash: string, salt: string }}
 */
export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, KEY_LEN, SCRYPT_PARAMS).toString('hex');
  return { hash, salt };
}

/**
 * @param {string} password
 * @param {string} salt
 * @param {string} expectedHash
 */
export function verifyPassword(password, salt, expectedHash) {
  const derived = scryptSync(password, salt, KEY_LEN, SCRYPT_PARAMS);
  const expected = Buffer.from(expectedHash, 'hex');
  if (expected.length !== derived.length) return false;
  return timingSafeEqual(derived, expected);
}

/** @returns {string} */
export function createSessionToken() {
  return randomBytes(32).toString('hex');
}
