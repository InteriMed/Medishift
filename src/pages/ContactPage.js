import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { useParams, Link } from 'react-router-dom';
import Button from '../components/BoxedInputFields/Button';
import PersonnalizedInputField from '../components/BoxedInputFields/Personnalized-InputField';
import TextareaField from '../components/BoxedInputFields/TextareaField';
import SimpleDropdown from '../components/BoxedInputFields/Dropdown-Field';
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setFormSubmitting(true);

    setTimeout(() => {
      console.log('Form submitted:', formData);
      setFormSubmitting(false);
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
    }, 1500);
  };

  return (
    <div className="contact-page flex flex-col min-h-screen bg-background text-foreground font-sans">
      <Helmet>
        <title>{t('meta.title')}</title>
        <meta name="description" content={t('meta.description')} />
        <meta name="keywords" content={t('meta.keywords')} />
      </Helmet>

      {/* Unified Background Wrapper */}
      <div className="bg-premium-hero">
        {/* Hero Section */}
        <section className="relative pt-6 pb-8 lg:pt-8 lg:pb-12 overflow-hidden flex items-center justify-center">
          <div className="container mx-auto px-4" style={{ maxWidth: '1200px' }}>
            <div className="text-center max-w-4xl mx-auto">
              <div className="inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium transition-colors border-transparent bg-primary/10 text-primary mb-6">
                Contactez-nous
              </div>
              <h1 className="text-4xl lg:text-7xl font-extrabold tracking-tight text-foreground pb-6 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 animate-gradient">
                {t('title')}
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                Notre équipe est à votre écoute pour répondre à toutes vos questions.
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
                <h2 className="text-3xl lg:text-4xl font-extrabold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">
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

                <form onSubmit={handleSubmit} className={formSubmitted ? 'hidden' : 'space-y-6'}>
                  <div>
                    <SimpleDropdown
                      label={t('contact.form.inquiryType.label')}
                      placeholder="Select inquiry type"
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
                    className="w-full py-4 text-lg font-bold rounded-xl shadow-lg hover:shadow-lg transition-all hover-lift flex items-center justify-center gap-2"
                    disabled={formSubmitting}
                    style={{ background: 'var(--secondary-color)', color: 'white' }}
                  >
                    {formSubmitting ? t('contact.form.submitting') : (
                      <>
                        {t('contact.form.submit')} <FaArrowRight className="arrow-animate" />
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
                      title="MediShift Office Location"
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
                { icon: FaFacebook, href: 'https://facebook.com', color: 'hover:text-blue-600', label: 'Facebook' },
                { icon: FaTwitter, href: 'https://twitter.com', color: 'hover:text-blue-400', label: 'Twitter' },
                { icon: FaLinkedin, href: 'https://linkedin.com', color: 'hover:text-blue-700', label: 'LinkedIn' },
                { icon: FaInstagram, href: 'https://instagram.com', color: 'hover:text-pink-600', label: 'Instagram' }
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
      <section className="relative py-32 bg-secondary text-white overflow-hidden">
        {/* Abstract Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_-20%,#3b82f6,transparent)]"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10 w-full" style={{ maxWidth: '1200px' }}>
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
            <div className="lg:w-1/2 text-left">
              <h2 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight">{t('faq.title')}</h2>
              <p className="text-xl text-slate-400 mb-8 max-w-xl">{t('faq.description')}</p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to={`/${lang}/faq`} onClick={() => window.scrollTo(0, 0)}>
                  <button className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-primary/25">
                    {t('faq.button')} <FaArrowRight />
                  </button>
                </Link>
              </div>
            </div>

            <div className="lg:w-1/2 flex justify-center lg:justify-end">
              <div className="relative">
                {/* Decorative Card Stack */}
                <div className="w-80 h-96 bg-secondary/80 rounded-2xl border border-slate-700 shadow-2xl transform rotate-3 absolute -left-4 -top-4 opacity-50"></div>
                <div className="w-80 h-96 bg-gradient-to-br from-primary to-primary/80 rounded-2xl shadow-2xl relative z-10 p-8 flex flex-col justify-between text-white">
                  <div>
                    <FaRegLightbulb size={48} className="mb-4 opacity-80" />
                    <div className="text-2xl font-bold mb-2">Support 24/7</div>
                    <p className="opacity-70">Des réponses rapides à toutes vos questions.</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-green-500"></div>
                      <div className="h-2 w-24 bg-white/20 rounded-full"></div>
                    </div>
                    <div className="h-2 w-full bg-white/10 rounded-full mb-2"></div>
                    <div className="h-2 w-2/3 bg-white/10 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ContactPage;
