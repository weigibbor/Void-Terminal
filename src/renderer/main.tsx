import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles/global.css';

// Set platform for CSS scoping (native scrollbars, etc.)
window.void.app.getPlatform().then((platform: string) => {
  document.documentElement.dataset.platform = platform;
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
