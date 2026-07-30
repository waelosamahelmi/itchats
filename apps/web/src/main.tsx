import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import { initTheme } from './app/theme';
import { applyLanguage, getStoredLanguage } from './lib/i18n';
import './styles/global.css';

initTheme();
applyLanguage(getStoredLanguage());

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
