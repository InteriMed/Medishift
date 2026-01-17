import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { FaChevronDown, FaChevronUp, FaSearch, FaArrowRight, FaRegLightbulb } from 'react-icons/fa';

const FAQPage = () => {
  const { t } = useTranslation(['faq', 'common']);
  const { lang } = useParams();
  const [activeCategory, setActiveCategory] = useState('general');
  const [expandedItems, setExpandedItems] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredFaqs, setFilteredFaqs] = useState([]);
  const [allFaqs, setAllFaqs] = useState([]);

  useEffect(() => {
    window.scrollTo(0, 0);

    const categories = Object.keys(t('categories', { returnObjects: true }));
    const loadedFaqs = [];

    categories.forEach(category => {
      const questions = t(`categories.${category}.questions`, { returnObjects: true });

      Object.keys(questions).forEach(key => {
        loadedFaqs.push({
          id: `${category}-${key}`,
          category,
          question: questions[key].question,
          answer: questions[key].answer
        });
      });
    });

    setAllFaqs(loadedFaqs);
    setFilteredFaqs(loadedFaqs.filter(faq => faq.category === 'general'));
  }, [t]);

  const handleCategoryChange = (category) => {
    setActiveCategory(category);
    setSearchQuery('');

    if (category === 'all') {
      setFilteredFaqs(allFaqs);
    } else {
      setFilteredFaqs(allFaqs.filter(faq => faq.category === category));
    }
  };

  const toggleItem = (id) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const query = searchQuery.toLowerCase();

    if (query.trim() === '') {
      handleCategoryChange(activeCategory);
    } else {
      const searchResults = allFaqs.filter(faq =>
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query)
      );

      setFilteredFaqs(searchResults);
    }
  };

  return (
    <div className="faq-page relative pastel-gradient-bg" style={{
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
      <Helmet>
        <title>{t('meta.title')}</title>
        <meta name="description" content={t('meta.description')} />
        <meta name="keywords" content={t('meta.keywords')} />
      </Helmet>

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 lg:pt-16 lg:pb-28 overflow-hidden flex items-center justify-center">
        <div className="container mx-auto px-4" style={{ maxWidth: '1200px' }}>
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium transition-colors border-transparent bg-primary/10 text-primary mb-6">
              Support & Aide
            </div>
            <h1 className="text-4xl lg:text-7xl font-black tracking-tight text-slate-900 pb-6 animate-gradient">
              {t('title')}
            </h1>
            <p className="text-xl text-muted-foreground mb-10 leading-relaxed max-w-2xl mx-auto">
              {t('subtitle')}
            </p>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary to-primary/80 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
              <form onSubmit={handleSearch} className="relative">
                <FaSearch className="absolute left-6 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('searchPlaceholder')}
                  className="w-full pl-14 pr-6 py-5 rounded-2xl border-none bg-white text-lg placeholder:text-slate-400 focus:outline-none focus:ring-0 shadow-xl"
                />
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Navigation */}
      <section className="py-10 border-b border-slate-100 bg-white sticky top-[var(--header-height)] z-30 shadow-sm backdrop-blur-md bg-white/80 supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto px-4" style={{ maxWidth: '1200px' }}>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all ${activeCategory === 'all'
                ? 'bg-secondary text-white shadow-lg shadow-secondary/20 transform scale-105'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-secondary'
                }`}
              onClick={() => handleCategoryChange('all')}
            >
              {t('allCategories')}
            </button>

            {Object.keys(t('categories', { returnObjects: true })).map(category => (
              <button
                key={category}
                className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all ${activeCategory === category
                  ? 'bg-secondary text-white shadow-lg shadow-secondary/20 transform scale-105'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-secondary'
                  }`}
                onClick={() => handleCategoryChange(category)}
              >
                {t(`categories.${category}.name`)}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="py-20 bg-premium-hero min-h-[50vh]">
        <div className="container mx-auto px-4" style={{ maxWidth: '1000px' }}>
          {searchQuery ? (
            <div>
              <h2 className="text-2xl font-bold mb-8 text-slate-900">{t('searchResults')}</h2>
              {filteredFaqs.length > 0 ? (
                <div className="space-y-4">
                  {filteredFaqs.map(faq => (
                    <div key={faq.id} className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
                      <button
                        className={`w-full px-8 py-6 text-left flex items-center justify-between font-bold text-lg transition-colors ${expandedItems[faq.id] ? 'text-primary' : 'text-slate-800 hover:text-primary'
                          }`}
                        onClick={() => toggleItem(faq.id)}
                      >
                        <span className="pr-8">{faq.question}</span>
                        {expandedItems[faq.id] ? <FaChevronUp className="flex-shrink-0" /> : <FaChevronDown className="flex-shrink-0 text-slate-400" />}
                      </button>
                      {expandedItems[faq.id] && (
                        <div className="px-8 pb-8 pt-0 animate-fadeIn">
                          <p className="text-slate-600 leading-relaxed border-t border-slate-100 pt-4">{faq.answer}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-slate-200">
                  <p className="text-slate-500 text-lg font-medium">{t('noResults')}</p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <h2 className="text-3xl font-extrabold mb-10 text-center text-slate-900">
                {activeCategory === 'all' ? t('allCategories') : t(`categories.${activeCategory}.name`)}
              </h2>
              <div className="space-y-4">
                {filteredFaqs.map(faq => (
                  <div key={faq.id} className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
                    <button
                      className={`w-full px-8 py-6 text-left flex items-center justify-between font-bold text-lg transition-colors ${expandedItems[faq.id] ? 'text-primary' : 'text-slate-800 hover:text-primary'
                        }`}
                      onClick={() => toggleItem(faq.id)}
                    >
                      <span className="pr-8">{faq.question}</span>
                      {expandedItems[faq.id] ? <FaChevronUp className="flex-shrink-0" /> : <FaChevronDown className="flex-shrink-0 text-slate-400" />}
                    </button>
                    {expandedItems[faq.id] && (
                      <div className="px-8 pb-8 pt-0 animate-fadeIn">
                        <p className="text-slate-600 leading-relaxed border-t border-slate-100 pt-4">{faq.answer}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Contact CTA */}
      {/* Contact CTA - Unified Design */}
      <section className="relative py-32 bg-secondary text-white overflow-hidden">
        {/* Abstract Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_-20%,#3b82f6,transparent)]"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10 w-full" style={{ maxWidth: '1200px' }}>
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
            <div className="lg:w-1/2 text-left">
              <h2 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight">{t('contactCta.title')}</h2>
              <p className="text-xl text-slate-400 mb-8 max-w-xl">{t('contactCta.description')}</p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to={`/${lang}/contact`} onClick={() => window.scrollTo(0, 0)}>
                  <button className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-primary/25">
                    {t('contactCta.button')} <FaArrowRight />
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
                    <div className="text-2xl font-bold mb-2">Support</div>
                    <p className="opacity-70">Nous sommes là pour vous aider.</p>
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

export default FAQPage;
