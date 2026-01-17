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
    <div className="min-h-screen bg-premium-hero">
      <Helmet>
        <title>{t('meta.title')}</title>
        <meta name="description" content={t('meta.description')} />
        <meta name="keywords" content={t('meta.keywords')} />
      </Helmet>

      {/* Hero Section */}
      <section className="relative pt-6 pb-8 lg:pt-8 lg:pb-12 overflow-hidden bg-premium-hero flex items-center justify-center">
        <div className="container mx-auto px-4" style={{ maxWidth: '1200px' }}>
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium transition-colors border-transparent bg-primary/10 text-primary mb-6">
              Blog & Actualités
            </div>
            <h1 className="text-4xl lg:text-7xl font-extrabold tracking-tight text-foreground pb-6 bg-clip-text text-transparent bg-gradient-to-r from-secondary via-secondary/80 to-secondary animate-gradient">
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
                    <button className="bg-secondary text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-secondary/90 transition-all hover-lift">
                      {t('readMore')} <FaArrowRight className="arrow-animate" />
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
                          <button className="text-sm font-bold text-primary flex items-center gap-1 hover:gap-2 transition-all">
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
              <h3 className="text-lg font-bold mb-6 pb-2 border-b border-slate-100 text-slate-900">{t('sidebar.search')}</h3>
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
              <h3 className="text-lg font-bold mb-6 pb-2 border-b border-slate-100 text-slate-900">{t('sidebar.categories')}</h3>
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
              <h3 className="text-lg font-bold mb-6 pb-2 border-b border-slate-100 text-slate-900">{t('sidebar.recentPosts')}</h3>
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

      {/* CTA Section - Unified Design */}
      <section className="relative py-32 bg-secondary text-white overflow-hidden">
        {/* Abstract Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_-20%,#3b82f6,transparent)]"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10 w-full" style={{ maxWidth: '1200px' }}>
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
            <div className="lg:w-1/2 text-left">
              <h2 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight">{t('blog:ctaDescription') || "Lancez-vous aujourd'hui"}</h2>
              <p className="text-xl text-slate-400 mb-8 max-w-xl">
                Rejoignez la révolution du recrutement médical en Suisse
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to={`/${lang}/facilities`} onClick={() => window.scrollTo(0, 0)}>
                  <button className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-primary/25">
                    Etablissements <FaArrowRight />
                  </button>
                </Link>
                <Link to={`/${lang}/professionals`} onClick={() => window.scrollTo(0, 0)}>
                  <button className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all hover:bg-white/10 border border-white/20 hover:border-white text-white">
                    Professionnels <FaArrowRight />
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
                    <div className="text-2xl font-bold mb-2">Platforme Digitale</div>
                    <p className="opacity-70">La solution complète pour le recrutement médical.</p>
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

export default BlogPage; 