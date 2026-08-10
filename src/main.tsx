import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './styles.css';

// Wilds Aura now ships with one intentional editorial theme.
document.documentElement.setAttribute('data-theme', 'dark');
localStorage.removeItem('wa_theme');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// React has mounted and its CSS is ready; reveal the page without an extra delay.
const splash = document.getElementById('wa-splash');
splash?.remove();
