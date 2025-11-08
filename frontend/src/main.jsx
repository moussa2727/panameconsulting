import React from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './utils/AuthContext';
import App from './App';
import './index.css';

// Configuration du filtrage des erreurs en développement
const setupErrorFiltering = () => {
  if (!import.meta.env.DEV) return;

  const originalError = console.error;
  
  console.error = (...args) => {
    const message = args[0]?.toString() || '';
    
    // Filtrage des erreurs non critiques
    const shouldIgnore = [
      'gen_204',
      'ERR_BLOCKED_BY_CLIENT',
      'Google Maps JavaScript API', // Erreurs Google Maps non critiques
      'Lottie', // Erreurs d'animation non critiques
    ].some(pattern => message.includes(pattern));

    if (shouldIgnore) return;
    
    originalError.apply(console, args);
  };
};

// Gestion de la compatibilité User-Agent
const setupUserAgentCompatibility = () => {
  if (typeof navigator !== 'undefined' && navigator.userAgentData && !navigator.userAgentData.brands) {
    Object.defineProperty(navigator.userAgentData, 'brands', {
      value: [],
      writable: false,
      configurable: false,
    });
  }
};

// Optimisation des event listeners pour les performances
const optimizeEventListeners = () => {
  if (typeof window === 'undefined') return;

  const originalAddEventListener = EventTarget.prototype.addEventListener;
  
  EventTarget.prototype.addEventListener = function (type, listener, options) {
    const passiveEvents = ['touchstart', 'touchmove', 'touchend', 'wheel', 'mousewheel'];
    
    if (passiveEvents.includes(type)) {
      const opts = typeof options === 'boolean' ? { capture: options } : options || {};
      
      if (opts.passive === undefined) {
        opts.passive = true;
      }
      
      return originalAddEventListener.call(this, type, listener, opts);
    }
    
    return originalAddEventListener.call(this, type, listener, options);
  };
};

// Initialisation des configurations
const initializeApp = () => {
  setupErrorFiltering();
  setupUserAgentCompatibility();
  
  // Éviter l'optimisation en mode production pour la stabilité
  if (import.meta.env.DEV) {
    optimizeEventListeners();
  }
};

// Exécuter l'initialisation
initializeApp();

// Rendu de l'application
const renderApp = () => {
  const rootElement = document.getElementById('root');
  
  if (!rootElement) {
    console.error('Élément racine non trouvé');
    return;
  }

  try {
    const root = createRoot(rootElement);
    
    root.render(
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
  } catch (error) {
    console.error('Erreur lors du rendu de l\'application:', error);
  }
};

renderApp();