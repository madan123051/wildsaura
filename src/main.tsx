import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { IdentityGuardWrapper } from './components/IdentityGuardWrapper';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <IdentityGuardWrapper>
        <App />
      </IdentityGuardWrapper>
    </ErrorBoundary>
  </React.StrictMode>
);
