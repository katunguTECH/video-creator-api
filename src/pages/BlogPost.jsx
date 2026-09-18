// src/pages/BlogPost.jsx — Individual blog post template
import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import BLOG_POSTS from '../data/blogPosts';

function BlogPost() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const post = BLOG_POSTS.find((p) => p.slug === slug);

  if (!post) {
    return (
      <div className="bg-[#0A0E1A] text-[#F5F7FB] min-h-screen flex items-center justify-center font-body">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-white mb-4">Post not found</h1>
          <Link to="/blog" className="text-[#4C6FFF] hover:underline">Back to blog</Link>
        </div>
      </div>
    );
  }

  const ACCENT = post.accent;
  const CANONICAL = 'https://www.katareel.com/blog/' + post.slug;

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: post.publishedDate,
    dateModified: post.publishedDate,
    author: { '@type': 'Organization', name: 'Katareel Team', url: 'https://www.katareel.com/' },
    publisher: { '@type': 'Organization', name: 'Katareel', logo: { '@type': 'ImageObject', url: 'https://www.katareel.com/logo192.png' } },
    mainEntityOfPage: { '@type': 'WebPage', '@id': CANONICAL },
  };
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: post.faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };

  return (
    <div className="bg-[#0A0E1A] text-[#F5F7FB] min-h-screen font-body">
      <Helmet>
        <title>{post.metaTitle}</title>
        <meta name="description" content={post.description} />
        <link rel="canonical" href={CANONICAL} />
        <script type="application/ld+json" data-rh="true" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
        <script type="application/ld+json" data-rh="true" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      </Helmet>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap'); .font-display { font-family: 'Space Grotesk', sans-serif; } .font-body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }`}</style>

      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#0A0E1A]/85 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="font-display text-lg font-semibold tracking-tight text-white">Katareel</Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-[#9AA3B8]">
            <Link to="/services" className="hover:text-white transition-colors">Services</Link>
            <Link to="/blog" className="hover:text-white transition-colors">Blog</Link>
            <Link to="/updates" className="hover:text-white transition-colors">Updates</Link>
            <a href="/#pricing" className="hover:text-white transition-colors">Pricing</a>
          </div>
          <button onClick={() => navigate('/create')} className="bg-[#4C6FFF] hover:bg-[#3d5ce0] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-all">
            Start free
          </button>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 pt-8 text-xs text-[#5C6478]">
        <Link to="/blog" className="hover:text-white transition-colors">Blog</Link>
        <span className="mx-2">/</span>
        <span className="text-[#9AA3B8]">{post.category}</span>
      </div>

      <article className="max-w-3xl mx-auto px-6 pt-8 pb-16">
        <div className="text-5xl mb-6">{post.heroEmoji}</div>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider px-2 py-1 rounded" style={{ backgroundColor: ACCENT + '22', color: ACCENT }}>{post.category}</span>
          <span className="text-xs text-[#7C87A3]">{post.readingTime} min read</span>
          <span className="text-xs text-[#7C87A3]">·</span>
          <span className="text-xs text-[#7C87A3]">By Katareel Team</span>
        </div>

        <h1 className="font-display text-3xl sm:text-4xl font-semibold leading-[1.15] mb-6 text-white">{post.title}</h1>

        <p className="text-lg text-[#9AA3B8] leading-relaxed mb-10">{post.intro}</p>

        {post.sections.map((sec, i) => (
          <section key={i} className="mb-10">
            <h2 className="font-display text-2xl font-semibold text-white mb-4">{sec.h2}</h2>
            {(sec.paras || []).map((p, j) => (
              <p key={j} className="text-[#9AA3B8] leading-relaxed mb-4">{p}</p>
            ))}
            {sec.bullets && (
              <ul className="space-y-2 mb-4 ml-1">
                {sec.bullets.map((b, k) => (
                  <li key={k} className="flex gap-3 text-[#9AA3B8] leading-relaxed">
                    <span className="flex-shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ACCENT }}></span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}
            {(sec.parasAfter || []).map((p, j) => (
              <p key={j} className="text-[#9AA3B8] leading-relaxed mb-4">{p}</p>
            ))}
          </section>
        ))}

        <section className="mt-16 pt-10 border-t border-white/5">
          <h2 className="font-display text-2xl font-semibold text-white mb-6">Frequently asked questions</h2>
          <div className="space-y-3">
            {post.faqs.map((f, i) => (
              <details key={i} className="group bg-[#10162A] border border-white/10 rounded-xl overflow-hidden">
                <summary className="cursor-pointer px-5 py-4 flex items-center justify-between gap-4 hover:bg-white/[0.03] transition-colors">
                  <span className="text-white font-medium text-sm sm:text-base">{f.q}</span>
                  <span className="text-[#7C87A3] text-xl group-open:rotate-45 transition-transform">+</span>
                </summary>
                <div className="px-5 pb-4 text-[#9AA3B8] text-sm leading-relaxed">{f.a}</div>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-16">
          <div className="border border-white/10 rounded-3xl p-8 text-center" style={{ background: 'linear-gradient(135deg, ' + ACCENT + '22, transparent)' }}>
            <h3 className="font-display text-xl font-semibold text-white mb-3">{post.cta.text}</h3>
            <button onClick={() => navigate(post.cta.link)} className="text-white font-semibold px-6 py-3 rounded-xl transition-all mt-2" style={{ backgroundColor: ACCENT }}>
              {post.cta.label} →
            </button>
          </div>
        </section>
      </article>

      <footer className="border-t border-white/5 mt-10">
        <div className="max-w-6xl mx-auto px-6 py-10 text-center">
          <p className="text-xs text-[#5C6478]">© {new Date().getFullYear()} Katareel. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default BlogPost;