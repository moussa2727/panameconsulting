import React, { useState, useEffect } from 'react';
import { FiAlertCircle, FiEye, FiEyeOff, FiLock, FiMail } from 'react-icons/fi';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../utils/AuthContext';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const { login, isLoading, user } = useAuth();

  useEffect(() => {
    // Redirection automatique uniquement vers la page d'accueil si déjà connecté
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (location.state?.message) {
      toast.info(location.state.message);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      // La redirection se fait dans le contexte d'auth ou via l'effet ci-dessus
    } catch (err: any) {
      const message = err instanceof Error ? err.message : 'Une erreur est survenue lors de la connexion';
      setError(message);
      toast.error(message);
    }
  };

  return (
    <div className="flex items-center justify-center p-4 min-h-screen bg-sky-50">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-lg shadow-md overflow-hidden mt-8">
          <div className="bg-gradient-to-r from-sky-500 to-sky-600 p-4 text-center">
            <div className="flex items-center justify-center space-x-2">
              <div className="bg-white p-1 rounded-full">
                <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center">
                  <FiLock className="text-white text-lg" />
                </div>
              </div>
              <h1 className="text-lg font-bold text-white">
                <Link to='/'>
                  Connexion
                </Link>
              </h1>
            </div>
          </div>

          <div className="p-4">
            <form className="space-y-3" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiMail className="text-gray-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 w-full px-3 py-2 rounded bg-gray-50 border border-gray-300 hover:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors"
                    placeholder="votre@email.com"
                    required
                    disabled={isLoading}
                    aria-describedby="email-description"
                  />
                </div>
                <p id="email-description" className="sr-only">
                  Entrez votre adresse email
                </p>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Mot de passe
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiLock className="text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 w-full px-3 py-2 rounded bg-gray-50 border border-gray-300 hover:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 pr-9 transition-colors"
                    placeholder="••••••••"
                    required
                    minLength={8}
                    disabled={isLoading}
                    aria-describedby="password-description password-toggle-description"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                    aria-label={showPassword ? 'Cacher le mot de passe' : 'Afficher le mot de passe'}
                    aria-describedby="password-toggle-description"
                    aria-controls="password"
                  >
                    {showPassword ? (
                      <FiEyeOff className="text-gray-400 hover:text-gray-600" aria-hidden="true" />
                    ) : (
                      <FiEye className="text-gray-400 hover:text-gray-600" aria-hidden="true" />
                    )}
                  </button>
                </div>
                <p id="password-description" className="sr-only">
                  Entrez votre mot de passe (minimum 8 caractères)
                </p>
                <p id="password-toggle-description" className="sr-only">
                  Bouton pour afficher ou cacher le mot de passe
                </p>
              </div>

              {error && (
                <div className="p-3 text-red-600 text-sm bg-red-50 rounded-md border border-red-200" role="alert">
                  <div className="flex items-center">
                    <FiAlertCircle className="w-4 h-4 mr-2" aria-hidden="true" />
                    <span>{error}</span>
                  </div>
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full py-2 px-4 rounded-md text-white bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 font-medium transition-all duration-200 ${
                    isLoading ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-md'
                  }`}
                  aria-describedby={isLoading ? 'loading-description' : undefined}
                >
                  {isLoading ? 'Connexion en cours...' : 'Se connecter'}
                </button>
                {isLoading && (
                  <p id="loading-description" className="sr-only">
                    Connexion en cours, veuillez patienter
                  </p>
                )}

                <div className="mt-3 text-center">
                  <p className="text-xs text-gray-600">
                    <Link
                      to="/mot-de-passe-oublie"
                      className="font-medium text-sky-600 hover:text-sky-500 transition-colors"
                    >
                      Mot de passe oublié?
                    </Link>
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Vous n'avez pas de compte?{' '}
                    <Link
                      to="/inscription"
                      className="font-medium text-sky-600 hover:text-sky-500 transition-colors"
                    >
                      S'inscrire
                    </Link>
                  </p>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;