import React from 'react';
import {
  FaArrowRight,
  FaAward,
  FaCalendar,
  FaGlobe,
  FaUsers,
} from 'react-icons/fa';
import { Link } from 'react-router-dom';

const Hero: React.FC = () => {
  const heroData = {
    slogan: "LE CAP VERS L'EXCELLENCE GLOBALE",
    title: 'PANAME CONSULTING',
    description:
      "Depuis 3 ans, notre équipe multiculturelle accompagne les étudiants ambitieux vers les meilleures universités du monde. De la sélection du programme jusqu’à votre installation, nous transformons vos ambitions en réussites concrètes.",
    countriesCount: 8,
    studentsCount: 50,
  };

  const titleParts = heroData.title.split(' ');
  const firstWord = titleParts[0];
  const restOfTitle = titleParts.slice(1).join(' ');
  const currentYear = new Date().getFullYear();

  return (
    <section
      className="
        relative overflow-hidden py-16 sm:py-20 md:py-24
        bg-gradient-to-br from-sky-600 via-sky-500 to-sky-400 text-white
      "
    >
      {/* --- Effet de fond animé ondulant --- */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[120%] h-[120%] bg-sky-300 opacity-10 rounded-full animate-[spin_40s_linear_infinite] blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-full h-40 text-sky-600">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320">
            <path
              fill="currentColor"
              fillOpacity="0.3"
              d="M0,256L48,224C96,192,192,128,288,101.3C384,75,480,85,576,112C672,139,768,181,864,208C960,235,1056,245,1152,229.3C1248,213,1344,171,1392,149.3L1440,128V320H0Z"
            >
              <animate
                attributeName="d"
                dur="10s"
                repeatCount="indefinite"
                values="
                  M0,256L48,224C96,192,192,128,288,101.3C384,75,480,85,576,112C672,139,768,181,864,208C960,235,1056,245,1152,229.3C1248,213,1344,171,1392,149.3L1440,128V320H0Z;
                  M0,224L48,202.7C96,181,192,139,288,133.3C384,128,480,160,576,176C672,192,768,192,864,170.7C960,149,1056,107,1152,117.3C1248,128,1344,192,1392,224L1440,256V320H0Z;
                  M0,256L48,224C96,192,192,128,288,101.3C384,75,480,85,576,112C672,139,768,181,864,208C960,235,1056,245,1152,229.3C1248,213,1344,171,1392,149.3L1440,128V320H0Z
                "
              />
            </path>
          </svg>
        </div>
      </div>

      {/* --- Contenu principal --- */}
      <div className="relative max-w-7xl mx-auto px-6 sm:px-8 flex flex-col lg:flex-row items-center gap-10 z-10">
        {/* --- Texte gauche --- */}
        <div className="flex-1 text-left space-y-5 md:space-y-6">
          <div className="inline-block bg-white/10 backdrop-blur-sm px-4 py-2 rounded">
            <p className="text-sm font-medium">{heroData.slogan}</p>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-sky-200 block">
              {firstWord}
            </span>{' '}
            {restOfTitle}
          </h1>

          <p className="text-base sm:text-lg text-sky-50 max-w-2xl">
            {heroData.description}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mt-6">
            <Link
              to="/rendez-vous"
              className="group px-6 py-3 bg-white text-sky-600 font-semibold rounded-lg shadow-md hover:shadow-lg hover:bg-sky-50 transition-all flex items-center justify-center"
            >
              <FaCalendar className="mr-2 group-hover:animate-pulse" />
              Rendez-vous
              <FaArrowRight className="ml-2 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/services"
              className="group px-6 py-3 bg-sky-500/30 text-white font-semibold rounded-lg border border-white/30 hover:bg-sky-500/50 hover:scale-105 transition-transform flex items-center justify-center"
            >
              <FaAward className="mr-2" />
              Nos Services
            </Link>
          </div>

          {/* Statistiques Mobile */}
          <div className="grid grid-cols-2 gap-4 mt-8 sm:hidden">
            <div className="bg-white/10 p-3 rounded-lg border border-white/10 text-center">
              <FaGlobe className="text-white text-xl mb-1 mx-auto" />
              <p className="text-xs text-sky-100">
                {heroData.countriesCount}+ pays partenaires
              </p>
            </div>
            <div className="bg-white/10 p-3 rounded-lg border border-white/10 text-center">
              <FaUsers className="text-white text-xl mb-1 mx-auto" />
              <p className="text-xs text-sky-100">
                {heroData.studentsCount}+ étudiants accompagnés
              </p>
            </div>
          </div>
        </div>

        {/* --- Cartes info --- */}
        {/* ✅ Masquées sur mobile grâce à hidden sm:grid */}
        <div className="hidden sm:grid flex-1 grid-cols-1 sm:grid-cols-2 gap-5">
          <article className="bg-white/10 backdrop-blur-md p-5 rounded-xl border border-white/20 hover:border-white/30 transition-colors">
            <div className="flex items-start">
              <div className="bg-white/20 p-3 rounded-lg mr-3">
                <FaGlobe className="text-white text-xl" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-1">
                  {heroData.countriesCount}+
                </h3>
                <p className="text-sky-100 text-sm">Pays partenaires</p>
                <p className="text-xs text-white/70 mt-1">
                  Chine, France, Chypre, Maroc, Algérie et plus encore
                </p>
              </div>
            </div>
          </article>

          <article className="bg-white p-5 rounded-xl shadow-md hover:shadow-xl transition-all">
            <div className="flex items-start">
              <div className="bg-sky-100 p-3 rounded-lg mr-3">
                <FaAward className="text-sky-600 text-xl" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-1">
                  {currentYear - 2023} ans d’expertise
                </h3>
                <p className="text-gray-600 text-sm mb-2">
                  Un accompagnement sur mesure
                </p>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-sky-500 rounded-full mr-2"></span>
                    Conseil adapté à chaque profil
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-sky-500 rounded-full mr-2"></span>
                    Assistance visa et intégration
                  </li>
                </ul>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
};

export default Hero;
