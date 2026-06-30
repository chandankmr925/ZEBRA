import './styles/main.css';
import { initAuthGate } from './ui/authGate.js';
import { initApp } from './ui/app.js';
import { store } from './state/store.js';

document.addEventListener('DOMContentLoaded', () => {
  initAuthGate(async (user) => {
    store.setCurrentUser(user.id);
    try {
      await initApp(user);
    } catch (err) {
      console.error('Failed to start application:', err);
    }
  }).catch((err) => {
    console.error('Auth initialization failed:', err);
  });
});
