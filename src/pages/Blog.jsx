// src/pages/Blog.jsx — Blog index
import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import BLOG_POSTS from '../data/blogPosts';

function Blog() {
  const navigate = useNavigate();

  const sorted = [...BLOG_POSTS].sort((a, b) => new Date(b.publishedDate) - new Date(a.publishedDate));

  return (
    <div className="bg-[#0A0E1A] text-[#F5F7FB] min-h-screen font-body">
      <Helmet>
        <title>Blog — AI Video Tips, Guides & Case Studies | Katareel</title>
        <meta name="description" content="Practical guides on AI video translation, text-to-video, photo-to-video, brand videos, and captions for creators and small businesses." />
        <link rel="canonical" href="https://www.katareel.com/blog" />
      </Helmet>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap'); .font-display { font-family: 'Space Grotesk', sans-serif; } .font-body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }`}</style>

      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#0A0E1A]/85 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="font-display text-lg font-semibold tracking-tight text-white">Katareel</Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-[#9AA3B8]">
            <Link to="/services" className="hover:text-white transition-colors">Services</Link>
            <Link to="/blog" className="text-white">Blog</Link>
            <Link to="/updates" className="hover:text-white transition-colors">Updates</Link>
            <a href="/#pricing" className="hover:text-white transition-colors">Pricing</a>
          </div>
          <button onClick={() => navigate('/create')} className="bg-[#4C6FFF] hover:bg-[#3d5ce0] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-all">
            Start free
          </button>
        </div>
      </nav>

      <section className="max-w-4xl mx-auto px-6 pt-16 pb-12 text-center">
        <h1 className="font-display text-4xl sm:text-5xl font-semibold leading-[1.1] mb-6 text-white">
          Blog
        </h1>
        <p className="text-lg text-[#9AA3B8] max-w-2xl mx-auto">
          Practical guides on AI video for creators, small businesses, and teams.
        </p>
      </section>

      <section className="max-w-4xl mx-auto px-6 pb-20 grid gap-4">
        {sorted.map((post) => (
          <article
            key={post.slug}
            className="bg-[#10162A] border border-white/10 hover:border-white/25 rounded-2xl p-6 transition-colors cursor-pointer"
            onClick={() => navigate('/blog/' + post.slug)}
          >
            <div className="flex items-start gap-4">
              <div className="text-4xl flex-shrink-0">{post.heroEmoji}</div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <span
                    className="text-xs font-semibold uppercase tracking-wider px-2 py-1 rounded"
                    style={{ backgroundColor: post.accent + '22', color: post.accent }}
                  >
                    {post.category}
                  </span>
                  <span className="text-xs text-[#7C87A3]">{post.readingTime} min read</span>
                </div>
                <h2 className="font-display text-xl font-semibold text-white mb-2">{post.title}</h2>
                <p className="text-sm text-[#9AA3B8] leading-relaxed mb-4">{post.description}</p>
                <span className="text-sm font-medium text-white hover:underline">Read article →</span>
              </div>
            </div>
          </article>
        ))}
      </section>

      <footer className="border-t border-white/5 mt-10">
        <div className="max-w-6xl mx-auto px-6 py-10 text-center">
          <p className="text-xs text-[#5C6478]">© {new Date().getFullYear()} Katareel. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default Blog;