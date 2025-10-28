import React from 'react';
import ReactDOM from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './utils/AuthContext';
import App from './App';
import './index.css';

// Optimisation des event listeners pour les événements tactiles
const originalAddEventListener = EventTarget.prototype.addEventListener;
EventTarget.prototype.addEventListener = function (type, listener, options) {
  if (['touchstart', 'touchmove', 'wheel'].includes(type)) {
    const opts = typeof options === 'boolean' ? { capture: options } : options || {};
    opts.passive = true;
    return originalAddEventListener.call(this, type, listener, opts);
  }
  return originalAddEventListener.call(this, type, listener, options);
};

const rootElement = document.getElementById('root');

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <HelmetProvider>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </HelmetProvider>
    </React.StrictMode>
  );
}