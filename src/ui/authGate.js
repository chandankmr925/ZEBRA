/** Login / register gate UI */

import { fetchCurrentUser, loginUser, logoutUser, registerUser } from '../data/authClient.js';

/** @type {((user: import('../data/authClient.js').AuthUser) => void)|null} */
let onAuthenticated = null;

function setMessage(text, type = 'error') {
  const el = document.getElementById('authMessage');
  if (!el) return;
  el.textContent = text;
  el.className =
    type === 'success'
      ? 'text-xs text-emerald-400 text-center'
      : type === 'neutral'
        ? 'text-xs text-slate-500 text-center'
        : 'text-xs text-red-400 text-center';
}

function showGate(show) {
  const gate = document.getElementById('authGate');
  const app = document.getElementById('appShell');
  if (gate) gate.classList.toggle('hidden', !show);
  if (app) app.classList.toggle('hidden', show);
  document.body.classList.toggle('overflow-hidden', show);
}

function setAuthMode(mode) {
  const isRegister = mode === 'register';
  document.getElementById('authLoginForm')?.classList.toggle('hidden', isRegister);
  document.getElementById('authRegisterForm')?.classList.toggle('hidden', !isRegister);
  document.getElementById('authTabLogin')?.classList.toggle('text-white', !isRegister);
  document.getElementById('authTabLogin')?.classList.toggle('bg-slate-700', !isRegister);
  document.getElementById('authTabLogin')?.classList.toggle('text-slate-400', isRegister);
  document.getElementById('authTabRegister')?.classList.toggle('text-white', isRegister);
  document.getElementById('authTabRegister')?.classList.toggle('bg-slate-700', isRegister);
  document.getElementById('authTabRegister')?.classList.toggle('text-slate-400', !isRegister);
  setMessage('', 'neutral');
}

/**
 * @param {import('../data/authClient.js').AuthUser} user
 */
function completeAuth(user) {
  showGate(false);
  onAuthenticated?.(user);
}

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('authLoginUsername')?.value?.trim();
  const password = document.getElementById('authLoginPassword')?.value;
  if (!username || !password) {
    setMessage('Enter username and password.');
    return;
  }

  const btn = document.getElementById('authLoginSubmit');
  if (btn) btn.disabled = true;
  setMessage('Signing in…', 'neutral');

  try {
    const session = await loginUser(username, password);
    completeAuth(session.user);
  } catch (err) {
    setMessage(err.message || 'Login failed.');
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const displayName = document.getElementById('authRegisterName')?.value?.trim();
  const username = document.getElementById('authRegisterUsername')?.value?.trim();
  const password = document.getElementById('authRegisterPassword')?.value;
  const confirm = document.getElementById('authRegisterConfirm')?.value;

  if (!username || !password) {
    setMessage('Username and password are required.');
    return;
  }
  if (password !== confirm) {
    setMessage('Passwords do not match.');
    return;
  }

  const btn = document.getElementById('authRegisterSubmit');
  if (btn) btn.disabled = true;
  setMessage('Creating account…', 'neutral');

  try {
    const { session, migratedLegacyPortfolio } = await registerUser(username, password, displayName);
    if (migratedLegacyPortfolio) {
      setMessage('Account created — your previous portfolio was imported.', 'success');
    }
    completeAuth(session.user);
  } catch (err) {
    setMessage(err.message || 'Registration failed.');
  } finally {
    if (btn) btn.disabled = false;
  }
}

function bindAuthEvents() {
  document.getElementById('authTabLogin')?.addEventListener('click', () => setAuthMode('login'));
  document.getElementById('authTabRegister')?.addEventListener('click', () => setAuthMode('register'));
  document.getElementById('authLoginForm')?.addEventListener('submit', handleLogin);
  document.getElementById('authRegisterForm')?.addEventListener('submit', handleRegister);
}

/**
 * @param {(user: import('../data/authClient.js').AuthUser) => void} callback
 */
export async function initAuthGate(callback) {
  onAuthenticated = callback;
  bindAuthEvents();
  setAuthMode('login');
  showGate(true);

  const user = await fetchCurrentUser();
  if (user) {
    completeAuth(user);
    return user;
  }

  return null;
}

/**
 * Sign out and return to login gate.
 * @param {() => void} [onLoggedOut]
 */
export async function signOut(onLoggedOut) {
  await logoutUser();
  showGate(true);
  setAuthMode('login');
  document.getElementById('authLoginUsername')?.focus();
  onLoggedOut?.();
}
