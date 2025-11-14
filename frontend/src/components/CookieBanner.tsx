import { useState, useEffect, useCallback } from "react";
import Cookies from "js-cookie";
import { motion, AnimatePresence } from "framer-motion";

interface CookieConsentResponse {
  success: boolean;
  message?: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Délai minimum entre deux soumissions (en ms)
const SUBMISSION_COOLDOWN = 2000;

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSubmissionTime, setLastSubmissionTime] = useState<number>(0);
  const [toast, setToast] = useState<{show: boolean, message: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    const consent = Cookies.get("cookie_consent");
    // Only show banner if no consent has been given yet
    if (consent === undefined) {
      setVisible(true);
    }
  }, []);

  useEffect(() => {
    if (toast?.show) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleConsent = useCallback(async (accepted: boolean) => {
    const now = Date.now();
    const timeSinceLastSubmission = now - lastSubmissionTime;
    
    // Vérifier le délai minimum entre deux soumissions
    if (timeSinceLastSubmission < SUBMISSION_COOLDOWN) {
      setToast({
        show: true,
        message: `Veuillez patienter ${Math.ceil((SUBMISSION_COOLDOWN - timeSinceLastSubmission) / 1000)} secondes avant de réessayer`,
        type: 'error'
      });
      return;
    }

    setIsLoading(true);
    setLastSubmissionTime(now);

    try {
      // 🔥 CORRECTION : 4 semaines = 28 jours côté client aussi
      const FOUR_WEEKS_IN_DAYS = 28;
      
      // Mise à jour locale d'abord pour une meilleure expérience utilisateur
      Cookies.set("cookie_consent", String(accepted), { 
        expires: FOUR_WEEKS_IN_DAYS, // 🔥 4 semaines
        sameSite: 'strict',
        secure: window.location.protocol === 'https:'
      });

      // URL corrigée et données simplifiées
      const response = await fetch(`${API_URL}/api/auth/cookie-consent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ 
          accepted
        })
      });

      const data: CookieConsentResponse = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const waitTime = retryAfter ? parseInt(retryAfter, 10) : 30;
          throw new Error(`Trop de demandes. Veuillez réessayer dans ${waitTime} secondes.`);
        }
        throw new Error(data.message || `Erreur ${response.status} lors de la mise à jour du consentement`);
      }

      if (data.success) {
        setToast({
          show: true,
          message: data.message || "Vos préférences de confidentialité ont été mises à jour avec succès pour 4 semaines.",
          type: 'success'
        });
        setVisible(false);
      }
    } catch (err) {
      console.error("Erreur lors de la mise à jour du consentement:", err);
      setToast({
        show: true,
        message: err instanceof Error ? err.message : "Une erreur inattendue est survenue",
        type: 'error'
      });
      // En cas d'erreur, on ne cache pas la bannière
      setVisible(true);
    } finally {
      setIsLoading(false);
    }
  }, [lastSubmissionTime]);

  if (!visible) return null;

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed bottom-0 left-0 right-0 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 shadow-lg p-4 md:p-6 z-50"
          role="alertdialog"
          aria-labelledby="cookie-consent-heading"
          aria-describedby="cookie-consent-description"
        >
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex-1">
                <h2 id="cookie-consent-heading" className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                  Nous respectons votre vie privée
                </h2>
                <p id="cookie-consent-description" className="text-sm text-slate-700 dark:text-slate-300">
                  Nous utilisons des cookies pour améliorer votre expérience, sécuriser votre session et mesurer notre audience. 
                  En cliquant sur "Accepter", vous consentez à l'utilisation de ces cookies conformément à notre 
                  <a 
                    href="/politique-de-confidentialite" 
                    className="text-sky-600 dark:text-sky-400 hover:underline ml-1"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    politique de confidentialité
                  </a>. Votre consentement sera valide pendant 4 semaines.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => handleConsent(false)}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
                  aria-label="Refuser les cookies non essentiels"
                >
                  {isLoading ? 'Traitement...' : 'Refuser'}
                </button>
                <button
                  type="button"
                  onClick={() => handleConsent(true)}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-sky-600 border border-transparent rounded-lg hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none transition-colors"
                  aria-label="Accepter tous les cookies"
                >
                  {isLoading ? 'Traitement...' : 'Accepter'}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast?.show && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 ${
              toast.type === 'success' 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' 
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <span>{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}