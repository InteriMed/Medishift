import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { useParams, Link } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../services/firebase';
import Button from '../components/colorPicker/button';
import PersonnalizedInputField from '../components/boxedInputFields/personnalizedInputField';
import TextareaField from '../components/boxedInputFields/textareaField';
import SimpleDropdown from '../components/boxedInputFields/dropdownField';
import { FaFacebook, FaTwitter, FaLinkedin, FaInstagram, FaArrowRight, FaRegLightbulb } from 'react-icons/fa';

const ContactPage = () => {
  const { t } = useTranslation(['contact', 'common']);
  const { lang } = useParams();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
    subject: '',
    company: '',
    type: 'general'
  });
  const [formErrors, setFormErrors] = useState({});
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: ''
      });
    }
  };

  const handleDropdownChange = (name, value) => {
    setFormData({
      ...formData,
      [name]: value
    });

    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: ''
      });
    }
  };

  const handleErrorReset = (fieldName) => {
    if (formErrors[fieldName]) {
      setFormErrors({
        ...formErrors,
        [fieldName]: ''
      });
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = t('contact.form.errors.nameRequired');
    }

    if (!formData.email.trim()) {
      errors.email = t('contact.form.errors.emailRequired');
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = t('contact.form.errors.emailInvalid');
    }

    if (!formData.message.trim()) {
      errors.message = t('contact.form.errors.messageRequired');
    }

    if (!formData.subject.trim()) {
      errors.subject = t('contact.form.errors.subjectRequired');
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const [submitError, setSubmitError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setFormSubmitting(true);
    setSubmitError('');

    try {
      const sendContactFormEmail = httpsCallable(functions, 'sendContactFormEmail');
      await sendContactFormEmail({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        company: formData.company,
        subject: formData.subject,
        message: formData.message,
        type: formData.type
      });

      setFormSubmitted(true);
      setFormData({
        name: '',
        email: '',
        phone: '',
        message: '',
        subject: '',
        company: '',
        type: 'general'
      });

      setTimeout(() => {
        setFormSubmitted(false);
      }, 5000);
    } catch (error) {
      console.error('Contact form error:', error);
      setSubmitError(t('contact.form.errors.submitFailed', 'Failed to send message. Please try again.'));
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <div className="contact-page flex flex-col min-h-screen bg-background text-foreground font-sans">
      <Helmet>
        <title>{t('meta.title')}</title>
        <meta name="description" content={t('meta.description')} />
        <meta name="keywords" content={t('meta.keywords')} />
      </Helmet>

      {/* Unified Background Wrapper */}
      <div className="relative pastel-gradient-bg" style={{
        background: 'linear-gradient(135deg, #fef0f4 0%, #f0f4ff 15%, #f0fdf4 30%, #fefce8 45%, #fdf2f8 60%, #f0f9ff 75%, #f5f3ff 90%, #fff1f2 100%)',
        backgroundSize: '400% 400%',
        animation: 'gradientShift 15s ease infinite'
      }}>
        {/* Pastel Colored Shapes Background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[10%] left-[5%] w-64 h-64 bg-pink-200/40 rounded-full blur-3xl animate-float"></div>
          <div className="absolute top-[20%] right-[10%] w-80 h-80 bg-blue-200/40 rounded-full blur-3xl animate-float-delayed"></div>
          <div className="absolute top-[50%] left-[15%] w-72 h-72 bg-purple-200/40 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-[60%] right-[20%] w-96 h-96 bg-green-200/40 rounded-full blur-3xl animate-float-delayed" style={{ animationDelay: '2s' }}></div>
          <div className="absolute bottom-[15%] left-[10%] w-56 h-56 bg-yellow-200/40 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }}></div>
          <div className="absolute bottom-[25%] right-[15%] w-88 h-88 bg-indigo-200/40 rounded-full blur-3xl animate-float-delayed" style={{ animationDelay: '4s' }}></div>

          <div className="absolute top-[30%] left-[50%] w-48 h-48 bg-rose-200/35 rounded-[40%] blur-2xl animate-float" style={{ animationDelay: '1.5s', transform: 'rotate(45deg)' }}></div>
          <div className="absolute bottom-[40%] left-[60%] w-60 h-60 bg-cyan-200/35 rounded-[35%] blur-2xl animate-float-delayed" style={{ animationDelay: '2.5s', transform: 'rotate(-30deg)' }}></div>
          <div className="absolute top-[70%] right-[30%] w-52 h-52 bg-purple-200/35 rounded-[45%] blur-2xl animate-float" style={{ animationDelay: '3.5s', transform: 'rotate(60deg)' }}></div>

          <svg className="absolute top-[5%] right-[5%] w-40 h-40 opacity-30" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="#fbcfe8" className="animate-pulse" />
          </svg>
          <svg className="absolute bottom-[10%] left-[5%] w-36 h-36 opacity-30" viewBox="0 0 100 100">
            <polygon points="50,10 90,90 10,90" fill="#c7d2fe" className="animate-pulse" style={{ animationDelay: '2s' }} />
          </svg>
          <svg className="absolute top-[40%] right-[40%] w-32 h-32 opacity-30" viewBox="0 0 100 100">
            <rect x="20" y="20" width="60" height="60" rx="10" fill="#a7f3d0" className="animate-pulse" style={{ animationDelay: '1s' }} />
          </svg>
        </div>
        {/* Hero Section */}
        <section className="relative pt-6 pb-8 lg:pt-8 lg:pb-12 overflow-hidden flex items-center justify-center">
          <div className="container mx-auto px-4" style={{ maxWidth: '1200px' }}>
            <div className="text-center max-w-4xl mx-auto">
              <div className="inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium transition-colors border-transparent bg-primary/10 text-primary mb-6">
                {t('hero.badge')}
              </div>
              <h1 className="text-4xl lg:text-7xl font-black tracking-tight text-slate-900 pb-6 animate-gradient">
                {t('title')}
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                {t('subtitle')}
              </p>
            </div>
          </div>
        </section>

        {/* Main Contact Section */}
        <section className="py-8 lg:py-12">
          <div className="container mx-auto px-4" style={{ maxWidth: '1200px' }}>
            <div className="grid md:grid-cols-2 gap-12 lg:gap-16">
              {/* Contact Form */}
              <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl p-10 lg:p-12 transition-all duration-300 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-50 to-transparent rounded-bl-[100%] opacity-50"></div>
                <h2 className="text-3xl lg:text-4xl font-black mb-8 text-slate-900 leading-tight">
                  {t('contact.form.title')}
                </h2>

                {formSubmitted && (
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-8 flex items-start gap-4">
                    <div className="bg-green-100 p-2 rounded-full text-green-600 mt-1">
                      <FaArrowRight className="rotate-45" size={12} />
                    </div>
                    <div>
                      <h3 className="text-green-800 font-bold text-lg mb-1">{t('contact.form.success.title')}</h3>
                      <p className="text-green-700">{t('contact.form.success.message')}</p>
                    </div>
                  </div>
                )}

                {submitError && (
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-8 flex items-start gap-4">
                    <div className="bg-red-100 p-2 rounded-full text-red-600 mt-1">
                      <FaArrowRight className="rotate-[135deg]" size={12} />
                    </div>
                    <div>
                      <h3 className="text-red-800 font-bold text-lg mb-1">{t('contact.form.errors.title', 'Error')}</h3>
                      <p className="text-red-700">{submitError}</p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className={formSubmitted ? 'hidden' : 'space-y-6'}>
                  <div>
                    <SimpleDropdown
                      label={t('contact.form.inquiryType.label')}
                      placeholder={t('form.inquiryType.placeholder')}
                      value={formData.type}
                      onChange={(value) => handleDropdownChange('type', value)}
                      options={[
                        { value: 'general', label: t('contact.form.inquiryType.options.general') },
                        { value: 'professional', label: t('contact.form.inquiryType.options.professional') },
                        { value: 'facility', label: t('contact.form.inquiryType.options.facility') },
                        { value: 'partnership', label: t('contact.form.inquiryType.options.partnership') },
                        { value: 'media', label: t('contact.form.inquiryType.options.media') }
                      ]}
                      error={formErrors.type}
                      marginBottom="0"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <PersonnalizedInputField
                      label={t('contact.form.name')}
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder={t('contact.form.namePlaceholder')}
                      error={formErrors.name}
                      onErrorReset={() => handleErrorReset('name')}
                      required={true}
                      marginBottom="0"
                    />

                    <PersonnalizedInputField
                      label={t('contact.form.company')}
                      type="text"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      placeholder={t('contact.form.companyPlaceholder')}
                      onErrorReset={() => handleErrorReset('company')}
                      marginBottom="0"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <PersonnalizedInputField
                      label={t('contact.form.email')}
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder={t('contact.form.emailPlaceholder')}
                      error={formErrors.email}
                      onErrorReset={() => handleErrorReset('email')}
                      required={true}
                      marginBottom="0"
                    />

                    <PersonnalizedInputField
                      label={t('contact.form.phone')}
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder={t('contact.form.phonePlaceholder')}
                      onErrorReset={() => handleErrorReset('phone')}
                      marginBottom="0"
                    />
                  </div>

                  <div>
                    <PersonnalizedInputField
                      label={t('contact.form.subject')}
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      placeholder={t('contact.form.subjectPlaceholder')}
                      error={formErrors.subject}
                      onErrorReset={() => handleErrorReset('subject')}
                      required={true}
                      marginBottom="0"
                    />
                  </div>

                  <div>
                    <TextareaField
                      label={t('contact.form.message')}
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      placeholder={t('contact.form.messagePlaceholder')}
                      error={formErrors.message}
                      onErrorReset={() => handleErrorReset('message')}
                      required={true}
                      rows={5}
                      marginBottom="0"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl hover:shadow-2xl hover:bg-slate-800 transition-all hover-lift flex items-center justify-center gap-3 transform hover:-translate-y-1"
                    disabled={formSubmitting}
                  >
                    {formSubmitting ? t('contact.form.submitting') : (
                      <>
                        {t('contact.form.submit')} <FaArrowRight />
                      </>
                    )}
                  </Button>
                </form>
              </div>

              {/* Map */}
              <div className="flex flex-col gap-8">
                <div className="bg-slate-50 rounded-[2.5rem] border border-slate-100 shadow-xl p-10 lg:p-12 h-full flex flex-col">
                  <h2 className="text-3xl lg:text-4xl font-extrabold mb-8 text-slate-900">
                    {t('map.title')}
                  </h2>
                  <div className="rounded-3xl overflow-hidden border border-slate-200 shadow-inner flex-grow">
                    <iframe
                      src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d44073.32400951133!2d6.123699486880694!3d46.20458355638357!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x478c650693d0e2eb%3A0xa0b695357b0bbc39!2sGeneva%2C%20Switzerland!5e0!3m2!1sen!2sus!4v1621270201284!5m2!1sen!2sus"
                      width="100%"
                      height="100%"
                      style={{ border: 0, minHeight: '400px' }}
                      allowFullScreen=""
                      loading="lazy"
                      title={t('map.title')}
                    ></iframe>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Social Media Section */}
        <section className="py-8">
          <div className="container mx-auto px-4 max-w-7xl text-center">
            <h2 className="text-4xl lg:text-5xl font-extrabold tracking-tight mb-12 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">
              {t('social.title')}
            </h2>
            <div className="flex flex-wrap justify-center gap-6">
              {[
                { icon: FaFacebook, href: 'https://facebook.com', color: 'hover:text-blue-600', label: t('social.facebook') },
                { icon: FaTwitter, href: 'https://twitter.com', color: 'hover:text-blue-400', label: t('social.twitter') },
                { icon: FaLinkedin, href: 'https://linkedin.com', color: 'hover:text-blue-700', label: t('social.linkedin') },
                { icon: FaInstagram, href: 'https://instagram.com', color: 'hover:text-pink-600', label: t('social.instagram') }
              ].map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className={`w-20 h-20 bg-white rounded-2xl border border-slate-100 shadow-md hover:shadow-xl flex items-center justify-center text-slate-400 ${social.color} transition-all duration-300 hover:-translate-y-2 group`}
                >
                  <social.icon size={32} className="transform group-hover:scale-110 transition-transform" />
                </a>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* FAQ Section Teaser */}
      {/* FAQ Section Teaser - Unified Design */}
      {/* FAQ Section Teaser - Unified Premium Design */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4" style={{ maxWidth: '1200px' }}>
          <div className="bg-slate-900 rounded-[4rem] p-12 lg:p-20 relative overflow-hidden text-white shadow-2xl">
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 rounded-full blur-[120px] opacity-20 transform translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600 rounded-full blur-[120px] opacity-20 transform -translate-x-1/2 translate-y-1/2"></div>

            <div className="flex flex-col lg:flex-row items-center justify-between gap-16 relative z-10">
              <div className="lg:w-1/2 text-left">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-blue-300 text-xs font-bold tracking-wider uppercase mb-6 border border-white/20">
                  <FaRegLightbulb className="mr-1" /> {t('faq.badge')}
                </div>
                <h2 className="text-4xl lg:text-6xl font-black mb-6 leading-tight">
                  {t('faq.title')}
                </h2>
                <p className="text-xl text-slate-400 mb-10 leading-relaxed font-medium max-w-xl">
                  {t('faq.description')}
                </p>
                <Link to={`/${lang}/faq`} onClick={() => window.scrollTo(0, 0)}>
                  <button className="px-8 py-4 bg-white text-slate-900 rounded-2xl font-black text-lg flex items-center gap-3 transition-all hover:bg-slate-50 hover:shadow-xl hover:shadow-white/10 transform hover:-translate-y-1">
                    {t('faq.button')}
                    <FaArrowRight className="text-blue-600" />
                  </button>
                </Link>
              </div>

              <div className="lg:w-1/2 relative">
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[3rem] p-8 border border-slate-700/50 shadow-2xl relative overflow-hidden group hover:border-blue-500/30 transition-all duration-500">
                  <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_100%_0%,rgba(59,130,246,0.1),transparent_50%)]"></div>

                  <div className="space-y-4 relative z-10">
                    <div className="bg-white/5 rounded-2xl p-6 border border-white/5 backdrop-blur-sm">
                      <div className="flex justify-between items-center mb-2">
                        <div className="h-2 w-16 bg-blue-500/50 rounded-full"></div>
                        <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 text-[10px]">
                          <FaArrowRight size={8} className="-rotate-45" />
                        </div>
                      </div>
                      <div className="h-3 w-3/4 bg-white/20 rounded-full mb-2"></div>
                      <div className="h-3 w-1/2 bg-white/10 rounded-full"></div>
                    </div>

                    <div className="bg-white/5 rounded-2xl p-6 border border-white/5 backdrop-blur-sm opacity-60 scale-95 translate-y-2">
                      <div className="h-3 w-2/3 bg-white/20 rounded-full mb-2"></div>
                      <div className="h-3 w-1/3 bg-white/10 rounded-full"></div>
                    </div>
                  </div>

                  <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-500 rounded-full blur-[60px] opacity-20 group-hover:opacity-40 transition-opacity"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Animation Styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }
        @keyframes float {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
            100% { transform: translateY(0px); }
        }
        @keyframes float-delayed {
            0% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-15px) rotate(2deg); }
            100% { transform: translateY(0px) rotate(0deg); }
        }
        @keyframes bounce-slow {
            0%, 100% { transform: translateY(0) scale(1); }
            50% { transform: translateY(-10px) scale(1.05); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 8s ease-in-out infinite; }
        .animate-bounce-slow { animation: bounce-slow 4s ease-in-out infinite; }
        .pastel-gradient-bg {
            background: linear-gradient(135deg, #fef0f4 0%, #f0f4ff 15%, #f0fdf4 30%, #fefce8 45%, #fdf2f8 60%, #f0f9ff 75%, #f5f3ff 90%, #fff1f2 100%) !important;
            background-image: linear-gradient(135deg, #fef0f4 0%, #f0f4ff 15%, #f0fdf4 30%, #fefce8 45%, #fdf2f8 60%, #f0f9ff 75%, #f5f3ff 90%, #fff1f2 100%) !important;
            background-size: 400% 400% !important;
            background-color: transparent !important;
        }
    `}} />
    </div>
  );
};

export default ContactPage;
