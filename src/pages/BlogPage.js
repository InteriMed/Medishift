import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { FaRegLightbulb, FaSearch, FaCalendarAlt, FaUser, FaTag, FaArrowRight, FaArrowLeft } from 'react-icons/fa';

const BlogPage = () => {
  const { t } = useTranslation(['blog', 'common']);
  const { lang } = useParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [blogPosts, setBlogPosts] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [featuredPost, setFeaturedPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const postsPerPage = 6;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const loadBlogPosts = async () => {
      try {
        setLoading(true);

        const postsModule = await import(`../locales/${lang || 'en'}/blog/posts.json`)
          .catch(() => import('../locales/en/blog/posts.json'));

        const posts = postsModule.default || [];

        const sortedPosts = [...posts].sort((a, b) =>
          new Date(b.date) - new Date(a.date)
        );

        setBlogPosts(sortedPosts);
        setFilteredPosts(sortedPosts);

        if (sortedPosts.length > 0) {
          setFeaturedPost(sortedPosts[0]);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error loading blog posts:', error);
        setLoading(false);
      }
    };

    loadBlogPosts();
  }, [lang]);

  useEffect(() => {
    let filtered = [...blogPosts];

    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(post =>
        post.title.toLowerCase().includes(query) ||
        post.excerpt.toLowerCase().includes(query) ||
        post.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter(post =>
        post.category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    if (featuredPost) {
      filtered = filtered.filter(post => post.id !== featuredPost.id);
    }

    setFilteredPosts(filtered);
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, blogPosts, featuredPost]);

  const handleCategoryClick = (category, e) => {
    e.preventDefault();
    setSelectedCategory(category === selectedCategory ? null : category);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
  };

  const categories = [...new Set(blogPosts.map(post => post.category))];
  const recentPosts = filteredPosts.slice(0, 5);

  const mostRecentPost = selectedCategory
    ? filteredPosts.sort((a, b) => new Date(b.date) - new Date(a.date))[0]
    : featuredPost;

  const indexOfLastPost = currentPage * postsPerPage;
  const indexOfFirstPost = indexOfLastPost - postsPerPage;

  const currentPosts = filteredPosts
    .filter(post => post.id !== featuredPost?.id)
    .slice(indexOfFirstPost, indexOfLastPost);

  const totalPages = Math.ceil(filteredPosts.length / postsPerPage);

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(lang || 'en', options);
  };

  return (
    <div className="min-h-screen relative pastel-gradient-bg" style={{
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
      <section className="relative pt-6 pb-8 lg:pt-8 lg:pb-12 overflow-hidden flex items-center justify-center">
        <div className="container mx-auto px-4" style={{ maxWidth: '1200px' }}>
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium transition-colors border-transparent bg-primary/10 text-primary mb-6">
              Blog & Actualités
            </div>
            <h1 className="text-4xl lg:text-7xl font-black tracking-tight text-slate-900 pb-6 animate-gradient">
              {t('title')}
            </h1>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12" style={{ maxWidth: '1200px' }}>
        <div className="grid lg:grid-cols-3 gap-12 pb-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-12">

            {/* Featured Post */}
            {mostRecentPost && !searchQuery && !selectedCategory && (
              <div className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-xl hover:shadow-2xl transition-all duration-500 group relative">
                <div className="relative h-64 md:h-[28rem] overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10"></div>
                  <img
                    src={mostRecentPost.image}
                    alt={mostRecentPost.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute top-6 left-6 z-20 bg-primary text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-lg">
                    {t('featured.title')}
                  </div>
                </div>
                <div className="p-10 relative">
                  <div className="flex flex-wrap gap-4 text-sm text-slate-500 mb-4 font-medium">
                    <span className="flex items-center gap-1 text-primary bg-primary/10 px-3 py-1 rounded-full">
                      <FaTag size={10} /> {mostRecentPost.category}
                    </span>
                    <span className="flex items-center gap-1">
                      <FaCalendarAlt size={12} /> {formatDate(mostRecentPost.date)}
                    </span>
                    <span className="flex items-center gap-1">
                      <FaUser size={12} /> {mostRecentPost.author}
                    </span>
                  </div>
                  <h2 className="text-3xl lg:text-4xl font-extrabold mb-4 text-slate-900 group-hover:text-primary transition-colors">
                    <Link to={`/${lang || 'en'}/blog/${mostRecentPost.slug}`}>
                      {mostRecentPost.title}
                    </Link>
                  </h2>
                  <p className="text-slate-600 mb-8 line-clamp-3 text-lg leading-relaxed">
                    {mostRecentPost.excerpt}
                  </p>
                  <Link to={`/${lang || 'en'}/blog/${mostRecentPost.slug}`}>
                    <button className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-lg flex items-center gap-3 hover:bg-slate-800 hover:shadow-xl transition-all hover:-translate-y-1">
                      {t('readMore')} <FaArrowRight />
                    </button>
                  </Link>
                </div>
              </div>
            )}

            {/* Blog Grid */}
            <div className="grid md:grid-cols-2 gap-8">
              {loading ? (
                <div className="col-span-2 flex justify-center py-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
              ) : currentPosts.length > 0 ? (
                currentPosts.map(post => (
                  <div key={post.id} className="bg-white rounded-[2rem] overflow-hidden border border-slate-100 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full group">
                    <div className="relative h-56 overflow-hidden">
                      <img
                        src={post.image}
                        alt={post.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm text-slate-900 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                        {post.category}
                      </div>
                    </div>
                    <div className="p-8 flex flex-col flex-grow">
                      <div className="flex flex-wrap gap-3 text-xs text-slate-500 mb-4 font-medium">
                        <span className="flex items-center gap-1">
                          <FaCalendarAlt size={10} /> {formatDate(post.date)}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold mb-4 text-slate-900 group-hover:text-primary transition-colors line-clamp-2">
                        <Link to={`/${lang || 'en'}/blog/${post.slug}`}>
                          {post.title}
                        </Link>
                      </h3>
                      <div className="mt-auto pt-4 border-t border-slate-100">
                        <Link to={`/${lang || 'en'}/blog/${post.slug}`}>
                          <button className="text-blue-600 font-bold text-sm uppercase tracking-wide flex items-center gap-2 hover:gap-3 transition-all">
                            {t('readMore')} <FaArrowRight size={12} />
                          </button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-center py-20 bg-slate-50 rounded-[2rem] border border-dashed border-slate-300">
                  <p className="text-slate-500 font-medium">{t('noPostsFound')}</p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {currentPosts.length > 0 && totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 pt-8">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-3 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <FaArrowLeft size={14} />
                </button>

                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-12 h-12 rounded-xl font-bold transition-all shadow-sm ${currentPage === i + 1
                      ? 'bg-secondary text-white shadow-md'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                    {i + 1}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-3 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <FaArrowRight size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Search Widget */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-lg p-8">
              <h3 className="text-xl font-black text-slate-900 mb-6 pb-2 border-b border-slate-100">{t('sidebar.search')}</h3>
              <form onSubmit={handleSearchSubmit} className="relative">
                <input
                  type="text"
                  placeholder={t('searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
                <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
              </form>
            </div>

            {/* Categories Widget */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-lg p-8">
              <h3 className="text-xl font-black text-slate-900 mb-6 pb-2 border-b border-slate-100">{t('sidebar.categories')}</h3>
              <div className="flex flex-wrap gap-3">
                {categories.map((category, index) => (
                  <button
                    key={index}
                    onClick={(e) => handleCategoryClick(category, e)}
                    className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide transition-all shadow-sm hover:shadow-md ${selectedCategory === category
                      ? 'bg-secondary text-white transform scale-105'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Posts Widget */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-lg p-8">
              <h3 className="text-xl font-black text-slate-900 mb-6 pb-2 border-b border-slate-100">{t('sidebar.recentPosts')}</h3>
              <div className="space-y-6">
                {recentPosts.slice(0, 3).map(post => (
                  <Link key={post.id} to={`/${lang || 'en'}/blog/${post.slug}`} className="flex gap-4 group items-center">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 shadow-sm">
                      <img src={post.image} alt={post.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm line-clamp-2 text-slate-800 group-hover:text-primary transition-colors mb-2">
                        {post.title}
                      </h4>
                      <span className="text-xs text-slate-400 flex items-center gap-1 font-medium bg-slate-50 px-2 py-1 rounded-md w-fit">
                        <FaCalendarAlt size={10} /> {formatDate(post.date)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* CTA Section - Unified Premium Design */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4" style={{ maxWidth: '1200px' }}>
          <div className="bg-slate-900 rounded-[4rem] p-12 lg:p-20 relative overflow-hidden text-white shadow-2xl">
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 rounded-full blur-[120px] opacity-20 transform translate-x-1/2 -translate-y-1/2"></div>

            <div className="grid lg:grid-cols-2 gap-20 items-center relative z-10">
              <div>
                <h2 className="text-4xl lg:text-5xl font-black mb-6 leading-tight">
                  {t('ctaDescription') || "Lancez-vous aujourd'hui"}
                </h2>
                <p className="text-xl text-slate-400 mb-10 leading-relaxed font-medium">
                  Rejoignez la révolution du recrutement médical en Suisse.
                </p>
                <div className="flex flex-col sm:flex-row gap-5">
                  <Link to={`/${lang}/facilities`} onClick={() => window.scrollTo(0, 0)}>
                    <button className="w-full sm:w-auto px-8 py-4 bg-white text-slate-900 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all hover:bg-slate-50 hover:shadow-xl hover:-translate-y-1">
                      Etablissements <FaArrowRight className="text-blue-600" />
                    </button>
                  </Link>
                  <Link to={`/${lang}/professionals`} onClick={() => window.scrollTo(0, 0)}>
                    <button className="w-full sm:w-auto px-8 py-4 bg-slate-800 text-white border border-slate-700 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all hover:bg-slate-700 hover:border-slate-600 hover:-translate-y-1">
                      Professionnels <FaArrowRight />
                    </button>
                  </Link>
                </div>
              </div>

              <div className="relative hidden lg:block">
                <div className="relative z-10 grid grid-cols-2 gap-4">
                  <div className="space-y-4 pt-8">
                    <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/10 transform translate-y-4">
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 mb-3">
                        <FaRegLightbulb />
                      </div>
                      <div className="h-2 w-20 bg-white/20 rounded-full mb-2"></div>
                      <div className="h-2 w-full bg-white/10 rounded-full"></div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm p-6 rounded-3xl border border-white/5">
                      <div className="h-2 w-16 bg-white/20 rounded-full mb-2"></div>
                      <div className="h-2 w-full bg-white/10 rounded-full"></div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-6 rounded-3xl shadow-xl transform -translate-y-4">
                      <div className="text-3xl font-black mb-1">100%</div>
                      <div className="text-blue-100 text-sm font-medium">Digital &amp; Humain</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/10">
                      <div className="h-2 w-24 bg-white/20 rounded-full mb-2"></div>
                      <div className="h-2 w-full bg-white/10 rounded-full"></div>
                      <div className="h-2 w-2/3 bg-white/10 rounded-full mt-2"></div>
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
    `}} />
    </div>
  );
};

export default BlogPage; 