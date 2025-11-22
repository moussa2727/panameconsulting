import React, { useEffect, useState } from 'react';
import { X, ShieldOff, Phone, Mail } from 'lucide-react';

interface DesactivationNotifProps {
  isOpen: boolean;
  onClose: () => void;
}

const DesactivationNotif: React.FC<DesactivationNotifProps> = ({ 
  isOpen, 
  onClose 
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
  if (isOpen) {
    setIsVisible(true);
    
    // Vibration légère sur mobile (optionnel)
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
    
    // Fermeture automatique après 8 secondes
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Attendre la fin de l'animation
    }, 8000);

    return () => clearTimeout(timer);
  }
}, [isOpen, onClose]);


  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-labelledby="desactivation-title"
      aria-modal="true"
    >
      {/* Overlay */}
      <div 
        className={`absolute inset-0 bg-black transition-opacity duration-300 ${
          isVisible ? 'bg-opacity-50' : 'bg-opacity-0'
        }`}
        onClick={() => {
          setIsVisible(false);
          setTimeout(onClose, 300);
        }}
      />
      
      {/* Popover */}
      <div 
        className={`relative bg-white rounded-xl shadow-2xl border border-gray-200 max-w-md w-full transform transition-all duration-300 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        {/* En-tête */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-rose-50 to-pink-50 rounded-t-xl">
          <div className="flex items-center space-x-3">
            <div className="bg-rose-100 p-2 rounded-full">
              <ShieldOff className="w-6 h-6 text-rose-600" />
            </div>
            <div>
              <h3 id="desactivation-title" className="text-lg font-semibold text-gray-900">
                Compte Désactivé
              </h3>
              <p className="text-sm text-rose-600 font-medium">
                Accès temporairement suspendu
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(onClose, 300);
            }}
            className="p-1 hover:bg-rose-100 rounded-full transition-colors duration-200"
            aria-label="Fermer la notification"
          >
            <X className="w-5 h-5 text-gray-500 hover:text-rose-600" />
          </button>
        </div>

        {/* Contenu */}
        <div className="p-6 space-y-4">
          <div className="text-center">
            <p className="text-gray-700 text-sm leading-relaxed">
              Votre compte a été temporairement désactivé. Cette mesure peut résulter 
              d'une inactivité prolongée, d'une suspension automatique du système 
              ou d'une action manuelle de notre équipe d'administration.
            </p>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-600 text-center mb-3">
              Pour réactiver votre compte et retrouver l'accès à nos services :
            </p>
          </div>

          {/* Contact */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-6">
              {/* Téléphone */}
              <div className="flex items-center space-x-2">
                <div className="bg-blue-100 p-2 rounded-full">
                  <Phone className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Contactez notre support</p>
                  <a 
                    href="tel:+22391830941"
                    className="text-sm font-semibold text-blue-700 hover:text-blue-800 transition-colors"
                  >
                    +223 91 83 09 41
                  </a>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-center space-x-2">
                <div className="bg-blue-100 p-2 rounded-full">
                  <Mail className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Ou par email</p>
                  <a 
                    href="mailto:panameconsulting906@gmail.com"
                    className="text-sm font-semibold text-blue-700 hover:text-blue-800 transition-colors hover:underline"
                  >
                    panameconsulting906@gmail.com
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600 text-center">
              Notre équipe d'assistance est disponible du lundi au vendredi, 
              de 8h00 à 18h00. Nous nous engageons à traiter votre demande 
              dans les plus brefs délais.
            </p>
          </div>
        </div>

        {/* Pied de page */}
        <div className="bg-gray-50 rounded-b-xl px-6 py-3 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Paname Consulting • Service Client
            </p>
            <div className="flex items-center space-x-1">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 h-1 bg-rose-400 rounded-full animate-pulse"
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/// DesactivationNotif.tsx - Vérifiez la fin du fichier
const useDesactivationNotif = () => {
  const [showNotif, setShowNotif] = useState(false);

  const showDesactivationNotif = () => {
    setShowNotif(true);
  };

  const hideDesactivationNotif = () => {
    setShowNotif(false);
  };

  return {
    showDesactivationNotif,
    hideDesactivationNotif,
    DesactivationNotif: () => (
      <DesactivationNotif
        isOpen={showNotif}
        onClose={hideDesactivationNotif}
      />
    )
  };
};
export default useDesactivationNotif;
export { useDesactivationNotif };
