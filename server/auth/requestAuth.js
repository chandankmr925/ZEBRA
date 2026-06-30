/** Extract and validate session from HTTP request */

import { getSession } from './sessionStore.js';

/**
 * @param {import('http').IncomingMessage} req
 */
export function getBearerToken(req) {
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) {
    return auth.slice(7).trim();
  }
  return null;
}

/**
 * @param {import('http').IncomingMessage} req
 */
export async function requireAuth(req) {
  const token = getBearerToken(req);
  const session = await getSession(token);
  if (!session) {
    const err = new Error('Authentication required');
    err.statusCode = 401;
    throw err;
  }
  return { token, userId: session.userId, username: session.username };
}
