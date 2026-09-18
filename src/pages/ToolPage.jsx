// src/pages/ToolPage.jsx — Shared template for programmatic tool pages
import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import TOOL_PAGES from '../data/toolPages';

function ToolPage() {
  const { service, slug } = useParams();
  const navigate = useNavigate();
  const page = TOOL_PAGES.find((p) => p.service === service && p.slug === slug);

  if (!page) {
    return (
      <div className="bg-[#0A0E1A] text-[#F5F7FB] min-h-screen flex items-center justify-center font-body">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-white mb-4">Page not found</h1>
          <Link to="/services" className="text-[#4C6FFF] hover:underline">Back to services</Link>
        </div>
      </div>
    );
  }

  const ACCENT = page.accent;
  const CANONICAL = 'https://www.katareel.com/services/' + page.service + '/' + page.slug;
  const TOOL_PATH =
    page.service === 'translate' ? '/translate' :
    page.service === 'photos-to-video' ? '/photos-to-video' :
    page.service === 'brand-video' ? '/brand-video' :
    page.service === 'music-captions' ? '/music-captions' :
    '/create';

  const serviceSchema = {
    '@context': 'https://schema.org', '@type': 'Service',
    name: page.h1, serviceType: page.h1,
    provider: { '@type': 'Organization', name: 'Katareel', url: 'https://www.katareel.com/' },
    areaServed: 'Worldwide', description: page.description, url: CANONICAL,
  };
  const faqSchema = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: page.faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };

  return (
    <div className="bg-[#0A0E1A] text-[#F5F7FB] min-h-screen font-body">
      <Helmet>
        <title>{page.title}</title>
        <meta name="description" content={page.description} />
        <link rel="canonical" href={CANONICAL} />
        <script type="application/ld+json" data-rh="true" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />
        <script type="application/ld+json" data-rh="true" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      </Helmet>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap'); .font-display { font-family: 'Space Grotesk', sans-serif; } .font-body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }`}</style>

      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#0A0E1A]/85 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="font-display text-lg font-semibold tracking-tight text-white">Katareel</Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-[#9AA3B8]">
            <Link to="/services" className="hover:text-white transition-colors">Services</Link>
            <Link to="/updates" className="hover:text-white transition-colors">Updates</Link>
            <a href="/#pricing" className="hover:text-white transition-colors">Pricing</a>
          </div>
          <button onClick={() => navigate(TOOL_PATH)} className="text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-all" style={{ backgroundColor: ACCENT }}>Try it now</button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 pt-8 text-xs text-[#5C6478]">
        <Link to="/services" className="hover:text-white transition-colors">Services</Link>
        <span className="mx-2">/</span>
        <Link to={'/services/' + page.service} className="hover:text-white transition-colors">{page.service.replace(/-/g, ' ')}</Link>
        <span className="mx-2">/</span>
        <span className="text-[#9AA3B8]">{page.slug}</span>
      </div>

      <section className="max-w-4xl mx-auto px-6 pt-8 pb-16">
        <h1 className="font-display text-4xl sm:text-5xl font-semibold leading-[1.1] mb-6 text-white">{page.h1}</h1>
        <p className="text-lg text-[#9AA3B8] leading-relaxed mb-8 max-w-3xl">{page.intro}</p>
        <div className="flex flex-wrap gap-4 mb-8">
          <button onClick={() => navigate(TOOL_PATH)} className="text-white font-semibold px-7 py-3.5 rounded-xl transition-all" style={{ backgroundColor: ACCENT }}>Get started →</button>
          <a href="#faq" className="border border-white/15 hover:border-white/40 hover:bg-white/5 text-white px-7 py-3.5 rounded-xl transition-all">Read FAQs</a>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-16 border-t border-white/5">
        <h2 className="font-display text-3xl font-semibold text-white mb-4">Who this is for</h2>
        <p className="text-[#9AA3B8] mb-10 max-w-2xl">Common ways our customers use this service.</p>
        <div className="grid sm:grid-cols-2 gap-4">
          {page.useCases.map((uc) => (
            <div key={uc.title} className="bg-[#10162A] border border-white/10 rounded-2xl p-6">
              <div className="text-3xl mb-3">{uc.emoji}</div>
              <h3 className="font-semibold text-white mb-2">{uc.title}</h3>
              <p className="text-sm text-[#9AA3B8] leading-relaxed">{uc.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="faq" className="max-w-3xl mx-auto px-6 py-16 border-t border-white/5">
        <h2 className="font-display text-3xl font-semibold text-white mb-10">Frequently asked questions</h2>
        <div className="space-y-3">
          {page.faqs.map((f, i) => (
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

      <section className="max-w-4xl mx-auto px-6 py-20">
        <div className="relative overflow-hidden border border-white/10 rounded-3xl p-12 text-center" style={{ background: 'linear-gradient(135deg, ' + ACCENT + '33, transparent)' }}>
          <h2 className="font-display text-3xl font-semibold text-white mb-4">Ready to get started?</h2>
          <p className="text-[#9AA3B8] mb-8 max-w-lg mx-auto">Most projects finish in under 3 minutes.</p>
          <button onClick={() => navigate(TOOL_PATH)} className="text-white font-semibold px-8 py-4 rounded-xl text-base transition-all" style={{ backgroundColor: ACCENT }}>Get started →</button>
        </div>
      </section>

      <footer className="border-t border-white/5 mt-10">
        <div className="max-w-6xl mx-auto px-6 py-10 text-center">
          <p className="text-xs text-[#5C6478]">© {new Date().getFullYear()} Katareel. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default ToolPage;