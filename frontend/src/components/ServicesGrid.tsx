import React, { useEffect } from 'react';
import {
  FiKey,
  FiEdit,
  FiBookOpen,
  FiFileText,
  FiUsers,
  FiBriefcase,
} from 'react-icons/fi';
import AOS from 'aos';
import 'aos/dist/aos.css';

const ServicesGrid = () => {
  useEffect(() => {
    AOS.init({
      duration: 800,
      once: true,
      easing: 'ease-out-cubic',
    });
  }, []);

  const services = [
    {
      icon: <FiKey className='w-6 h-6' />,
      title: "Création d'un Compte Pastel",
      description:
        'Nous créons votre compte Pastel rapidement et en toute sécurité.',
    },
    {
      icon: <FiEdit className='w-6 h-6' />,
      title: 'Saisie des Informations Personnelles',
      description:
        'Nous saisissons et insérons vos informations personnelles avec précision.',
    },
    {
      icon: <FiBookOpen className='w-6 h-6' />,
      title: 'Choix des Universités et Formations',
      description:
        'Nous vous aidons à choisir les meilleures universités et formations.',
    },
    {
      icon: <FiFileText className='w-6 h-6' />,
      title: 'Lettre de Motivation',
      description:
        'Nous rédigeons des lettres de motivation percutantes et personnalisées.',
    },
    {
      icon: <FiUsers className='w-6 h-6' />,
      title: 'Préparation aux Entretiens',
      description: 'Nous vous préparons efficacement pour vos entretiens.',
    },
    {
      icon: <FiBriefcase className='w-6 h-6' />,
      title: 'Assistance dans la Demande de Visa',
      description: 'Nous vous accompagnons dans votre demande de visa.',
    },
  ];

  return (
    <section className='py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white via-sky-50 to-white'>
      <div className='max-w-7xl mx-auto'>
        <div
          className='text-center mb-16'
          data-aos='fade-up'
          data-aos-duration='500'
        >
          <div
            className='inline-flex items-center justify-center bg-gradient-to-r from-sky-500 to-sky-600 text-white px-4 py-1 rounded-full mb-4'
            data-aos='zoom-in'
            data-aos-delay='100'
          >
            <span className='text-sm font-medium'>Nos services</span>
          </div>
          <h2
            className='text-3xl md:text-4xl font-bold text-gray-900 mb-4'
            data-aos='fade-up'
            data-aos-delay='200'
          >
            Accompagnement complet pour vos études à l'étranger
          </h2>
          <p
            className='text-gray-600 max-w-2xl mx-auto text-lg'
            data-aos='fade-up'
            data-aos-delay='300'
          >
            Un parcours simplifié de la création de compte à l'obtention de
            votre visa
          </p>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
          {services.map((service, index) => (
            <div
              key={index}
              className='group relative bg-white p-7 rounded border border-gray-100 shadow-sm transition-all duration-300 overflow-hidden'
              data-aos='fade-up'
              data-aos-delay={index * 100}
              data-aos-offset='100'
            >
              {/* Élément décoratif arrière */}
              <div className='absolute inset-0 bg-gradient-to-br from-sky-50 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-0'></div>

              <div className='relative z-10'>
                <div className='mb-5'>
                  <div
                    className='inline-flex items-center justify-center w-14 h-14 bg-white rounded text-sky-600 group-hover:text-white border border-sky-100 group-hover:bg-gradient-to-r from-sky-500 to-sky-600 shadow-sm transition-all duration-300'
                    data-aos='zoom-in'
                    data-aos-delay={index * 100 + 300}
                  >
                    {service.icon}
                  </div>
                </div>

                <h3
                  className='text-xl font-bold text-gray-900 mb-3'
                  data-aos='fade-up'
                  data-aos-delay={index * 100 + 100}
                >
                  {service.title}
                </h3>
                <p
                  className='text-gray-600 leading-relaxed mb-5'
                  data-aos='fade-up'
                  data-aos-delay={index * 100 + 200}
                >
                  {service.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesGrid;
