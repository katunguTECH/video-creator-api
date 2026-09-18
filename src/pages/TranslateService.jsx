// src/pages/TranslateService.jsx — SEO landing page for AI Video Translation
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { getUsdToKesRate, formatUsd } from '../utils/currency';

const PRICE_KES = 300;

const FAQS = [
  { q: 'How does AI video translation work?', a: 'We extract the audio from your video, transcribe it using AI speech recognition, translate the text into your chosen language, then generate natural-sounding voiceover audio in that language. The new audio is mixed back into your video, replacing the original speech track while keeping the visuals untouched.' },
  { q: 'Which languages can I translate my video into?', a: 'We support 37 languages including Swahili, French, Spanish, Mandarin, Arabic, Hindi, Portuguese, German, Japanese, Korean, Italian, and more. Voice tone, pacing, and meaning are preserved throughout.' },
  { q: 'Will the translated voice sound like the original speaker?', a: 'The AI voice is generated in a natural tone that matches the gender and pacing of the original speech. It is not a clone of the original speaker, but it sounds natural and professional.' },
  { q: 'How long does video translation take?', a: 'Most videos under 5 minutes are translated in 60-180 seconds. Longer videos take proportionally longer - usually under 10 minutes.' },
  { q: 'What video formats do you accept?', a: 'We accept MP4, AVI, MOV, and WEBM files up to 50 MB. If your video is hosted elsewhere (YouTube, Drive, etc.), you can download it first and upload the file.' },
  { q: 'How much does video translation cost?', a: 'Translation is a flat rate of KES 300 (about $2.30) per video, regardless of length up to 50 MB. There are no subscriptions and no hidden fees - you pay per video.' },
  { q: 'How do I pay?', a: 'Card or M-Pesa through Pesapal. Prices are shown in USD but billed in Kenyan Shillings at the live exchange rate.' },
  { q: 'Can I use the translated video commercially?', a: 'Yes. Once you have paid for the translation and downloaded the file, you own the output and can use it for any commercial purpose - marketing, social media, client work, e-learning, and more.' },
];

const USE_CASES = [
  { emoji: '📣', title: 'Marketing & advertising', desc: 'Reach audiences in multiple countries with the same campaign. Translate a single ad into five languages and run localized versions worldwide without reshooting.' },
  { emoji: '📚', title: 'E-learning & training', desc: 'Localize instructional content for international teams or students. Add language tracks without re-recording instructors or rebuilding course videos.' },
  { emoji: '🎥', title: 'Creator content', desc: 'Grow your YouTube, TikTok, or Instagram audience in new regions. Translate existing videos to reach viewers who do not speak your language.' },
  { emoji: '🏛️', title: 'NGOs & government', desc: 'Deliver public service announcements, health campaigns, or civic content in local languages without expensive voice talent.' },
  { emoji: '🛒', title: 'E-commerce & product demos', desc: 'Translate product walkthroughs and demo videos for international customers. Localize the same clip into different regional versions.' },
];

function TranslateService() {
  const navigate = useNavigate();
  const [rate, setRate] = useState(null);

  useEffect(() => {
    getUsdToKesRate().then(setRate).catch(() => setRate(129.55));
  }, []);

  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'AI Video Translation',
    serviceType: 'Video Translation Service',
    provider: { '@type': 'Organization', name: 'Katareel', url: 'https://www.katareel.com/' },
    areaServed: 'Worldwide',
    description: 'AI-powered video translation into 37 languages. Preserves tone, pacing, and meaning while replacing the original voice track.',
    offers: { '@type': 'Offer', price: PRICE_KES, priceCurrency: 'KES', url: 'https://www.katareel.com/translate' },
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <div className="bg-[#0A0E1A] text-[#F5F7FB] min-h-screen font-body">
      <Helmet>
        <title>AI Video Translation — Translate Videos to 37 Languages | Katareel</title>
        <meta name="description" content="Dub any video into Swahili, French, Spanish, Chinese, Arabic, and 33 more languages with AI. Preserves voice tone and pacing. Flat rate KES 300." />
        <link rel="canonical" href="https://www.katareel.com/services/translate" />
        <script type="application/ld+json">{JSON.stringify(serviceSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap'); .font-display { font-family: 'Space Grotesk', sans-serif; } .font-body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }`}</style>

      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#0A0E1A]/85 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="font-display text-lg font-semibold tracking-tight text-white">Katareel</Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-[#9AA3B8]">
            <Link to="/services" className="hover:text-white transition-colors">Services</Link>
            <a href="/#demos" className="hover:text-white transition-colors">Demos</a>
            <a href="/#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="/#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>
          <button onClick={() => navigate('/translate')} className="bg-[#22D3B4] hover:brightness-110 text-[#0A0E1A] text-sm font-semibold px-5 py-2.5 rounded-lg transition-all">Translate a video</button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 pt-8 text-xs text-[#5C6478]">
        <Link to="/services" className="hover:text-white transition-colors">Services</Link>
        <span className="mx-2">/</span>
        <span className="text-[#9AA3B8]">Video Translation</span>
      </div>

      <section className="max-w-4xl mx-auto px-6 pt-8 pb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#22D3B4]/10 border border-[#22D3B4]/30 text-xs text-[#22D3B4] mb-6">🌐 37 languages supported</div>
        <h1 className="font-display text-4xl sm:text-5xl font-semibold leading-[1.1] mb-6 text-white">AI Video Translation &amp; Dubbing</h1>
        <p className="text-lg text-[#9AA3B8] leading-relaxed mb-8 max-w-3xl">Translate any video into 37 languages with AI. We extract the original speech, translate it accurately, and replace it with natural-sounding voiceover in your target language - all while preserving the pacing, emotion, and meaning of the original.</p>
        <div className="flex flex-wrap gap-4 mb-8">
          <button onClick={() => navigate('/translate')} className="bg-[#22D3B4] hover:brightness-110 text-[#0A0E1A] font-semibold px-7 py-3.5 rounded-xl transition-all hover:shadow-[0_0_30px_rgba(34,211,180,0.5)]">Translate a video →</button>
          <a href="#how" className="border border-white/15 hover:border-white/40 hover:bg-white/5 text-white px-7 py-3.5 rounded-xl transition-all">How it works</a>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-[#7C87A3]">
          <span>✦ Flat rate {rate ? formatUsd(PRICE_KES, rate) : 'KES 300'}</span>
          <span>✦ Delivered in minutes</span>
          <span>✦ Commercial use included</span>
        </div>
      </section>

      <section id="how" className="max-w-4xl mx-auto px-6 py-16 border-t border-white/5">
        <h2 className="font-display text-3xl font-semibold text-white mb-10">How AI video translation works</h2>
        <div className="space-y-8">
          {[
            { n: '01', t: 'Upload your video', d: 'Choose any MP4, MOV, AVI, or WEBM file up to 50 MB. We support videos with clear speech in any source language.' },
            { n: '02', t: 'AI listens and transcribes', d: 'Our AI transcribes your video audio into text. It handles accents, background noise, and natural speech.' },
            { n: '03', t: 'Translation and voiceover', d: 'The text is translated into your chosen language, then converted into natural-sounding speech that matches the tone of the original.' },
            { n: '04', t: 'Audio is mixed back', d: 'The new voiceover is aligned with the original video timeline, replacing the source audio while leaving the visuals untouched.' },
            { n: '05', t: 'Download and use', d: 'Your translated video is delivered by email and available to download immediately. Use it commercially - no restrictions.' },
          ].map((step) => (
            <div key={step.n} className="flex gap-6">
              <div className="font-display text-3xl font-semibold text-[#22D3B4] flex-shrink-0 w-14">{step.n}</div>
              <div>
                <h3 className="font-semibold text-white text-lg mb-2">{step.t}</h3>
                <p className="text-[#9AA3B8] leading-relaxed">{step.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-16 border-t border-white/5">
        <h2 className="font-display text-3xl font-semibold text-white mb-4">Who uses AI video translation</h2>
        <p className="text-[#9AA3B8] mb-10 max-w-2xl">Whether you are a solo creator or a multinational team, translation opens your content up to audiences you could never reach by hand.</p>
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
        <h2 className="font-display text-3xl font-semibold text-white mb-10">Why use Katareel for video translation</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          {[
            { t: 'Natural-sounding voices', d: 'Our AI generates speech that sounds human - not robotic. Listeners hear a real voice, not a machine.' },
            { t: 'Preserves pacing', d: 'The translated audio is timed to fit the original video length, so nothing gets rushed or cut off.' },
            { t: 'No software to install', d: 'Everything runs in your browser. Upload, pay, download - no plugins, no desktop apps, no editing skills needed.' },
            { t: 'Pay per video', d: 'One flat rate. No subscription, no monthly minimum, no credits that expire. Pay only when you need a video translated.' },
          ].map((b) => (
            <div key={b.t} className="flex gap-3">
              <div className="text-[#22D3B4] text-xl flex-shrink-0">✦</div>
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
        <div className="relative overflow-hidden bg-gradient-to-br from-[#22D3B4]/20 via-[#4C6FFF]/15 to-[#EC4899]/20 border border-white/10 rounded-3xl p-12 text-center">
          <h2 className="font-display text-3xl font-semibold text-white mb-4">Ready to translate your video?</h2>
          <p className="text-[#9AA3B8] mb-8 max-w-lg mx-auto">Upload, pay, download - most videos are translated in under 3 minutes.</p>
          <button onClick={() => navigate('/translate')} className="bg-[#22D3B4] hover:brightness-110 text-[#0A0E1A] font-semibold px-8 py-4 rounded-xl text-base transition-all">Translate a video →</button>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="font-display text-xl font-semibold text-white mb-6">Other Katareel tools</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { t: 'Text to Video', p: '/create', e: '✨' },
            { t: 'Photos to Video', p: '/photos-to-video', e: '🎞️' },
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

export default TranslateService;