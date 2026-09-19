// src/pages/BrandVideoService.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { getUsdToKesRate, formatUsd } from '../utils/currency';

const PRICE_KES = 250;
const ACCENT = '#F5A623';

const FAQS = [
  { q: 'How does brand video generation work?', a: 'Upload your video and your logo. Our system adds a professional intro card with your branding, an AI-generated voiceover narrating your business, and a closing card with your contact details - automatically.' },
  { q: 'What video should I upload?', a: 'Any business video works - a product demo, behind-the-scenes footage, testimonials, or a service walkthrough. It should be MP4, MOV, AVI, or WEBM up to 50 MB.' },
  { q: 'Can I write my own voiceover script?', a: 'Yes. Provide your own script and we will narrate it. Or leave the field blank and we will auto-generate a script based on your company name and tagline.' },
  { q: 'What voice is used for the voiceover?', a: 'We use a natural-sounding neural voice. The default is a confident, friendly female voice suited to brand promos.' },
  { q: 'How much does it cost?', a: 'A flat $1.93 (KES 250) per video. No subscription, no monthly fee - you pay only for the brand video you generate.' },
  { q: 'Can I use the final video commercially?', a: 'Yes. Once rendered and paid for, the branded video is yours to use on any platform - social, ads, website, or client work.' },
];

const USE_CASES = [
  { emoji: '🏪', title: 'Small business promos', desc: 'Take raw footage from a phone and turn it into a polished business video with logo, narration, and closing contact card.' },
  { emoji: '🚀', title: 'Startup pitch videos', desc: 'Wrap your product demo in branded packaging with a compelling voiceover, ready to send to investors.' },
  { emoji: '🍽️', title: 'Restaurant and retail ads', desc: 'Add your logo intro and business hours to food or store footage, then post directly to social media.' },
  { emoji: '💼', title: 'Consultant introductions', desc: 'Create a 30-second intro video for your LinkedIn profile or website with your name, offer, and contact card.' },
];

function BrandVideoService() {
  const navigate = useNavigate();
  const [rate, setRate] = useState(null);
  useEffect(() => { getUsdToKesRate().then(setRate).catch(() => setRate(129.55)); }, []);

  const serviceSchema = {
    '@context': 'https://schema.org', '@type': 'Service',
    name: 'Brand Video Maker', serviceType: 'Brand Video Service',
    provider: { '@type': 'Organization', name: 'Katareel', url: 'https://www.katareel.com/' },
    areaServed: 'Worldwide',
    description: 'Automatically add a logo intro, AI voiceover, and closing contact card to any business video.',
    offers: { '@type': 'Offer', price: PRICE_KES, priceCurrency: 'KES', url: 'https://www.katareel.com/brand-video' },
  };
  const faqSchema = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQS.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) };

  return (
    <div className="bg-[#0A0E1A] text-[#F5F7FB] min-h-screen font-body">
      <Helmet>
        <title>Brand Video Maker — Add Logo Intro, Voiceover & Outro | Katareel</title>
        <meta name="description" content="Upload your video and logo. We add a professional intro card, AI voiceover, and closing contact card automatically. Ideal for SMEs. $1.93 (KES 250) flat rate." />
        <link rel="canonical" href="https://www.katareel.com/services/brand-video" />
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
          <button onClick={() => navigate('/brand-video')} className="text-[#0A0E1A] text-sm font-semibold px-5 py-2.5 rounded-lg transition-all" style={{ backgroundColor: ACCENT }}>Brand a video</button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 pt-8 text-xs text-[#5C6478]">
        <Link to="/services" className="hover:text-white transition-colors">Services</Link>
        <span className="mx-2">/</span>
        <span className="text-[#9AA3B8]">Brand Video</span>
      </div>

      <section className="max-w-4xl mx-auto px-6 pt-8 pb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs mb-6" style={{ backgroundColor: ACCENT + '1A', border: '1px solid ' + ACCENT + '40', color: ACCENT }}>🎬 Logo + voiceover + contact card</div>
        <h1 className="font-display text-4xl sm:text-5xl font-semibold leading-[1.1] mb-6 text-white">Brand Video Maker</h1>
        <p className="text-lg text-[#9AA3B8] leading-relaxed mb-8 max-w-3xl">Upload any business video and your logo. We wrap it in a professional intro card, narrate it with a natural-sounding AI voiceover, and finish with your contact details. Fully automatic.</p>
        <div className="flex flex-wrap gap-4 mb-8">
          <button onClick={() => navigate('/brand-video')} className="text-[#0A0E1A] font-semibold px-7 py-3.5 rounded-xl transition-all" style={{ backgroundColor: ACCENT }}>Brand a video →</button>
          <a href="#how" className="border border-white/15 hover:border-white/40 hover:bg-white/5 text-white px-7 py-3.5 rounded-xl transition-all">How it works</a>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-[#7C87A3]">
          <span>✦ Flat rate {rate ? formatUsd(PRICE_KES, rate) : '$1.93 (KES 250)'}</span>
          <span>✦ Automatic narration</span>
          <span>✦ Commercial use included</span>
        </div>
      </section>

      <section id="how" className="max-w-4xl mx-auto px-6 py-16 border-t border-white/5">
        <h2 className="font-display text-3xl font-semibold text-white mb-10">How brand video generation works</h2>
        <div className="space-y-8">
          {[
            { n: '01', t: 'Upload your video', d: 'Any business clip up to 50 MB. Product demo, customer testimonial, behind-the-scenes - anything works.' },
            { n: '02', t: 'Upload your logo', d: 'A clean PNG with transparent background works best. It will appear in the intro and outro cards.' },
            { n: '03', t: 'Enter your details', d: 'Company name, tagline, contact phone, and email. These appear on the closing card.' },
            { n: '04', t: 'Write or auto-generate the script', d: 'Leave the voiceover blank and we generate one from your company name and tagline. Or write your own.' },
            { n: '05', t: 'Get the finished video', d: 'Four-second intro card, your video with narration overlaid, then a four-second outro card. Delivered by email.' },
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
        <h2 className="font-display text-3xl font-semibold text-white mb-4">Who uses brand video generation</h2>
        <p className="text-[#9AA3B8] mb-10 max-w-2xl">Small teams, solo founders, and agencies use it to ship branded video without hiring editors or voiceover artists.</p>
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
        <h2 className="font-display text-3xl font-semibold text-white mb-10">Why use Katareel for brand videos</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          {[
            { t: 'Automatic narration', d: 'No need to record voiceover. AI generates natural speech from your script or ours.' },
            { t: 'Consistent branding', d: 'Logo appears in intro and outro at a consistent size and position every time.' },
            { t: 'Fast turnaround', d: 'Most brand videos render in under five minutes. Delivered directly to your inbox.' },
            { t: 'Pay per video', d: 'One flat rate. No subscription, no monthly fee, no credits that expire.' },
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
          <h2 className="font-display text-3xl font-semibold text-white mb-4">Ready to brand your video?</h2>
          <p className="text-[#9AA3B8] mb-8 max-w-lg mx-auto">Upload, add your details, get a finished brand video in minutes.</p>
          <button onClick={() => navigate('/brand-video')} className="text-[#0A0E1A] font-semibold px-8 py-4 rounded-xl text-base transition-all" style={{ backgroundColor: ACCENT }}>Brand a video →</button>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="font-display text-xl font-semibold text-white mb-6">Other Katareel tools</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { t: 'Text to Video', p: '/create', e: '✨' },
            { t: 'Photos to Video', p: '/photos-to-video', e: '🎞️' },
            { t: 'Video Translation', p: '/translate', e: '🌐' },
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

export default BrandVideoService;