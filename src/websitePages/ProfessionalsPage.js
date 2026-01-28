import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
    FaUserMd, FaArrowRight, FaCheckCircle, FaMagic,
    FaFingerprint, FaClock, FaPassport, FaLaptopCode, FaCheckDouble
} from 'react-icons/fa';

import phoneAppMockup from '../assets/pages/homepage/HeroBannerRightPicture.png';

const ProfessionalsNew = () => {
    const { t } = useTranslation('professionals');
    const { lang } = useParams();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="flex flex-col min-h-screen text-foreground font-sans overflow-x-hidden relative" style={{ backgroundColor: '#ffffff' }}>
            <Helmet>
                <title>{t('meta.title')}</title>
                <meta name="description" content={t('meta.description')} />
            </Helmet>

            {/* Hero Section */}
            <section className="relative pt-20 pb-32 overflow-hidden flex items-center z-10 pastel-gradient-bg" style={{
                minHeight: 'calc(100vh - var(--header-height))',
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
                    <div className="flex flex-col lg:flex-row items-center gap-16">
                        <div className="flex-1 text-left">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100/50 text-blue-700 text-xs font-bold tracking-wider uppercase mb-8 border border-blue-200 shadow-sm">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                                </span>
                                {t('hero.badge')}
                            </div>

                            <h1 className="text-5xl lg:text-7xl font-black tracking-tight text-slate-900 leading-[1.1] mb-8">
                                {t('hero.title')}
                            </h1>

                            <p className="text-xl text-slate-600 max-w-xl mb-10 leading-relaxed font-medium">
                                {t('hero.subtitle')}
                            </p>

                            <div className="flex flex-wrap gap-5">
                                <Link to={`/${lang || 'fr'}/signup`} className="group">
                                    <button className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-lg flex items-center gap-3 transition-all hover:bg-slate-800 hover:shadow-2xl hover:shadow-slate-200 transform hover:-translate-y-1">
                                        {t('hero.ctaCreate')}
                                        <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </Link>
                                <Link to="#details">
                                    <button className="px-8 py-4 bg-white text-slate-900 border-2 border-slate-200 rounded-2xl font-black text-lg flex items-center gap-3 transition-all hover:border-blue-600 hover:text-blue-600 hover:bg-blue-50 transform hover:-translate-y-1">
                                        {t('hero.ctaLearnMore')}
                                    </button>
                                </Link>
                            </div>
                        </div>

                        <div className="flex-1 px-14 lg:px-0">
                            <div className="relative">
                                <div className="relative z-10 animate-float">
                                    <div className="bg-white rounded-[3rem] p-4 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-slate-100">
                                        <img
                                            src={phoneAppMockup}
                                            alt={t('hero.appAlt')}
                                            className="w-full h-auto rounded-[2.5rem]"
                                        />
                                    </div>
                                </div>

                                {/* Verification Floating Badge */}
                                <div className="absolute top-1/4 -right-12 bg-white rounded-2xl p-6 shadow-2xl border border-blue-50 flex flex-col gap-2 animate-bounce-slow z-20">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg">
                                            <FaFingerprint size={18} />
                                        </div>
                                        <div className="font-black text-slate-800">{t('hero.glnVerification')}</div>
                                    </div>
                                    <div className="flex items-center gap-2 text-green-500 font-bold text-xs">
                                        <FaCheckDouble /> {t('hero.validated')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Professional Features Section */}
            <section id="details" className="py-24 bg-slate-50 relative overflow-hidden">
                <div className="container mx-auto px-4" style={{ maxWidth: '1200px' }}>
                    <div className="text-center max-w-2xl mx-auto mb-20">
                        <h2 className="text-4xl font-black text-slate-900 mb-6">{t('quickApply.title')}</h2>
                        <p className="text-lg text-slate-600 font-medium">{t('quickApply.description')}</p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12">
                        {/* GLN Verification */}
                        <div className="flex flex-col gap-6 relative group">
                            <div className="w-14 h-14 bg-white rounded-2xl shadow-md flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                                <FaPassport size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 mb-3">{t('features.glnVerification.title')}</h3>
                                <p className="text-slate-500 font-medium leading-relaxed">
                                    {t('features.glnVerification.description')}
                                </p>
                            </div>
                        </div>

                        {/* Automated CV Creation */}
                        <div className="flex flex-col gap-6 relative group">
                            <div className="w-14 h-14 bg-white rounded-2xl shadow-md flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                                <FaMagic size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 mb-3">{t('features.smartCV.title')}</h3>
                                <p className="text-slate-500 font-medium leading-relaxed">
                                    {t('features.smartCV.description')}
                                </p>
                            </div>
                        </div>

                        {/* Reduced Application Time */}
                        <div className="flex flex-col gap-6 relative group">
                            <div className="w-14 h-14 bg-white rounded-2xl shadow-md flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                                <FaClock size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 mb-3">{t('features.fastTrack.title')}</h3>
                                <p className="text-slate-500 font-medium leading-relaxed">
                                    {t('features.fastTrack.description')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Availability & Communication Section */}
            <section className="py-24 bg-white">
                <div className="container mx-auto px-4" style={{ maxWidth: '1200px' }}>
                    <div className="grid lg:grid-cols-2 gap-20 items-center">
                        <div>
                            <h2 className="text-4xl lg:text-5xl font-black text-slate-900 mb-8 leading-tight">
                                {t('availability.title')}
                            </h2>
                            <p className="text-xl text-slate-600 mb-10 leading-relaxed font-medium">
                                {t('availability.description')}
                            </p>

                            <div className="grid sm:grid-cols-2 gap-8">
                                <div className="p-8 rounded-[2rem] bg-blue-50/50 border border-blue-100">
                                    <h4 className="font-black text-slate-900 mb-3">{t('availability.flexibility.title')}</h4>
                                    <p className="text-slate-500 text-sm font-medium">{t('availability.flexibility.description')}</p>
                                </div>
                                <div className="p-8 rounded-[2rem] bg-indigo-50/50 border border-indigo-100">
                                    <h4 className="font-black text-slate-900 mb-3">{t('availability.messaging.title')}</h4>
                                    <p className="text-slate-500 text-sm font-medium">{t('availability.messaging.description')}</p>
                                </div>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute -inset-4 bg-slate-900 rounded-[4rem] transform rotate-2"></div>
                            <div className="relative bg-slate-800 p-12 rounded-[3rem] shadow-2xl border border-slate-700 text-white">
                                <div className="flex items-center gap-4 mb-10">
                                    <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                                        <FaLaptopCode />
                                    </div>
                                    <h3 className="text-2xl font-black">{t('availability.adminCard.title')}</h3>
                                </div>
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4 text-slate-300 font-medium">
                                        <FaCheckCircle className="text-green-500" /> {t('availability.adminCard.item1')}
                                    </div>
                                    <div className="flex items-center gap-4 text-slate-300 font-medium">
                                        <FaCheckCircle className="text-green-500" /> {t('availability.adminCard.item2')}
                                    </div>
                                    <div className="flex items-center gap-4 text-slate-300 font-medium">
                                        <FaCheckCircle className="text-green-500" /> {t('availability.adminCard.item3')}
                                    </div>
                                    <div className="flex items-center gap-4 text-slate-300 font-medium">
                                        <FaCheckCircle className="text-green-500" /> {t('availability.adminCard.item4')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* High Conversion Section */}
            <section className="py-24 bg-white">
                <div className="container mx-auto px-4" style={{ maxWidth: '1200px' }}>
                    <div className="bg-slate-900 rounded-[4rem] p-12 lg:p-20 relative overflow-hidden">
                        {/* Decorative circles */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 rounded-full blur-[120px] opacity-20 transform translate-x-1/2 -translate-y-1/2"></div>

                        <div className="grid lg:grid-cols-2 gap-16 items-center">
                            <div className="text-white relative z-10">
                                <h2 className="text-4xl lg:text-5xl font-black mb-8 leading-tight">{t('cta.title')}</h2>
                                <div className="space-y-6 mb-10">
                                    <div className="flex items-center gap-4 text-lg font-medium text-slate-300">
                                        <FaCheckCircle className="text-blue-500" /> {t('cta.item1')}
                                    </div>
                                    <div className="flex items-center gap-4 text-lg font-medium text-slate-300">
                                        <FaCheckCircle className="text-blue-500" /> {t('cta.item2')}
                                    </div>
                                    <div className="flex items-center gap-4 text-lg font-medium text-slate-300">
                                        <FaCheckCircle className="text-blue-500" /> {t('cta.item3')}
                                    </div>
                                </div>
                                <Link to={`/${lang || 'fr'}/signup`}>
                                    <button className="px-10 py-5 bg-blue-600 text-white rounded-2xl font-black text-xl hover:bg-blue-700 transition-all shadow-xl hover:shadow-blue-500/20">
                                        {t('cta.button')}
                                    </button>
                                </Link>
                            </div>
                            <div className="relative">
                                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[3rem] p-8 lg:p-12">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white">
                                            <FaUserMd size={32} />
                                        </div>
                                        <div>
                                            <div className="text-white font-black text-xl">{t('cta.card.title')}</div>
                                            <div className="text-slate-500 font-bold uppercase tracking-widest text-xs">{t('cta.card.status')}</div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="h-3 bg-white/10 rounded-full w-full"></div>
                                        <div className="h-3 bg-white/10 rounded-full w-4/5"></div>
                                        <div className="h-3 bg-white/10 rounded-full w-2/3"></div>
                                        <div className="pt-4 flex justify-between">
                                            <div className="h-8 bg-blue-500/20 rounded-lg w-24"></div>
                                            <div className="h-8 bg-green-500/20 rounded-lg w-20"></div>
                                        </div>
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
                section.pastel-gradient-bg.bg-white {
                    background: linear-gradient(135deg, #fef0f4 0%, #f0f4ff 15%, #f0fdf4 30%, #fefce8 45%, #fdf2f8 60%, #f0f9ff 75%, #f5f3ff 90%, #fff1f2 100%) !important;
                    background-image: linear-gradient(135deg, #fef0f4 0%, #f0f4ff 15%, #f0fdf4 30%, #fefce8 45%, #fdf2f8 60%, #f0f9ff 75%, #f5f3ff 90%, #fff1f2 100%) !important;
                }
            `}} />
        </div>
    );
};

export default ProfessionalsNew;
