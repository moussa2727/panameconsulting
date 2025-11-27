import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import AOS from 'aos';
import 'aos/dist/aos.css';
import ErrorBoundary from './components/ErrorBoundary';
import { useAuth } from './context/AuthContext';

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
import RequireAdmin from './context/RequireAdmin';

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

function App() {
  const location = useLocation();
  const [navigationKey, setNavigationKey] = useState(0);
  const { isLoading } = useAuth();

  const safeScrollToTop = useCallback((behavior: ScrollBehavior = 'smooth') => {
    try {
      window.scrollTo({
        top: 0,
        behavior: behavior,
      });
    } catch (error) {
      window.scrollTo(0, 0);
    }
  }, []);

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

  // Initialize AOS once for the entire application
  useEffect(() => {
    if (typeof window !== 'undefined') {
      AOS.init({
        duration: window.innerWidth < 768 ? 300 : 600, // Shorter duration on mobile
        once: true,
        easing: 'ease-out-cubic',
        disable: false, // Enable AOS on all devices
        offset: window.innerWidth < 768 ? 20 : 50, // Smaller offset on mobile
        delay: 0,
        // Disable animations that might cause issues on mobile
        disableMutationObserver: window.innerWidth < 768
      });
    }

    return () => {
      AOS.refresh();
    };
  }, []);

  return (
    <ErrorBoundary>
      <Helmet>
        
        <meta
          name='description'
          content='Accompagnement pour études en France, obtention de visas et services consulaires'
        />
        <meta
          name='keywords'
          content='Paname Consulting, visa France, études France, accompagnement étudiant'
        />
        <meta property='og:title' content='Paname Consulting' />
        <meta property='og:type' content='website' />
        <meta property='og:url' content={window.location.href} />
        <link rel='canonical' href={window.location.href} />
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
          <Route path='/connexion' element={<Connexion />} />
          <Route path='/inscription' element={<Inscription />} />
          <Route path='/mot-de-passe-oublie' element={<MotdePasseoublie />} />

          {/* Utilisateur - sans Header/Footer communs */}
          <Route path='/user-rendez-vous' element={<MesRendezVous />} />
          <Route path='/user-profile' element={<UserProfile />} />
          <Route path='/user-procedure' element={<UserProcedure />} />

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

          {/* Routes spécifiques pour /admin/ qui doivent être NotFound */}
          <Route path='/admin' element={<NotFound />} />
          <Route path='/admin/*' element={<NotFound />} />

          {/* Route de protection contre accès non autorisé ou fausses routes */}
          <Route path='*' element={<NotFound />} />
        </Routes>
      </div>
    </ErrorBoundary>
  );
}

export default App;