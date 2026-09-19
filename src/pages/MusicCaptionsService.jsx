// src/pages/MusicCaptionsService.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { getUsdToKesRate, formatUsd } from '../utils/currency';

const PRICE_KES = 200;
const ACCENT = '#EC4899';

const FAQS = [
  { q: 'How does music and captions addition work?', a: 'Upload your video, optionally upload a background music track, and add caption text. We mix the music into the audio track and burn the captions into the video with your chosen style and position.' },
  { q: 'What caption styles are available?', a: 'Subtle, bold, neon, classic, and karaoke styles. Each can be positioned at the top, center, or bottom of the frame.' },
  { q: 'Can I control when captions appear?', a: 'Yes. Captions are timed to your video. By default they display at 1.5-second intervals, and you can add as many caption lines as you need.' },
  { q: 'What music can I upload?', a: 'Any audio file you have the rights to use - MP3, WAV, or M4A. We mix it under your existing audio at a volume you control.' },
  { q: 'How much does it cost?', a: 'A flat $1.54 (KES 200) per video. No subscription. Pay only when you add music or captions.' },
  { q: 'Will captions work on all platforms?', a: 'Yes. Captions are permanently burned into the video, so they display on TikTok, Instagram, YouTube, LinkedIn, and any other platform.' },
];

const USE_CASES = [
  { emoji: '📱', title: 'Social media accessibility', desc: '85% of social videos are watched with sound off. Burned-in captions keep viewers engaged even muted.' },
  { emoji: '🎵', title: 'TikTok and Reels captions', desc: 'Add trending-style animated captions to vertical videos ready for short-form platforms.' },
  { emoji: '▶️', title: 'YouTube subtitle overlays', desc: 'Add on-screen text for key moments in long-form YouTube content without editing software.' },
  { emoji: '🏢', title: 'Corporate training videos', desc: 'Ensure training and onboarding content is accessible to deaf and hard-of-hearing employees.' },
];

function MusicCaptionsService() {
  const navigate = useNavigate();
  const [rate, setRate] = useState(null);
  useEffect(() => { getUsdToKesRate().then(setRate).catch(() => setRate(129.55)); }, []);

  const serviceSchema = {
    '@context': 'https://schema.org', '@type': 'Service',
    name: 'Music and Captions for Video', serviceType: 'Video Music and Captions Service',
    provider: { '@type': 'Organization', name: 'Katareel', url: 'https://www.katareel.com/' },
    areaServed: 'Worldwide',
    description: 'Add background music and professionally styled on-screen captions to any video.',
    offers: { '@type': 'Offer', price: PRICE_KES, priceCurrency: 'KES', url: 'https://www.katareel.com/music-captions' },
  };
  const faqSchema = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQS.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) };

  return (
    <div className="bg-[#0A0E1A] text-[#F5F7FB] min-h-screen font-body">
      <Helmet>
        <title>Add Music & Captions to Any Video — AI Caption Tool | Katareel</title>
        <meta name="description" content="Add background music and on-screen captions to any video in minutes. Multiple caption styles, positioned exactly where you want. $1.54 (KES 200) flat rate." />
        <link rel="canonical" href="https://www.katareel.com/services/music-captions" />
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
          <button onClick={() => navigate('/music-captions')} className="text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-all" style={{ backgroundColor: ACCENT }}>Add music & captions</button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 pt-8 text-xs text-[#5C6478]">
        <Link to="/services" className="hover:text-white transition-colors">Services</Link>
        <span className="mx-2">/</span>
        <span className="text-[#9AA3B8]">Music & Captions</span>
      </div>

      <section className="max-w-4xl mx-auto px-6 pt-8 pb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs mb-6" style={{ backgroundColor: ACCENT + '1A', border: '1px solid ' + ACCENT + '40', color: ACCENT }}>🎵 Music + styled captions</div>
        <h1 className="font-display text-4xl sm:text-5xl font-semibold leading-[1.1] mb-6 text-white">Music & Captions for Video</h1>
        <p className="text-lg text-[#9AA3B8] leading-relaxed mb-8 max-w-3xl">Add background music and professionally styled on-screen captions to any video - without opening an editor. Choose from multiple styles, position them anywhere, and control music volume.</p>
        <div className="flex flex-wrap gap-4 mb-8">
          <button onClick={() => navigate('/music-captions')} className="text-white font-semibold px-7 py-3.5 rounded-xl transition-all" style={{ backgroundColor: ACCENT }}>Get started →</button>
          <a href="#how" className="border border-white/15 hover:border-white/40 hover:bg-white/5 text-white px-7 py-3.5 rounded-xl transition-all">How it works</a>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-[#7C87A3]">
          <span>✦ Flat rate {rate ? formatUsd(PRICE_KES, rate) : '$1.54 (KES 200)'}</span>
          <span>✦ Burned-in captions</span>
          <span>✦ Commercial use included</span>
        </div>
      </section>

      <section id="how" className="max-w-4xl mx-auto px-6 py-16 border-t border-white/5">
        <h2 className="font-display text-3xl font-semibold text-white mb-10">How music and captions work</h2>
        <div className="space-y-8">
          {[
            { n: '01', t: 'Upload your video', d: 'Any MP4, MOV, AVI, or WEBM file up to 50 MB. Already have audio? We keep it and layer music underneath.' },
            { n: '02', t: 'Add captions (optional)', d: 'Type caption lines one at a time. Each displays for 1.5 seconds by default. Add as many as you need.' },
            { n: '03', t: 'Upload music (optional)', d: 'Any MP3, WAV, or M4A file you have rights to use. Adjust the volume as a percentage of the original.' },
            { n: '04', t: 'Choose style and position', d: 'Five caption styles - subtle, bold, neon, classic, karaoke. Position at top, center, or bottom.' },
            { n: '05', t: 'Download the finished video', d: 'Captions are burned into the video, so they show up on every platform. Music is mixed in at your chosen level.' },
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
        <h2 className="font-display text-3xl font-semibold text-white mb-4">Who uses music and captions</h2>
        <p className="text-[#9AA3B8] mb-10 max-w-2xl">Anywhere a video needs to work with sound off, or where a background track would improve the mood.</p>
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
        <h2 className="font-display text-3xl font-semibold text-white mb-10">Why use Katareel for captions</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          {[
            { t: 'Burned-in captions', d: 'Unlike subtitle files that need to be loaded separately, ours are permanently part of the video. Works everywhere.' },
            { t: 'Multiple styles', d: 'Match your brand or platform - subtle for LinkedIn, bold for TikTok, karaoke for entertainment.' },
            { t: 'Music layering', d: 'Add background music without losing your original audio. Full control over the mix.' },
            { t: 'Pay per video', d: 'One flat rate. No subscription, no monthly minimum, no credits that expire.' },
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
          <h2 className="font-display text-3xl font-semibold text-white mb-4">Ready to upgrade your video?</h2>
          <p className="text-[#9AA3B8] mb-8 max-w-lg mx-auto">Add music and captions in minutes. Most videos finish in under 3 minutes.</p>
          <button onClick={() => navigate('/music-captions')} className="text-white font-semibold px-8 py-4 rounded-xl text-base transition-all" style={{ backgroundColor: ACCENT }}>Get started →</button>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="font-display text-xl font-semibold text-white mb-6">Other Katareel tools</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { t: 'Text to Video', p: '/create', e: '✨' },
            { t: 'Photos to Video', p: '/photos-to-video', e: '🎞️' },
            { t: 'Video Translation', p: '/translate', e: '🌐' },
            { t: 'Brand Video', p: '/brand-video', e: '🎬' },
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

export default MusicCaptionsService;