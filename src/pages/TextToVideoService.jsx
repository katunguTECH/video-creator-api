// src/pages/TextToVideoService.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { getUsdToKesRate, formatUsd } from '../utils/currency';

const PRICE_KES = 200;
const ACCENT = '#4C6FFF';

const FAQS = [
  { q: 'How does AI text-to-video generation work?', a: 'You describe the scene in plain language, and our AI generates a video clip matching your prompt - no cameras, actors, or editing software required. Most videos render in 30 to 90 seconds.' },
  { q: 'What kinds of prompts work best?', a: 'Be specific about the scene, mood, and style. For example: a slow drone shot over a coastal town at sunrise, cinematic, warm colors produces better results than just a town.' },
  { q: 'How long can my video be?', a: 'Currently we support 5, 10, and 15-second clips. Longer durations cost proportionally more and take longer to render.' },
  { q: 'How much does it cost?', a: 'Starting at KES 200 (about $1.55) for a 5-second clip. Prices scale with duration - you pay per video, no subscription.' },
  { q: 'Do I own the videos I create?', a: 'Yes. Once rendered and paid for, the video is yours to use for marketing, social media, client work, or any commercial purpose.' },
  { q: 'How do I pay?', a: 'Card, PayPal, or M-Pesa through Pesapal. Prices are shown in USD but billed in Kenyan Shillings at the live exchange rate.' },
];

const USE_CASES = [
  { emoji: '📱', title: 'Social media content', desc: 'Generate scroll-stopping clips for TikTok, Instagram Reels, and YouTube Shorts from a text idea - no filming needed.' },
  { emoji: '🎨', title: 'Storyboard and concepting', desc: 'Turn a script into a visual draft before investing in production. Show clients a preview before the real shoot.' },
  { emoji: '📢', title: 'Ad concepts and A/B tests', desc: 'Generate multiple versions of an ad concept quickly, then test which performs best before spending on production.' },
  { emoji: '🎓', title: 'Explainers and education', desc: 'Turn abstract concepts into visual clips for lessons, onboarding, or internal training.' },
];

function TextToVideoService() {
  const navigate = useNavigate();
  const [rate, setRate] = useState(null);
  useEffect(() => { getUsdToKesRate().then(setRate).catch(() => setRate(129.55)); }, []);

  const serviceSchema = {
    '@context': 'https://schema.org', '@type': 'Service',
    name: 'AI Text to Video Generation', serviceType: 'Text to Video Service',
    provider: { '@type': 'Organization', name: 'Katareel', url: 'https://www.katareel.com/' },
    areaServed: 'Worldwide',
    description: 'AI-powered text-to-video generation. Describe a scene and receive a generated video clip in minutes.',
    offers: { '@type': 'Offer', price: PRICE_KES, priceCurrency: 'KES', url: 'https://www.katareel.com/create' },
  };
  const faqSchema = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQS.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) };

  return (
    <div className="bg-[#0A0E1A] text-[#F5F7FB] min-h-screen font-body">
      <Helmet>
        <title>AI Text to Video Generator — Create Videos from Prompts | Katareel</title>
        <meta name="description" content="Describe a scene in plain text and get an AI-generated video in minutes. Text-to-video for marketing, social media, and storytelling. From KES 200." />
        <link rel="canonical" href="https://www.katareel.com/services/text-to-video" />
        <script type="application/ld+json" data-rh="true" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />
        <script type="application/ld+json" data-rh="true" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      </Helmet>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap'); .font-display { font-family: 'Space Grotesk', sans-serif; } .font-body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }`}</style>

      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#0A0E1A]/85 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="font-display text-lg font-semibold tracking-tight text-white">Katareel</Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-[#9AA3B8]">
            <Link to="/services" className="hover:text-white transition-colors">Services</Link>
            <a href="/#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="/#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>
          <button onClick={() => navigate('/create')} className="text-[#0A0E1A] text-sm font-semibold px-5 py-2.5 rounded-lg transition-all" style={{ backgroundColor: ACCENT }}>Create a video</button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 pt-8 text-xs text-[#5C6478]">
        <Link to="/services" className="hover:text-white transition-colors">Services</Link>
        <span className="mx-2">/</span>
        <span className="text-[#9AA3B8]">Text to Video</span>
      </div>

      <section className="max-w-4xl mx-auto px-6 pt-8 pb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs mb-6" style={{ backgroundColor: ACCENT + '1A', border: '1px solid ' + ACCENT + '40', color: ACCENT }}>✨ Text-prompt video generation</div>
        <h1 className="font-display text-4xl sm:text-5xl font-semibold leading-[1.1] mb-6 text-white">AI Text to Video Generator</h1>
        <p className="text-lg text-[#9AA3B8] leading-relaxed mb-8 max-w-3xl">Type a description of the scene you want. Our AI reads your prompt and returns a finished video clip - no camera, no cast, no editing suite. Perfect for social media, ad concepts, and storyboards.</p>
        <div className="flex flex-wrap gap-4 mb-8">
          <button onClick={() => navigate('/create')} className="text-[#0A0E1A] font-semibold px-7 py-3.5 rounded-xl transition-all" style={{ backgroundColor: ACCENT }}>Create a video →</button>
          <a href="#how" className="border border-white/15 hover:border-white/40 hover:bg-white/5 text-white px-7 py-3.5 rounded-xl transition-all">How it works</a>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-[#7C87A3]">
          <span>✦ From {rate ? formatUsd(PRICE_KES, rate) : 'KES 200'}</span>
          <span>✦ Rendered in 30-90s</span>
          <span>✦ Commercial use included</span>
        </div>
      </section>

      <section id="how" className="max-w-4xl mx-auto px-6 py-16 border-t border-white/5">
        <h2 className="font-display text-3xl font-semibold text-white mb-10">How text-to-video works</h2>
        <div className="space-y-8">
          {[
            { n: '01', t: 'Write your prompt', d: 'Describe what you want to see. Be specific about subject, mood, camera angle, and lighting for best results.' },
            { n: '02', t: 'Pick duration', d: 'Choose 5, 10, or 15 seconds. Longer clips cost proportionally more and take slightly longer to render.' },
            { n: '03', t: 'Pay securely', d: 'Card, PayPal, or M-Pesa through Pesapal. Prices shown in USD, billed in Kenyan Shillings.' },
            { n: '04', t: 'AI renders your clip', d: 'Our models process your prompt and generate a matching video. Typically 30-90 seconds.' },
            { n: '05', t: 'Download and use', d: 'The finished video arrives in your browser and by email. Use it commercially with no restrictions.' },
          ].map((step) => (
            <div key={step.n} className="flex gap-6">
              <div className="font-display text-3xl font-semibold flex-shrink-0 w-14" style={{ color: ACCENT }}>{step.n}</div>
              <div>
                <h3 className="font-semibold text-white text-lg mb-2">{step.t}</h3>
                <p className="text-[#9AA3B8] leading-relaxed">{step.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-16 border-t border-white/5">
        <h2 className="font-display text-3xl font-semibold text-white mb-4">Who uses AI text-to-video</h2>
        <p className="text-[#9AA3B8] mb-10 max-w-2xl">Whether you are a solo creator, agency, or enterprise - prompt-driven video means no production bottleneck.</p>
        <div className="grid sm:grid-cols-2 gap-4">
          {USE_CASES.map((uc) => (
            <div key={uc.title} className="bg-[#10162A] border border-white/10 rounded-2xl p-6">
              <div className="text-3xl mb-3">{uc.emoji}</div>
              <h3 className="font-semibold text-white mb-2">{uc.title}</h3>
              <p className="text-sm text-[#9AA3B8] leading-relaxed">{uc.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-16 border-t border-white/5">
        <h2 className="font-display text-3xl font-semibold text-white mb-10">Why use Katareel for text-to-video</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          {[
            { t: 'No software to learn', d: 'Everything runs in your browser. Write a prompt, click generate, download.' },
            { t: 'Pay per video', d: 'No subscription, no credit system. Pay only when you generate.' },
            { t: 'Multiple durations', d: 'Choose 5, 10, or 15 seconds depending on your platform and budget.' },
            { t: 'Commercial rights', d: 'Every video you generate is yours to use freely - ads, social media, client work.' },
          ].map((b) => (
            <div key={b.t} className="flex gap-3">
              <div className="text-xl flex-shrink-0" style={{ color: ACCENT }}>✦</div>
              <div>
                <h3 className="font-semibold text-white mb-1">{b.t}</h3>
                <p className="text-sm text-[#9AA3B8] leading-relaxed">{b.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 py-16 border-t border-white/5">
        <h2 className="font-display text-3xl font-semibold text-white mb-10">Frequently asked questions</h2>
        <div className="space-y-3">
          {FAQS.map((f, i) => (
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
          <h2 className="font-display text-3xl font-semibold text-white mb-4">Ready to generate your first video?</h2>
          <p className="text-[#9AA3B8] mb-8 max-w-lg mx-auto">Type a prompt, pick a duration, get a clip in under two minutes.</p>
          <button onClick={() => navigate('/create')} className="text-[#0A0E1A] font-semibold px-8 py-4 rounded-xl text-base transition-all" style={{ backgroundColor: ACCENT }}>Create a video →</button>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="font-display text-xl font-semibold text-white mb-6">Other Katareel tools</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { t: 'Photos to Video', p: '/photos-to-video', e: '🎞️' },
            { t: 'Video Translation', p: '/translate', e: '🌐' },
            { t: 'Brand Video', p: '/brand-video', e: '🎬' },
            { t: 'Music & Captions', p: '/music-captions', e: '🎵' },
          ].map((r) => (
            <button key={r.t} onClick={() => navigate(r.p)} className="text-left bg-[#10162A] border border-white/10 hover:border-white/25 rounded-xl p-4 transition-colors">
              <div className="text-2xl mb-2">{r.e}</div>
              <div className="text-sm font-medium text-white">{r.t}</div>
            </button>
          ))}
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

export default TextToVideoService;