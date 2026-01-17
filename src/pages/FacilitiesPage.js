import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
    FaBuilding, FaArrowRight, FaCheckCircle, FaUsers, FaRegLightbulb,
    FaCalendarAlt, FaBriefcase, FaLayerGroup, FaChartLine, FaRobot, FaHandshake
} from 'react-icons/fa';

import institutionalMockup from '../assets/pages/homepage/healthcareInstitutions.png';

const FacilitiesNew = () => {
    const { t } = useTranslation('facilities');
    const { lang } = useParams();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="flex flex-col min-h-screen text-foreground font-sans overflow-x-hidden relative" style={{ backgroundColor: '#ffffff' }}>
            <Helmet>
                <title>Gestion RH Hospitalière & Etablissements | MediShift</title>
                <meta name="description" content="Solution complète de gestion RH pour les établissements de santé suisses. Planning, recrutement et gestion d'équipe." />
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
                                Espace Établissements
                            </div>

                            <h1 className="text-5xl lg:text-7xl font-black tracking-tight text-slate-900 leading-[1.1] mb-8">
                                Optimisez votre <span className="text-blue-600">Gestion RH</span>
                            </h1>

                            <p className="text-xl text-slate-600 max-w-xl mb-10 leading-relaxed font-medium">
                                Une plateforme tout-en-un pour piloter vos équipes, vos plannings et vos recrutements avec une efficacité inégalée.
                            </p>

                            <div className="flex flex-wrap gap-5">
                                <Link to={`/${lang || 'fr'}/signup`} className="group">
                                    <button className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-lg flex items-center gap-3 transition-all hover:bg-slate-800 hover:shadow-2xl hover:shadow-slate-200 transform hover:-translate-y-1">
                                        Commencer gratuitement
                                        <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </Link>
                                <Link to="#details">
                                    <button className="px-8 py-4 bg-white text-slate-900 border-2 border-slate-200 rounded-2xl font-black text-lg flex items-center gap-3 transition-all hover:border-blue-600 hover:text-blue-600 hover:bg-blue-50 transform hover:-translate-y-1">
                                        Voir les solutions
                                    </button>
                                </Link>
                            </div>
                        </div>

                        <div className="flex-1 px-14 lg:px-0">
                            <div className="relative">
                                <div className="relative z-10 animate-float">
                                    <div className="bg-white rounded-[3rem] p-4 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-slate-100">
                                        <img
                                            src={institutionalMockup}
                                            alt="Espace Santé"
                                            className="w-full h-auto rounded-[2.5rem]"
                                        />
                                    </div>
                                </div>

                                {/* Verification Floating Badge */}
                                <div className="absolute top-1/4 -right-12 bg-white rounded-2xl p-6 shadow-2xl border border-blue-50 flex flex-col gap-2 animate-bounce-slow z-20">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg">
                                            <FaBuilding size={18} />
                                        </div>
                                        <div className="font-black text-slate-800">Partenaire Certifié</div>
                                    </div>
                                    <div className="flex items-center gap-2 text-green-500 font-bold text-xs">
                                        <FaCheckCircle /> Swiss Made
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Core Solutions Grid */}
            <section className="py-24 bg-white relative z-20">
                <div className="container mx-auto px-4" style={{ maxWidth: '1200px' }}>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {/* Team Management */}
                        <div className="group p-10 rounded-[2.5rem] bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-2xl transition-all duration-500">
                            <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white mb-8 group-hover:scale-110 transition-transform shadow-lg shadow-blue-200">
                                <FaUsers size={28} />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 mb-4">Gestion d'Équipe</h3>
                            <p className="text-slate-600 font-medium leading-relaxed mb-6">
                                Centralisez tous vos collaborateurs. Gérez les rôles, les accès et les dossiers administratifs en un clic.
                            </p>
                            <ul className="space-y-3">
                                <li className="flex items-center gap-2 text-sm text-slate-500 font-bold">
                                    <FaCheckCircle className="text-blue-600" /> Dossiers RH digitaux
                                </li>
                                <li className="flex items-center gap-2 text-sm text-slate-500 font-bold">
                                    <FaCheckCircle className="text-blue-600" /> Gestion multi-rôles
                                </li>
                            </ul>
                        </div>

                        {/* Calendar & Scheduling */}
                        <div className="group p-10 rounded-[2.5rem] bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-2xl transition-all duration-500">
                            <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white mb-8 group-hover:scale-110 transition-transform shadow-lg shadow-indigo-200">
                                <FaCalendarAlt size={28} />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 mb-4">Planning Intelligent</h3>
                            <p className="text-slate-600 font-medium leading-relaxed mb-6">
                                Planifiez vos shifts, gérez les absences et comblez les lacunes de planning en temps réel.
                            </p>
                            <ul className="space-y-3">
                                <li className="flex items-center gap-2 text-sm text-slate-500 font-bold">
                                    <FaCheckCircle className="text-indigo-600" /> Synchronisation temps réel
                                </li>
                                <li className="flex items-center gap-2 text-sm text-slate-500 font-bold">
                                    <FaCheckCircle className="text-indigo-600" /> Alertes de sous-effectif
                                </li>
                            </ul>
                        </div>

                        {/* Vacancy & Chains Management */}
                        <div className="group p-10 rounded-[2.5rem] bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-2xl transition-all duration-500">
                            <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center text-white mb-8 group-hover:scale-110 transition-transform shadow-lg shadow-emerald-200">
                                <FaLayerGroup size={28} />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 mb-4">Gestion des Groupes</h3>
                            <p className="text-slate-600 font-medium leading-relaxed mb-6">
                                Solution idéale pour les chaînes de cliniques et pharmacies. Vision globale et mobilité inter-sites (subletting).
                            </p>
                            <ul className="space-y-3">
                                <li className="flex items-center gap-2 text-sm text-slate-500 font-bold">
                                    <FaCheckCircle className="text-emerald-600" /> Mobilité inter-sites
                                </li>
                                <li className="flex items-center gap-2 text-sm text-slate-500 font-bold">
                                    <FaCheckCircle className="text-emerald-600" /> Reporting consolidé
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Team Workspace Section */}
            <section className="py-24 bg-slate-50">
                <div className="container mx-auto px-4" style={{ maxWidth: '1200px' }}>
                    <div className="grid lg:grid-cols-2 gap-20 items-center">
                        <div className="order-2 lg:order-1 relative">
                            <div className="absolute -inset-4 bg-blue-600/5 rounded-[4rem] transform -rotate-2"></div>
                            <div className="relative bg-white p-12 rounded-[3rem] shadow-2xl border border-slate-100">
                                <div className="space-y-8">
                                    <div className="flex gap-6">
                                        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                                            <FaUsers />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-slate-900 text-lg">Work-life Balance</h4>
                                            <p className="text-slate-500 font-medium">Gestion des demandes de congés et absences via des flux d'approbation personnalisés.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-6">
                                        <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 flex-shrink-0">
                                            <FaHandshake />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-slate-900 text-lg">Subletting (Prêt de personnel)</h4>
                                            <p className="text-slate-500 font-medium">Partagez vos collaborateurs entre différents sites de votre réseau en un clic.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-6">
                                        <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-green-600 flex-shrink-0">
                                            <FaRegLightbulb />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-slate-900 text-lg">Niveaux de dotation minimaux</h4>
                                            <p className="text-slate-500 font-medium">Définissez vos besoins critiques en personnel pour chaque service et shift.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="order-1 lg:order-2">
                            <h2 className="text-4xl lg:text-5xl font-black text-slate-900 mb-8 leading-tight">
                                Votre Espace de <span className="text-blue-600">Travail Collaboratif</span>
                            </h2>
                            <p className="text-xl text-slate-600 mb-10 leading-relaxed font-medium">
                                MediShift ne se contente pas de recruter. Nous vous offrons un véritable outil de pilotage pour votre équipe interne.
                            </p>
                            <ul className="space-y-4 font-bold text-slate-700">
                                <li className="flex items-center gap-3"><FaCheckCircle className="text-blue-600" /> Profils membres d'équipe complets</li>
                                <li className="flex items-center gap-3"><FaCheckCircle className="text-blue-600" /> Gestion des droits et permissions</li>
                                <li className="flex items-center gap-3"><FaCheckCircle className="text-blue-600" /> Horaires d'ouverture standards personnalisés</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* In-depth Vacancy Management Section */}
            <section className="py-24 bg-white">
                <div className="container mx-auto px-4" style={{ maxWidth: '1200px' }}>
                    <div className="bg-slate-900 rounded-[4rem] p-12 lg:p-20 relative overflow-hidden text-white">
                        {/* Decorative circles */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 rounded-full blur-[120px] opacity-20 transform translate-x-1/2 -translate-y-1/2"></div>

                        <div className="grid lg:grid-cols-2 gap-20 items-center relative z-10">
                            <div>
                                <h2 className="text-4xl lg:text-5xl font-black mb-8 leading-tight">
                                    Pilotage Multi-sites & <span className="text-blue-500">Besoins Flexibles</span>
                                </h2>
                                <p className="text-xl text-slate-400 mb-10 leading-relaxed font-medium">
                                    Que vous soyez un cabinet indépendant ou une chaîne nationale, MediShift s'adapte à votre échelle.
                                </p>

                                <div className="space-y-6">
                                    <div className="flex gap-4 items-center p-6 bg-white/5 rounded-2xl border border-white/10">
                                        <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-500">
                                            <FaBriefcase />
                                        </div>
                                        <div>
                                            <div className="font-bold text-lg">Vacancy Management</div>
                                            <div className="text-slate-500 text-sm">Postez vos besoins en un éclair et recevez des candidatures qualifiées instantanément.</div>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 items-center p-6 bg-white/5 rounded-2xl border border-white/10">
                                        <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-500">
                                            <FaChartLine />
                                        </div>
                                        <div>
                                            <div className="font-bold text-lg">Analytics RH</div>
                                            <div className="text-slate-500 text-sm">Suivez vos indicateurs de performance, coûts et taux de remplissage en temps réel.</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[3rem] p-12 text-center relative overflow-hidden shadow-2xl">
                                <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_50%_50%,#fff,transparent)]"></div>
                                <FaLayerGroup size={80} className="mx-auto mb-8 text-blue-200 opacity-50" />
                                <h3 className="text-3xl font-black mb-6">Prêt pour la Santé 2.0 ?</h3>
                                <p className="text-blue-100 mb-8 font-medium">
                                    Rejoignez les établissements qui ont déjà digitalisé leur gestion RH avec MediShift.
                                </p>
                                <Link to={`/${lang || 'fr'}/signup`}>
                                    <button className="w-full py-4 bg-white text-blue-600 rounded-2xl font-black text-lg hover:shadow-xl hover:bg-slate-50 transition-all">
                                        Essayer maintenant
                                    </button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Style for Animations */}
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
                .animate-float { animation: float 6s ease-in-out infinite; }
                .animate-float-delayed { animation: float-delayed 8s ease-in-out infinite; }
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

export default FacilitiesNew;
