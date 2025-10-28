import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Banknote,
  Languages,
  BookOpen,
  GraduationCap,
  Globe,
  MapPin,
  Sparkles,
  BadgeCheck,
} from 'lucide-react';

interface Question {
  id: string;
  question: string;
  icon: React.ReactElement;
  options: {
    value: string;
    label: string;
  }[];
}

interface Destination {
  id: string;
  name: string;
  description: string;
  advantages: string[];
  score: number;
}

const DestinationQuiz: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Destination[]>([]);

  const questions: Question[] = [
    {
      id: 'budget',
      question: 'Quel est votre budget annuel pour les études ? (en FCFA)',
      icon: <Banknote className='w-8 h-8 text-sky-600' />,
      options: [
        { value: '2-3M', label: '2-3 millions FCFA' },
        { value: '3-5M', label: '3-5 millions FCFA' },
        { value: '5-10M', label: '5-10 millions FCFA' },
        { value: '10M+', label: '10+ millions FCFA' },
      ],
    },
    {
      id: 'language',
      question: 'Quelles sont vos préférences linguistiques ?',
      icon: <Languages className='w-8 h-8 text-sky-600' />,
      options: [
        { value: 'fr', label: 'Français uniquement' },
        { value: 'en', label: 'Anglais uniquement' },
        { value: 'bilingue', label: 'Bilingue (FR/EN)' },
        { value: 'other', label: 'Autre combinaison' },
      ],
    },
    {
      id: 'field',
      question: 'Quel domaine de formation recherchez-vous ?',
      icon: <BookOpen className='w-8 h-8 text-sky-600' />,
      options: [
        { value: 'info', label: 'Informatique & Tech' },
        { value: 'med', label: 'Médecine & Santé' },
        { value: 'law', label: 'Droit & Juridique' },
        { value: 'finance', label: 'Finance & Commerce' },
        { value: 'arts', label: 'Lettres & Arts' },
        { value: 'engineering', label: 'Ingénierie' },
      ],
    },
    {
      id: 'degree',
      question: "Quel niveau d'études visez-vous ?",
      icon: <GraduationCap className='w-8 h-8 text-sky-600' />,
      options: [
        { value: 'bachelor', label: 'Licence/Bachelor' },
        { value: 'master', label: 'Master' },
        { value: 'phd', label: 'Doctorat' },
        { value: 'short', label: 'Formation courte' },
      ],
    },
    {
      id: 'destination',
      question: 'Avez-vous une préférence géographique ?',
      icon: <Globe className='w-8 h-8 text-sky-600' />,
      options: [
        { value: 'europe', label: 'Europe' },
        { value: 'america', label: 'Amérique du Nord' },
        { value: 'africa', label: 'Afrique' },
        { value: 'asia', label: 'Asie' },
        { value: 'none', label: 'Aucune préférence' },
      ],
    },
  ];

  const destinations: Destination[] = [
    {
      id: 'france',
      name: 'France',
      description:
        'Excellence académique avec des frais abordables et riche culture étudiante',
      advantages: [
        'Grandes écoles renommées',
        'Frais universitaires bas',
        'Système de bourses',
        'Vie étudiante animée',
      ],
      score: 0,
    },
    {
      id: 'canada',
      name: 'Canada',
      description:
        'Pays bilingue avec des opportunités de travail et immigration facilitée',
      advantages: [
        'Permis de travail post-études',
        'Environnement multiculturel',
        'Diplômes reconnus',
        'Qualité de vie élevée',
      ],
      score: 0,
    },
    {
      id: 'maroc',
      name: 'Maroc',
      description:
        'Proximité culturelle et coûts très abordables pour des formations de qualité',
      advantages: [
        'Coûts très compétitifs',
        'Environnement francophone',
        'Proximité géographique',
        'Développement économique',
      ],
      score: 0,
    },
    {
      id: 'turquie',
      name: 'Turquie',
      description:
        "Pont entre l'Europe et l'Asie avec des programmes en anglais et français",
      advantages: [
        'Coûts modérés',
        'Programmes internationaux',
        'Culture riche',
        'Position stratégique',
      ],
      score: 0,
    },
    {
      id: 'chine',
      name: 'Chine',
      description:
        'Croissance économique rapide avec des programmes en anglais et bourses',
      advantages: [
        'Bourses disponibles',
        'Croissance économique',
        'Expérience asiatique',
        'Programmes techniques',
      ],
      score: 0,
    },
    {
      id: 'algerie',
      name: 'Algérie',
      description:
        'Système éducatif francophone avec des coûts très accessibles',
      advantages: [
        'Très abordable',
        'Culture similaire',
        'Formations professionnelles',
        'Environnement francophone',
      ],
      score: 0,
    },
    {
      id: 'russie',
      name: 'Russie',
      description:
        'Excellence en sciences et technologie avec des frais modérés',
      advantages: [
        'Bourses gouvernementales',
        'Fort en sciences',
        'Expérience unique',
        'Coûts modérés',
      ],
      score: 0,
    },
  ];

  const calculateResults = (answers: Record<string, string>): Destination[] => {
    const scoredDestinations = destinations.map(d => ({ ...d, score: 0 }));

    Object.entries(answers).forEach(([questionId, answer]) => {
      switch (questionId) {
        case 'budget':
          if (answer === '2-3M') {
            scoredDestinations.find(d => d.id === 'algerie')!.score += 3;
            scoredDestinations.find(d => d.id === 'maroc')!.score += 2;
          } else if (answer === '3-5M') {
            scoredDestinations.find(d => d.id === 'france')!.score += 2;
            scoredDestinations.find(d => d.id === 'turquie')!.score += 2;
          } else if (answer === '5-10M') {
            scoredDestinations.find(d => d.id === 'canada')!.score += 2;
            scoredDestinations.find(d => d.id === 'chine')!.score += 1;
          } else {
            scoredDestinations.find(d => d.id === 'canada')!.score += 3;
            scoredDestinations.find(d => d.id === 'russie')!.score += 1;
          }
          break;

        case 'language':
          if (answer === 'fr') {
            scoredDestinations.find(d => d.id === 'france')!.score += 3;
            scoredDestinations.find(d => d.id === 'maroc')!.score += 2;
          } else if (answer === 'en') {
            scoredDestinations.find(d => d.id === 'canada')!.score += 2;
            scoredDestinations.find(d => d.id === 'chine')!.score += 1;
          } else if (answer === 'bilingue') {
            scoredDestinations.find(d => d.id === 'canada')!.score += 3;
            scoredDestinations.find(d => d.id === 'turquie')!.score += 1;
          }
          break;

        case 'field':
          if (answer === 'info') {
            scoredDestinations.find(d => d.id === 'canada')!.score += 2;
            scoredDestinations.find(d => d.id === 'chine')!.score += 1;
          } else if (answer === 'med') {
            scoredDestinations.find(d => d.id === 'france')!.score += 3;
            scoredDestinations.find(d => d.id === 'russie')!.score += 1;
          } else if (answer === 'engineering') {
            scoredDestinations.find(d => d.id === 'france')!.score += 2;
            scoredDestinations.find(d => d.id === 'russie')!.score += 2;
          }
          break;

        case 'degree':
          if (answer === 'phd') {
            scoredDestinations.find(d => d.id === 'france')!.score += 2;
            scoredDestinations.find(d => d.id === 'canada')!.score += 1;
          } else if (answer === 'master') {
            scoredDestinations.find(d => d.id === 'turquie')!.score += 2;
            scoredDestinations.find(d => d.id === 'chine')!.score += 1;
          }
          break;

        case 'destination':
          if (answer === 'europe') {
            scoredDestinations.find(d => d.id === 'france')!.score += 3;
            scoredDestinations.find(d => d.id === 'turquie')!.score += 1;
          } else if (answer === 'america') {
            scoredDestinations.find(d => d.id === 'canada')!.score += 4;
          } else if (answer === 'africa') {
            scoredDestinations.find(d => d.id === 'maroc')!.score += 3;
            scoredDestinations.find(d => d.id === 'algerie')!.score += 2;
          } else if (answer === 'asia') {
            scoredDestinations.find(d => d.id === 'chine')!.score += 3;
            scoredDestinations.find(d => d.id === 'russie')!.score += 1;
          }
          break;
      }
    });

    return scoredDestinations
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .map(d => ({ ...d, score: Math.min(10, Math.max(1, d.score)) }));
  };

  const handleAnswer = (questionId: string, answer: string) => {
    const newAnswers = { ...answers, [questionId]: answer };
    setAnswers(newAnswers);

    if (currentStep < questions.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      const topDestinations = calculateResults(newAnswers);
      setResults(topDestinations);
    }
  };

  const progress = ((currentStep + 1) / questions.length) * 100;

  if (results.length > 0) {
    return (
      <div className='py-12 px-4 sm:px-6 flex flex-col min-h-[80vh]'>
        <div className='max-w-3xl mx-auto w-full flex-grow flex flex-col'>
          <div className='bg-white rounded shadow-lg overflow-hidden flex-grow flex flex-col'>
            <div className='p-8 text-center flex-grow flex flex-col'>
              <div className='mx-auto flex items-center justify-center h-24 w-24 rounded bg-sky-100 mb-6'>
                <MapPin className='h-12 w-12 text-sky-600' />
              </div>

              <h2 className='text-3xl font-bold text-sky-600 mb-4'>
                Vos destinations recommandées
              </h2>

              <p className='text-gray-600 mb-8 max-w-lg mx-auto'>
                Voici les pays les plus adaptés à votre profil académique et vos
                préférences
              </p>

              <div className='grid gap-8 md:grid-cols-2 mb-12 flex-grow'>
                {results.map((destination, index) => (
                  <div
                    key={destination.id}
                    className={`border rounded-xl p-6 text-left flex flex-col ${
                      index === 0
                        ? 'border-sky-300 bg-sky-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className='flex items-center justify-between mb-4'>
                      <h3 className='text-2xl font-bold text-gray-900 flex items-center'>
                        {destination.name}
                      </h3>
                      <div className='flex items-center bg-sky-100 px-3 py-1 rounded-full'>
                        <Sparkles className='h-4 w-4 text-sky-600 mr-1' />
                        <span className='text-sm font-medium text-sky-600'>
                          {destination.score}/10
                        </span>
                      </div>
                    </div>

                    <p className='text-gray-600 mb-4'>
                      {destination.description}
                    </p>

                    <h4 className='font-semibold text-sky-600 mb-2'>
                      Avantages clés :
                    </h4>
                    <ul className='space-y-2 mb-4'>
                      {destination.advantages.map((advantage, i) => (
                        <li key={i} className='flex items-start'>
                          <BadgeCheck className='h-5 w-5 text-sky-500 mr-2 mt-0.5 flex-shrink-0' />
                          <span className='text-gray-700'>{advantage}</span>
                        </li>
                      ))}
                    </ul>

                    <div className='mt-auto'></div>
                  </div>
                ))}
              </div>

              <div className='space-y-4 mt-auto'>
                <Link
                  to='/rendez-vous'
                  className='inline-flex items-center justify-center px-3 py-3 mx-4 border border-transparent text-base font-medium rounded shadow-sm text-white bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 transition-all hover:scale-105'
                >
                  Discuter avec un conseiller
                </Link>
                <button
                  onClick={() => {
                    setCurrentStep(0);
                    setAnswers({});
                    setResults([]);
                  }}
                  className='text-sky-600 hover:text-sky-700 font-medium text-sm'
                >
                  Refaire le questionnaire
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='py-8 px-4 sm:px-6 flex flex-col min-h-[80vh] bg-gray-50'>
      <div className='max-w-lg mx-auto w-full flex-grow flex flex-col justify-center'>
        <div className='mb-8'>
          <div className='flex justify-between mb-2'>
            <span className='text-sm font-medium text-sky-600'>
              Question {currentStep + 1}/{questions.length}
            </span>
            <span className='text-sm font-medium text-sky-600'>
              {Math.round(progress)}%
            </span>
          </div>
          <div className='w-full bg-gray-200 rounded h-2.5'>
            <div
              className='bg-gradient-to-r from-sky-400 to-sky-600 h-2.5 rounded transition-all duration-300'
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        <div className='bg-white overflow-hidden shadow rounded border border-gray-200'>
          <div className='px-6 py-8'>
            <div className='flex items-center justify-center mb-6'>
              {questions[currentStep].icon}
            </div>

            <h3 className='text-center text-xl font-bold text-gray-900 mb-8'>
              {questions[currentStep].question}
            </h3>

            <div className='space-y-3'>
              {questions[currentStep].options.map(option => (
                <button
                  key={option.value}
                  onClick={() =>
                    handleAnswer(questions[currentStep].id, option.value)
                  }
                  className='w-full px-4 py-3 border border-gray-200 rounded text-left hover:border-sky-300 hover:bg-sky-50 transition-all duration-200 hover:scale-[1.02] flex items-center'
                >
                  <span className='flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full border border-gray-300 mr-3'>
                    <span className='h-2 w-2 rounded bg-gray-400'></span>
                  </span>
                  <span className='text-gray-700 font-medium'>
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className='bg-gray-50 px-6 py-4 flex justify-between'>
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep(prev => prev - 1)}
                className='text-sky-600 hover:text-sky-700 font-medium flex items-center'
              >
                <svg
                  className='w-4 h-4 mr-1'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M15 19l-7-7 7-7'
                  />
                </svg>
                Précédent
              </button>
            )}
            <div className='flex-1'></div>
            <div className='text-sm text-gray-500'>
              {currentStep + 1}/{questions.length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DestinationQuiz;
