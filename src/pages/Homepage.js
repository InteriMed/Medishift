import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
    FaCalendarAlt, FaShieldAlt, FaBolt, FaBuilding,
    FaUserMd, FaArrowRight, FaCheckCircle, FaUsers, FaRegLightbulb,
    FaUserPlus, FaStore, FaComments, FaFileContract, FaLock,
    FaServer, FaCode, FaMousePointer, FaRocket, FaSearch
} from 'react-icons/fa';

import phoneAppMockup from '../assets/pages/homepage/HeroBannerRightPicture.png';
import spsLogo from '../assets/pages/homepage/sps.png';


const NewHomepage = () => {
    const { t } = useTranslation('home');
    const { lang } = useParams();

    // Scroll to top when component mounts
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="homepage flex flex-col min-h-screen text-foreground font-sans overflow-x-hidden relative" style={{ backgroundColor: '#ffffff' }}>
            <Helmet>
                <title>{t('meta.title')} | MediShift New</title>
                <meta name="description" content={t('meta.description')} />
            </Helmet>

            {/* Modern Premium Hero Section */}
            <section className="relative pt-20 pb-32 overflow-hidden flex items-center z-10" style={{
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
                                {t('hero.tagLine')}
                            </div>

                            <h1 className="text-5xl lg:text-7xl font-black tracking-tight text-slate-900 leading-[1.1] mb-8">
                                Gestion RH Digitale
                                <span className="text-blue-600">.</span>
                            </h1>

                            <p className="text-xl text-slate-600 max-w-xl mb-10 leading-relaxed font-medium">
                                {t('hero.description')}
                            </p>

                            <div className="flex flex-row flex-wrap gap-5">
                                <Link to={`/${lang || 'fr'}/signup`} className="group">
                                    <button className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-lg flex items-center gap-3 transition-all hover:bg-slate-800 hover:shadow-2xl hover:shadow-slate-200 transform hover:-translate-y-1">
                                        {t('hero.cta.recruit')}
                                        <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </Link>
                                <Link to={`/${lang || 'fr'}/signup`} className="group">
                                    <button className="px-8 py-4 bg-white text-slate-900 border-2 border-slate-200 rounded-2xl font-black text-lg flex items-center gap-3 transition-all hover:border-slate-300 hover:bg-slate-50 transform hover:-translate-y-1">
                                        {t('hero.cta.work')}
                                        <FaSearch className="text-blue-600" />
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
                                            alt="MediShift App"
                                            className="w-full h-auto rounded-[2.5rem]"
                                        />
                                    </div>
                                </div>

                                <div className="absolute top-1/4 -left-12 bg-white rounded-2xl p-4 shadow-xl border border-slate-50 flex items-center gap-3 animate-bounce-slow z-20">
                                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-green-600">
                                        <FaCheckCircle size={18} />
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-slate-400 font-black uppercase tracking-tight">Vérifié</div>
                                        <div className="text-sm font-bold text-slate-800">Profil Validé</div>
                                    </div>
                                </div>

                                <div className="absolute bottom-1/4 -right-8 bg-white rounded-2xl p-4 shadow-xl border border-slate-50 flex items-center gap-3 animate-float-delayed z-20">
                                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                                        <FaFileContract size={18} />
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-slate-400 font-black uppercase tracking-tight">Contrat</div>
                                        <div className="text-sm font-bold text-slate-800">Signature Digitale</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Trust Bar */}
            <section className="relative py-12 bg-white/60 backdrop-blur-sm border-y border-slate-100/50 z-10">
                <div className="container mx-auto px-4" style={{ maxWidth: '1200px' }}>
                    <div className="flex flex-wrap justify-center items-center gap-16 md:gap-32 transition-all duration-500">
                        <img src={spsLogo} alt="SPS" className="h-16 w-auto object-contain" />
                        <img src="https://assets.onedoc.ch/images/groups/233046662f84ce9a70aaf7dbadf02b6de290d4c613fffd0ac40e38709e28e404-small.png" alt="OneDoc Group" className="h-20 w-auto object-contain" />
                        <img src="https://www.pikpng.com/pngl/b/577-5770945_switzerland-global-value-propositions-confdration-suisse-clipart.png" alt="Confédération Suisse" className="h-24 w-auto object-contain" />
                        <img src="https://assets.onedoc.ch/images/entities/b76d5e33eab4aa7bd5940f08ef50511e7e4c6c1227ebb9491d4d16b97f2637e0-medium.png" alt="Dental Clinic" className="h-20 w-auto object-contain" />
                    </div>
                </div>
            </section>

            {/* Feature Grid - The "Why MediShift" */}
            <section className="relative py-24 bg-white/70 backdrop-blur-sm overflow-hidden z-10">
                <div className="container mx-auto px-4 relative z-10" style={{ maxWidth: '1200px' }}>
                    <div className="max-w-3xl mx-auto text-center mb-20">
                        <h2 className="text-4xl lg:text-5xl font-black text-slate-900 mb-6">
                            Une plateforme pensée pour <span className="text-blue-600 underline decoration-blue-100 underline-offset-8">votre efficacité</span>
                        </h2>
                        <p className="text-lg text-slate-600 font-medium">
                            Simplifiez votre quotidien administratif et concentrez-vous sur l'essentiel : le soin.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-12 gap-8">
                        {/* Asymmetrical Grid for Premium Feel */}
                        <div className="md:col-span-8 group p-8 lg:p-12 rounded-[2.5rem] bg-white border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 flex flex-col lg:flex-row gap-10 items-center">
                            <div className="w-20 h-20 rounded-3xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0 group-hover:scale-110 transition-transform shadow-lg shadow-blue-100">
                                <FaBolt size={32} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 mb-4">Matching Intelligent & Instantané</h3>
                                <p className="text-lg text-slate-500 font-medium leading-relaxed">
                                    Notre algorithme de pointe connecte les talents avec les besoins en personnel en temps réel, garantissant une réactitivé sans précédent sur le marché suisse.
                                </p>
                            </div>
                        </div>

                        <div className="md:col-span-4 group p-8 rounded-[2.5rem] bg-slate-900 shadow-2xl transition-all duration-500 hover:-translate-y-2 flex flex-col justify-between overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
                            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-green-400 mb-8 relative z-10">
                                <FaLock size={24} />
                            </div>
                            <div className="relative z-10">
                                <h3 className="text-xl font-black text-white mb-3">Données nLPD Ready</h3>
                                <p className="text-slate-400 font-medium text-sm leading-relaxed">Souveraineté totale de vos données hébergées au cœur des Alpes suisses.</p>
                            </div>
                        </div>

                        <div className="md:col-span-4 group p-8 rounded-[2.5rem] bg-white border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2">
                            <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 mb-6 group-hover:scale-110 transition-transform">
                                <FaCalendarAlt size={24} />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 mb-3">Planning Collaboratif</h3>
                            <p className="text-slate-500 font-medium text-sm leading-relaxed">Gérez vos shifts et disponibilités via une interface interactive ultra-fluide.</p>
                        </div>

                        <div className="md:col-span-4 group p-8 rounded-[2.5rem] bg-white border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2">
                            <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 mb-6 group-hover:scale-110 transition-transform">
                                <FaFileContract size={24} />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 mb-3">Zéro Bureaucratie</h3>
                            <p className="text-slate-500 font-medium text-sm leading-relaxed">Contrats, signatures et paie : tout est automatisé et digitalisé à 100%.</p>
                        </div>

                        <div className="md:col-span-4 group p-8 rounded-[2.5rem] bg-blue-600 text-white shadow-xl hover:shadow-blue-200 transition-all duration-500 hover:-translate-y-2 flex flex-col justify-between">
                            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-white mb-8">
                                <FaRocket size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white mb-3">Accès Illimité & Gratuit</h3>
                                <p className="text-blue-100 font-medium text-sm leading-relaxed">Zéro frais d'inscription ou de publication.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Dual Persona Section */}
            <section className="relative py-24 bg-white">
                <div className="container mx-auto px-4 relative z-10" style={{ maxWidth: '1200px' }}>
                    <div className="bg-slate-900 rounded-[4rem] p-12 lg:p-20 relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none">
                            <svg viewBox="0 0 400 400" className="w-full h-full text-blue-500 fill-current">
                                <circle cx="400" cy="0" r="400" />
                            </svg>
                        </div>
                        <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-blue-600 rounded-full blur-[120px] opacity-20 pointer-events-none"></div>

                        <div className="grid lg:grid-cols-2 gap-20 items-center relative z-10 text-white text-left">
                            <div>
                                <h2 className="text-4xl lg:text-5xl font-black mb-8 leading-tight">
                                    Rejoignez le futur du <span className="text-blue-500">recrutement médical</span>
                                </h2>
                                <p className="text-xl text-slate-400 mb-10 leading-relaxed font-medium">
                                    Une plateforme pensée pour connecter les meilleurs talents avec les établissements de santé en toute simplicité.
                                </p>

                                <div className="space-y-6">
                                    <Link to={`/${lang || 'fr'}/facilities`} className="block group">
                                        <div className="flex gap-4 items-center p-6 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all duration-300">
                                            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/20">
                                                <FaBuilding size={20} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="relative flex h-2 w-2">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                                    </span>
                                                    <h4 className="text-lg font-bold text-white">Établissements de santé</h4>
                                                </div>
                                                <p className="text-slate-500 text-sm">Gérez vos besoins en personnel avec flexibilité et sans frais de placement.</p>
                                            </div>
                                            <FaArrowRight className="text-blue-500 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </Link>

                                    <Link to={`/${lang || 'fr'}/professionals`} className="block group">
                                        <div className="flex gap-4 items-center p-6 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all duration-300">
                                            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                                                <FaUserMd size={20} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="relative flex h-2 w-2">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/60 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                                                    </span>
                                                    <h4 className="text-lg font-bold text-white">Professionnels de santé</h4>
                                                </div>
                                                <p className="text-slate-500 text-sm">Reprenez le contrôle de votre emploi du temps et trouvez des missions.</p>
                                            </div>
                                            <FaArrowRight className="text-white group-hover:translate-x-1 transition-transform opacity-50 group-hover:opacity-100" />
                                        </div>
                                    </Link>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[3rem] p-12 text-center relative overflow-hidden shadow-2xl">
                                <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
                                <FaRocket size={80} className="mx-auto mb-8 text-blue-200 opacity-50" />

                                <div className="relative z-10">
                                    <h3 className="text-3xl font-black mb-6 text-white">100% En ligne & Gratuit</h3>
                                    <p className="text-lg font-medium text-blue-100 mb-8 leading-relaxed">
                                        Aucun frais d'inscription, aucun frais mensuel. MediShift se rémunère uniquement lors de la signature réussie d'un contrat.
                                    </p>
                                    <Link to={`/${lang || 'fr'}/signup`}>
                                        <button className="w-full py-4 bg-white text-blue-600 rounded-2xl font-black text-lg shadow-xl hover:shadow-2xl transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2">
                                            Essayer maintenant
                                            <FaArrowRight />
                                        </button>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            {/* Security & Swiss Made Section */}
            <section className="relative py-24 bg-white/70 backdrop-blur-sm border-y border-slate-100/50 overflow-hidden z-10">
                <div className="container mx-auto px-4" style={{ maxWidth: '1200px' }}>
                    <div className="flex flex-col lg:flex-row items-center gap-20">
                        <div className="flex-1">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-50 border border-red-100 text-red-600 text-xs font-bold tracking-wider uppercase mb-8 shadow-sm">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                                </span>
                                Sécurité & Confiance
                            </div>
                            <h2 className="text-4xl lg:text-5xl font-black text-slate-900 mb-8 leading-tight">
                                Vos données sont <span className="text-red-500">en sécurité</span> en Suisse
                            </h2>
                            <p className="text-xl text-slate-600 mb-12 leading-relaxed font-medium">
                                MediShift est conçu selon les standards de sécurité les plus élevés. Toutes vos informations professionnelles et personnelles sont protégées par les lois suisses sur la protection des données.
                            </p>

                            <div className="grid sm:grid-cols-2 gap-8">
                                <div className="flex gap-4 items-start group">
                                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-red-600">
                                        <FaServer size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-slate-900 mb-1">Hébergement Suisse</h4>
                                        <p className="text-sm text-slate-500 font-medium">Données stockées exclusivement dans des datacenters helvétiques hautement sécurisés.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4 items-start group">
                                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-red-600">
                                        <FaShieldAlt size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-slate-900 mb-1">Conformité nLPD</h4>
                                        <p className="text-sm text-slate-500 font-medium">Plateforme 100% conforme à la nouvelle loi fédérale sur la protection des données.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4 items-start group">
                                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-red-600">
                                        <FaLock size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-slate-900 mb-1">Encryption de pointe</h4>
                                        <p className="text-sm text-slate-500 font-medium">Chiffrement SSL/TLS de toutes les communications et des données au repos.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4 items-start group">
                                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-red-600">
                                        <FaCode size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-slate-900 mb-1">Développement Suisse</h4>
                                        <p className="text-sm text-slate-500 font-medium">Une plateforme pensée, développée et maintenue par des experts en Suisse.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 relative">
                            <div className="relative w-full max-w-lg mx-auto aspect-square bg-white rounded-[3rem] border border-slate-100 shadow-2xl p-12 flex items-center justify-center overflow-hidden">
                                <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#e5e7eb_2px,transparent_2px)] [background-size:24px_24px]"></div>

                                <div className="relative z-10 flex flex-col items-center">
                                    <div className="w-48 h-48 lg:w-64 lg:h-64 bg-red-600 rounded-[2.5rem] shadow-2xl flex items-center justify-center mb-12 relative group transform hover:scale-105 transition-transform duration-500">
                                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-[2.5rem]"></div>
                                        <svg viewBox="0 0 100 100" className="w-32 h-32 lg:w-40 lg:h-40 text-white fill-current drop-shadow-2xl">
                                            <rect x="41" y="15" width="18" height="70" rx="3" />
                                            <rect x="15" y="41" width="70" height="18" rx="3" />
                                        </svg>
                                    </div>
                                    <div className="flex gap-4 justify-center">
                                        <div className="px-6 py-2.5 bg-slate-900 text-white rounded-full shadow-lg text-xs font-black tracking-widest uppercase flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                            nLPD Ready
                                        </div>
                                        <div className="px-6 py-2.5 bg-white text-slate-900 rounded-full shadow-lg border border-slate-100 text-xs font-black tracking-widest uppercase flex items-center gap-2">
                                            <FaLock size={12} className="text-slate-400" />
                                            SSL Secure
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pourquoi nous choisir */}
            <section className="relative py-24 bg-white/70 backdrop-blur-sm overflow-hidden z-10">
                <div className="container mx-auto px-4 relative z-10" style={{ maxWidth: '1200px' }}>
                    <div className="text-center max-w-3xl mx-auto mb-20">
                        <h2 className="text-4xl lg:text-5xl font-black text-slate-900 mb-6">
                            Pourquoi nous choisir
                        </h2>
                        <h3 className="text-3xl lg:text-4xl font-black text-blue-600 mb-4">
                            C'est gratuit
                        </h3>
                        <p className="text-lg text-slate-600 font-medium leading-relaxed">
                            Rejoignez notre plateforme sans frais cachés. Simple, transparent et gratuit pour tous.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[
                            {
                                title: "Aucun frais d'inscription",
                                subtitle: "Etablissements",
                                desc: "Inscrivez-vous gratuitement et commencez à publier vos offres d'emploi dès aujourd'hui",
                                icon: FaBuilding,
                                color: 'text-primary',
                                bg: 'bg-primary/10',
                                link: `/${lang || 'fr'}/facilities`
                            },
                            {
                                title: "Gratuit pour toujours",
                                subtitle: "Professionnels",
                                desc: "Créez votre profil gratuitement et accédez à toutes les opportunités sans frais cachés",
                                icon: FaUserMd,
                                color: 'text-purple-500',
                                bg: 'bg-purple-50',
                                link: `/${lang || 'fr'}/professionals`
                            },
                            {
                                title: "Sans engagement",
                                subtitle: "Pour tous",
                                desc: "Utilisez notre plateforme sans frais, sans engagement et sans surprise. Simple et transparent",
                                icon: FaUsers,
                                color: 'text-green-500',
                                bg: 'bg-green-50',
                                link: `/${lang || 'fr'}/signup`
                            }
                        ].map((card, idx) => (
                            <Link key={idx} to={card.link} className="group block">
                                <div className="relative bg-white rounded-3xl p-8 border border-slate-100 hover:border-primary/20 shadow-sm hover:shadow-xl transition-all duration-300 h-full">
                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110 ${card.bg} ${card.color}`}>
                                        <card.icon size={30} />
                                    </div>
                                    <div className="relative z-10">
                                        <div className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">{card.subtitle}</div>
                                        <h3 className="text-xl font-black mb-3 text-slate-900">{card.title}</h3>
                                        <p className="text-slate-500 leading-relaxed text-sm">{card.desc}</p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* Final CTA Section */}
            <section className="relative py-24 overflow-hidden z-10" style={{
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
                        <h2 className="text-4xl lg:text-5xl font-black text-slate-900 mb-8 leading-tight">
                            Prêt à optimiser votre gestion RH ?
                        </h2>
                        <div className="flex justify-center gap-4">
                            <Link to={`/${lang || 'fr'}/signup`}>
                                <button className="px-10 py-5 bg-blue-600 text-white rounded-2xl font-black text-xl hover:bg-blue-700 transition-all shadow-xl hover:shadow-blue-500/20 transform hover:-translate-y-1">
                                    Commencer maintenant
                                </button>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Styles for Animations */}
            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes shapeFloat {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(30px, -30px) rotate(5deg); }
          66% { transform: translate(-20px, 20px) rotate(-5deg); }
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
      `}} />
        </div>
    );
};

export default NewHomepage;
