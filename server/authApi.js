/** HTTP handlers for /api/auth/* */

import { createSession, getSession, revokeSession } from './auth/sessionStore.js';
import { getBearerToken } from './auth/requestAuth.js';
import {
  authenticateUser,
  createUser,
  getUserById,
  validatePassword,
  validateUsername,
} from './auth/userStore.js';
import { migrateLegacyPortfolioIfNeeded } from './userPortfolioFile.js';

/**
 * @param {import('http').IncomingMessage} req
 * @returns {Promise<unknown>}
 */
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

/**
 * @param {import('http').ServerResponse} res
 * @param {number} status
 * @param {unknown} payload
 */
function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 */
export async function handleAuthApi(req, res) {
  const url = new URL(req.url || '/', 'http://localhost');

  try {
    if (req.method === 'POST' && url.pathname === '/api/auth/register') {
      const body = await readJsonBody(req);
      const username = String(body.username || '');
      const password = String(body.password || '');
      const displayName = body.displayName ? String(body.displayName) : undefined;

      const userError = validateUsername(username);
      if (userError) {
        sendJson(res, 400, { error: userError });
        return;
      }
      const passError = validatePassword(password);
      if (passError) {
        sendJson(res, 400, { error: passError });
        return;
      }

      const user = await createUser(username, password, displayName);
      const migrated = await migrateLegacyPortfolioIfNeeded(user.id);
      const session = await createSession(user.id, user.username);

      sendJson(res, 201, {
        user,
        token: session.token,
        expiresAt: session.expiresAt,
        migratedLegacyPortfolio: migrated,
      });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/login') {
      const body = await readJsonBody(req);
      const username = String(body.username || '');
      const password = String(body.password || '');

      if (!username || !password) {
        sendJson(res, 400, { error: 'Username and password are required.' });
        return;
      }

      const user = await authenticateUser(username, password);
      if (!user) {
        sendJson(res, 401, { error: 'Invalid username or password.' });
        return;
      }

      const session = await createSession(user.id, user.username);
      sendJson(res, 200, {
        user,
        token: session.token,
        expiresAt: session.expiresAt,
      });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/logout') {
      const token = getBearerToken(req);
      await revokeSession(token);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/auth/me') {
      const token = getBearerToken(req);
      const session = await getSession(token);
      if (!session) {
        sendJson(res, 401, { error: 'Not authenticated' });
        return;
      }

      const user = await getUserById(session.userId);
      if (!user) {
        sendJson(res, 401, { error: 'User not found' });
        return;
      }

      sendJson(res, 200, { user, expiresAt: new Date(session.expires).toISOString() });
      return;
    }

    sendJson(res, 404, { error: 'Auth route not found' });
  } catch (err) {
    console.error('Auth API error:', err);
    const status = /username|password|already taken/i.test(err.message || '') ? 400 : 500;
    sendJson(res, status, { error: err.message || 'Authentication failed' });
  }
}
