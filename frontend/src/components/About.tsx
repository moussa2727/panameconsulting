import React from 'react';

const About = () => {
  return (
    <section className="bg-gradient-to-br from-sky-50 to-white py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-sky-900 mb-4">
            À Propos de Nous
          </h2>
          <div className="w-24 h-1 bg-sky-500 mx-auto mb-6"></div>
          <p className="text-xl text-sky-700 max-w-3xl mx-auto">
            Découvrez notre histoire, notre mission et les valeurs qui nous animent
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Image */}
          <div className="relative">
            <div className="bg-sky-500 rounded-2xl p-2 transform rotate-3">
              <div className="bg-white rounded-xl overflow-hidden transform -rotate-3 shadow-xl">
                <img 
                  src="/damini.webp"
                  alt="Notre équipe"
                  className="w-full h-96 object-cover"
                />
              </div>
            </div>
            {/* Decorative elements */}
            <div className="absolute -top-4 -left-4 w-20 h-20 bg-sky-200 rounded-full opacity-50"></div>
            <div className="absolute -bottom-6 -right-6 w-16 h-16 bg-sky-300 rounded-full opacity-70"></div>
          </div>

          {/* Right Column - Content */}
          <div className="space-y-8">
            {/* Mission Section */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-sky-100">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-sky-500 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-sky-900">Notre Mission</h3>
              </div>
              <p className="text-sky-700 leading-relaxed">
                Nous nous engageons à fournir des solutions innovantes et de qualité qui transforment 
                la manière dont nos clients travaillent. Notre mission est de créer un impact positif 
                grâce à la technologie et l'innovation.
              </p>
            </div>

            {/* Values Section */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-sky-100">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-sky-500 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-sky-900">Nos Valeurs</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-sky-500 rounded-full mr-3"></div>
                  <span className="text-sky-700">Innovation continue</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-sky-500 rounded-full mr-3"></div>
                  <span className="text-sky-700">Qualité exceptionnelle</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-sky-500 rounded-full mr-3"></div>
                  <span className="text-sky-700">Collaboration efficace</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-sky-500 rounded-full mr-3"></div>
                  <span className="text-sky-700">Transparence totale</span>
                </div>
              </div>
            </div>

            {/* Stats Section */}
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-sky-600 mb-2">50+</div>
                <div className="text-sm text-sky-700">Projets réalisés</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-sky-600 mb-2">15+</div>
                <div className="text-sm text-sky-700">Pays desservis</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-sky-600 mb-2">98%</div>
                <div className="text-sm text-sky-700">Clients satisfaits</div>
              </div>
            </div>

            {/* CTA Button */}
            <div className="text-center lg:text-left">
              <button className="bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white font-semibold py-3 px-8 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105">
                Découvrir nos services
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;