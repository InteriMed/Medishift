import React from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import {
  FaShieldAlt,
  FaBullseye,
  FaHandshake,
  FaUsers,
  FaClinicMedical,
  FaArrowRight
} from 'react-icons/fa';

import HeroImage from '../assets/pages/aboutpage/aboutHero.png';

const AboutPage = () => {
  const { t } = useTranslation('about');
  const { lang } = useParams();

  // Company values with icons
  const values = [
    {
      icon: FaShieldAlt,
      title: t('values.value1.title'),
      description: t('values.value1.description')
    },
    {
      icon: FaBullseye,
      title: t('values.value2.title'),
      description: t('values.value2.description')
    },
    {
      icon: FaHandshake,
      title: t('values.value3.title'),
      description: t('values.value3.description')
    },
    {
      icon: FaUsers,
      title: t('values.value4.title'),
      description: t('values.value4.description')
    },
    {
      icon: FaClinicMedical,
      title: t('values.value5.title'),
      description: t('values.value5.description')
    }
  ];

  return (
    <div className="about-page flex flex-col min-h-screen bg-background text-foreground font-sans">
      <Helmet>
        <title>{t('h1meta.title')} | MediShift</title>
        <meta name="description" content={t('h1meta.description')} />
        <meta name="keywords" content={t('h1meta.keywords')} />
      </Helmet>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden flex items-center justify-center z-10 pastel-gradient-bg" style={{
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

        <div className="container mx-auto px-4 relative z-10" style={{ maxWidth: '1200px' }}>
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium transition-colors border-blue-200 bg-blue-100/50 text-blue-700 mb-6 shadow-sm">
              Notre histoire
            </div>
            <h1 className="text-4xl lg:text-7xl font-black tracking-tight text-slate-900 leading-[1.1] pb-6 mb-8">
              {t('hero.title')}
            </h1>
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="py-24 lg:py-32 bg-premium-hero">
        <div className="container mx-auto px-4" style={{ maxWidth: '1200px' }}>
          <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="order-2 md:order-1 relative">
              <div className="absolute -inset-4 bg-gradient-to-tr from-primary/20 to-slate-50 rounded-[3rem] transform -rotate-2"></div>
              <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl bg-white border border-slate-100">
                <img
                  src={HeroImage}
                  alt="MediShift Story"
                  className="w-full h-auto object-cover transform hover:scale-105 transition-transform duration-700"
                />
              </div>
            </div>
            <div className="order-1 md:order-2">
              <span className="text-primary font-bold tracking-wider uppercase text-sm mb-4 block">Origine</span>
              <h2 className="text-4xl lg:text-5xl font-extrabold tracking-tight mb-8 bg-clip-text text-transparent bg-gradient-to-r from-secondary to-secondary/80">
                {t('story.title')}
              </h2>
              <div className="space-y-6 text-lg text-slate-600 leading-relaxed">
                <p>{t('story.paragraph1')}</p>
                <p>{t('story.paragraph2')}</p>
                <p>{t('story.paragraph3')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision Section */}
      <section className="py-24 lg:py-32 bg-premium-hero">
        <div className="container mx-auto px-4" style={{ maxWidth: '1200px' }}>
          <div className="text-center max-w-4xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6">
              <FaBullseye /> Vision & Missions
            </div>
            <h2 className="text-4xl lg:text-5xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-secondary to-secondary/80">
              {t('missionVision.title')}
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white rounded-[2rem] p-10 border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 hover:-translate-y-2 transition-all duration-300 group flex flex-col">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6">
                <FaClinicMedical size={24} />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-secondary">
                {t('missionVision.experienceSection.title')}
              </h3>
              <p className="text-slate-500 text-base leading-relaxed flex-grow mb-4">{t('missionVision.experienceSection.paragraph1')}</p>
              <p className="text-slate-500 text-base leading-relaxed">{t('missionVision.experienceSection.paragraph2')}</p>
            </div>

            <div className="bg-white rounded-[2rem] p-10 border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 hover:-translate-y-2 transition-all duration-300 group flex flex-col">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6">
                <FaUsers size={24} />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-secondary">
                {t('missionVision.insightSection.title')}
              </h3>
              <p className="text-slate-500 text-base leading-relaxed flex-grow">{t('missionVision.insightSection.paragraph1')}</p>
            </div>

            <div className="bg-white rounded-[2rem] p-10 border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 hover:-translate-y-2 transition-all duration-300 group flex flex-col">
              <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mb-6">
                <FaHandshake size={24} />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-secondary">
                {t('missionVision.commitmentSection.title')}
              </h3>
              <ul className="space-y-4 flex-grow">
                {(() => {
                  const points = t('missionVision.commitmentSection.points', { returnObjects: true });
                  return Array.isArray(points) ? points.map((point, index) => (
                    <li key={index} className="text-slate-500 text-sm leading-relaxed flex gap-3">
                      <div className="mt-1 min-w-[6px] h-[6px] rounded-full bg-teal-400"></div>
                      <span><strong className="text-secondary block mb-1">{point.title}</strong> {point.text}</span>
                    </li>
                  )) : null;
                })()}
              </ul>
            </div>
          </div>

          <div className="text-center max-w-3xl mx-auto bg-primary/5 rounded-2xl p-8 border border-primary/20">
            <p className="text-xl text-slate-600 leading-relaxed font-medium italic">"{t('missionVision.conclusion')}"</p>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-24 lg:py-32 bg-premium-hero">
        <div className="container mx-auto px-4" style={{ maxWidth: '1200px' }}>
          <div className="text-center max-w-4xl mx-auto mb-20">
            <h2 className="text-4xl lg:text-5xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-secondary to-secondary/80">
              {t('values.title')}
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
            {values.map((value, index) => {
              const colors = [
                { bg: 'bg-primary/10', text: 'text-primary' },
                { bg: 'bg-indigo-50', text: 'text-indigo-600' },
                { bg: 'bg-purple-50', text: 'text-purple-600' },
                { bg: 'bg-pink-50', text: 'text-pink-600' },
                { bg: 'bg-slate-50', text: 'text-slate-600' }
              ];
              const color = colors[index % colors.length];

              return (
                <div key={index} className="bg-white rounded-[2rem] border border-slate-100 p-8 hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-300 hover:-translate-y-2 group h-full flex flex-col items-center text-center">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 ${color.bg} ${color.text}`}>
                    <value.icon size={28} />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-slate-800">
                    {value.title}
                  </h3>
                  <p className="text-slate-500 text-base leading-relaxed flex-grow">
                    {value.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {/* CTA Section - Unified Design */}
      <section className="relative py-32 bg-secondary text-white overflow-hidden">
        {/* Abstract Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_-20%,#3b82f6,transparent)]"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10 w-full" style={{ maxWidth: '1200px' }}>
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
            <div className="lg:w-1/2 text-left">
              <h2 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight">{t('cta.title')}</h2>
              <p className="text-xl text-slate-400 mb-8 max-w-xl">
                Rejoignez la révolution du recrutement médical.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to={`/${lang}/facilities`} onClick={() => window.scrollTo(0, 0)}>
                  <button className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-primary/25">
                    {t('cta.forFacilities')} <FaArrowRight />
                  </button>
                </Link>
                <Link to={`/${lang}/professionals`} onClick={() => window.scrollTo(0, 0)}>
                  <button className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all hover:bg-white/10 border border-white/20 hover:border-white text-white">
                    {t('cta.forProfessionals')} <FaArrowRight />
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
                    <FaClinicMedical size={48} className="mb-4 opacity-80" />
                    <div className="text-2xl font-bold mb-2">Innovation Santé</div>
                    <p className="opacity-70">Une technologie au service de l'humain.</p>
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

export default AboutPage;
