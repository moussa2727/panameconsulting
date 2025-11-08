import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import AOS from 'aos';
import 'aos/dist/aos.css';
import ErrorBoundary from './components/ErrorBoundary';
import { useAuth } from './utils/AuthContext';

// Components communs
import Header from './components/Header';
import Footer from './components/Footer';
import Loader from './components/Loader';

// Pages publiques
import Accueil from './pages/Accueil';
import Contact from './pages/Contact';
import Propos from './pages/Propos';
import Services from './pages/Services';
import NotFound from './pages/Notfound';
import RendezVous from './pages/user/Rendez-Vous';

// Pages de connexion, inscription, mot de passe oublié
import Connexion from './pages/Connexion';
import Inscription from './pages/Inscription';
import MotdePasseoublie from './pages/MotdePasseoublie';

// Pages admin (lazy loaded)
const UsersManagement = lazy(() => import('./pages/admin/UsersManagement'));
const AdminLayout = lazy(() => import('./AdminLayout'));
const AdminMessages = lazy(() => import('./pages/admin/AdminMessages'));
const AdminProfile = lazy(() => import('./pages/admin/AdminProfile'));
const AdminProcedure = lazy(() => import('./pages/admin/AdminProcedure'));
const AdminDestinations = lazy(() => import('./pages/admin/AdminDestinations'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));

// Restrictions admin
import RequireAdmin from './utils/RequireAdmin';

import MesRendezVous from './pages/user/MesRendezVous';
import UserProfile from './pages/user/UserProfile';
import UserProcedure from './pages/user/UserProcedure';
import AdminRendezVous from './pages/admin/AdminRendez-Vous';

// Layout pour les pages publiques
const PublicLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className='flex flex-col min-h-screen w-full overflow-x-hidden touch-pan-y'>
      <Header />
      <main className='flex-1 mt-20'>
        {children}
      </main>
      <Footer />
    </div>
  );
};

// Layout minimal sans Header ni Footer
const MinimalLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className='flex flex-col min-h-screen w-full overflow-x-hidden touch-pan-y'>
      <main className='flex-1'>
        {children}
      </main>
    </div>
  );
};

// Layout pour les pages d'authentification
const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className='flex flex-col min-h-screen w-full overflow-x-hidden touch-pan-y'>
      <main className='flex-1'>
        {children}
      </main>
    </div>
  );
};

// Layout pour les pages utilisateur
const UserLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className='flex flex-col min-h-screen w-full overflow-x-hidden touch-pan-y'>
      <main className='flex-1'>
        {children}
      </main>
    </div>
  );
};

function App() {
  const location = useLocation();
  const [navigationKey, setNavigationKey] = useState(0);
  const { isLoading } = useAuth();
  const [isAOSInitialized, setIsAOSInitialized] = useState(false);

  const safeScrollToTop = useCallback((behavior: ScrollBehavior = 'smooth') => {
    try {
      window.scrollTo({
        top: 0,
        behavior: behavior,
      });
    } catch (error) {
      // Fallback pour les navigateurs qui ne supportent pas le scroll smooth
      window.scrollTo(0, 0);
    }
  }, []);

  // Gestion du scroll en haut lors du changement de route
  useEffect(() => {
    safeScrollToTop();

    const handlePopState = () => {
      safeScrollToTop('auto');
      setNavigationKey(prev => prev + 1);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [location.pathname, safeScrollToTop]);

  // Initialisation optimisée de AOS
  useEffect(() => {
    if (typeof window === 'undefined' || isAOSInitialized) return;

    const initializeAOS = () => {
      const isMobile = window.innerWidth < 768;
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      
      // Configuration unique pour la propriété disable
      const shouldDisableAOS = prefersReducedMotion || isMobile;
      
      AOS.init({
        duration: isMobile ? 300 : 600,
        once: true,
        easing: 'ease-out-cubic',
        disable: shouldDisableAOS, // Une seule propriété disable
        offset: isMobile ? 20 : 50,
        delay: 0,
        // Désactive l'observer de mutations sur mobile pour les performances
        disableMutationObserver: isMobile,
      });

      setIsAOSInitialized(true);
    };

    // Attendre que le DOM soit complètement chargé
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeAOS);
    } else {
      initializeAOS();
    }

    return () => {
      document.removeEventListener('DOMContentLoaded', initializeAOS);
    };
  }, [isAOSInitialized]);

  // Re-initialiser AOS quand la largeur de la fenêtre change significativement
  useEffect(() => {
    if (!isAOSInitialized) return;

    const handleResize = () => {
      AOS.refresh();
    };

    // Délai pour éviter de rafraîchir trop souvent pendant le redimensionnement
    let resizeTimeout: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(handleResize, 250);
    };

    window.addEventListener('resize', debouncedResize);
    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', debouncedResize);
    };
  }, [isAOSInitialized]);

  // Gestionnaire d'erreurs global pour AOS
  useEffect(() => {
    const handleAOSError = (error: any) => {
      if (error?.message?.includes('AOS') || error?.message?.includes('animation')) {
        console.warn('AOS animation error caught:', error);
        return true;
      }
      return false;
    };

    const errorHandler = (event: ErrorEvent) => {
      if (handleAOSError(event.error)) {
        event.preventDefault();
      }
    };

    window.addEventListener('error', errorHandler);
    return () => {
      window.removeEventListener('error', errorHandler);
    };
  }, []);

  return (
    <ErrorBoundary>
      <Helmet>
        {/* Balises principales */}
        <title>Paname Consulting - Études à l'Étranger, Voyages d'Affaires & Visas</title>
        <meta
          name="description"
          content="Paname Consulting : expert en accompagnement étudiant à l'étranger, organisation de voyages d'affaires et demandes de visa. Conseil personnalisé pour votre réussite internationale."
        />
        <meta
          name="keywords"
          content="Paname Consulting, accompagnement étudiant, visa études, voyage d'affaires, consultation immigration, études à l'étranger, conseil international"
        />

        {/* Balises Open Graph */}
        <meta property="og:title" content="Paname Consulting - Accompagnement Étudiant, Voyages d'Affaires & Visas" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.panameconsulting.com/" />
        <meta property="og:description" content="Services professionnels d'accompagnement pour études à l'étranger, voyages d'affaires et démarches de visa." />
        <meta property="og:locale" content="fr_FR" />
        <meta property="og:site_name" content="Paname Consulting" />

        {/* Balises Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Paname Consulting - Études à l'Étranger, Voyages d'Affaires & Visas" />
        <meta name="twitter:description" content="Expert en accompagnement étudiant à l'étranger et démarches de visa." />

        {/* Canonical */}
        <link rel="canonical" href="https://www.panameconsulting.com/" />
      </Helmet>

      <div key={navigationKey}>
        <Routes>
          {/* Routes publiques avec Header et Footer communs */}
          <Route path='/' element={
            isLoading ? (
              <Loader />
            ) : (
              <PublicLayout>
                <Accueil />
              </PublicLayout>
            )
          } />
          <Route path='/services' element={
            <PublicLayout>
              <Services />
            </PublicLayout>
          } />
          <Route path='/contact' element={
            <PublicLayout>
              <Contact />
            </PublicLayout>
          } />
          <Route path='/a-propos' element={
            <PublicLayout>
              <Propos />
            </PublicLayout>
          } />
          
          {/* RendezVous - sans Header/Footer */}
          <Route path='/rendez-vous' element={
            <MinimalLayout>
              <RendezVous />
            </MinimalLayout>
          } />

          {/* Auth - sans Header/Footer communs */}
          <Route path='/connexion' element={
            <AuthLayout>
              <Connexion />
            </AuthLayout>
          } />
          <Route path='/inscription' element={
            <AuthLayout>
              <Inscription />
            </AuthLayout>
          } />
          <Route path='/mot-de-passe-oublie' element={
            <AuthLayout>
              <MotdePasseoublie />
            </AuthLayout>
          } />

          {/* Utilisateur - sans Header/Footer communs */}
          <Route path='/mes-rendez-vous' element={
            <UserLayout>
              <MesRendezVous />
            </UserLayout>
          } />
          <Route path='/mon-profil' element={
            <UserLayout>
              <UserProfile />
            </UserLayout>
          } />
          <Route path='/ma-procedure' element={
            <UserLayout>
              <UserProcedure />
            </UserLayout>
          } />

          {/* Administration - utilise AdminLayout */}
          <Route path='/gestionnaire/*' element={
            <RequireAdmin>
              <Suspense fallback={<Loader />}>
                <AdminLayout />
              </Suspense>
            </RequireAdmin>
          }>
            <Route index element={<Navigate to="statistiques" replace />} />
            <Route path='utilisateurs' element={
              <Suspense fallback={<Loader />}>
                <UsersManagement />
              </Suspense>
            } />
            <Route path='statistiques' element={
              <Suspense fallback={<Loader />}>
                <AdminDashboard />
              </Suspense>
            } />
            <Route path='messages' element={
              <Suspense fallback={<Loader />}>
                <AdminMessages />
              </Suspense>
            } />
            <Route path='procedures' element={
              <Suspense fallback={<Loader />}>
                <AdminProcedure />
              </Suspense>
            } />
            <Route path='profil' element={
              <Suspense fallback={<Loader />}>
                <AdminProfile />
              </Suspense>
            } />
            <Route path='destinations' element={
              <Suspense fallback={<Loader />}>
                <AdminDestinations />
              </Suspense>
            } />
            <Route path='rendez-vous' element={
              <Suspense fallback={<Loader />}>
                <AdminRendezVous />
              </Suspense>
            } />
          </Route>

          {/* Routes obsolètes - redirections pour compatibilité */}
          <Route path='/user-rendez-vous' element={<Navigate to="/mes-rendez-vous" replace />} />
          <Route path='/user-profile' element={<Navigate to="/mon-profil" replace />} />
          <Route path='/user-procedure' element={<Navigate to="/ma-procedure" replace />} />

          {/* Routes de protection contre accès non autorisé */}
          <Route path='/admin' element={<NotFound />} />
          <Route path='/admin/*' element={<NotFound />} />

          {/* Route 404 */}
          <Route path='*' element={<NotFound />} />
        </Routes>
      </div>
    </ErrorBoundary>
  );
}

export default App;