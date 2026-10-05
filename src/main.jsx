import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/tokens.css';

// PERMANENT AUTH REMOVAL: Clear browser cache to force old auth state to be forgotten.
localStorage.clear();
sessionStorage.clear();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
