/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async'; // ✅ Import corrigé
import { FiArrowLeft, FiFrown, FiXCircle } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';

const NotFound = () => {
  const [countdown, setCountdown] = useState(5);
  const [showRedirect, setShowRedirect] = useState(true);
  const navigate = useNavigate();

  // Gestion du compte à rebours
  useEffect(() => {
    let timer, redirectTimer;
    if (countdown === 0) {
      navigate('/');
      return;
    }

    if (showRedirect) {
      timer = setInterval(() => {
        setCountdown(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);

      redirectTimer = setTimeout(() => {
        navigate('/');
      }, 5000);
    }

    return () => {
      clearInterval(timer);
      clearTimeout(redirectTimer);
    };
  }, [showRedirect, navigate, countdown]);

  const resetTimer = () => {
    setCountdown(5);
    setShowRedirect(false);
  };

  return (
    <>
      <Helmet>
        <title>OUPS - Page Not-Found</title>
        <meta
          name='viewport'
          content='width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
        />
        <link rel='icon' href='/paname-consulting.jpg' />
        <link rel='apple-touch-icon' href='/paname-consulting.jpg' />
        <link rel='canonical' href='https://panameconsulting.com/' />
        <meta httpEquiv='X-UA-Compatible' content='IE=edge' />
        {/* Balises de contrôle d'indexation */}
        <meta name='robots' content='noindex, nofollow' />
        <meta name='googlebot' content='noindex, nofollow' />
        <style type='text/css'>{`
          html, body {
            overscroll-behavior-x: none;
            overflow-x: hidden;
          }
        `}</style>
      </Helmet>

      <div className='min-h-screen bg-gradient-to-br from-sky-600 to-sky-500 flex items-center justify-center px-4 sm:px-6 lg:px-8 relative overflow-hidden'>
        {/* Cercles décoratifs */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className='absolute -top-32 -left-32 w-64 h-64 bg-white/10 rounded-full blur-3xl'
        />
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2 }}
          className='absolute -bottom-32 -right-32 w-64 h-64 bg-sky-400/20 rounded-full blur-3xl'
        />

        <div className='relative z-10 text-center max-w-2xl mx-auto'>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className='space-y-6'>
              <motion.div
                animate={{ rotate: [-10, 10, -10] }}
                transition={{ duration: 2, repeat: Infinity }}
                className='inline-block'
              >
                <FiFrown className='w-20 h-20 text-white/90 mx-auto' />
              </motion.div>

              <h1 className='text-6xl md:text-8xl font-bold text-white mb-2'>
                404
              </h1>
              <h2 className='text-2xl md:text-3xl font-semibold text-white'>
                Oups! Page disparue
              </h2>

              <AnimatePresence>
                {showRedirect && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 5, ease: 'linear' }}
                    className='h-1 bg-white/20 rounded-full overflow-hidden'
                  >
                    <div className='h-full bg-white/50' />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className='space-y-4'>
                

                <div className='flex justify-center gap-4'>
                  <Link to='/'>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className='flex items-center bg-white/10 text-white px-6 py-2.5 rounded-lg font-semibold backdrop-blur-sm hover:bg-white/20 transition-all'
                    >
                      <FiArrowLeft className='mr-2 w-5 h-5' />
                      Accueil
                    </motion.button>
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default NotFound;
