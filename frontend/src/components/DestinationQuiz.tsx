import React, { useState, useCallback, useMemo } from 'react';
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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

// Types
interface Question {
  id: string;
  question: string;
  icon: React.ReactElement;
  options: {
    value: string;
    label: string;
    description?: string;
  }[];
}

interface Destination {
  id: string;
  name: string;
  description: string;
  advantages: string[];
  score: number;
  matchPercentage: number;
  image?: string;
  flag: string;
}

// Composant de chargement optimisé
const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center py-12">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
  </div>
);

// Composant de carte de destination
const DestinationCard: React.FC<{ destination: Destination; rank: number }> = React.memo(({ destination, rank }) => (
  <div className={`relative border rounded-2xl p-6 text-left flex flex-col h-full transform transition-all duration-300 hover:scale-[1.02] ${
    rank === 1
      ? 'border-sky-300 bg-gradient-to-br from-sky-50 to-blue-50 shadow-lg'
      : 'border-gray-200 bg-white shadow-md'
  }`}>
    {/* Badge de rang */}
    <div className={`absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
      rank === 1 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : 'bg-gradient-to-r from-gray-500 to-gray-600'
    }`}>
      #{rank}
    </div>

    {/* En-tête avec drapeau et score */}
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center space-x-3">
        <span className="text-2xl">{destination.flag}</span>
        <h3 className="text-2xl font-bold text-gray-900">
          {destination.name}
        </h3>
      </div>
      <div className="flex items-center bg-sky-100 px-3 py-1 rounded-full">
        <Sparkles className="h-4 w-4 text-sky-600 mr-1" />
        <span className="text-sm font-medium text-sky-600">
          {destination.matchPercentage}% match
        </span>
      </div>
    </div>

    {/* Description */}
    <p className="text-gray-600 mb-4 flex-grow">
      {destination.description}
    </p>

    {/* Avantages */}
    <div className="mt-4">
      <h4 className="font-semibold text-sky-600 mb-3 flex items-center">
        <BadgeCheck className="h-5 w-5 mr-2" />
        Avantages clés :
      </h4>
      <ul className="space-y-2">
        {destination.advantages.map((advantage, i) => (
          <li key={i} className="flex items-start">
            <div className="h-2 w-2 rounded-full bg-sky-500 mr-3 mt-2 flex-shrink-0"></div>
            <span className="text-gray-700 text-sm">{advantage}</span>
          </li>
        ))}
      </ul>
    </div>
  </div>
));

const DestinationQuiz: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Destination[]>([]);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  // Questions avec useMemo pour éviter les recréations
  const questions: Question[] = useMemo(() => [
    {
      id: 'budget',
      question: 'Quel est votre budget annuel pour les études ?',
      icon: <Banknote className='w-8 h-8 text-sky-600' />,
      options: [
        { 
          value: '2-3M', 
          label: '2-3 millions FCFA',
          description: 'Budget économique'
        },
        { 
          value: '3-5M', 
          label: '3-5 millions FCFA',
          description: 'Budget moyen'
        },
        { 
          value: '5-10M', 
          label: '5-10 millions FCFA',
          description: 'Budget confortable'
        },
        { 
          value: '10M+', 
          label: '10+ millions FCFA',
          description: 'Budget élevé'
        },
      ],
    },
    {
      id: 'language',
      question: 'Quelles sont vos préférences linguistiques ?',
      icon: <Languages className='w-8 h-8 text-sky-600' />,
      options: [
        { 
          value: 'fr', 
          label: 'Français uniquement',
          description: 'Programmes en français'
        },
        { 
          value: 'en', 
          label: 'Anglais uniquement',
          description: 'Programmes en anglais'
        },
        { 
          value: 'bilingue', 
          label: 'Bilingue (FR/EN)',
          description: 'Programmes dans les deux langues'
        },
        { 
          value: 'other', 
          label: 'Autre combinaison',
          description: 'Autres langues disponibles'
        },
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
        { value: 'africa', label: 'Afrique' },
        { value: 'asia', label: 'Asie' },
        { value: 'none', label: 'Aucune préférence' },
      ],
    },
  ], []);

  // Destinations avec useMemo
  const destinations: Destination[] = useMemo(() => [
    {
      id: 'france',
      name: 'France',
      description: 'Excellence académique avec des frais abordables et riche culture étudiante dans un environnement francophone.',
      advantages: [
        'Grandes écoles et universités renommées',
        'Frais universitaires très accessibles',
        'Système de bourses développé',
        'Vie étudiante riche et dynamique',
        'Diplômes reconnus internationalement'
      ],
      score: 0,
      matchPercentage: 0,
      flag: '🇫🇷'
    },
    {
      id: 'russie',
      name: 'Russie',
      description: 'Pays bilingue avec des opportunités de travail pendant les études et immigration facilitée après graduation.',
      advantages: [
        'Permis de travail post-études avantageux',
        'Environnement multiculturel et inclusif',
        'Diplômes très bien reconnus',
        'Excellente qualité de vie',
        'Économie stable et opportunités'
      ],
      score: 0,
      matchPercentage: 0,
      flag: '🇷🇺'
    },
    {
      id: 'maroc',
      name: 'Maroc',
      description: 'Proximité culturelle et coûts très abordables pour des formations de qualité reconnue.',
      advantages: [
        'Coûts de vie et études très compétitifs',
        'Environnement francophone familier',
        'Proximité géographique si africain',
        'Développement économique rapide',
        'Culture riche et accueillante'
      ],
      score: 0,
      matchPercentage: 0,
      flag: '🇲🇦'
    },
    {
      id: 'turquie',
      name: 'Turquie',
      description: 'Pont entre l\'Europe et l\'Asie avec des programmes en anglais et français à coûts modérés.',
      advantages: [
        'Coûts modérés avec bonne qualité',
        'Programmes internationaux diversifiés',
        'Culture historique riche',
        'Position géographique stratégique',
        'Bourses disponibles pour étudiants'
      ],
      score: 0,
      matchPercentage: 0,
      flag: '🇹🇷'
    },
    {
      id: 'chine',
      name: 'Chine',
      description: 'Croissance économique rapide avec des programmes en anglais et nombreuses bourses disponibles.',
      advantages: [
        'Bourses gouvernementales nombreuses',
        'Croissance économique exceptionnelle',
        'Expérience culturelle asiatique unique',
        'Programmes techniques avancés',
        'Coûts relativement bas'
      ],
      score: 0,
      matchPercentage: 0,
      flag: '🇨🇳'
    }
  ], []);

  // Logique de calcul optimisée avec useCallback
  const calculateResults = useCallback((answers: Record<string, string>): Destination[] => {
    const scoredDestinations = destinations.map(d => ({ ...d, score: 0 }));

    // Système de scoring plus sophistiqué
    const scoringRules: Record<string, Record<string, Record<string, number>>> = {
      budget: {
        '2-3M': { 'maroc': 4, 'algerie': 3, 'turquie': 2 },
        '3-5M': { 'france': 3, 'turquie': 3, 'maroc': 2 },
        '5-10M': { 'russie': 3, 'france': 2, 'chine': 2 },
        '10M+': { 'russie': 4, 'france': 3, 'chine': 2 }
      },
      language: {
        'fr': { 'france': 4, 'maroc': 3, 'russie': 2 },
        'en': { 'russie': 4, 'chine': 2, 'turquie': 2 },
        'bilingue': { 'russie': 4, 'france': 2, 'maroc': 2 },
        'other': { 'turquie': 2, 'chine': 2 }
      },
      field: {
        'info': { 'russie': 3, 'chine': 2, 'france': 2 },
        'med': { 'france': 4, 'russie': 2 },
        'engineering': { 'france': 3, 'russie': 2, 'chine': 2 },
        'finance': { 'france': 3, 'russie': 3 },
        'law': { 'france': 4, 'russie': 2 },
        'arts': { 'france': 3, 'russie': 2 }
      },
      degree: {
        'bachelor': { 'france': 2, 'russie': 2, 'maroc': 2 },
        'master': { 'france': 3, 'russie': 3, 'turquie': 2 },
        'phd': { 'france': 4, 'russie': 3, 'chine': 2 },
        'short': { 'maroc': 3, 'turquie': 2, 'france': 2 }
      },
      destination: {
        'europe': { 'france': 4, 'turquie': 2, 'russie': 4 },
        'africa': { 'maroc': 4 },
        'asia': { 'chine': 4, 'turquie': 2 },
        'none': { 'france': 1, 'russie': 1, 'maroc': 1, 'chine': 1, 'turquie': 1 }
      }
    };

    // Application des règles de scoring
    Object.entries(answers).forEach(([questionId, answer]) => {
      const rules = scoringRules[questionId as keyof typeof scoringRules];
      if (rules && rules[answer]) {
        Object.entries(rules[answer]).forEach(([country, points]) => {
          const destination = scoredDestinations.find(d => d.id === country);
          if (destination) {
            destination.score += points as number;
          }
        });
      }
    });

    // Calcul du pourcentage de match
    const maxPossibleScore = 20; // Score maximum théorique
    return scoredDestinations
      .filter(d => d.score > 0) // Ne garder que les destinations avec un score positif
      .sort((a, b) => b.score - a.score)
      .slice(0, 3) // Top 3 destinations
      .map(d => ({
        ...d,
        matchPercentage: Math.min(100, Math.round((d.score / maxPossibleScore) * 100))
      }));
  }, [destinations]);

  // Gestion des réponses avec animation
  const handleAnswer = useCallback(async (questionId: string, answer: string) => {
    setSelectedOption(answer);
    
    const newAnswers = { ...answers, [questionId]: answer };
    setAnswers(newAnswers);

    // Petit délai pour l'animation
    await new Promise(resolve => setTimeout(resolve, 300));

    if (currentStep < questions.length - 1) {
      setCurrentStep(prev => prev + 1);
      setSelectedOption(null);
    } else {
      setIsCalculating(true);
      // Simulation du temps de calcul
      setTimeout(() => {
        const topDestinations = calculateResults(newAnswers);
        setResults(topDestinations);
        setIsCalculating(false);
      }, 1500);
    }
  }, [answers, currentStep, questions.length, calculateResults]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      setSelectedOption(null);
    }
  }, [currentStep]);

  const progress = ((currentStep + 1) / questions.length) * 100;

  // Écran de résultats
  if (results.length > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50 py-8 px-4 sm:px-6 lg:px-8 md:pb-2">
        <div className="max-w-6xl mx-auto">
          {/* En-tête des résultats */}
          <div className="text-center mb-12">
            <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-white shadow-lg mb-6">
              <MapPin className="h-10 w-10 text-sky-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Vos destinations recommandées
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Basé sur vos préférences, voici les pays les plus adaptés à votre projet d'études
            </p>
          </div>

          {/* Grille des résultats */}
          <div className="grid gap-8 lg:grid-cols-3 mb-12">
            {results.map((destination, index) => (
              <DestinationCard 
                key={destination.id} 
                destination={destination} 
                rank={index + 1} 
              />
            ))}
          </div>

          {/* Actions */}
          <div className="text-center space-y-6">
            <div className="space-y-4">
              <Link
                to="/rendez-vous"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-sky-500 to-blue-600 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
              >
                Discuter avec un conseiller
                <ChevronRight className="ml-2 h-5 w-5" />
              </Link>
            </div>
            
            <div className="pt-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setCurrentStep(0);
                  setAnswers({});
                  setResults([]);
                  setSelectedOption(null);
                }}
                className="text-sky-600 hover:text-sky-700 font-semibold transition-colors duration-200 flex items-center justify-center mx-auto"
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refaire le questionnaire
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Écran de chargement
  if (isCalculating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50 flex items-center justify-center md:pb-2">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-sky-600 mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Analyse de vos préférences...
          </h3>
          <p className="text-gray-600">
            Nous sélectionnons les meilleures destinations pour vous
          </p>
        </div>
      </div>
    );
  }

  // Interface du questionnaire
  const currentQuestion = questions[currentStep];

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50 py-8 px-4 sm:px-6 lg:px-8 md:pb-2">
      <div className="max-w-2xl mx-auto">
        {/* Barre de progression */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-semibold text-sky-600">
              Question {currentStep + 1}/{questions.length}
            </span>
            <span className="text-sm font-semibold text-sky-600">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-sky-400 to-blue-500 h-3 rounded-full transition-all duration-500 ease-out shadow-sm"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Carte de question */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* En-tête de la question */}
          <div className="p-8 text-center border-b border-gray-100">
            <div className="flex justify-center mb-4">
              {currentQuestion.icon}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 leading-tight">
              {currentQuestion.question}
            </h2>
          </div>

          {/* Options de réponse */}
          <div className="p-6 space-y-4">
            {currentQuestion.options.map((option) => (
              <button
                key={option.value}
                onClick={() => handleAnswer(currentQuestion.id, option.value)}
                className={`w-full p-4 text-left rounded-xl border-2 transition-all duration-300 transform hover:scale-[1.02] ${
                  selectedOption === option.value
                    ? 'border-sky-500 bg-sky-50 shadow-md'
                    : 'border-gray-200 hover:border-sky-300 hover:bg-sky-50/50'
                }`}
              >
                <div className="flex items-center">
                  <div className={`flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full border-2 mr-4 ${
                    selectedOption === option.value
                      ? 'border-sky-500 bg-sky-500'
                      : 'border-gray-300'
                  }`}>
                    {selectedOption === option.value && (
                      <div className="h-2 w-2 rounded-full bg-white"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">
                      {option.label}
                    </div>
                    {option.description && (
                      <div className="text-sm text-gray-600 mt-1">
                        {option.description}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="bg-gray-50 px-6 py-4 flex items-center justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className={`flex items-center font-medium ${
                currentStep === 0
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-sky-600 hover:text-sky-700'
              }`}
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              Précédent
            </button>
            
            <div className="text-sm text-gray-500 font-medium">
              {currentStep + 1} sur {questions.length}
            </div>
            
            <div className="w-20"></div> {/* Espaceur pour l'alignement */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(DestinationQuiz);