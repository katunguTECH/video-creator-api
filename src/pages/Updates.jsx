// src/pages/Updates.jsx — Customer-facing changelog and SEO progress page
import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const CHANGES = [
  {
    icon: '🔍',
    title: 'You can now find us on Google',
    before: 'Google could not read our site at all — it saw an empty page and skipped us entirely.',
    after: 'Search for "AI video translation Kenya" or "turn photos into video online" and we can appear in the results.',
  },
  {
    icon: '📄',
    title: 'Each service has its own page',
    before: 'Everything was crammed into one homepage. Visitors had to hunt for what they needed.',
    after: 'Translation, text-to-video, photo-to-video, brand videos, and music & captions each have a dedicated page with clear information.',
  },
  {
    icon: '❓',
    title: 'Google can answer questions for us',
    before: 'You had to visit the site to see pricing, formats, and delivery times.',
    after: 'Ask Google "How much does AI video translation cost?" and our answers may appear directly in search results.',
  },
  {
    icon: '🎬',
    title: 'Our demo videos can appear in search',
    before: 'Google did not know we had video demos at all.',
    after: 'Search for "brand video with logo intro" and our demo thumbnails may show next to our listing.',
  },
  {
    icon: '⚡',
    title: 'Faster, cleaner experience',
    before: 'Pages waited for JavaScript to build them, which sometimes caused slow first loads.',
    after: 'Content loads instantly. Real visitors still get the same interactive experience — just faster and more reliable.',
  },
  {
    icon: '✅',
    title: 'Correct branding everywhere',
    before: 'Sharing a Katareel link on WhatsApp, LinkedIn, or Facebook showed a mismatched preview.',
    after: 'Every link preview now shows the correct "Katareel" name, description, and thumbnail.',
  },
];

const TIMELINE = [
  { when: 'Week 1–2', what: 'Google finishes crawling and indexing the new pages.' },
  { when: 'Week 3–6', what: 'You start seeing impressions in Search Console — people seeing us in search results.' },
  { when: 'Week 4–12', what: 'First clicks and rankings for specific searches.' },
  { when: 'Month 3–6', what: 'Consistent rankings for targeted keywords as Google confirms our pages are useful.' },
];

function Updates() {
  const navigate = useNavigate();

  return (
    <div className="bg-[#0A0E1A] text-[#F5F7FB] min-h-screen font-body">
      <Helmet>
        <title>What's New at Katareel — SEO & Site Improvements</title>
        <meta name="description" content="A plain-English summary of recent improvements to Katareel: better Google visibility, dedicated service pages, faster loading, and clearer answers in search results." />
        <link rel="canonical" href="https://www.katareel.com/updates" />
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
            <Link to="/services" className="hover:text-white transition-colors">Services</Link>
            <Link to="/updates" className="text-white">Updates</Link>
            <a href="/#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="/#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>
          <button onClick={() => navigate('/create')} className="bg-[#4C6FFF] hover:bg-[#3d5ce0] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-all">
            Start free
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-12 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-[#9AA3B8] mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22D3B4] animate-pulse"></span>
          Recently shipped
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-semibold leading-[1.1] mb-6 text-white">
          What's new at Katareel
        </h1>
        <p className="text-lg text-[#9AA3B8] max-w-2xl mx-auto">
          A plain-English summary of what we just improved — and what it means for you.
          No technical jargon, no exaggerated claims.
        </p>
      </section>

      {/* BEFORE / AFTER CARDS */}
      <section className="max-w-4xl mx-auto px-6 py-12 space-y-4">
        {CHANGES.map((c, i) => (
          <article key={i} className="bg-[#10162A] border border-white/10 rounded-2xl p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="text-3xl flex-shrink-0">{c.icon}</div>
              <h2 className="font-display text-xl font-semibold text-white pt-1">{c.title}</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <div className="bg-black/30 border border-white/5 rounded-xl p-4">
                <div className="text-xs uppercase tracking-wider text-[#7C87A3] mb-2">Before</div>
                <p className="text-sm text-[#9AA3B8] leading-relaxed">{c.before}</p>
              </div>
              <div className="bg-[#22D3B4]/5 border border-[#22D3B4]/20 rounded-xl p-4">
                <div className="text-xs uppercase tracking-wider text-[#22D3B4] mb-2">Now</div>
                <p className="text-sm text-white/90 leading-relaxed">{c.after}</p>
              </div>
            </div>
          </article>
        ))}
      </section>

      {/* WHAT THIS MEANS */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h2 className="font-display text-3xl font-semibold text-white mb-6">The bottom line, in one sentence</h2>
        <p className="text-lg text-[#9AA3B8] leading-relaxed mb-8">
          Before this week, Google didn't know Katareel existed. Now Google can find us, read
          what we offer, and show us to people searching for the exact services we sell.
        </p>
        <div className="bg-[#10162A] border border-white/10 rounded-2xl p-6">
          <p className="text-sm text-[#7C87A3] uppercase tracking-wider mb-3">A quick analogy</p>
          <p className="text-white leading-relaxed">
            It's like going from being invisible — to being listed in the phone book
            under every service you offer. Same business, but now people can actually find you.
          </p>
        </div>
      </section>

      {/* TIMELINE */}
      <section className="max-w-3xl mx-auto px-6 py-16 border-t border-white/5">
        <h2 className="font-display text-3xl font-semibold text-white mb-4">What happens next</h2>
        <p className="text-[#9AA3B8] mb-10">
          Search engines take time to trust new content. Here's the honest timeline:
        </p>
        <div className="space-y-4">
          {TIMELINE.map((t, i) => (
            <div key={i} className="flex gap-6 items-start">
              <div className="font-display text-sm font-semibold text-[#4C6FFF] w-24 flex-shrink-0 pt-1">{t.when}</div>
              <div className="flex-1 pb-4 border-b border-white/5 last:border-0">
                <p className="text-[#9AA3B8] leading-relaxed">{t.what}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-sm text-[#7C87A3] mt-8 leading-relaxed">
          No overnight magic — but the foundation is now correct. Before this work,
          none of these steps were even possible.
        </p>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h2 className="font-display text-3xl font-semibold text-white mb-4">Ready to try a service?</h2>
        <p className="text-[#9AA3B8] mb-8 max-w-lg mx-auto">
          Five AI video tools, all in one place. Pay per video, no subscription.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <button onClick={() => navigate('/services')} className="bg-[#4C6FFF] hover:bg-[#3d5ce0] text-white font-semibold px-7 py-3.5 rounded-xl transition-all">
            See all services
          </button>
          <button onClick={() => navigate('/create')} className="border border-white/15 hover:border-white/40 hover:bg-white/5 text-white font-semibold px-7 py-3.5 rounded-xl transition-all">
            Create a video →
          </button>
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

export default Updates;