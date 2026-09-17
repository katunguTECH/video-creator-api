// Home.jsx — Katareel landing page
// Rebuilt to lead with real proof (actual translation + brand video output)
// instead of generic feature cards. See README-landing-page.md for setup notes.

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const WHATSAPP_URL = 'https://wa.me/254710440648';

const services = [
  {
    key: 'text-to-video',
    emoji: '✍️',
    title: 'Text to Video',
    desc: 'Describe a scene. AI generates the clip — no camera, no footage needed.',
    price: 'From Ksh 200',
    path: '/create',
  },
  {
    key: 'photos-to-video',
    emoji: '🖼️',
    title: 'Photos to Video',
    desc: 'Turn a set of photos into a moving slideshow with transitions.',
    price: 'Pay per video',
    path: '/photos-to-video',
  },
  {
    key: 'music-captions',
    emoji: '🎵',
    title: 'Music & Captions',
    desc: 'Add background music and on-screen captions to any video you already have.',
    price: 'Ksh 200',
    path: '/music-captions',
  },
];

function LangToggleVideo() {
  const [lang, setLang] = useState('en');
  const videoRef = useRef(null);

  const sources = {
    en: '/demo/translate-original.mp4',
    zh: '/demo/translate-chinese.mp4',
  };

  const handleSwitch = (next) => {
    if (next === lang) return;
    setLang(next);
  };

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.load();
    v.play().catch(() => {});
  }, [lang]);

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex justify-center gap-2 mb-4">
        <button
          onClick={() => handleSwitch('en')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium border transition-colors ${
            lang === 'en'
              ? 'bg-[#E3A008] text-black border-[#E3A008]'
              : 'bg-transparent text-[#c9c2b4] border-white/20 hover:border-white/40'
          }`}
        >
          English (original)
        </button>
        <button
          onClick={() => handleSwitch('zh')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium border transition-colors ${
            lang === 'zh'
              ? 'bg-[#E3A008] text-black border-[#E3A008]'
              : 'bg-transparent text-[#c9c2b4] border-white/20 hover:border-white/40'
          }`}
        >
          中文 (dubbed by Katareel)
        </button>
      </div>

      <div className="relative rounded-[18px] border border-white/15 bg-black p-2 shadow-2xl">
        <div className="rounded-xl overflow-hidden bg-black">
          <video
            ref={videoRef}
            key={lang}
            controls
            playsInline
            className="w-full aspect-video bg-black"
          >
            <source src={sources[lang]} type="video/mp4" />
          </video>
        </div>
      </div>
      <p className="text-center text-xs text-[#8f887a] mt-3">
        Same video, same edit — only the voice track changed. That's the whole job.
      </p>
    </div>
  );
}

function Home() {
  const navigate = useNavigate();

  return (
    <div className="bg-[#0B0E14] text-[#F7F3EA]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap');
        .font-display { font-family: 'Fraunces', serif; }
        .font-body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
        @keyframes heroIn {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .hero-in { animation: heroIn 0.7s ease-out both; }
        .hero-in-delay { animation: heroIn 0.7s ease-out 0.15s both; }
      `}</style>

      {/* Top bar */}
      <div className="max-w-6xl mx-auto px-6 pt-6 flex items-center justify-between font-body">
        <span className="font-display text-xl font-semibold tracking-tight">Katareel</span>
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-[#c9c2b4] hover:text-white transition-colors flex items-center gap-1.5"
        >
          <span>💬</span> Chat on WhatsApp
        </a>
      </div>

      {/* HERO */}
      <section className="max-w-6xl mx-auto px-6 pt-14 pb-20 grid lg:grid-cols-2 gap-14 items-center font-body">
        <div className="hero-in">
          <h1 className="font-display text-4xl sm:text-5xl font-semibold leading-[1.08] mb-6 text-white">
            One video. Every language your audience speaks.
          </h1>
          <p className="text-lg text-[#c9c2b4] mb-8 max-w-lg">
            Katareel takes a video you already have and dubs it into another
            language — Swahili, French, Chinese, Arabic, and more — so it
            reaches family, customers, or followers wherever they are.
          </p>
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <button
              onClick={() => navigate('/translate')}
              className="bg-[#E3A008] hover:bg-[#c98f06] text-black font-semibold px-7 py-3.5 rounded-md text-base transition-colors"
            >
              Translate a video — Ksh 300
            </button>
            <button
              onClick={() => navigate('/create')}
              className="border border-white/20 hover:border-white/40 text-white px-7 py-3.5 rounded-md text-base transition-colors"
            >
              See all tools
            </button>
          </div>
          <p className="text-sm text-[#8f887a]">
            Pay instantly with M-Pesa or card. Built and run by a small team in Nairobi.
          </p>
        </div>

        <div className="hero-in-delay">
          <LangToggleVideo />
        </div>
      </section>

      {/* WHAT YOU CAN MAKE */}
      <section className="max-w-6xl mx-auto px-6 py-16 font-body">
        <h2 className="font-display text-2xl sm:text-3xl font-semibold text-white mb-10">
          What you can make
        </h2>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Flagship: translation */}
          <div
            onClick={() => navigate('/translate')}
            className="cursor-pointer rounded-2xl border border-[#E3A008]/30 bg-gradient-to-br from-[#1a1508] to-[#0f0d08] p-8 flex flex-col justify-between hover:border-[#E3A008]/60 transition-colors"
          >
            <div>
              <div className="text-3xl mb-4">🌐</div>
              <h3 className="font-display text-xl font-semibold text-white mb-2">
                Video Translation
              </h3>
              <p className="text-[#c9c2b4] text-sm leading-relaxed">
                Upload a video, pick a target language, get back a fully
                dubbed version. This is what most people come to Katareel for.
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between text-sm">
              <span className="text-[#E3A008] font-medium">Ksh 300 per video</span>
              <span className="text-white/60">Try it →</span>
            </div>
          </div>

          <div className="grid gap-6">
            {services.map((s) => (
              <div
                key={s.key}
                onClick={() => navigate(s.path)}
                className="cursor-pointer rounded-2xl border border-white/10 bg-white/[0.03] p-6 flex items-center gap-5 hover:bg-white/[0.06] transition-colors"
              >
                <div className="text-2xl">{s.emoji}</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white text-base mb-0.5">{s.title}</h3>
                  <p className="text-[#8f887a] text-sm leading-snug">{s.desc}</p>
                </div>
                <span className="text-[#c9c2b4] text-sm whitespace-nowrap">{s.price}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BRAND VIDEO SHOWCASE */}
      <section className="max-w-6xl mx-auto px-6 py-16 font-body">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="text-3xl mb-4">🎬</div>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-white mb-4">
              Turn any clip into a branded video
            </h2>
            <p className="text-[#c9c2b4] mb-6 leading-relaxed">
              Send a video you filmed on your phone and your logo. Katareel adds
              a logo intro, an AI voiceover, and a closing contact card — ready
              to post to WhatsApp Status, TikTok, or Instagram the same day.
            </p>
            <ul className="text-sm text-[#c9c2b4] space-y-2 mb-8">
              <li>✓ Logo intro and outro added automatically</li>
              <li>✓ AI voiceover — or write your own script</li>
              <li>✓ Delivered in the vertical format social apps want</li>
            </ul>
            <button
              onClick={() => navigate('/brand-video')}
              className="bg-white text-black font-semibold px-7 py-3.5 rounded-md text-base hover:bg-white/90 transition-colors"
            >
              Make my brand video — Ksh 250
            </button>
          </div>

          <div className="flex justify-center">
            <div className="rounded-[28px] border border-white/15 bg-black p-2 shadow-2xl w-full max-w-[280px]">
              <div className="rounded-[20px] overflow-hidden bg-black">
                <video controls playsInline className="w-full aspect-[9/16] bg-black">
                  <source src="/demo/brand-video-demo.mp4" type="video/mp4" />
                </video>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-6xl mx-auto px-6 py-16 font-body">
        <h2 className="font-display text-2xl sm:text-3xl font-semibold text-white mb-10">
          How it works
        </h2>
        <div className="grid sm:grid-cols-3 gap-8">
          {[
            { n: '1', t: 'Upload', d: 'Send your video, photos, or a short text prompt — whatever the tool needs.' },
            { n: '2', t: 'Pay', d: 'Ksh 200–300 per video, paid instantly by M-Pesa or card through Pesapal.' },
            { n: '3', t: 'Download', d: 'Your finished video lands in your email and is ready to share right away.' },
          ].map((step) => (
            <div key={step.n}>
              <div className="font-display text-3xl text-[#E3A008] mb-3">{step.n}</div>
              <h3 className="font-semibold text-white mb-2">{step.t}</h3>
              <p className="text-[#8f887a] text-sm leading-relaxed">{step.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FOUNDER NOTE (honest trust signal instead of fabricated reviews) */}
      <section className="max-w-3xl mx-auto px-6 py-16 font-body">
        <div className="border-l-2 border-[#E3A008]/50 pl-6">
          <p className="text-[#c9c2b4] leading-relaxed italic">
            We're a small team building Katareel out of Nairobi. Every video
            that comes through right now gets a real look from us — reply to
            any email and you'll hear back from a person, not a bot. If
            something doesn't work, tell us on WhatsApp and we'll fix it.
          </p>
          {/*
            TODO: once you have a couple of genuine customer quotes,
            replace this note (or add alongside it) with real testimonials —
            e.g. a line from katungu1@gmail.com, your first paying customer.
            Don't invent quotes or star ratings; it isn't worth the trust cost.
          */}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center font-body">
        <h2 className="font-display text-3xl sm:text-4xl font-semibold text-white mb-6">
          Ready to make your next video work harder?
        </h2>
        <button
          onClick={() => navigate('/translate')}
          className="bg-[#E3A008] hover:bg-[#c98f06] text-black font-semibold px-8 py-4 rounded-md text-lg transition-colors"
        >
          Start with a translation
        </button>
      </section>

      {/* CONTACT / FOOTER */}
      <footer className="max-w-4xl mx-auto px-6 border-t border-white/10 pt-10 pb-10 font-body">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="bg-white/[0.03] rounded-xl p-4">
            <div className="text-2xl mb-2">💼</div>
            <h4 className="text-xs uppercase tracking-wider text-[#8f887a] mb-1">Sales</h4>
            <a href="mailto:sales@katareel.com" className="text-white hover:text-[#E3A008] transition-colors text-sm">
              sales@katareel.com
            </a>
          </div>
          <div className="bg-white/[0.03] rounded-xl p-4">
            <div className="text-2xl mb-2">🛠️</div>
            <h4 className="text-xs uppercase tracking-wider text-[#8f887a] mb-1">Support</h4>
            <a href="mailto:support@katareel.com" className="text-white hover:text-[#E3A008] transition-colors text-sm">
              support@katareel.com
            </a>
          </div>
          <div className="bg-white/[0.03] rounded-xl p-4">
            <div className="text-2xl mb-2">💬</div>
            <h4 className="text-xs uppercase tracking-wider text-[#8f887a] mb-1">WhatsApp</h4>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:text-[#E3A008] transition-colors text-sm"
            >
              +254 710 440 648
            </a>
          </div>
        </div>
        <p className="text-center text-[#5c574d] text-xs mt-6">
          © {new Date().getFullYear()} Katareel. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

export default Home;
