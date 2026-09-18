// src/pages/PhotosToVideoService.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { getUsdToKesRate, formatUsd } from '../utils/currency';

const PRICE_KES = 300;
const ACCENT = '#8B5CF6';

const FAQS = [
  { q: 'How does AI photo-to-video work?', a: 'Upload one or more photos. Our AI analyzes them and generates natural motion, transitions, and pacing to turn stills into a moving video. Add optional narration for voiceover.' },
  { q: 'How many photos can I upload?', a: 'Between 1 and 10 photos per video. Pricing depends on the number of photos and video duration.' },
  { q: 'What kinds of photos work best?', a: 'Clear, well-lit photos with a distinct subject work best. Portrait shots of people, product photos on plain backgrounds, and real estate photos all produce strong results.' },
  { q: 'Can I add a voiceover?', a: 'Yes. Provide a script and choose a male, female, or neutral voice. We generate the audio and mix it into the video automatically.' },
  { q: 'How much does it cost?', a: 'From KES 300 for a single 5-second clip with one photo. Multiple photos and longer durations scale proportionally.' },
  { q: 'Do I own the resulting video?', a: 'Yes. Once paid for and downloaded, the video is yours for commercial use without restriction.' },
];

const USE_CASES = [
  { emoji: '🏠', title: 'Real estate listings', desc: 'Turn property photos into a walkthrough-style video for portals and social media without a videographer on site.' },
  { emoji: '🛍️', title: 'Product showcases', desc: 'Bring product photos to life with subtle motion and pacing - perfect for e-commerce and Instagram.' },
  { emoji: '💒', title: 'Wedding and event memories', desc: 'Turn a gallery of photos into a moving recap with narration for sharing with family and friends.' },
  { emoji: '✈️', title: 'Travel and personal reels', desc: 'Create a visual story from your trip photos in minutes. Add narration or captions and share directly.' },
];

function PhotosToVideoService() {
  const navigate = useNavigate();
  const [rate, setRate] = useState(null);
  useEffect(() => { getUsdToKesRate().then(setRate).catch(() => setRate(129.55)); }, []);

  const serviceSchema = {
    '@context': 'https://schema.org', '@type': 'Service',
    name: 'AI Photo to Video Maker', serviceType: 'Photo to Video Service',
    provider: { '@type': 'Organization', name: 'Katareel', url: 'https://www.katareel.com/' },
    areaServed: 'Worldwide',
    description: 'AI-powered photo-to-video generation. Turn still photos into moving videos with narration and transitions.',
    offers: { '@type': 'Offer', price: PRICE_KES, priceCurrency: 'KES', url: 'https://www.katareel.com/photos-to-video' },
  };
  const faqSchema = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQS.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) };

  return (
    <div className="bg-[#0A0E1A] text-[#F5F7FB] min-h-screen font-body">
      <Helmet>
        <title>AI Photo to Video Maker — Turn Photos into Videos | Katareel</title>
        <meta name="description" content="Upload photos and let AI turn them into a moving video with narration. Perfect for real estate, products, weddings, and social media. From KES 300." />
        <link rel="canonical" href="https://www.katareel.com/services/photos-to-video" />
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
          <button onClick={() => navigate('/photos-to-video')} className="text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-all" style={{ backgroundColor: ACCENT }}>Create a video</button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 pt-8 text-xs text-[#5C6478]">
        <Link to="/services" className="hover:text-white transition-colors">Services</Link>
        <span className="mx-2">/</span>
        <span className="text-[#9AA3B8]">Photos to Video</span>
      </div>

      <section className="max-w-4xl mx-auto px-6 pt-8 pb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs mb-6" style={{ backgroundColor: ACCENT + '1A', border: '1px solid ' + ACCENT + '40', color: ACCENT }}>🎞️ Photo-driven video generation</div>
        <h1 className="font-display text-4xl sm:text-5xl font-semibold leading-[1.1] mb-6 text-white">AI Photo to Video Maker</h1>
        <p className="text-lg text-[#9AA3B8] leading-relaxed mb-8 max-w-3xl">Turn a stack of stills into a moving story. Upload photos, describe the mood, add optional narration - and get back a finished video in minutes. No editing skills needed.</p>
        <div className="flex flex-wrap gap-4 mb-8">
          <button onClick={() => navigate('/photos-to-video')} className="text-white font-semibold px-7 py-3.5 rounded-xl transition-all" style={{ backgroundColor: ACCENT }}>Create a video →</button>
          <a href="#how" className="border border-white/15 hover:border-white/40 hover:bg-white/5 text-white px-7 py-3.5 rounded-xl transition-all">How it works</a>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-[#7C87A3]">
          <span>✦ From {rate ? formatUsd(PRICE_KES, rate) : 'KES 300'}</span>
          <span>✦ Optional AI voiceover</span>
          <span>✦ Commercial use included</span>
        </div>
      </section>

      <section id="how" className="max-w-4xl mx-auto px-6 py-16 border-t border-white/5">
        <h2 className="font-display text-3xl font-semibold text-white mb-10">How photo-to-video works</h2>
        <div className="space-y-8">
          {[
            { n: '01', t: 'Upload your photos', d: 'Add 1 to 10 photos. JPG, PNG, or WEBP up to 10 MB each. Clear subjects work best.' },
            { n: '02', t: 'Describe the mood', d: 'A short prompt guides pacing, transitions, and tone. Optional but recommended.' },
            { n: '03', t: 'Add narration (optional)', d: 'Provide a script and choose male, female, or neutral voice. We generate the audio.' },
            { n: '04', t: 'Pay securely', d: 'Card or M-Pesa through Pesapal. Price scales with photo count and duration.' },
            { n: '05', t: 'Download and share', d: 'Your finished video arrives in minutes by email and in the browser. Yours forever.' },
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
        <h2 className="font-display text-3xl font-semibold text-white mb-4">Who uses AI photo-to-video</h2>
        <p className="text-[#9AA3B8] mb-10 max-w-2xl">Whenever you have great photos but no video, this tool fills the gap.</p>
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
        <h2 className="font-display text-3xl font-semibold text-white mb-10">Why use Katareel for photo-to-video</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          {[
            { t: 'No video editing skills', d: 'You only need photos and a description. Our AI handles motion, transitions, and pacing.' },
            { t: 'Narration built in', d: 'Add a voiceover script and choose a voice - no separate recording session needed.' },
            { t: 'Works on any device', d: 'Runs in your browser. Upload from your phone, laptop, or tablet.' },
            { t: 'Pay per video', d: 'No subscription. Pay only when you generate, and keep every video forever.' },
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
          <h2 className="font-display text-3xl font-semibold text-white mb-4">Turn your photos into a video</h2>
          <p className="text-[#9AA3B8] mb-8 max-w-lg mx-auto">Upload, describe, generate - most videos render in under 3 minutes.</p>
          <button onClick={() => navigate('/photos-to-video')} className="text-white font-semibold px-8 py-4 rounded-xl text-base transition-all" style={{ backgroundColor: ACCENT }}>Create a video →</button>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="font-display text-xl font-semibold text-white mb-6">Other Katareel tools</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { t: 'Text to Video', p: '/create', e: '✨' },
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

export default PhotosToVideoService;