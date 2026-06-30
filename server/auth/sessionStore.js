/** In-memory session store with optional disk persistence */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createSessionToken } from './crypto.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SESSIONS_FILE = path.join(ROOT, 'data', 'sessions.json');
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** @type {Map<string, { userId: string, username: string, expires: number }>} */
const sessions = new Map();

let loaded = false;

async function loadSessions() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await fs.readFile(SESSIONS_FILE, 'utf-8');
    const data = JSON.parse(raw);
    if (Array.isArray(data.sessions)) {
      for (const s of data.sessions) {
        if (s.token && s.userId && s.expires > Date.now()) {
          sessions.set(s.token, s);
        }
      }
    }
  } catch {
    /* no sessions file yet */
  }
}

async function persistSessions() {
  const list = [...sessions.entries()].map(([token, s]) => ({ token, ...s }));
  await fs.mkdir(path.dirname(SESSIONS_FILE), { recursive: true });
  await fs.writeFile(SESSIONS_FILE, JSON.stringify({ sessions: list }, null, 2), 'utf-8');
}

/**
 * @param {string} userId
 * @param {string} username
 */
export async function createSession(userId, username) {
  await loadSessions();
  const token = createSessionToken();
  const entry = {
    userId,
    username,
    expires: Date.now() + SESSION_TTL_MS,
  };
  sessions.set(token, entry);
  await persistSessions();
  return { token, expiresAt: new Date(entry.expires).toISOString() };
}

/**
 * @param {string} token
 */
export async function getSession(token) {
  if (!token) return null;
  await loadSessions();
  const s = sessions.get(token);
  if (!s) return null;
  if (s.expires <= Date.now()) {
    sessions.delete(token);
    await persistSessions();
    return null;
  }
  return s;
}

/**
 * @param {string} token
 */
export async function revokeSession(token) {
  if (!token) return;
  await loadSessions();
  sessions.delete(token);
  await persistSessions();
}
