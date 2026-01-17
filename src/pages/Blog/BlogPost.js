import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { useParams, Link } from 'react-router-dom';
import { FaCalendarAlt, FaUser, FaTag, FaArrowLeft, FaShare } from 'react-icons/fa';
import './styles/BlogPost.css';

const BlogPost = () => {
  const { t } = useTranslation(['blog', 'common']);
  const { lang, slug } = useParams();
  const [post, setPost] = useState(null);
  const [relatedPosts, setRelatedPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0); // Scroll to top on component mount
  }, []); // Empty dependency array to run only on mount

  useEffect(() => {
    // In a real implementation, this would fetch from an API
    // For now, we'll simulate loading the blog post data
    const loadBlogPost = async () => {
      try {
        setLoading(true);
        
        // Try to load the specific blog post translation
        const postData = await import(`../../locales/${lang}/blog/${slug}.json`)
          .catch(() => import(`../../locales/en/blog/${slug}.json`)); // Fallback to English
        
        // Load all blog posts to find related ones
        const allPostsData = await import(`../../locales/${lang}/blog/posts.json`)
          .catch(() => import(`../../locales/en/blog/posts.json`));
        
        const allPosts = allPostsData.default || [];
        
        // Find the current post metadata
        const currentPostMeta = allPosts.find(p => p.slug === slug);
        
        if (currentPostMeta && postData.default) {
          // Combine metadata with content
          const fullPost = {
            ...currentPostMeta,
            ...postData.default
          };
          
          setPost(fullPost);
          
          // Find related posts (same category, excluding current)
          const related = allPosts
            .filter(p => p.category === currentPostMeta.category && p.slug !== slug)
            .slice(0, 3);
          
          setRelatedPosts(related);
        }
      } catch (error) {
        console.error("Error loading blog post:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadBlogPost();
  }, [lang, slug]);

  if (loading) {
    return (
      <div className="blog-post-loading">
        <div className="loading-spinner"></div>
        <p>{t('common:loading')}</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="blog-post-not-found">
        <h1>{t('postNotFound')}</h1>
        <p>{t('postNotFoundDescription')}</p>
        <Link to={`/${lang}/blog`} className="btn btn-primary">
          <FaArrowLeft /> {t('backToBlog')}
        </Link>
      </div>
    );
  }

  return (
    <div className="blog-post-page">
      <Helmet>
        <title>{post.title} | InteriMed</title>
        <meta name="description" content={post.excerpt} />
        <meta name="keywords" content={post.keywords?.join(', ')} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.excerpt} />
        <meta property="og:image" content={post.image} />
        <meta property="og:type" content="article" />
      </Helmet>

      {/* Hero Section */}
      <section className="blog-post-hero" style={{ backgroundImage: `url(${post.image})` }}>
        <div className="container">
          <div className="blog-post-hero-content">
            <h1>{post.title}</h1>
          </div>
        </div>
      </section>
      
      <div className="back-to-blog-container">
        <Link to={`/${lang}/blog`} className="back-to-blog">
          <FaArrowLeft /> {t('backToBlog')}
        </Link>
      </div>

      {/* Main Content */}
      <section className="blog-post-content">
        <div className="container">
          <div className="blog-post-column">
            {/* Article Content */}
            <article className="blog-post-main">
              <div className="blog-post-excerpt">
                <h3>{post.excerpt}</h3>
              </div>
              
              {/* Table of Contents (if available) */}
              {post.tableOfContents && (
                <div className="blog-post-toc">
                  <h3>{t('tableOfContents')}</h3>
                  <ul>
                    {post.tableOfContents.map((item, index) => (
                      <li key={index}>
                        <a href={`#section-${index + 1}`}>{item}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Render content sections */}
              {post.content.map((section, index) => (
                <div key={index} id={`section-${index + 1}`} className="blog-post-section">
                  {section.title && <h2>{section.title}</h2>}
                  {section.paragraphs.map((paragraph, pIndex) => (
                    <p key={pIndex}>{paragraph}</p>
                  ))}
                  {section.image && (
                    <div className="blog-post-section-image">
                      <img src={section.image} alt={section.imageAlt || section.title} />
                      {section.imageCaption && <figcaption>{section.imageCaption}</figcaption>}
                    </div>
                  )}
                </div>
              ))}
              
              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="blog-post-tags">
                  <h3>{t('tags')}</h3>
                  <div className="tags-list">
                    {post.tags.map((tag, index) => (
                      <Link key={index} to={`/${lang}/blog/tag/${tag.toLowerCase().replace(/\s+/g, '-')}`} className="tag">
                        <FaTag /> {tag}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Share */}
              <div className="blog-post-share">
                <h3>{t('shareThisPost')}</h3>
                <div className="share-buttons">
                  <button className="share-button facebook">
                    <FaShare /> Facebook
                  </button>
                  <button className="share-button twitter">
                    <FaShare /> Twitter
                  </button>
                  <button className="share-button linkedin">
                    <FaShare /> LinkedIn
                  </button>
                </div>
              </div>
            </article>
            
            {/* Sidebar */}
            <aside className="blog-post-sidebar">
              {/* Author Info */}
              {post.authorBio && (
                <div className="sidebar-section author-info">
                  <h3>{t('aboutAuthor')}</h3>
                  <div className="author-bio">
                    {post.authorImage && (
                      <div className="author-image">
                        <img src={post.authorImage} alt={post.author} />
                      </div>
                    )}
                    <div className="author-details">
                      <h4>{post.author}</h4>
                      <p>{post.authorBio}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Related Posts */}
              {relatedPosts.length > 0 && (
                <div className="sidebar-section related-posts">
                  <h3>{t('relatedPosts')}</h3>
                  <ul className="related-posts-list">
                    {relatedPosts.map((relatedPost, index) => (
                      <li key={index}>
                        <Link to={`/${lang}/blog/${relatedPost.slug}`}>
                          <div className="related-post-image">
                            <img src={relatedPost.image} alt={relatedPost.title} />
                          </div>
                          <div className="related-post-content">
                            <h4>{relatedPost.title}</h4>
                            <span className="related-post-date">
                              <FaCalendarAlt />
                              {new Date(relatedPost.date).toLocaleDateString()}
                            </span>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
};
export default BlogPost;