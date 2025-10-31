import React, { useEffect, useRef, useState } from 'react';
import {
  FiMail,
  FiMapPin,
  FiMessageSquare,
  FiPhone,
  FiUser,
} from 'react-icons/fi';

const Form = () => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    success?: boolean;
    message?: string;
  }>({});
  const formRef = useRef<HTMLFormElement>(null);
  const API_URL = (import.meta as any).env.VITE_API_URL;

  useEffect(() => {
    if (submitStatus.message) {
      const timer = setTimeout(() => setSubmitStatus({}), 5000);
      return () => clearTimeout(timer);
    }
  }, [submitStatus]);

  const validateField = (name: string, value: string): string => {
    if (!value && (name === 'email' || name === 'message')) {
      return 'Ce champ est obligatoire';
    }

    switch (name) {
      case 'email':
        return /\S+@\S+\.\S+/.test(value) ? '' : 'Email invalide';
      case 'message':
        return value.trim().length >= 10
          ? ''
          : 'Le message doit contenir au moins 10 caractères';
      case 'firstName':
      case 'lastName':
        return value && !/^[a-zA-ZÀ-ÿ\s-]+$/.test(value)
          ? 'Caractères invalides'
          : '';
      default:
        return '';
    }
  };

  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(formRef.current!);
    const data = {
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      email: formData.get('email') as string,
      message: formData.get('message') as string,
    };

    const newErrors = {
      email: data.email
        ? validateField('email', data.email)
        : 'Email obligatoire',
      message: data.message
        ? validateField('message', data.message)
        : 'Message obligatoire',
    };
    setErrors(newErrors);

    if (Object.values(newErrors).some(Boolean)) {
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Échec de l'envoi");

      setSubmitStatus({
        success: true,
        message: 'Message envoyé ! Vous recevrez une confirmation par email.',
      });
      formRef.current?.reset();
    } catch (error) {
      setSubmitStatus({
        success: false,
        message: "Erreur lors de l'envoi. Veuillez réessayer.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className='py-8 md:py-12 px-2 sm:px-4 lg:px-8 bg-gray-50'>
      <div className='max-w-7xl mx-auto'>
        <div className='bg-white rounded shadow-xl overflow-hidden'>
          <div className='flex flex-col md:flex-row'>

           {/* SECTION GAUCHE ULTRAMODERNE */}
<section
  className='relative w-full md:w-1/3 text-white space-y-6 p-8 lg:p-12 
  overflow-hidden rounded-br-[60px] md:rounded-br-none md:rounded-tl-[60px]
  bg-gradient-to-tr from-sky-600 via-sky-500 to-sky-400
  before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_30%_40%,rgba(255,255,255,0.2),transparent_50%)]
  before:animate-[pulse_6s_ease-in-out_infinite]
  after:absolute after:inset-0 after:bg-[url("https://www.transparenttextures.com/patterns/cubes.png")]
  after:opacity-10 after:mix-blend-overlay
  backdrop-blur-md z-10'
>

              <h2 className='text-2xl font-bold drop-shadow-lg'>Paname Consulting</h2>
              <div className='space-y-4'>
                <ContactInfo
                  icon={<FiMapPin className='w-5 h-5 mt-1 text-sky-100' />}
                  title='Adresse'
                  content='Kalaban Coura, Imm.Bore <br/>en face de l&apos;hôtel Wassulu'
                />
                <ContactInfo
                  icon={<FiPhone className='w-5 h-5 mt-1 text-sky-100' />}
                  title='Téléphone'
                  content={
                    <a href='tel:+22391830941' className='hover:underline'>
                      +223 91 83 09 41
                    </a>
                  }
                />
                <ContactInfo
                  icon={<FiMail className='w-5 h-5 mt-1 text-sky-100' />}
                  title='Email'
                  content={
                    <a
                      href='mailto:panameconsulting906@gmail.com'
                      className='hover:underline'
                    >
                      panameconsulting906@gmail.com
                    </a>
                  }
                />
              </div>

              <div className='mt-8 h-48 md:h-56 rounded-xl overflow-hidden shadow-lg'>
                <iframe
                  src='https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3894.010270463331!2d-7.993864324930176!3d12.581574287699127!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xe51cf2248975979%3A0xa90fabf3b7838312!2sImmeuble%20BORE!5e0!3m2!1sfr!2sma!4v1750297669135!5m2!1sfr!2sma'
                  className='w-full h-full'
                  loading='lazy'
                  title='Localisation Paname Consulting'
                  style={{ touchAction: 'manipulation' }}
                />
              </div>
            </section>

            {/* FORMULAIRE */}
            <form
              ref={formRef}
              onSubmit={handleSubmit}
              className='w-full md:w-2/3 p-8 lg:p-12'
              noValidate
            >
              <h2 className='text-2xl font-bold text-gray-800 mb-8'>
                Contactez-nous
              </h2>

              {submitStatus.message && (
                <div
                  className={`mb-6 p-4 rounded-lg ${
                    submitStatus.success
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {submitStatus.message}
                </div>
              )}

              <div className='space-y-6'>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                  <InputField
                    id='firstName'
                    label='Prénom'
                    name='firstName'
                    onBlur={handleBlur}
                    error={errors.firstName}
                    required={false}
                    icon={<FiUser className='text-gray-400' />}
                    placeholder='Votre prénom'
                  />
                  <InputField
                    id='lastName'
                    label='Nom'
                    name='lastName'
                    onBlur={handleBlur}
                    error={errors.lastName}
                    required={false}
                    icon={<FiUser className='text-gray-400' />}
                    placeholder='Votre nom de famille'
                  />
                </div>
                <InputField
                  id='email'
                  label='Email professionnel'
                  name='email'
                  type='email'
                  onBlur={handleBlur}
                  error={errors.email}
                  required={true}
                  icon={<FiMail className='text-gray-400' />}
                  placeholder='exemple@entreprise.com'
                />
                <TextAreaField
                  id='message'
                  label='Message'
                  name='message'
                  onBlur={handleBlur}
                  error={errors.message}
                  required={true}
                  icon={<FiMessageSquare className='text-gray-400' />}
                  placeholder='Votre message, avis ou commentaire...'
                />
                <SubmitButton isSubmitting={isSubmitting} />
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
};

/* --- Autres composants inchangés --- */
const ContactInfo = ({ icon, title, content }: any) => (
  <div className='flex space-x-3'>
    {icon}
    <div>
      <p className='font-medium'>{title}</p>
      <div className='text-sm opacity-90'>
        {typeof content === 'string' ? (
          <span dangerouslySetInnerHTML={{ __html: content }} />
        ) : (
          content
        )}
      </div>
    </div>
  </div>
);

const InputField = ({ id, label, name, type = 'text', error, onBlur, required, icon, placeholder }: any) => (
  <div>
    <label htmlFor={id} className='block text-sm font-medium text-gray-700 mb-1'>
      {label} {required && '*'}
    </label>
    <div className='relative'>
      <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
        {icon}
      </div>
      <input
        id={id}
        name={name}
        type={type}
        onBlur={onBlur}
        placeholder={placeholder}
        className={`w-full pl-10 pr-4 py-3 rounded border ${
          error ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-50'
        } focus:outline-none focus:border-sky-500 hover:border-sky-400 transition-colors`}
      />
    </div>
    {error && <p className='mt-1 text-sm text-red-600'>{error}</p>}
  </div>
);

const TextAreaField = ({ id, label, name, error, onBlur, required, icon, placeholder }: any) => (
  <div>
    <label htmlFor={id} className='block text-sm font-medium text-gray-700 mb-1'>
      {label} {required && '*'}
    </label>
    <div className='relative'>
      <div className='absolute top-3 left-3'>{icon}</div>
      <textarea
        id={id}
        name={name}
        rows={5}
        onBlur={onBlur}
        placeholder={placeholder}
        className={`w-full pl-10 pr-4 py-3 rounded border ${
          error ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-50'
        } focus:outline-none focus:border-sky-500 hover:border-sky-400 transition-colors resize-none`}
      />
    </div>
    {error && <p className='mt-1 text-sm text-red-600'>{error}</p>}
  </div>
);

const SubmitButton = ({ isSubmitting }: { isSubmitting: boolean }) => (
  <button
    type='submit'
    disabled={isSubmitting}
    className='w-full px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded transition-colors disabled:opacity-70'
  >
    {isSubmitting ? (
      <span className='flex items-center justify-center'>
        <Spinner />
        Envoi en cours...
      </span>
    ) : (
      'Envoyer'
    )}
  </button>
);

const Spinner = () => (
  <svg
    className='animate-spin -ml-1 mr-2 h-5 w-5 text-white'
    xmlns='http://www.w3.org/2000/svg'
    fill='none'
    viewBox='0 0 24 24'
  >
    <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
    <path
      className='opacity-75'
      fill='currentColor'
      d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
    ></path>
  </svg>
);

export default Form;
