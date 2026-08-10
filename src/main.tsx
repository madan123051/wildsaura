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

// Remove splash screen once React has mounted
const splash = document.getElementById('wa-splash');
if (splash) {
  splash.style.transition = 'opacity 0.3s ease';
  splash.style.opacity = '0';
  setTimeout(() => splash.remove(), 300);
}
