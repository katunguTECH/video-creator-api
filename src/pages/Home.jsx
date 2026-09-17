// Home.jsx — Katareel landing page (v2)
// Equal treatment across all 5 services, USD-first pricing, global SaaS styling.

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUsdToKesRate, formatUsd } from '../utils/currency';

const WHATSAPP_URL = 'https://wa.me/254710440648';

// Base KES price (lowest tier) per service — matches what each page actually charges.
const services = [
  {
    key: 'text-to-video',
    emoji: '✍️',
    accent: '#4C6FFF',
    title: 'Text to Video',
    desc: 'Describe a scene in plain language and get back an AI-generated clip.',
    basePriceKes: 200,
    priceNote: 'from',
    path: '/create',
  },
  {
    key: 'photos-to-video',
    emoji: '🖼️',
    accent: '#8B5CF6',
    title: 'Photos to Video',
    desc: 'Turn a set of photos into a moving slideshow with transitions and pacing.',
    basePriceKes: 300,
    priceNote: 'from',
    path: '/photos-to-video',
  },
  {
    key: 'translation',
    emoji: '🌐',
    accent: '#22D3B4',
    title: 'Video Translation',
    desc: 'Dub any video into another language — Swahili, French, Chinese, and more.',
    basePriceKes: 300,
    priceNote: 'flat rate',
    path: '/translate',
  },
  {
    key: 'brand-video',
    emoji: '🎬',
    accent: '#F5A623',
    title: 'Brand Video',
    desc: 'Add a logo intro, AI voiceover, and closing contact card to your footage.',
    basePriceKes: 250,
    priceNote: 'flat rate',
    path: '/brand-video',
  },
  {
    key: 'music-captions',
    emoji: '🎵',
    accent: '#F0568C',
    title: 'Music & Captions',
    desc: 'Add background music and on-screen captions to a video you already have.',
    basePriceKes: 200,
    priceNote: 'flat rate',
    path: '/music-captions',
  },
];

function PriceTag({ basePriceKes, priceNote, rate, accent }) {
  const usd = rate ? formatUsd(basePriceKes, rate) : null;
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-xs text-[#7C87A3] uppercase tracking-wide">{priceNote}</span>
      <span className="text-lg font-semibold" style={{ color: accent }}>
        {usd || '—'}
      </span>
    </div>
  );
}

function TranslationDemo() {
  const [lang, setLang] = useState('en');
  const videoRef = useRef(null);
  const sources = { en: '/demo/translate-original.mp4', zh: '/demo/translate-chinese.mp4' };

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.load();
    v.play().catch(() => {});
  }, [lang]);

  return (
    <div className="bg-[#10162A] border border-white/10 rounded-2xl p-6 flex flex-col h-full">
      <h3 className="font-semibold text-white mb-1">Video Translation</h3>
      <p className="text-sm text-[#9AA3B8] mb-4">Same edit, different voice track.</p>
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setLang('en')}
          className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors ${
            lang === 'en'
              ? 'bg-[#22D3B4] text-black border-[#22D3B4]'
              : 'border-white/15 text-[#9AA3B8] hover:border-white/30'
          }`}
        >
          English
        </button>
        <button
          onClick={() => setLang('zh')}
          className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors ${
            lang === 'zh'
              ? 'bg-[#22D3B4] text-black border-[#22D3B4]'
              : 'border-white/15 text-[#9AA3B8] hover:border-white/30'
          }`}
        >
          中文 dub
        </button>
      </div>
      <div className="rounded-xl overflow-hidden bg-black mt-auto">
        <video ref={videoRef} key={lang} controls playsInline className="w-full aspect-video bg-black">
          <source src={sources[lang]} type="video/mp4" />
        </video>
      </div>
    </div>
  );
}

function BrandVideoDemo() {
  return (
    <div className="bg-[#10162A] border border-white/10 rounded-2xl p-6 flex flex-col h-full">
      <h3 className="font-semibold text-white mb-1">Brand Video</h3>
      <p className="text-sm text-[#9AA3B8] mb-4">Logo intro, voiceover, and outro added automatically.</p>
      <div className="rounded-xl overflow-hidden bg-black mt-auto flex justify-center">
        <video controls playsInline className="h-[280px] bg-black">
          <source src="/demo/brand-video-demo.mp4" type="video/mp4" />
        </video>
      </div>
    </div>
  );
}

function Home() {
  const navigate = useNavigate();
  const [rate, setRate] = useState(null);

  useEffect(() => {
    getUsdToKesRate().then(setRate).catch(() => setRate(129.55));
  }, []);

  return (
    <div className="bg-[#0A0E1A] text-[#F5F7FB]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');
        .font-display { font-family: 'Space Grotesk', sans-serif; }
        .font-body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
        @keyframes heroIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .hero-in { animation: heroIn 0.6s ease-out both; }
      `}</style>

      {/* NAV */}
      <nav className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between font-body">
        <span className="font-display text-lg font-semibold tracking-tight text-white">Katareel</span>
        <div className="hidden sm:flex items-center gap-8 text-sm text-[#9AA3B8]">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
          <a href="#contact" className="hover:text-white transition-colors">Contact</a>
        </div>
        <button
          onClick={() => navigate('/create')}
          className="bg-[#4C6FFF] hover:bg-[#3d5ce0] text-white text-sm font-semibold px-5 py-2.5 rounded-md transition-colors"
        >
          Get Started
        </button>
      </nav>

      {/* HERO */}
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-20 text-center font-body hero-in">
        <h1 className="font-display text-4xl sm:text-5xl font-semibold leading-[1.1] mb-6 text-white">
          AI video tools for teams and creators, wherever they are.
        </h1>
        <p className="text-lg text-[#9AA3B8] max-w-2xl mx-auto mb-9">
          Generate video from text, translate it into another language, add music
          and captions, turn photos into a story, or brand it with your logo —
          all in one place, priced in dollars, ready in minutes.
        </p>
        <div className="flex flex-wrap justify-center items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/create')}
            className="bg-[#4C6FFF] hover:bg-[#3d5ce0] text-white font-semibold px-7 py-3.5 rounded-md text-base transition-colors"
          >
            Get started
          </button>
          <a
            href="#features"
            className="border border-white/15 hover:border-white/30 text-white px-7 py-3.5 rounded-md text-base transition-colors"
          >
            See pricing
          </a>
        </div>
        <p className="text-sm text-[#7C87A3]">
          Pay by card or M-Pesa · Delivered in minutes · Support from a real team
        </p>
      </section>

      {/* FEATURES — equal grid */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-16 font-body">
        <div className="text-center mb-12">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-white mb-3">
            Five tools. One workflow.
          </h2>
          <p className="text-[#9AA3B8] max-w-xl mx-auto">
            Pick what your video needs. Every tool is priced separately, so you
            only pay for what you use.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((s) => (
            <div
              key={s.key}
              onClick={() => navigate(s.path)}
              className="cursor-pointer bg-[#10162A] border border-white/10 rounded-2xl p-6 flex flex-col hover:border-white/25 transition-colors"
            >
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center text-xl mb-5"
                style={{ backgroundColor: `${s.accent}1A`, border: `1px solid ${s.accent}40` }}
              >
                {s.emoji}
              </div>
              <h3 className="font-semibold text-white text-base mb-2">{s.title}</h3>
              <p className="text-sm text-[#9AA3B8] leading-relaxed mb-6 flex-1">{s.desc}</p>
              <div className="flex items-center justify-between">
                <PriceTag
                  basePriceKes={s.basePriceKes}
                  priceNote={s.priceNote}
                  rate={rate}
                  accent={s.accent}
                />
                <span className="text-sm text-[#7C87A3]">Try it →</span>
              </div>
            </div>
          ))}

          {/* Filler card: keeps a clean 3-col grid on desktop (5 items -> 6th slot) */}
          <div className="hidden lg:flex bg-transparent border border-dashed border-white/10 rounded-2xl p-6 flex-col items-center justify-center text-center">
            <p className="text-sm text-[#7C87A3]">
              Need something custom? <br />
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="text-[#4C6FFF] hover:underline">
                Talk to us on WhatsApp
              </a>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-[#5C6478] mt-6">
          Prices shown in USD at today's exchange rate. Billed in Kenyan Shillings via M-Pesa or card.
        </p>
      </section>

      {/* SEE IT IN ACTION — equal-sized demo pair */}
      <section className="max-w-6xl mx-auto px-6 py-16 font-body">
        <h2 className="font-display text-2xl sm:text-3xl font-semibold text-white mb-10 text-center">
          See it in action
        </h2>
        <div className="grid sm:grid-cols-2 gap-6">
          <TranslationDemo />
          <BrandVideoDemo />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-16 font-body">
        <h2 className="font-display text-2xl sm:text-3xl font-semibold text-white mb-10 text-center">
          How it works
        </h2>
        <div className="grid sm:grid-cols-3 gap-8">
          {[
            { n: '1', t: 'Choose a tool', d: 'Pick the service that matches what you need — text, photos, translation, branding, or music.' },
            { n: '2', t: 'Pay securely', d: 'Card or M-Pesa, processed through Pesapal. Prices shown in USD, billed in KES.' },
            { n: '3', t: 'Download & share', d: 'Your finished video arrives by email, ready to post wherever your audience is.' },
          ].map((step) => (
            <div key={step.n} className="text-center">
              <div className="font-display text-3xl text-[#4C6FFF] mb-3">{step.n}</div>
              <h3 className="font-semibold text-white mb-2">{step.t}</h3>
              <p className="text-[#9AA3B8] text-sm leading-relaxed">{step.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TRUST STATEMENT — honest, no fabricated stats or quotes */}
      <section className="max-w-3xl mx-auto px-6 py-16 font-body text-center">
        <p className="text-[#9AA3B8] leading-relaxed">
          Every video is processed the same way, whether it's your first order
          or your fiftieth. Questions get answered by a real person — email or
          WhatsApp us and you'll hear back directly.
        </p>
        {/*
          TODO: once you have genuine customer quotes, add a testimonials
          section here. Don't fabricate quotes or ratings — it costs more
          trust than it buys.
        */}
      </section>

      {/* FINAL CTA */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center font-body">
        <h2 className="font-display text-3xl sm:text-4xl font-semibold text-white mb-6">
          Ready to make your next video?
        </h2>
        <button
          onClick={() => navigate('/create')}
          className="bg-[#4C6FFF] hover:bg-[#3d5ce0] text-white font-semibold px-8 py-4 rounded-md text-lg transition-colors"
        >
          Get started
        </button>
      </section>

      {/* CONTACT / FOOTER */}
      <footer id="contact" className="max-w-4xl mx-auto px-6 border-t border-white/10 pt-10 pb-10 font-body">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="bg-[#10162A] border border-white/10 rounded-xl p-4">
            <div className="text-2xl mb-2">💼</div>
            <h4 className="text-xs uppercase tracking-wider text-[#7C87A3] mb-1">Sales</h4>
            <a href="mailto:sales@katareel.com" className="text-white hover:text-[#4C6FFF] transition-colors text-sm">
              sales@katareel.com
            </a>
          </div>
          <div className="bg-[#10162A] border border-white/10 rounded-xl p-4">
            <div className="text-2xl mb-2">🛠️</div>
            <h4 className="text-xs uppercase tracking-wider text-[#7C87A3] mb-1">Support</h4>
            <a href="mailto:support@katareel.com" className="text-white hover:text-[#4C6FFF] transition-colors text-sm">
              support@katareel.com
            </a>
          </div>
          <div className="bg-[#10162A] border border-white/10 rounded-xl p-4">
            <div className="text-2xl mb-2">💬</div>
            <h4 className="text-xs uppercase tracking-wider text-[#7C87A3] mb-1">WhatsApp</h4>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:text-[#4C6FFF] transition-colors text-sm"
            >
              +254 710 440 648
            </a>
          </div>
        </div>
        <p className="text-center text-[#5C6478] text-xs mt-6">
          © {new Date().getFullYear()} Katareel. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

export default Home;
