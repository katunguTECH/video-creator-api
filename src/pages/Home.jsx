// Home.jsx — Katareel landing page (v3) — animated, interactive, creator-focused
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { getUsdToKesRate, formatUsd } from '../utils/currency';

const WHATSAPP_URL = 'https://wa.me/254710440648';

const SERVICES = [
  { key: 'text-to-video',   emoji: '✨',  accent: '#4C6FFF', title: 'Text to Video',    desc: 'Type a scene. Get a cinematic clip back in minutes.',                     basePriceKes: 200, priceNote: 'from', path: '/create' },
  { key: 'photos-to-video', emoji: '🎞️', accent: '#8B5CF6', title: 'Photos to Video',  desc: 'Turn a stack of stills into a moving story with AI motion.',              basePriceKes: 300, priceNote: 'from', path: '/photos-to-video' },
  { key: 'translation',     emoji: '🌐',  accent: '#22D3B4', title: 'Video Translation',desc: 'Dub any video into 37 languages — voice, tone, and timing intact.',       basePriceKes: 300, priceNote: 'flat', path: '/translate' },
  { key: 'brand-video',     emoji: '🎬',  accent: '#F5A623', title: 'Brand Video',      desc: 'Logo intro, AI voiceover, and closing card — added automatically.',       basePriceKes: 250, priceNote: 'flat', path: '/brand-video' },
  { key: 'music-captions',  emoji: '🎵',  accent: '#EC4899', title: 'Music & Captions', desc: 'Background tracks and on-screen captions baked into any clip.',           basePriceKes: 200, priceNote: 'flat', path: '/music-captions' },
];

const PHRASES = [
  'Turn text into stunning videos.',
  'Dub any clip into 37 languages.',
  'Add music and captions in seconds.',
  'Turn photos into moving stories.',
  'Brand any video with your logo.',
];

const LANGS = [
  { name: 'English',    flag: '🇬🇧' }, { name: 'Swahili',    flag: '🇰🇪' },
  { name: 'French',     flag: '🇫🇷' }, { name: 'Spanish',    flag: '🇪🇸' },
  { name: 'Mandarin',   flag: '🇨🇳' }, { name: 'Arabic',     flag: '🇸🇦' },
  { name: 'Hindi',      flag: '🇮🇳' }, { name: 'German',     flag: '🇩🇪' },
  { name: 'Portuguese', flag: '🇧🇷' }, { name: 'Japanese',   flag: '🇯🇵' },
  { name: 'Korean',     flag: '🇰🇷' }, { name: 'Italian',    flag: '🇮🇹' },
];

const FAQS = [
  { q: 'What kinds of videos can I create?',    a: 'Five tools in one: text-to-video, photo-to-video, translation, branding, and music & captions. Use them standalone or chain them together.' },
  { q: 'How much does it cost?',                a: 'Prices start at KES 200 (about $1.55) per video. Everything is billed per video — no subscription, no hidden fees.' },
  { q: 'How long does it take?',                a: 'Text-to-video and photo-to-video generate in 30–90 seconds. Translation and music/captions finish in about 60–180 seconds.' },
  { q: 'How do I pay?',                         a: 'Card or M-Pesa through Pesapal. Prices are shown in USD but billed in Kenyan Shillings at the live exchange rate.' },
  { q: 'What languages can I translate into?',  a: '37 languages including Swahili, French, Spanish, Mandarin, Arabic, Hindi, Portuguese, and more. Voice tone and timing are preserved.' },
];

/* ---------- hooks ---------- */
function useScrollReveal(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

function useTyping(words) {
  const [i, setI] = useState(0);
  const [txt, setTxt] = useState('');
  const [del, setDel] = useState(false);
  useEffect(() => {
    const w = words[i % words.length];
    const t = setTimeout(() => {
      if (!del) {
        setTxt(w.slice(0, txt.length + 1));
        if (txt === w) setTimeout(() => setDel(true), 1600);
      } else {
        setTxt(w.slice(0, txt.length - 1));
        if (txt === '') { setDel(false); setI(i + 1); }
      }
    }, del ? 25 : 65);
    return () => clearTimeout(t);
  }, [txt, del, i, words]);
  return txt;
}

/* ---------- small components ---------- */
function Reveal({ children, delay = 0, y = 24 }) {
  const [ref, visible] = useScrollReveal();
  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : `translateY(${y}px)`,
      transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
    }}>{children}</div>
  );
}

function Counter({ to, suffix = '', duration = 1600 }) {
  const [n, setN] = useState(0);
  const [ref, visible] = useScrollReveal();
  useEffect(() => {
    if (!visible) return;
    const start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / duration, 1);
      setN(Math.floor(p * to));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [visible, to, duration]);
  return <span ref={ref}>{n}{suffix}</span>;
}

function BeforeAfter() {
  const [pos, setPos] = useState(50);
  return (
    <div className="relative aspect-video rounded-2xl overflow-hidden bg-black select-none group">
      <video src="/demo/translate-chinese.mp4" autoPlay loop muted playsInline
             className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <video src="/demo/translate-original.mp4" autoPlay loop muted playsInline
               className="w-full h-full object-cover" />
      </div>

      <div className="absolute top-0 bottom-0 w-[2px] bg-white/90 pointer-events-none"
           style={{ left: `${pos}%`, boxShadow: '0 0 12px rgba(255,255,255,0.6)' }}>
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white text-black flex items-center justify-center font-bold shadow-xl text-xs">
          ⇔
        </div>
      </div>

      <input type="range" min="0" max="100" value={pos}
             onChange={e => setPos(+e.target.value)}
             className="absolute inset-x-0 bottom-3 w-[80%] mx-auto opacity-0 group-hover:opacity-100 transition-opacity cursor-ew-resize"
             aria-label="Translation comparison slider" />

      <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur text-xs text-white font-medium">
        🇬🇧 Original
      </div>
      <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur text-xs text-white font-medium">
        🇨🇳 Translated
      </div>
    </div>
  );
}

function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <div className="space-y-3">
      {FAQS.map((f, i) => (
        <div key={i}
             className="border border-white/10 rounded-xl overflow-hidden bg-white/[0.03] hover:bg-white/[0.05] transition-colors">
          <button onClick={() => setOpen(open === i ? -1 : i)}
                  className="w-full text-left px-5 py-4 flex items-center justify-between gap-4">
            <span className="text-white font-medium">{f.q}</span>
            <span className="text-[#7C87A3] text-xl transition-transform duration-300"
                  style={{ transform: open === i ? 'rotate(45deg)' : 'rotate(0)' }}>+</span>
          </button>
          <div className="overflow-hidden transition-all duration-300"
               style={{ maxHeight: open === i ? 260 : 0 }}>
            <p className="px-5 pb-4 text-[#9AA3B8] text-sm leading-relaxed">{f.a}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- page ---------- */
function Home() {
  const navigate = useNavigate();
  const [rate, setRate] = useState(null);
  const typed = useTyping(PHRASES);

  useEffect(() => {
    getUsdToKesRate().then(setRate).catch(() => setRate(129.55));
  }, []);

  return (
    <div className="bg-[#0A0E1A] text-[#F5F7FB] font-body min-h-screen">
      <Helmet>
        <title>Katareel — AI Video Translator, Creator & Branding Tools</title>
        <meta name="description" content="AI video translator, text-to-video generator, photo-to-video, brand video, and music & captions — all in one place. Pay by card or M-Pesa." />
        <link rel="canonical" href="https://www.katareel.com/" />
      </Helmet>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');
        .font-display { font-family: 'Space Grotesk', sans-serif; }
        .font-body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
        @keyframes blob { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(40px,-50px) scale(1.1)} 66%{transform:translate(-30px,30px) scale(0.95)} }
        .blob { animation: blob 22s ease-in-out infinite; }
        @keyframes marquee { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        .marquee { animation: marquee 45s linear infinite; }
        @keyframes blink { 50%{opacity:0} }
        .cursor { animation: blink 1s step-end infinite; }
        .grid-dots { background-image: radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px); background-size: 32px 32px; }
        .service-card { transition: transform .35s cubic-bezier(.2,.8,.2,1), border-color .35s, box-shadow .35s; }
        .service-card:hover { transform: translateY(-6px); box-shadow: 0 20px 40px -20px rgba(76,111,255,0.35); }
        .service-card:hover .svc-icon { transform: scale(1.12) rotate(-6deg); }
        .svc-icon { transition: transform .4s cubic-bezier(.2,.8,.2,1); }
        .service-card:hover .svc-arrow { transform: translateX(6px); opacity: 1; }
        .svc-arrow { transition: transform .35s, opacity .35s; opacity: .45; }
      `}</style>

      {/* NAV */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#0A0E1A]/85 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="font-display text-lg font-semibold tracking-tight text-white">Katareel</span>
          <div className="hidden md:flex items-center gap-8 text-sm text-[#9AA3B8]">
            <a href="#tools" className="hover:text-white transition-colors">Tools</a>
            <a href="#demos" className="hover:text-white transition-colors">Demos</a>
            <a href="#how" className="hover:text-white transition-colors">How it works</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>
          <button onClick={() => navigate('/create')}
                  className="bg-[#4C6FFF] hover:bg-[#3d5ce0] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-all hover:shadow-[0_0_24px_rgba(76,111,255,0.5)]">
            Start free
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden grid-dots">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-[#4C6FFF]/20 blur-[120px] blob" />
          <div className="absolute top-20 -right-40 w-[400px] h-[400px] rounded-full bg-[#EC4899]/15 blur-[120px] blob" style={{ animationDelay: '-7s' }} />
          <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] rounded-full bg-[#22D3B4]/10 blur-[120px] blob" style={{ animationDelay: '-14s' }} />
        </div>

        <div className="relative max-w-4xl mx-auto px-6 pt-24 pb-28 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-[#9AA3B8] mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22D3B4] animate-pulse" />
            AI video translation · generation · branding
          </div>

          <h1 className="font-display text-4xl sm:text-6xl font-semibold leading-[1.05] mb-6 text-white">
            AI Video Translator,<br />
            <span className="bg-gradient-to-r from-[#4C6FFF] via-[#8B5CF6] to-[#EC4899] bg-clip-text text-transparent">
              Creator & Branding Tools.
            </span>
          </h1>

          <div className="h-[2.5rem] sm:h-[3rem] mb-8 flex items-center justify-center">
            <p className="text-lg sm:text-2xl text-[#9AA3B8]">
              <span>{typed}</span>
              <span className="cursor text-[#4C6FFF] font-light">|</span>
            </p>
          </div>

          <p className="text-base text-[#7C87A3] max-w-2xl mx-auto mb-10">
            Generate, translate, brand, caption, or animate — all in one place.
            Prices in USD, billed in KES via card or M-Pesa.
          </p>

          <div className="flex flex-wrap justify-center items-center gap-3 mb-6">
            <button onClick={() => navigate('/create')}
                    className="bg-[#4C6FFF] hover:bg-[#3d5ce0] text-white font-semibold px-7 py-3.5 rounded-xl text-base transition-all hover:shadow-[0_0_40px_rgba(76,111,255,0.6)] hover:-translate-y-0.5">
              Start creating →
            </button>
            <a href="#demos"
               className="border border-white/15 hover:border-white/40 hover:bg-white/5 text-white px-7 py-3.5 rounded-xl text-base transition-all">
              See it live
            </a>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-xs text-[#5C6478]">
            <span>✦ Pay by card or M-Pesa</span>
            <span>✦ Delivered in minutes</span>
            <span>✦ No subscription</span>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="tools" className="max-w-6xl mx-auto px-6 py-20">
        <Reveal>
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-white mb-3">Five tools. One workflow.</h2>
            <p className="text-[#9AA3B8] max-w-xl mx-auto">Use them standalone or chain them — the output of one becomes the input of the next.</p>
          </div>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {SERVICES.map((s, i) => (
            <Reveal key={s.key} delay={i * 80}>
              <div onClick={() => navigate(s.path)}
                   className="service-card group cursor-pointer bg-[#10162A] border border-white/10 hover:border-white/25 rounded-2xl p-6 flex flex-col h-full">
                <div className="svc-icon w-14 h-14 rounded-xl flex items-center justify-center text-2xl mb-5"
                     style={{ backgroundColor: `${s.accent}1A`, border: `1px solid ${s.accent}40` }}>
                  {s.emoji}
                </div>
                <h3 className="font-semibold text-white text-lg mb-2">{s.title}</h3>
                <p className="text-sm text-[#9AA3B8] leading-relaxed mb-6 flex-1">{s.desc}</p>
                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[10px] uppercase tracking-wider text-[#7C87A3]">{s.priceNote}</span>
                    <span className="text-lg font-semibold" style={{ color: s.accent }}>
                      {rate ? formatUsd(s.basePriceKes, rate) : '—'}
                    </span>
                  </div>
                  <span className="svc-arrow text-sm text-white">→</span>
                </div>
              </div>
            </Reveal>
          ))}

          <Reveal delay={400}>
            <div className="bg-transparent border border-dashed border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center text-center h-full min-h-[220px]">
              <p className="text-sm text-[#7C87A3]">
                Need something custom?<br />
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer"
                   className="text-[#4C6FFF] hover:underline mt-1 inline-block">Talk to us on WhatsApp →</a>
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* DEMOS */}
      <section id="demos" className="max-w-6xl mx-auto px-6 py-20">
        <Reveal>
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-white mb-3">See it in action.</h2>
            <p className="text-[#9AA3B8] max-w-xl mx-auto">Real output from our tools — no mockups, no edits.</p>
          </div>
        </Reveal>

        <div className="grid lg:grid-cols-2 gap-6">
          <Reveal>
            <div className="bg-[#10162A] border border-white/10 rounded-2xl p-6 h-full">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-white mb-1">Video Translation</h3>
                  <p className="text-sm text-[#9AA3B8]">Same clip, two languages. Drag the slider.</p>
                </div>
                <span className="px-2 py-1 rounded-full bg-[#22D3B4]/15 text-[#22D3B4] text-[10px] font-semibold uppercase tracking-wide">Live</span>
              </div>
              <BeforeAfter />
            </div>
          </Reveal>

          <Reveal delay={150}>
            <div className="bg-[#10162A] border border-white/10 rounded-2xl p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-white mb-1">Brand Video</h3>
                  <p className="text-sm text-[#9AA3B8]">Logo intro, AI voiceover, closing card — added automatically.</p>
                </div>
                <span className="px-2 py-1 rounded-full bg-[#F5A623]/15 text-[#F5A623] text-[10px] font-semibold uppercase tracking-wide">Demo</span>
              </div>
              <div className="rounded-xl overflow-hidden bg-black mt-auto flex-1 flex items-center justify-center">
                <video controls playsInline className="max-h-[340px] w-full" poster="/demo/brand-video-demo-thumb.jpg">
                  <source src="/demo/brand-video-demo.mp4" type="video/mp4" />
                </video>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* LANGUAGES MARQUEE */}
      <section className="max-w-6xl mx-auto px-6 py-16 overflow-hidden">
        <Reveal>
          <div className="text-center mb-8">
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-white mb-2">Translate into 37 languages.</h2>
            <p className="text-[#9AA3B8]">Voice tone, pacing, and meaning stay intact — only the language changes.</p>
          </div>
        </Reveal>
        <div className="relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
          <div className="flex gap-3 marquee w-max">
            {[...LANGS, ...LANGS].map((l, i) => (
              <div key={i} className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#10162A] border border-white/10 whitespace-nowrap">
                <span className="text-lg">{l.flag}</span>
                <span className="text-sm text-[#9AA3B8]">{l.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <Reveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { n: 37,  s: '+', label: 'Languages supported' },
              { n: 5,   s: '',  label: 'AI tools in one' },
              { n: 90,  s: 's', label: 'Typical generation time' },
              { n: 200, s: '',  label: 'Starting price (KES)' },
            ].map((stat, i) => (
              <div key={i} className="bg-[#10162A] border border-white/10 rounded-2xl p-6 text-center">
                <div className="font-display text-4xl font-semibold text-white mb-2">
                  <Counter to={stat.n} suffix={stat.s} />
                </div>
                <div className="text-xs text-[#7C87A3] uppercase tracking-wide">{stat.label}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="max-w-6xl mx-auto px-6 py-20">
        <Reveal>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-white mb-12 text-center">How it works.</h2>
        </Reveal>
        <div className="grid sm:grid-cols-3 gap-8">
          {[
            { n: '01', t: 'Pick a tool',       d: 'Text, photos, translation, branding, or music & captions. Each one stands alone.' },
            { n: '02', t: 'Pay & upload',      d: 'Card or M-Pesa through Pesapal. Prices in USD, billed in KES. No subscription.' },
            { n: '03', t: 'Download or share', d: 'Your video arrives by email in minutes, ready to post wherever your audience is.' },
          ].map((step, i) => (
            <Reveal key={i} delay={i * 120}>
              <div>
                <div className="font-display text-5xl font-semibold bg-gradient-to-br from-[#4C6FFF] to-[#EC4899] bg-clip-text text-transparent mb-4">
                  {step.n}
                </div>
                <h3 className="font-semibold text-white text-lg mb-2">{step.t}</h3>
                <p className="text-sm text-[#9AA3B8] leading-relaxed">{step.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-20">
        <Reveal>
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-white mb-3">Simple pricing. No subscriptions.</h2>
            <p className="text-[#9AA3B8]">Pay per video. Prices shown in USD, billed in Kenyan Shillings.</p>
          </div>
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {SERVICES.map((s, i) => (
            <Reveal key={s.key} delay={i * 60}>
              <div className="bg-[#10162A] border border-white/10 rounded-2xl p-5 text-center h-full flex flex-col">
                <div className="text-2xl mb-2">{s.emoji}</div>
                <div className="text-sm font-medium text-white mb-3">{s.title}</div>
                <div className="font-display text-2xl font-semibold mb-1" style={{ color: s.accent }}>
                  {rate ? formatUsd(s.basePriceKes, rate) : '—'}
                </div>
                <div className="text-xs text-[#7C87A3] mb-4">{s.priceNote === 'flat' ? 'flat rate' : 'starting'}</div>
                <button onClick={() => navigate(s.path)}
                        className="mt-auto text-xs font-medium text-white border border-white/15 hover:border-white/40 hover:bg-white/5 rounded-lg px-3 py-2 transition-colors">
                  Use tool →
                </button>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={300}>
          <p className="text-center text-xs text-[#5C6478] mt-6">
            Prices shown in USD at today's live exchange rate. Billed in Kenyan Shillings via card or M-Pesa.
          </p>
        </Reveal>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-3xl mx-auto px-6 py-20">
        <Reveal>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-white mb-10 text-center">Questions.</h2>
        </Reveal>
        <Reveal delay={100}>
          <Faq />
        </Reveal>
      </section>

      {/* FINAL CTA */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <Reveal>
          <div className="relative overflow-hidden bg-gradient-to-br from-[#4C6FFF]/20 via-[#8B5CF6]/15 to-[#EC4899]/20 border border-white/10 rounded-3xl p-12 text-center">
            <div className="absolute -top-20 -right-20 w-[300px] h-[300px] rounded-full bg-[#EC4899]/20 blur-[100px] blob" />
            <div className="relative">
              <h2 className="font-display text-3xl sm:text-4xl font-semibold text-white mb-4">Ready to make your next video?</h2>
              <p className="text-[#9AA3B8] max-w-lg mx-auto mb-8">
                Start with text-to-video. Add translation, captions, or a brand intro whenever you're ready.
              </p>
              <button onClick={() => navigate('/create')}
                      className="bg-white text-[#0A0E1A] font-semibold px-8 py-4 rounded-xl text-base hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:-translate-y-0.5 transition-all">
                Start creating →
              </button>
            </div>
          </div>
        </Reveal>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 mt-10">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid sm:grid-cols-3 gap-8">
            <div>
              <div className="font-display text-lg font-semibold text-white mb-2">Katareel</div>
              <p className="text-sm text-[#7C87A3]">AI video tools for creators, teams, and small businesses.</p>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-[#5C6478] mb-3">Contact</div>
              <ul className="space-y-1.5 text-sm">
                <li><a href="mailto:support@katareel.com" className="text-[#9AA3B8] hover:text-white transition-colors">support@katareel.com</a></li>
                <li><a href="mailto:sales@katareel.com" className="text-[#9AA3B8] hover:text-white transition-colors">sales@katareel.com</a></li>
                <li><a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="text-[#9AA3B8] hover:text-white transition-colors">WhatsApp: +254 710 440 648</a></li>
              </ul>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-[#5C6478] mb-3">Tools</div>
              <ul className="space-y-1.5 text-sm">
                {SERVICES.map(s => (
                  <li key={s.key}>
                    <button onClick={() => navigate(s.path)} className="text-[#9AA3B8] hover:text-white transition-colors">
                      {s.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-white/5 text-center">
            <p className="text-xs text-[#5C6478]">© {new Date().getFullYear()} Katareel. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Home;