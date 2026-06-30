/** Client-side authentication API */

const SESSION_KEY = 'zebra:session';

/**
 * @typedef {{ id: string, username: string, displayName: string, createdAt?: string }} AuthUser
 * @typedef {{ token: string, user: AuthUser, expiresAt?: string }} AuthSession
 */

/**
 * @returns {AuthSession|null}
 */
export function loadStoredSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.token || !parsed?.user?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * @param {AuthSession|null} session
 */
export function saveStoredSession(session) {
  if (!session) {
    localStorage.removeItem(SESSION_KEY);
    return;
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

/** @returns {string|null} */
export function getAuthToken() {
  return loadStoredSession()?.token ?? null;
}

/**
 * @param {string} path
 * @param {RequestInit} [init]
 */
async function authFetch(path, init = {}) {
  const token = getAuthToken();
  const headers = new Headers(init.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(path, { ...init, headers, cache: 'no-store' });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }

  return data;
}

/**
 * @param {string} username
 * @param {string} password
 * @param {string} [displayName]
 */
export async function registerUser(username, password, displayName) {
  const data = await authFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password, displayName }),
  });
  const session = { token: data.token, user: data.user, expiresAt: data.expiresAt };
  saveStoredSession(session);
  return { session, migratedLegacyPortfolio: data.migratedLegacyPortfolio === true };
}

/**
 * @param {string} username
 * @param {string} password
 */
export async function loginUser(username, password) {
  const data = await authFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  const session = { token: data.token, user: data.user, expiresAt: data.expiresAt };
  saveStoredSession(session);
  return session;
}

export async function logoutUser() {
  try {
    await authFetch('/api/auth/logout', { method: 'POST' });
  } catch {
    /* clear local session even if server call fails */
  }
  saveStoredSession(null);
}

/**
 * @returns {Promise<AuthUser|null>}
 */
export async function fetchCurrentUser() {
  const stored = loadStoredSession();
  if (!stored?.token) return null;

  try {
    const data = await authFetch('/api/auth/me');
    const session = { token: stored.token, user: data.user, expiresAt: data.expiresAt };
    saveStoredSession(session);
    return data.user;
  } catch (err) {
    if (err.status === 401) saveStoredSession(null);
    return null;
  }
}
