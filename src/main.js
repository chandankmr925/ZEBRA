import './styles/main.css';
import { initApp } from './ui/app.js';

document.addEventListener('DOMContentLoaded', () => {
  initApp().catch((err) => {
    console.error('Failed to start application:', err);
  });
});
