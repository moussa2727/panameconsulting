import AOS from 'aos';
import 'aos/dist/aos.css';
import React, { useEffect, useCallback, useMemo } from 'react';
import {
  FiArrowRight,
  FiAward,
  FiBook,
  FiTarget,
  FiUser,
  FiUsers,
} from 'react-icons/fi';
import { Link, useLocation } from 'react-router-dom';

const About = () => {
  const location = useLocation();
  const isAboutPage = location.pathname === '/a-propos';

  // Optimisation du chargement AOS
  useEffect(() => {
    if (typeof window !== 'undefined') {
      AOS.init({
        once: true,
        duration: 600,
        easing: 'ease-out-cubic',
        offset: 50,
        delay: 0,
      });
    }
  }, []);

  // Mémoization des services
  const services = useMemo(() => [
    {
      icon: <FiBook className='w-5 h-5 sm:w-6 sm:h-6' />,
      title: 'Formation professionnelle',
      text: 'Expertise pointue et pédagogie innovante pour booster votre carrière',
      keywords: 'formation pro, développement compétences'
    },
    {
      icon: <FiTarget className='w-5 h-5 sm:w-6 sm:h-6' />,
      title: 'Conseil stratégique',
      text: 'Solutions personnalisées pour vos choix professionnels et éducatifs',
      keywords: 'conseil stratégique, orientation'
    },
    {
      icon: <FiUser className='w-5 h-5 sm:w-6 sm:h-6' />,
      title: 'Coaching personnalisé',
      text: 'Accompagnement sur mesure avec méthodologie orientée résultats',
      keywords: 'coaching, accompagnement personnalisé'
    },
    {
      icon: <FiUsers className='w-5 h-5 sm:w-6 sm:h-6' />,
      title: 'Team-building',
      text: "Ateliers dynamiques pour renforcer la cohésion d'équipe",
      keywords: 'team building, cohésion équipe'
    },
  ], []);

  // Handlers pour interactions tactiles
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.style.transform = 'scale(0.98)';
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.style.transform = 'scale(1)';
  }, []);

  return (
    <div 
      className='bg-gradient-to-b from-white via-sky-50/70 to-white'
      role="main"
      aria-label="À propos de Paname Consulting"
    >
      <section
        id='a-propos'
        className='py-8 sm:py-12 px-4 sm:px-6 lg:px-8 w-full max-w-7xl mx-auto'
      >
        {/* En-tête avec meilleure sémantique SEO */}
        <header className='text-center mb-8 sm:mb-12'>
          <span
            className='inline-block px-3 py-1.5 sm:px-4 sm:py-2 mb-2 sm:mb-3 text-xs font-bold text-sky-600 uppercase tracking-widest bg-sky-50 rounded-lg border-l-4 border-sky-500 shadow-xs transition-all duration-300 hover:shadow-sm'
            data-aos='fade-up'
            data-aos-duration='400'
            role="doc-subtitle"
          >
            Qui Sommes Nous ?
          </span>
        </header>

        {/* Section Fondateur avec structure sémantique améliorée */}
        <article
          id='fondateur'
          className='bg-white overflow-hidden shadow-lg sm:shadow-xl border border-gray-100 '
          data-aos='fade-up'
          data-aos-duration='600'
          data-aos-delay='100'
          itemScope
          itemType="https://schema.org/Person"
        >
          <div className='flex flex-col lg:flex-row'>
            {/* Côté photo avec informations structurées */}
            <div 
              className='lg:w-2/5 bg-gradient-to-br from-sky-500 to-sky-700 p-4 sm:p-6 md:p-8 flex flex-col justify-center relative overflow-hidden'
              aria-label="Informations du fondateur"
            >
              <div className='absolute inset-0 pointer-events-none'>
                <div
                  className='absolute inset-0 opacity-20'
                  style={{
                    backgroundImage:
                      'radial-gradient(circle, white 1px, transparent 1px)',
                    backgroundSize: '4px 4px',
                    WebkitMaskImage:
                      'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)',
                    maskImage:
                      'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)',
                  }}
                  aria-hidden="true"
                />
              </div>
              
              <div className='text-center mb-4 sm:mb-6 relative z-10'>
                <div 
                  className='mx-auto bg-gray-200 rounded-xl w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 flex items-center justify-center shadow-inner'
                  role="img"
                  aria-label="Photo de Sangare Damini, fondateur de Paname Consulting"
                >
                  <img
                    src='/damini.webp'
                    alt='Photo de Sangare Damini - Fondateur & CEO Paname Consulting'
                    className='w-full h-full object-cover rounded-lg'
                    loading='lazy'
                    width={112}
                    height={112}
                    itemProp="image"
                  />
                </div>
              </div>
              
              <div className='text-white text-center relative z-10'>
                <h1 
                  className='text-lg sm:text-xl md:text-2xl font-bold mb-1'
                  itemProp="name"
                >
                  Sangare Damini
                </h1>
                <p 
                  className='text-sky-100 text-xs sm:text-sm font-medium mb-3 sm:mb-4'
                  itemProp="jobTitle"
                >
                  Fondateur & CEO
                </p>
                <div 
                  className='flex justify-center space-x-2 sm:space-x-3 md:space-x-4'
                  aria-label="Compétences du fondateur"
                >
                  {[FiAward, FiUsers, FiTarget].map((Icon, index) => (
                    <div 
                      key={index}
                      className='bg-sky-400/30 p-1 sm:p-1.5 md:p-2 rounded-lg'
                      aria-hidden="true"
                    >
                      <Icon className='w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5' />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Contenu principal avec hiérarchie SEO améliorée */}
            <div className='lg:w-3/5 p-4 sm:p-6 md:p-8 bg-white'>
              <header className='mb-4 sm:mb-6'>
                <span 
                  className='inline-block text-sky-600 bg-sky-100 px-2 py-1 sm:px-3 sm:py-1 text-xs font-semibold mb-2 sm:mb-3 rounded'
                  role="doc-subtitle"
                >
                  Notre histoire
                </span>
                <h2 className='text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mb-3 sm:mb-4 leading-tight'>
                  Notre mission, votre réussite
                </h2>
              </header>

              <div 
                className='space-y-2 sm:space-y-3 md:space-y-4 text-gray-700 text-sm sm:text-base leading-relaxed'
                itemProp="description"
              >
                <p>
                  Fondée par{' '}
                  <strong className='text-sky-600 font-semibold' itemProp="founder">
                    Sangare Damini
                  </strong>
                  , PANAME CONSULTING est née d'une passion pour l'éducation et
                  l'accompagnement.
                </p>
                <p>
                  Notre mission : vous offrir un accompagnement sur mesure pour
                  vos projets d'études à l'étranger, dans un monde en constante
                  mutation.
                </p>
                <p>
                  <span className='font-semibold text-sky-600'>
                    PANAME CONSULTING
                  </span>{' '}
                  est votre passerelle vers l'international. Nous transformons
                  l'éducation en opportunités mondiales grâce à un
                  accompagnement sur-mesure pour vos projets en France, Russie,
                  Turquie et au-delà.
                </p>

                {/* Citation avec balisage sémantique */}
                <blockquote 
                  className='bg-sky-50 p-3 sm:p-4 border-l-4 border-sky-500 mt-3 sm:mt-4 md:mt-6 rounded-r'
                  itemProp="knowsAbout"
                >
                  <p className='italic text-gray-700 text-xs sm:text-sm md:text-base leading-relaxed'>
                    "L'éducation est le passeport pour l'avenir, car demain
                    appartient à ceux qui s'y préparent aujourd'hui." 
                    <cite className='block not-italic text-sky-600 font-medium mt-1'>
                      - Malcolm X
                    </cite>
                  </p>
                </blockquote>
              </div>

              {/* Call-to-action optimisé */}
              <footer className='mt-4 sm:mt-6 md:mt-8'>
                {!isAboutPage && (
                  <Link
                    to='/a-propos'
                    className='inline-flex items-center font-medium text-sky-700 bg-sky-100/60 hover:bg-sky-200 px-3 py-1 sm:px-4 sm:py-1.5 md:px-5 md:py-2 rounded-lg shadow-xs hover:shadow-sm transition-all group text-xs sm:text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2'
                    aria-label="En savoir plus sur Paname Consulting"
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                  >
                    <span className='relative z-10 flex items-center gap-1 sm:gap-2'>
                      <span className='font-semibold group-hover:underline underline-offset-4'>
                        VOIR PLUS
                      </span>
                      <FiArrowRight className='transition-transform group-hover:translate-x-0.5' aria-hidden="true" />
                    </span>
                  </Link>
                )}
              </footer>
            </div>
          </div>
        </article>

        {/* Services avec grid optimisée mobile-first */}
        <section 
          className='mt-8 sm:mt-12 md:mt-16'
          aria-labelledby="services-heading"
        >
          <h2 id="services-heading" className='sr-only'>
            Nos services principaux
          </h2>
          
          <div className='grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6'>
            {services.map((service, index) => (
              <article
                key={index}
                data-aos='fade-up'
                data-aos-duration='500'
                data-aos-delay={Math.min(150 + index * 80, 400)}
                className='flex flex-col p-3 sm:p-4 md:p-6 bg-white shadow-xs hover:shadow-sm transition-all duration-300 rounded-lg border border-gray-50 hover:border-sky-100 active:scale-98'
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                role="article"
                aria-label={`Service: ${service.title}`}
              >
                <div className='flex justify-center mb-2 sm:mb-3 md:mb-4'>
                  <div 
                    className='flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-sky-100 text-sky-600 rounded-lg'
                    aria-hidden="true"
                  >
                    {service.icon}
                  </div>
                </div>

                <div className='flex-1 text-center'>
                  <h3 className='text-sm sm:text-base md:text-lg font-semibold text-gray-900 mb-1 sm:mb-2 leading-tight'>
                    {service.title}
                  </h3>
                  <p className='text-gray-600 text-xs sm:text-sm leading-relaxed'>
                    {service.text}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </div>
  );
};

export default React.memo(About);