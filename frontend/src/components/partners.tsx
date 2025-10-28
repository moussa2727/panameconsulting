import { motion } from 'framer-motion';
import { FiExternalLink, FiMapPin } from 'react-icons/fi';

/**
 * Liste des partenaires institutionnels
 * @type {Array<{
 *   id: number,
 *   name: string,
 *   location: string,
 *   image: string,
 *   link: string,
 *   description?: string
 * }>}
 */
const partners = [
  {
    id: 1,
    name: 'Supemir',
    location: 'Maroc',
    image: '/supemir.webp',
    link: 'https://www.supemir.com/',
    description: 'École supérieure de commerce et de management au Maroc',
  },
  {
    id: 2,
    name: "L'École Multimédia",
    location: 'France',
    image: '/Ecolemultimediafrance.webp',
    link: 'https://www.ecole-multimedia.com/',
    description: 'École de formation aux métiers du digital à Paris',
  },
  {
    id: 3,
    name: 'International Institute Ford Ghana',
    location: 'Ghana',
    image: '/internationalinstitute.png',
    link: 'https://visionfordgh.com/',
    description: 'Institut international de formation au Ghana',
  },
  {
    id: 4,
    name: 'Université de Chongqing',
    location: 'Chine',
    image: '/universitechiongqing.png',
    link: 'https://english.cqu.edu.cn/',
    description: 'Université prestigieuse en Chine',
  },
];

/**
 * Composant Partners - Affiche la section des partenaires institutionnels
 * @returns {JSX.Element} Section des partenaires
 */
const Partners = () => {
  return (
    <section
      className='py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-sky-50 to-white relative overflow-hidden'
      aria-labelledby='partners-heading'
    >
      {/* Effets de fond décoratifs */}
      <div className='absolute inset-0 pointer-events-none'>
        <div className='absolute -right-20 -top-20 w-96 h-96 rounded-full bg-sky-200/30 blur-[120px] animate-pulse' />
        <div className='absolute -left-20 -bottom-20 w-96 h-96 rounded-full bg-sky-200/30 blur-[120px] animate-pulse delay-1000' />
      </div>

      <div className='max-w-7xl mx-auto relative'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '0px 0px -100px 0px' }}
          className='text-center mb-12 sm:mb-16'
        >
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className='inline-block text-sky-600 text-sm uppercase tracking-wide mb-3 bg-sky-100 px-4 py-1.5 rounded-full font-medium'
          >
            Partenariats Stratégiques
          </motion.span>
          <h2
            id='partners-heading'
            className='text-3xl sm:text-4xl font-bold text-gray-900 mb-4'
          >
            Nos Institutions Partenaires
          </h2>
          <p className='text-base sm:text-lg text-gray-600 max-w-2xl mx-auto'>
            Collaborations exclusives avec des établissements d'excellence
            internationale
          </p>
        </motion.div>

        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8'>
          {partners.map((partner, index) => (
            <motion.article
              key={partner.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '0px 0px -50px 0px' }}
              transition={{
                delay: index * 0.15,
                type: 'spring',
                stiffness: 80,
              }}
              className='group relative h-full scale-95'
            >
              <motion.div
                whileHover={{ scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className='block h-full rounded bg-white shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden'
              >
                {/* Image Container avec effet de brillance */}
                <div className='relative h-36 sm:h-44 bg-gray-100 overflow-hidden'>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className='h-full w-full'
                  >
                    <img
                      src={partner.image}
                      alt={`Logo de ${partner.name}`}
                      className='object-cover object-center w-full h-full transition-transform duration-300'
                      style={{ objectFit: 'cover', objectPosition: 'center' }}
                      loading='lazy'
                      width='400'
                      height='300'
                    />
                  </motion.div>

                  {/* Effet de brillance au survol */}
                  <div className='absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
                  <div className='absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000' />
                </div>

                {/* Content avec effet de survol */}
                <div className='p-3 sm:p-5 relative'>
                  <div className='absolute inset-0 bg-gradient-to-br from-sky-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300' />

                  <div className='relative'>
                    <h3 className='text-base sm:text-lg font-semibold text-gray-900 mb-2 leading-tight group-hover:text-sky-600 transition-colors duration-300'>
                      {partner.name}
                    </h3>

                    <div className='flex items-center text-gray-600 mb-2'>
                      <FiMapPin
                        className='w-4 h-4 sm:w-5 sm:h-5 text-sky-600 mr-2 flex-shrink-0'
                        aria-hidden='true'
                      />
                      <span className='truncate text-sm sm:text-base'>
                        {partner.location}
                      </span>
                    </div>

                    {partner.description && (
                      <p className='text-sm text-gray-600 mb-3 line-clamp-2 group-hover:text-gray-700 transition-colors duration-300'>
                        {partner.description}
                      </p>
                    )}

                    <div className='flex items-center justify-between mt-3'>
                      <a
                        href={partner.link}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='inline-flex items-center text-sky-600 hover:text-sky-700 transition-colors text-sm sm:text-base'
                        aria-label={`Visiter le site de ${partner.name}`}
                      >
                        <span className='mr-2'>Visiter le site</span>
                        <FiExternalLink
                          className='w-4 h-4'
                          aria-hidden='true'
                        />
                      </a>
                      <motion.span
                        whileHover={{ scale: 1.1 }}
                        className='text-xs bg-sky-100 text-sky-700 px-3 py-1 rounded-full font-medium'
                        role='status'
                        aria-label='Statut du partenariat'
                      >
                        Partenariat actif
                      </motion.span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Partners;
