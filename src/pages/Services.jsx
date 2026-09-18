// src/pages/Services.jsx — Pillar page for all 5 services
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { getUsdToKesRate, formatUsd } from '../utils/currency';

const SERVICES = [
  {
    key: 'text-to-video', emoji: '✨', accent: '#4C6FFF',
    title: 'AI Text to Video Generator',
    short: 'Text to Video',
    desc: 'Type any scene, mood, or story and get back a cinematic AI-generated video in minutes. Perfect for creators, marketers, and storytellers.',
    useCases: ['Social media clips from scripts', 'Storyboard visualization', 'Ad concepts before shooting', 'Educational explainers'],
    basePriceKes: 200,
    path: '/services/text-to-video',
    toolPath: '/create',
  },
  {
    key: 'photos-to-video', emoji: '🎞️', accent: '#8B5CF6',
    title: 'AI Photo to Video Maker',
    short: 'Photos to Video',
    desc: 'Turn a stack of still photos into a moving video with AI-generated motion, transitions, and optional voiceover narration.',
    useCases: ['Real estate listings', 'Product showcases', 'Wedding & event memories', 'Personal travel reels'],
    basePriceKes: 300,
    path: '/services/photos-to-video',
    toolPath: '/photos-to-video',
  },
  {
    key: 'translate', emoji: '🌐', accent: '#22D3B4',
    title: 'AI Video Translation & Dubbing',
    short: 'Video Translation',
    desc: 'Dub any video into 37 languages while preserving the original voice tone, emotion, and pacing. Reach audiences worldwide.',
    useCases: ['Multi-language marketing campaigns', 'E-learning localization', 'Creator content for global audiences', 'NGO & government communications'],
    basePriceKes: 300,
    path: '/services/translate',
    toolPath: '/translate',
  },
  {
    key: 'brand-video', emoji: '🎬', accent: '#F5A623',
    title: 'Brand Video Maker',
    short: 'Brand Video',
    desc: 'Automatically add a professional logo intro, AI voiceover, and closing contact card to any business video.',
    useCases: ['Small business promos', 'Startup pitch videos', 'Restaurant & retail ads', 'Consultant introductions'],
    basePriceKes: 250,
    path: '/services/brand-video',
    toolPath: '/brand-video',
  },
  {
    key: 'music-captions', emoji: '🎵', accent: '#EC4899',
    title: 'Music & Captions for Video',
    short: 'Music & Captions',
    desc: 'Add background music and professionally-styled on-screen captions to any video — no editing software required.',
    useCases: ['Social media accessibility', 'TikTok & Reels captions', 'YouTube subtitle overlays', 'Corporate training videos'],
    basePriceKes: 200,
    path: '/services/music-captions',
    toolPath: '/music-captions',
  },
];

function Services() {
  const navigate = useNavigate();
  const [rate, setRate] = useState(null);

  useEffect(() => {
    getUsdToKesRate().then(setRate).catch(() => setRate(129.55));
  }, []);

  return (
    <div className="bg-[#0A0E1A] text-[#F5F7FB] min-h-screen font-body">
      <Helmet>
        <title>AI Video Services — Translation, Creation & Branding | Katareel</title>
        <meta name="description" content="Five AI video tools in one place: text-to-video, photo-to-video, translation to 37 languages, brand videos, and music & captions. Pay per video, no subscription." />
        <link rel="canonical" href="https://www.katareel.com/services" />
      </Helmet>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');
        .font-display { font-family: 'Space Grotesk', sans-serif; }
        .font-body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
      `}</style>

      {/* NAV */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#0A0E1A]/85 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="font-display text-lg font-semibold tracking-tight text-white">Katareel</Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-[#9AA3B8]">
            <Link to="/services" className="text-white transition-colors">Services</Link>
            <a href="/#demos" className="hover:text-white transition-colors">Demos</a>
            <a href="/#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="/#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>
          <button onClick={() => navigate('/create')}
                  className="bg-[#4C6FFF] hover:bg-[#3d5ce0] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-all">
            Start free
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-12 text-center">
        <h1 className="font-display text-4xl sm:text-5xl font-semibold leading-[1.1] mb-6 text-white">
          AI video services for creators, businesses, and teams.
        </h1>
        <p className="text-lg text-[#9AA3B8] max-w-2xl mx-auto">
          Five tools. One platform. No software to install, no subscription to remember.
          Pay per video, delivered in minutes.
        </p>
      </section>

      {/* SERVICE LIST */}
      <section className="max-w-5xl mx-auto px-6 py-12 space-y-8">
        {SERVICES.map((s, i) => (
          <article key={s.key}
                   id={s.key}
                   className="bg-[#10162A] border border-white/10 rounded-2xl p-8 hover:border-white/25 transition-colors">
            <div className="grid md:grid-cols-[80px_1fr] gap-6">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0"
                   style={{ backgroundColor: `${s.accent}1A`, border: `1px solid ${s.accent}40` }}>
                {s.emoji}
              </div>
              <div>
                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                  <h2 className="font-display text-2xl font-semibold text-white">{s.title}</h2>
                  <span className="text-sm" style={{ color: s.accent }}>
                    From {rate ? formatUsd(s.basePriceKes, rate) : '—'}
                  </span>
                </div>
                <p className="text-[#9AA3B8] leading-relaxed mb-5">{s.desc}</p>

                <div className="mb-6">
                  <div className="text-xs uppercase tracking-wider text-[#7C87A3] mb-2">Common uses</div>
                  <ul className="flex flex-wrap gap-2">
                    {s.useCases.map((u, j) => (
                      <li key={j}
                          className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[#9AA3B8]">
                        {u}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button onClick={() => navigate(s.toolPath)}
                          className="text-sm font-semibold px-5 py-2.5 rounded-lg text-white transition-all"
                          style={{ backgroundColor: s.accent }}>
                    Use {s.short} →
                  </button>
                  <Link to={s.path}
                        className="text-sm font-medium px-5 py-2.5 rounded-lg border border-white/15 hover:border-white/40 hover:bg-white/5 text-white transition-all">
                    Learn more
                  </Link>
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h2 className="font-display text-3xl font-semibold text-white mb-4">Not sure which tool you need?</h2>
        <p className="text-[#9AA3B8] mb-8 max-w-lg mx-auto">
          Message us on WhatsApp and we'll point you in the right direction — usually within an hour.
        </p>
        <a href="https://wa.me/254710440648" target="_blank" rel="noopener noreferrer"
           className="inline-block bg-[#4C6FFF] hover:bg-[#3d5ce0] text-white font-semibold px-7 py-3.5 rounded-xl transition-all">
          Talk to us on WhatsApp
        </a>
      </section>

      <footer className="border-t border-white/5 mt-10">
        <div className="max-w-6xl mx-auto px-6 py-10 text-center">
          <p className="text-xs text-[#5C6478]">© {new Date().getFullYear()} Katareel. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default Services;