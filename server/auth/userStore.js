/** File-based user accounts under data/users/ */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { hashPassword, verifyPassword } from './crypto.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const USERS_DIR = path.join(ROOT, 'data', 'users');

const USERNAME_RE = /^[a-zA-Z][a-zA-Z0-9_]{2,31}$/;

/**
 * @param {string} username
 */
export function normalizeUsername(username) {
  return username.trim().toLowerCase();
}

/**
 * @param {string} username
 */
export function validateUsername(username) {
  const n = normalizeUsername(username);
  if (!USERNAME_RE.test(n)) {
    return 'Username must be 3–32 characters, start with a letter, and use letters, numbers, or underscores only.';
  }
  return null;
}

/**
 * @param {string} password
 */
export function validatePassword(password) {
  if (!password || password.length < 6) {
    return 'Password must be at least 6 characters.';
  }
  if (password.length > 128) return 'Password is too long.';
  return null;
}

/**
 * @param {string} userId
 */
function userDir(userId) {
  return path.join(USERS_DIR, userId);
}

/**
 * @param {string} userId
 */
function accountPath(userId) {
  return path.join(userDir(userId), 'account.json');
}

async function ensureUsersDir() {
  await fs.mkdir(USERS_DIR, { recursive: true });
}

/**
 * @param {string} username
 */
export async function userExists(username) {
  const id = normalizeUsername(username);
  try {
    await fs.access(accountPath(id));
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string} username
 * @param {string} password
 * @param {string} [displayName]
 */
export async function createUser(username, password, displayName) {
  await ensureUsersDir();

  const id = normalizeUsername(username);
  const userError = validateUsername(username);
  if (userError) throw new Error(userError);
  const passError = validatePassword(password);
  if (passError) throw new Error(passError);

  if (await userExists(id)) {
    throw new Error('Username is already taken.');
  }

  const { hash, salt } = hashPassword(password);
  const account = {
    id,
    username: id,
    displayName: (displayName || username).trim().slice(0, 64) || id,
    passwordHash: hash,
    salt,
    createdAt: new Date().toISOString(),
  };

  await fs.mkdir(userDir(id), { recursive: true });
  await fs.writeFile(accountPath(id), `${JSON.stringify(account, null, 2)}\n`, 'utf-8');
  return sanitizeUser(account);
}

/**
 * @param {object} account
 */
function sanitizeUser(account) {
  return {
    id: account.id,
    username: account.username,
    displayName: account.displayName,
    createdAt: account.createdAt,
  };
}

/**
 * @param {string} username
 */
async function readAccount(username) {
  const id = normalizeUsername(username);
  const raw = await fs.readFile(accountPath(id), 'utf-8');
  return JSON.parse(raw);
}

/**
 * @param {string} username
 * @param {string} password
 */
export async function authenticateUser(username, password) {
  const id = normalizeUsername(username);
  try {
    const account = await readAccount(id);
    const ok = verifyPassword(password, account.salt, account.passwordHash);
    if (!ok) return null;
    return sanitizeUser(account);
  } catch {
    return null;
  }
}

/**
 * @param {string} userId
 */
export async function getUserById(userId) {
  try {
    const account = await readAccount(userId);
    return sanitizeUser(account);
  } catch {
    return null;
  }
}
