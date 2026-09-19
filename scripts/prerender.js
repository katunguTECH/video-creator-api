// scripts/prerender.js — Custom prerender with direct head injection
const fs = require('fs');
const path = require('path');
const express = require('express');
const puppeteer = require('puppeteer');

const BASE_URL = 'https://www.katareel.com';

const PAGES = {
  '/': {
    title: 'Katareel — AI Video Generator, Translation & Branding Tools',
    description: 'Create videos from text or photos, translate to 37 languages, add music and captions, or brand with your logo. AI video tools from Katareel.',
    canonical: BASE_URL + '/',
    keepVideos: true,
    schemas: [],
  },
  '/services': {
    title: 'AI Video Services — Translation, Creation & Branding | Katareel',
    description: 'Five AI video tools in one place: text-to-video, photo-to-video, translation to 37 languages, brand videos, and music & captions. Pay per video.',
    canonical: BASE_URL + '/services',
    keepVideos: false,
    schemas: [],
  },
  '/services/translate': {
    title: 'AI Video Translation — Translate Videos to 37 Languages | Katareel',
    description: 'Dub any video into Swahili, French, Spanish, Chinese, Arabic, and 33 more languages with AI. Preserves voice tone and pacing. Flat rate KES 300.',
    canonical: BASE_URL + '/services/translate',
    keepVideos: false,
    schemas: ['service', 'faq'],
  },
  '/create': {
    title: 'AI Text to Video Generator — Create Videos from Prompts | Katareel',
    description: 'Describe a scene in plain text and get an AI-generated video in minutes. Text-to-video for marketing, social media, and storytelling. From KES 200.',
    canonical: BASE_URL + '/create',
    keepVideos: false,
    schemas: [],
  },
  '/photos-to-video': {
    title: 'AI Photo to Video Maker — Turn Photos into Videos | Katareel',
    description: 'Upload photos and let AI turn them into a moving video with narration. Perfect for real estate, products, weddings, and social media. From KES 300.',
    canonical: BASE_URL + '/photos-to-video',
    keepVideos: false,
    schemas: [],
  },
  '/translate': {
    title: 'AI Video Translation — Translate Videos to 37 Languages | Katareel',
    description: 'Dub any video into Swahili, French, Spanish, Chinese, Arabic, and 33 more languages with AI. Preserves voice tone and pacing. Flat rate KES 300.',
    canonical: BASE_URL + '/translate',
    keepVideos: false,
    schemas: [],
  },
  '/brand-video': {
    title: 'Brand Video Maker — Add Logo Intro, Voiceover & Outro | Katareel',
    description: 'Upload your video and logo. We add a professional intro card, AI voiceover, and closing contact card automatically. Ideal for SMEs. KES 250 flat rate.',
    canonical: BASE_URL + '/brand-video',
    keepVideos: false,
    schemas: [],
  },
  '/music-captions': {
    title: 'Add Music & Captions to Any Video — AI Caption Tool | Katareel',
    description: 'Add background music and on-screen captions to any video in minutes. Multiple caption styles, positioned exactly where you want. KES 200 flat rate.',
    canonical: BASE_URL + '/music-captions',
    keepVideos: false,
    schemas: [],
  },
  '/services/text-to-video': {
    title: 'AI Text to Video Generator — Create Videos from Prompts | Katareel',
    description: 'Describe a scene in plain text and get an AI-generated video in minutes. Text-to-video for marketing, social media, and storytelling. From KES 200.',
    canonical: BASE_URL + '/services/text-to-video',
    keepVideos: false,
    schemas: ['t2v_service', 't2v_faq'],
  },
  '/services/photos-to-video': {
    title: 'AI Photo to Video Maker — Turn Photos into Videos | Katareel',
    description: 'Upload photos and let AI turn them into a moving video with narration. Perfect for real estate, products, weddings, and social media. From KES 300.',
    canonical: BASE_URL + '/services/photos-to-video',
    keepVideos: false,
    schemas: ['p2v_service', 'p2v_faq'],
  },
  '/services/brand-video': {
    title: 'Brand Video Maker — Add Logo Intro, Voiceover & Outro | Katareel',
    description: 'Upload your video and logo. We add a professional intro card, AI voiceover, and closing contact card automatically. Ideal for SMEs. KES 250 flat rate.',
    canonical: BASE_URL + '/services/brand-video',
    keepVideos: false,
    schemas: ['bv_service', 'bv_faq'],
  },
  '/services/music-captions': {
    title: 'Add Music & Captions to Any Video — AI Caption Tool | Katareel',
    description: 'Add background music and on-screen captions to any video in minutes. Multiple caption styles, positioned exactly where you want. KES 200 flat rate.',
    canonical: BASE_URL + '/services/music-captions',
    keepVideos: false,
    schemas: ['mc_service', 'mc_faq'],
  },
  '/updates': {
    title: "What's New at Katareel — SEO & Site Improvements",
    description: 'A plain-English summary of recent improvements to Katareel: better Google visibility, dedicated service pages, faster loading, and clearer answers in search results.',
    canonical: BASE_URL + '/updates',
    keepVideos: false,
    schemas: [],
  },
  '/services/translate/swahili': {
    title: 'Translate Video to Swahili — AI Dubbing | Katareel',
    description: 'Dub any video into Swahili with AI. Preserves voice tone, pacing, and meaning. Flat rate KES 300. Popular for Kenyan and East African audiences.',
    canonical: BASE_URL + '/services/translate/swahili',
    keepVideos: false,
    schemas: ['sw_service', 'sw_faq'],
  },
  '/services/translate/french': {
    title: 'Translate Video to French — AI Dubbing | Katareel',
    description: 'Dub any video into French with AI. Natural tone, correct pacing. Flat rate KES 300. Ideal for West African, European, and Canadian audiences.',
    canonical: BASE_URL + '/services/translate/french',
    keepVideos: false,
    schemas: ['fr_service', 'fr_faq'],
  },
  '/services/photos-to-video/real-estate': {
    title: 'Real Estate Photo to Video — AI Listing Videos | Katareel',
    description: 'Turn property photos into a moving listing video in minutes. No videographer needed. Perfect for agents and landlords. From KES 300 per property.',
    canonical: BASE_URL + '/services/photos-to-video/real-estate',
    keepVideos: false,
    schemas: ['re_service', 're_faq'],
  },
  '/services/photos-to-video/wedding': {
    title: 'Wedding Photo to Video — AI Wedding Slideshow | Katareel',
    description: 'Turn wedding photos into a moving video with music and narration. Share with family, keep forever. From KES 300. No editing skills needed.',
    canonical: BASE_URL + '/services/photos-to-video/wedding',
    keepVideos: false,
    schemas: ['wd_service', 'wd_faq'],
  },
  '/services/brand-video/restaurants': {
    title: 'Restaurant Promo Video — Add Logo, Voiceover & Hours | Katareel',
    description: 'Turn your food footage into a branded restaurant promo with logo intro, AI voiceover, and closing contact card. Flat rate KES 250. Ready in minutes.',
    canonical: BASE_URL + '/services/brand-video/restaurants',
    keepVideos: false,
    schemas: ['rt_service', 'rt_faq'],
  },
  '/services/music-captions/tiktok': {
    title: 'Add Captions to TikTok Videos — AI Caption Tool | Katareel',
    description: 'Add burned-in captions to TikTok videos with multiple styles and positions. KES 200 flat rate. Works with trending-style text overlays.',
    canonical: BASE_URL + '/services/music-captions/tiktok',
    keepVideos: false,
    schemas: ['tt_service', 'tt_faq'],
  },
  '/blog': {
    title: 'Blog — AI Video Tips, Guides & Case Studies | Katareel',
    description: 'Practical guides on AI video translation, text-to-video, photo-to-video, brand videos, and captions for creators and small businesses.',
    canonical: BASE_URL + '/blog',
    keepVideos: false,
    schemas: [],
  },
  '/blog/translate-video-to-swahili': {
    title: 'How to Translate a Video to Swahili — Complete 2026 Guide | Katareel',
    description: 'A step-by-step guide to translating any video into Swahili with AI. Covers cost, accuracy, timing, and use cases for Kenyan and East African audiences.',
    canonical: BASE_URL + '/blog/translate-video-to-swahili',
    keepVideos: false,
    schemas: ['translate-video-to-swahili_article', 'translate-video-to-swahili_faq'],
  },
  '/blog/ai-video-translation-guide': {
    title: 'AI Video Translation Guide 2026 — Cost, Accuracy, Languages | Katareel',
    description: 'Everything you need to know about AI video translation in 2026: how it works, what it costs, which languages are supported, and when to use it.',
    canonical: BASE_URL + '/blog/ai-video-translation-guide',
    keepVideos: false,
    schemas: ['ai-video-translation-guide_article', 'ai-video-translation-guide_faq'],
  },
  '/blog/photos-to-video-real-estate': {
    title: 'Real Estate Photo to Video — AI Listing Videos | Katareel',
    description: 'How real estate agents use AI to turn property photos into walkthrough-style listing videos.',
    canonical: BASE_URL + '/blog/photos-to-video-real-estate',
    keepVideos: false,
    schemas: ['photos-to-video-real-estate_article', 'photos-to-video-real-estate_faq'],
  },
  '/blog/wedding-photo-video': {
    title: 'Wedding Photo to Video — AI Slideshow Maker | Katareel',
    description: 'Turn your wedding photos into a moving slideshow video with music and narration.',
    canonical: BASE_URL + '/blog/wedding-photo-video',
    keepVideos: false,
    schemas: ['wedding-photo-video_article', 'wedding-photo-video_faq'],
  },
  '/blog/restaurant-promo-video': {
    title: 'Restaurant Promo Video — Logo, Voiceover & Hours | Katareel',
    description: 'How restaurants can create branded promo videos from phone footage.',
    canonical: BASE_URL + '/blog/restaurant-promo-video',
    keepVideos: false,
    schemas: ['restaurant-promo-video_article', 'restaurant-promo-video_faq'],
  },
  '/blog/add-captions-tiktok': {
    title: 'How to Add Captions to TikTok Videos — Complete Guide | Katareel',
    description: 'Add burned-in captions to TikTok videos in minutes. Learn why captions boost watch time.',
    canonical: BASE_URL + '/blog/add-captions-tiktok',
    keepVideos: false,
    schemas: ['add-captions-tiktok_article', 'add-captions-tiktok_faq'],
  },
  '/blog/brand-video-logo-voiceover': {
    title: 'Add Logo Intro & Voiceover to Video — AI Brand Video | Katareel',
    description: 'Add a professional logo intro, AI voiceover, and closing contact card to any business video.',
    canonical: BASE_URL + '/blog/brand-video-logo-voiceover',
    keepVideos: false,
    schemas: ['brand-video-logo-voiceover_article', 'brand-video-logo-voiceover_faq'],
  },
  '/blog/text-to-video-vs-photo-to-video': {
    title: 'Text to Video vs Photo to Video — Full Comparison | Katareel',
    description: 'A practical comparison of AI text-to-video and AI photo-to-video. When to use each and how to choose.',
    canonical: BASE_URL + '/blog/text-to-video-vs-photo-to-video',
    keepVideos: false,
    schemas: ['text-to-video-vs-photo-to-video_article', 'text-to-video-vs-photo-to-video_faq'],
  },
  '/blog/ai-video-cost-guide': {
    title: 'AI Video Generator Pricing 2026 — Full Cost Breakdown | Katareel',
    description: 'A complete cost breakdown of AI video generation in 2026.',
    canonical: BASE_URL + '/blog/ai-video-cost-guide',
    keepVideos: false,
    schemas: ['ai-video-cost-guide_article', 'ai-video-cost-guide_faq'],
  },
  '/blog/ai-video-small-business-growth': {
    title: 'AI Video for Small Business — Complete 2026 Guide | Katareel',
    description: 'How small businesses worldwide use AI video to compete with larger brands.',
    canonical: BASE_URL + '/blog/ai-video-small-business-growth',
    keepVideos: false,
    schemas: ['ai-video-small-business-growth_article', 'ai-video-small-business-growth_faq'],
  },
  '/services/translate/spanish': {
    title: 'Translate Video to Spanish — AI Dubbing | Katareel',
    description: 'Dub any video into Spanish with AI. Natural tone, correct pacing. Flat rate $2.32 (KES 300). Ideal for Latin America, Spain, and US Hispanic audiences.',
    canonical: BASE_URL + '/services/translate/spanish',
    keepVideos: false,
    schemas: ['es_service', 'es_faq'],
  },
  '/services/translate/arabic': {
    title: 'Translate Video to Arabic — AI Dubbing | Katareel',
    description: 'Dub any video into Modern Standard Arabic with AI. Natural tone, correct pacing. Flat rate $2.32 (KES 300). Ideal for GCC, MENA, and global Arab audiences.',
    canonical: BASE_URL + '/services/translate/arabic',
    keepVideos: false,
    schemas: ['ar_service', 'ar_faq'],
  },
  '/services/photos-to-video/product-shots': {
    title: 'Product Photos to Video — AI E-commerce Video Maker | Katareel',
    description: 'Turn product photos into video for e-commerce, Instagram Shop, Amazon, Shopify, and social ads. No videographer needed. From $2.32 (KES 300).',
    canonical: BASE_URL + '/services/photos-to-video/product-shots',
    keepVideos: false,
    schemas: ['ps_service', 'ps_faq'],
  },
  '/services/brand-video/real-estate-agents': {
    title: 'Real Estate Agent Video — Intro, Listings & Promo | Katareel',
    description: 'Create branded real estate videos with logo intro, AI voiceover, and closing contact card. Flat rate $1.93 (KES 250). Perfect for agents and brokerages.',
    canonical: BASE_URL + '/services/brand-video/real-estate-agents',
    keepVideos: false,
    schemas: ['ra_service', 'ra_faq'],
  },
  '/services/music-captions/instagram-reels': {
    title: 'Add Captions to Instagram Reels — AI Caption Tool | Katareel',
    description: 'Add burned-in captions to Instagram Reels with multiple styles and positions. Flat rate $1.54 (KES 200). Works with trending audio and reel transitions.',
    canonical: BASE_URL + '/services/music-captions/instagram-reels',
    keepVideos: false,
    schemas: ['ir_service', 'ir_faq'],
  },
};



const BLOG_META = [
  { slug: 'translate-video-to-swahili', title: 'How to Translate a Video to Swahili (Step-by-Step)', description: 'A step-by-step guide to translating any video into Swahili with AI.', date: '2026-01-15', faqs: [{ q: 'Can I translate a video that is already in Swahili into another language?', a: 'Yes. Upload the Swahili video and choose any target language.' }, { q: 'Will the translated voice sound like the original speaker?', a: 'Not exactly. The AI voice matches gender and pacing but is not a clone.' }, { q: 'Can I use the Swahili video commercially?', a: 'Yes. Once paid for and downloaded, the video is yours for any commercial purpose.' }, { q: 'What if my video has no speech, only music?', a: 'Translation works best with videos that have clear speech.' }] },
  { slug: 'ai-video-translation-guide', title: 'AI Video Translation: The Complete 2026 Guide', description: 'Everything you need to know about AI video translation in 2026.', date: '2026-01-18', faqs: [{ q: 'How long does AI video translation take?', a: 'Videos under 5 minutes are typically translated in 60 to 180 seconds.' }, { q: 'Does AI translation preserve the original speakers voice?', a: 'No. The AI voice matches gender and pacing but is not a clone.' }, { q: 'What video formats can I upload?', a: 'MP4, AVI, MOV, and WEBM, up to 50 MB per video.' }, { q: 'Can I get a refund if the translation is poor?', a: 'Contact support@katareel.com within 24 hours of your order.' }] },
  { slug: 'photos-to-video-real-estate', title: 'Why Real Estate Agents Are Switching to Photo-to-Video Listings', description: 'How real estate agents use AI to turn property photos into walkthrough-style listing videos.', date: '2026-01-20', faqs: [{ q: 'How many photos do I need?', a: 'Between 1 and 10. For real estate, 5 to 8 photos work best.' }, { q: 'Can I add narration with the price and my contact?', a: 'Yes. Provide a script and choose a voice.' }, { q: 'How long is a typical listing video?', a: '5, 10, or 15 seconds depending on duration and photo count.' }, { q: 'Can I use the video on Property24 and BuyRentKenya?', a: 'Yes. The output is a standard MP4 file that uploads to any portal.' }] },
  { slug: 'wedding-photo-video', title: 'How to Make a Wedding Photo Slideshow Video in Minutes', description: 'Turn your wedding photos into a moving slideshow video with music and narration.', date: '2026-01-22', faqs: [{ q: 'Can I use my own music?', a: 'Yes. Upload an MP3, WAV, or M4A file that you have rights to use.' }, { q: 'How long is the final video?', a: 'Typically 5, 10, or 15 seconds.' }, { q: 'Can I share it on WhatsApp?', a: 'Yes. The output is a standard MP4 file.' }, { q: 'Will it look professional?', a: 'Yes. The AI adds natural motion, pacing, and transitions.' }] },
  { slug: 'restaurant-promo-video', title: 'Restaurant Promo Videos Without a Videographer', description: 'How restaurants create branded promo videos from phone footage.', date: '2026-01-25', faqs: [{ q: 'Do I need a logo?', a: 'Yes, upload your logo as a PNG with transparent background.' }, { q: 'Can I add my opening hours?', a: 'Yes. Enter your phone, address, and hours.' }, { q: 'What voice is used?', a: 'A natural, friendly female voice suited to restaurant promos.' }, { q: 'Can I post the same video on multiple platforms?', a: 'Yes. The output is a standard MP4.' }] },
  { slug: 'add-captions-tiktok', title: 'How to Add Captions to TikTok Videos (Without an Editor)', description: 'Add burned-in captions to TikTok videos in minutes.', date: '2026-01-28', faqs: [{ q: 'Can I use trending audio on TikTok with captions?', a: 'Yes. Upload your video with the trending audio already included.' }, { q: 'How many captions can I add?', a: 'Unlimited. Each caption displays for 1.5 seconds by default.' }, { q: 'Will captions affect the algorithm?', a: 'Positively. TikTok reads on-screen text as part of its ranking.' }, { q: 'How much does it cost?', a: 'A flat $1.54 (KES 200) per video. No subscription.' }] },
  { slug: 'brand-video-logo-voiceover', title: 'How to Add a Logo Intro and Voiceover to Any Video', description: 'Add a professional logo intro, AI voiceover, and closing contact card to any video.', date: '2026-02-01', faqs: [{ q: 'Can I use my own voiceover script?', a: 'Yes. Provide the text and the AI reads it.' }, { q: 'What if I do not have a logo?', a: 'You need a PNG image with transparent background.' }, { q: 'How long should the raw video be?', a: 'Anywhere from 10 seconds to several minutes.' }, { q: 'How much does it cost?', a: 'A flat $1.93 (KES 250) per video.' }] },
  { slug: 'text-to-video-vs-photo-to-video', title: 'Text to Video vs Photo to Video: Which Do You Need?', description: 'A practical comparison of AI text-to-video and AI photo-to-video.', date: '2026-02-05', faqs: [{ q: 'Which produces more realistic output?', a: 'Photo-to-video preserves realism because it starts from real photos.' }, { q: 'Can I use text-to-video for real estate?', a: 'Photo-to-video is far better for real estate.' }, { q: 'Which is faster?', a: 'Both finish in under 2 minutes for most projects.' }, { q: 'Do I need to pick one?', a: 'No. Many creators use both.' }] },
  { slug: 'ai-video-cost-guide', title: 'How Much Does AI Video Generation Cost in 2026?', description: 'A complete cost breakdown of AI video generation in 2026.', date: '2026-02-08', faqs: [{ q: 'Do you charge per minute or per video?', a: 'Per video. A 30-second video and a 5-minute video cost the same for most services.' }, { q: 'Are there any hidden fees?', a: 'No. The price shown at checkout is the price charged.' }, { q: 'Can I get a bulk discount?', a: 'Contact sales@katareel.com for volumes above 50 videos per month.' }, { q: 'What payment methods do you accept?', a: 'Card and M-Pesa through Pesapal.' }] },
  { slug: 'ai-video-small-business-growth', title: 'How Small Businesses Worldwide Are Using AI Video in 2026', description: 'How small businesses worldwide use AI video to compete with larger brands.', date: '2026-02-12', faqs: [{ q: 'Do I need special equipment?', a: 'No. A modern smartphone is more than enough.' }, { q: 'What payment methods do you accept?', a: 'Yes. All payments accept M-Pesa, Airtel Money, and cards.' }, { q: 'Do I need technical skills?', a: 'No. If you can upload a photo to WhatsApp, you can use Katareel.' }, { q: 'How fast is delivery?', a: 'Most videos finish in under 3 minutes.' }] }
];

const BLOG_SCHEMAS = {};
BLOG_META.forEach(function(post) {
  BLOG_SCHEMAS[post.slug + '_article'] = { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: post.title, description: post.description, datePublished: post.date, dateModified: post.date, author: { '@type': 'Organization', name: 'Katareel Team', url: BASE_URL + '/' }, publisher: { '@type': 'Organization', name: 'Katareel', logo: { '@type': 'ImageObject', url: BASE_URL + '/logo192.png' } }, mainEntityOfPage: { '@type': 'WebPage', '@id': BASE_URL + '/blog/' + post.slug } };
  BLOG_SCHEMAS[post.slug + '_faq'] = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: post.faqs.map(function(f) { return { '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }; }) };
});

const T2V_SERVICE_SCHEMA = { '@context': 'https://schema.org', '@type': 'Service', name: 'AI Text to Video Generation', serviceType: 'Text to Video Service', provider: { '@type': 'Organization', name: 'Katareel', url: BASE_URL + '/' }, areaServed: 'Worldwide', description: 'AI-powered text-to-video generation. Describe a scene and receive a generated video clip in minutes.', offers: { '@type': 'Offer', price: 200, priceCurrency: 'KES', url: BASE_URL + '/create' } };
const T2V_FAQ_SCHEMA = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [{ '@type': 'Question', name: 'How does AI text-to-video generation work?', acceptedAnswer: { '@type': 'Answer', text: 'You describe the scene in plain language, and our AI generates a video clip matching your prompt - no cameras, actors, or editing software required.' } }, { '@type': 'Question', name: 'How long can my video be?', acceptedAnswer: { '@type': 'Answer', text: 'Currently we support 5, 10, and 15-second clips.' } }, { '@type': 'Question', name: 'How much does it cost?', acceptedAnswer: { '@type': 'Answer', text: 'Starting at $1.54 (KES 200) for a 5-second clip. Prices scale with duration.' } }, { '@type': 'Question', name: 'Do I own the videos I create?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Once rendered and paid for, the video is yours to use commercially.' } }] };

const P2V_SERVICE_SCHEMA = { '@context': 'https://schema.org', '@type': 'Service', name: 'AI Photo to Video Maker', serviceType: 'Photo to Video Service', provider: { '@type': 'Organization', name: 'Katareel', url: BASE_URL + '/' }, areaServed: 'Worldwide', description: 'AI-powered photo-to-video generation. Turn still photos into moving videos with narration and transitions.', offers: { '@type': 'Offer', price: 300, priceCurrency: 'KES', url: BASE_URL + '/photos-to-video' } };
const P2V_FAQ_SCHEMA = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [{ '@type': 'Question', name: 'How does AI photo-to-video work?', acceptedAnswer: { '@type': 'Answer', text: 'Upload photos. Our AI analyzes them and generates natural motion, transitions, and pacing to turn stills into a moving video.' } }, { '@type': 'Question', name: 'Can I add a voiceover?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Provide a script and choose a male, female, or neutral voice.' } }, { '@type': 'Question', name: 'How much does it cost?', acceptedAnswer: { '@type': 'Answer', text: 'From KES 300 for a single 5-second clip with one photo.' } }, { '@type': 'Question', name: 'Do I own the resulting video?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Once paid for and downloaded, the video is yours for commercial use.' } }] };

const BV_SERVICE_SCHEMA = { '@context': 'https://schema.org', '@type': 'Service', name: 'Brand Video Maker', serviceType: 'Brand Video Service', provider: { '@type': 'Organization', name: 'Katareel', url: BASE_URL + '/' }, areaServed: 'Worldwide', description: 'Automatically add a logo intro, AI voiceover, and closing contact card to any business video.', offers: { '@type': 'Offer', price: 250, priceCurrency: 'KES', url: BASE_URL + '/brand-video' } };
const BV_FAQ_SCHEMA = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [{ '@type': 'Question', name: 'How does brand video generation work?', acceptedAnswer: { '@type': 'Answer', text: 'Upload your video and your logo. Our system adds an intro card, AI voiceover, and closing contact card automatically.' } }, { '@type': 'Question', name: 'Can I write my own voiceover script?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Provide your own script, or leave blank and we will auto-generate one.' } }, { '@type': 'Question', name: 'How much does it cost?', acceptedAnswer: { '@type': 'Answer', text: 'A flat KES 250 per video. No subscription.' } }, { '@type': 'Question', name: 'Can I use the final video commercially?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Once rendered and paid for, the branded video is yours to use.' } }] };

const MC_SERVICE_SCHEMA = { '@context': 'https://schema.org', '@type': 'Service', name: 'Music and Captions for Video', serviceType: 'Video Music and Captions Service', provider: { '@type': 'Organization', name: 'Katareel', url: BASE_URL + '/' }, areaServed: 'Worldwide', description: 'Add background music and professionally styled on-screen captions to any video.', offers: { '@type': 'Offer', price: 200, priceCurrency: 'KES', url: BASE_URL + '/music-captions' } };
const MC_FAQ_SCHEMA = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [{ '@type': 'Question', name: 'How does music and captions addition work?', acceptedAnswer: { '@type': 'Answer', text: 'Upload your video, optionally upload a music track, add caption text, and we mix and burn both into the video.' } }, { '@type': 'Question', name: 'What caption styles are available?', acceptedAnswer: { '@type': 'Answer', text: 'Subtle, bold, neon, classic, and karaoke. Each can be positioned at the top, center, or bottom.' } }, { '@type': 'Question', name: 'How much does it cost?', acceptedAnswer: { '@type': 'Answer', text: 'A flat $1.54 (KES 200) per video. No subscription.' } }, { '@type': 'Question', name: 'Will captions work on all platforms?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Captions are burned into the video so they display on any platform.' } }] };
const SW_SERVICE_SCHEMA = { '@context': 'https://schema.org', '@type': 'Service', name: 'Translate Your Video to Swahili', serviceType: 'Video Translation to Swahili', provider: { '@type': 'Organization', name: 'Katareel', url: BASE_URL + '/' }, areaServed: 'Worldwide', description: 'Dub any video into Swahili with AI.', url: BASE_URL + '/services/translate/swahili' };
const SW_FAQ_SCHEMA = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [{ '@type': 'Question', name: 'How accurate is AI Swahili translation?', acceptedAnswer: { '@type': 'Answer', text: 'Our AI produces natural-sounding Swahili that a native speaker will understand.' } }, { '@type': 'Question', name: 'Does it handle Kenyan Swahili slang?', acceptedAnswer: { '@type': 'Answer', text: 'It handles standard Swahili well. Very localised sheng may not translate perfectly.' } }, { '@type': 'Question', name: 'How long does Swahili translation take?', acceptedAnswer: { '@type': 'Answer', text: 'Videos under 5 minutes are typically translated in 60 to 180 seconds.' } }, { '@type': 'Question', name: 'How much does it cost?', acceptedAnswer: { '@type': 'Answer', text: 'A flat $2.32 (KES 300) per video, regardless of length up to 50 MB.' } }] };

const FR_SERVICE_SCHEMA = { '@context': 'https://schema.org', '@type': 'Service', name: 'Translate Your Video to French', serviceType: 'Video Translation to French', provider: { '@type': 'Organization', name: 'Katareel', url: BASE_URL + '/' }, areaServed: 'Worldwide', description: 'Dub any video into French with AI.', url: BASE_URL + '/services/translate/french' };
const FR_FAQ_SCHEMA = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [{ '@type': 'Question', name: 'Is the French translation European or Canadian?', acceptedAnswer: { '@type': 'Answer', text: 'Our default is standard European French, widely understood globally including in Canada and Africa.' } }, { '@type': 'Question', name: 'How accurate is the AI French?', acceptedAnswer: { '@type': 'Answer', text: 'Highly accurate for standard business and conversational content.' } }, { '@type': 'Question', name: 'How long does French translation take?', acceptedAnswer: { '@type': 'Answer', text: 'Most videos are translated in 60 to 180 seconds.' } }, { '@type': 'Question', name: 'How much does it cost?', acceptedAnswer: { '@type': 'Answer', text: 'A flat $2.32 (KES 300) per video, regardless of length up to 50 MB.' } }] };

const RE_SERVICE_SCHEMA = { '@context': 'https://schema.org', '@type': 'Service', name: 'Real Estate Photo to Video', serviceType: 'Real Estate Video Generation', provider: { '@type': 'Organization', name: 'Katareel', url: BASE_URL + '/' }, areaServed: 'Worldwide', description: 'Turn property photos into a moving listing video in minutes.', url: BASE_URL + '/services/photos-to-video/real-estate' };
const RE_FAQ_SCHEMA = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [{ '@type': 'Question', name: 'How many photos do I need?', acceptedAnswer: { '@type': 'Answer', text: 'Between 1 and 10 photos work best.' } }, { '@type': 'Question', name: 'Can I add narration?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Provide a script and choose male, female, or neutral voice.' } }, { '@type': 'Question', name: 'How long is the video?', acceptedAnswer: { '@type': 'Answer', text: 'Typically 5, 10, or 15 seconds depending on the number of photos and duration.' } }, { '@type': 'Question', name: 'How much does it cost?', acceptedAnswer: { '@type': 'Answer', text: 'From $2.32 (KES 300) for a single photo in a 5-second clip.' } }] };

const WD_SERVICE_SCHEMA = { '@context': 'https://schema.org', '@type': 'Service', name: 'Wedding Photo to Video', serviceType: 'Wedding Video Generation', provider: { '@type': 'Organization', name: 'Katareel', url: BASE_URL + '/' }, areaServed: 'Worldwide', description: 'Turn wedding photos into a moving video with music and narration.', url: BASE_URL + '/services/photos-to-video/wedding' };
const WD_FAQ_SCHEMA = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [{ '@type': 'Question', name: 'How many photos can I include?', acceptedAnswer: { '@type': 'Answer', text: 'Between 1 and 10 photos per video.' } }, { '@type': 'Question', name: 'Can I add music or narration?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Add background music and/or a voiceover script.' } }, { '@type': 'Question', name: 'How long is the video?', acceptedAnswer: { '@type': 'Answer', text: 'Typically 5, 10, or 15 seconds depending on the number of photos.' } }, { '@type': 'Question', name: 'How much does it cost?', acceptedAnswer: { '@type': 'Answer', text: 'From $2.32 (KES 300) per video.' } }] };

const RT_SERVICE_SCHEMA = { '@context': 'https://schema.org', '@type': 'Service', name: 'Restaurant Promo Video', serviceType: 'Restaurant Video Marketing', provider: { '@type': 'Organization', name: 'Katareel', url: BASE_URL + '/' }, areaServed: 'Worldwide', description: 'Turn your food footage into a branded restaurant promo.', url: BASE_URL + '/services/brand-video/restaurants' };
const RT_FAQ_SCHEMA = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [{ '@type': 'Question', name: 'What should I upload?', acceptedAnswer: { '@type': 'Answer', text: 'Any food photos or short video clips.' } }, { '@type': 'Question', name: 'How do I add my logo and hours?', acceptedAnswer: { '@type': 'Answer', text: 'Upload your logo as a PNG and enter your contact details.' } }, { '@type': 'Question', name: 'What voice is used for the narration?', acceptedAnswer: { '@type': 'Answer', text: 'A natural, friendly female voice suited to restaurant promos.' } }, { '@type': 'Question', name: 'How much does it cost?', acceptedAnswer: { '@type': 'Answer', text: 'A flat $1.93 (KES 250) per video.' } }] };

const TT_SERVICE_SCHEMA = { '@context': 'https://schema.org', '@type': 'Service', name: 'Add Captions to TikTok Videos', serviceType: 'TikTok Caption Service', provider: { '@type': 'Organization', name: 'Katareel', url: BASE_URL + '/' }, areaServed: 'Worldwide', description: 'Add burned-in captions to TikTok videos with multiple styles and positions.', url: BASE_URL + '/services/music-captions/tiktok' };
const TT_FAQ_SCHEMA = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [{ '@type': 'Question', name: 'What caption styles are available?', acceptedAnswer: { '@type': 'Answer', text: 'Subtle, bold, neon, classic, and karaoke styles.' } }, { '@type': 'Question', name: 'How many captions can I add?', acceptedAnswer: { '@type': 'Answer', text: 'Unlimited. Each caption displays for 1.5 seconds by default.' } }, { '@type': 'Question', name: 'Will the captions play on any device?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Captions are burned into the video itself.' } }, { '@type': 'Question', name: 'How much does it cost?', acceptedAnswer: { '@type': 'Answer', text: 'A flat $1.54 (KES 200) per video.' } }] };

const PROGRAMMATIC_META = [
  { key: 'es', name: 'Translate Your Video to Spanish', svcType: 'Video Translation to Spanish', url: '/services/translate/spanish', desc: 'Dub any video into Spanish with AI.', faqs: [
    { q: 'Is the Spanish translation Latin American or European?', a: 'Our default Spanish is neutral Latin American Spanish, widely understood in both Spain and Latin America.' },
    { q: 'How accurate is the AI Spanish?', a: 'Highly accurate for business, marketing, and conversational content.' },
    { q: 'How long does Spanish translation take?', a: 'Most videos are translated in 60 to 180 seconds.' },
    { q: 'How much does it cost?', a: 'A flat $2.32 (KES 300) per video.' }
  ]},
  { key: 'ar', name: 'Translate Your Video to Arabic', svcType: 'Video Translation to Arabic', url: '/services/translate/arabic', desc: 'Dub any video into Modern Standard Arabic with AI.', faqs: [
    { q: 'Is the Arabic translation Modern Standard or a dialect?', a: 'Our default is Modern Standard Arabic (MSA), understood across all Arab countries.' },
    { q: 'How accurate is the AI Arabic?', a: 'Highly accurate for business, marketing, and informational content.' },
    { q: 'How long does Arabic translation take?', a: 'Most videos are translated in 60 to 180 seconds.' },
    { q: 'How much does it cost?', a: 'A flat $2.32 (KES 300) per video.' }
  ]},
  { key: 'ps', name: 'Product Photos to Video', svcType: 'E-commerce Product Video', url: '/services/photos-to-video/product-shots', desc: 'Turn product photos into video for e-commerce.', faqs: [
    { q: 'What kind of product photos work best?', a: 'Clean, well-lit photos with the product as the subject.' },
    { q: 'How many photos can I use per product?', a: 'Between 1 and 10 photos.' },
    { q: 'Can I add a voiceover with price and features?', a: 'Yes. Provide a script with key selling points.' },
    { q: 'How much does it cost?', a: 'From $2.32 (KES 300) per video.' }
  ]},
  { key: 'ra', name: 'Real Estate Agent Brand Videos', svcType: 'Real Estate Video Branding', url: '/services/brand-video/real-estate-agents', desc: 'Create branded real estate videos with logo intro and AI voiceover.', faqs: [
    { q: 'What should I upload?', a: 'Any agent footage — listing walkthroughs, talking-head clips, or drone shots.' },
    { q: 'How do I add my logo and contact details?', a: 'Upload your logo as a PNG and enter your phone, email, and brokerage.' },
    { q: 'Can I write my own voiceover script?', a: 'Yes. Provide the text and the AI reads it.' },
    { q: 'How much does it cost?', a: 'A flat $1.93 (KES 250) per video.' }
  ]},
  { key: 'ir', name: 'Add Captions to Instagram Reels', svcType: 'Instagram Reel Captions', url: '/services/music-captions/instagram-reels', desc: 'Add burned-in captions to Instagram Reels.', faqs: [
    { q: 'What caption styles are available?', a: 'Subtle, bold, neon, classic, and karaoke styles.' },
    { q: 'Will captions work with trending audio?', a: 'Yes. Upload your reel with the trending audio already attached.' },
    { q: 'How many captions can I add?', a: 'Unlimited. Each caption displays for 1.5 seconds by default.' },
    { q: 'How much does it cost?', a: 'A flat $1.54 (KES 200) per video.' }
  ]}
];

const PROGRAMMATIC_SCHEMAS = {};
PROGRAMMATIC_META.forEach(function(p) {
  PROGRAMMATIC_SCHEMAS[p.key + '_service'] = { '@context': 'https://schema.org', '@type': 'Service', name: p.name, serviceType: p.svcType, provider: { '@type': 'Organization', name: 'Katareel', url: BASE_URL + '/' }, areaServed: 'Worldwide', description: p.desc, url: BASE_URL + p.url };
  PROGRAMMATIC_SCHEMAS[p.key + '_faq'] = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: p.faqs.map(function(f) { return { '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }; }) };
});
const BUILD_DIR = path.join(__dirname, '..', 'build');
const PORT = 45678;

const SERVICE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'AI Video Translation',
  serviceType: 'Video Translation Service',
  provider: { '@type': 'Organization', name: 'Katareel', url: BASE_URL + '/' },
  areaServed: 'Worldwide',
  description: 'AI-powered video translation into 37 languages. Preserves tone, pacing, and meaning while replacing the original voice track.',
  offers: { '@type': 'Offer', price: 300, priceCurrency: 'KES', url: BASE_URL + '/translate' },
};

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'How does AI video translation work?', acceptedAnswer: { '@type': 'Answer', text: 'We extract the audio from your video, transcribe it using AI speech recognition, translate the text into your chosen language, then generate natural-sounding voiceover audio in that language.' } },
    { '@type': 'Question', name: 'Which languages can I translate my video into?', acceptedAnswer: { '@type': 'Answer', text: 'We support 37 languages including Swahili, French, Spanish, Mandarin, Arabic, Hindi, Portuguese, German, Japanese, Korean, Italian, and more.' } },
    { '@type': 'Question', name: 'Will the translated voice sound like the original speaker?', acceptedAnswer: { '@type': 'Answer', text: 'The AI voice is generated in a natural tone that matches the gender and pacing of the original speech.' } },
    { '@type': 'Question', name: 'How long does video translation take?', acceptedAnswer: { '@type': 'Answer', text: 'Most videos under 5 minutes are translated in 60-180 seconds.' } },
    { '@type': 'Question', name: 'What video formats do you accept?', acceptedAnswer: { '@type': 'Answer', text: 'We accept MP4, AVI, MOV, and WEBM files up to 50 MB.' } },
    { '@type': 'Question', name: 'How much does video translation cost?', acceptedAnswer: { '@type': 'Answer', text: 'Translation is a flat rate of $2.32 (KES 300) per video, regardless of length up to 50 MB.' } },
    { '@type': 'Question', name: 'How do I pay?', acceptedAnswer: { '@type': 'Answer', text: 'Card or M-Pesa through Pesapal. Prices are shown in USD but billed in Kenyan Shillings.' } },
    { '@type': 'Question', name: 'Can I use the translated video commercially?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Once you have paid for the translation and downloaded the file, you own the output and can use it for any commercial purpose.' } },
  ],
};

function escapeAttr(s) {
  return String(s).replace(/"/g, '&quot;');
}

function rewriteHead(html, meta) {
  html = html.replace(/<title>[^<]*<\/title>/, '<title>' + meta.title + '</title>');

  html = html.replace(
    /<meta name="description" content="[^"]*"/,
    '<meta name="description" content="' + escapeAttr(meta.description) + '"'
  );

  html = html.replace(
    /<link rel="canonical" href="[^"]*"/,
    '<link rel="canonical" href="' + meta.canonical + '"'
  );

  html = html.replace(
    /<meta property="og:title" content="[^"]*"/,
    '<meta property="og:title" content="' + escapeAttr(meta.title) + '"'
  );

  html = html.replace(
    /<meta property="og:description" content="[^"]*"/,
    '<meta property="og:description" content="' + escapeAttr(meta.description) + '"'
  );

  html = html.replace(
    /<meta property="og:url" content="[^"]*"/,
    '<meta property="og:url" content="' + meta.canonical + '"'
  );

  html = html.replace(
    /<meta name="twitter:title" content="[^"]*"/,
    '<meta name="twitter:title" content="' + escapeAttr(meta.title) + '"'
  );

  html = html.replace(
    /<meta name="twitter:description" content="[^"]*"/,
    '<meta name="twitter:description" content="' + escapeAttr(meta.description) + '"'
  );

  if (!meta.keepVideos) {
    html = html.replace(
      /<script type="application\/ld\+json">[\s\S]*?<\/script>/g,
      function (match) {
        return match.indexOf('"VideoObject"') !== -1 ? '' : match;
      }
    );
  }

  if (meta.schemas && meta.schemas.length > 0) {
    var injected = '';
    meta.schemas.forEach(function (s) {
      var obj = null;
      if (s === 'service') obj = SERVICE_SCHEMA;
      if (s === 'faq') obj = FAQ_SCHEMA;
      if (s === 't2v_service') obj = T2V_SERVICE_SCHEMA;
      if (s === 't2v_faq') obj = T2V_FAQ_SCHEMA;
      if (s === 'p2v_service') obj = P2V_SERVICE_SCHEMA;
      if (s === 'p2v_faq') obj = P2V_FAQ_SCHEMA;
      if (s === 'bv_service') obj = BV_SERVICE_SCHEMA;
      if (s === 'bv_faq') obj = BV_FAQ_SCHEMA;
      if (s === 'mc_service') obj = MC_SERVICE_SCHEMA;
      if (s === 'mc_faq') obj = MC_FAQ_SCHEMA;
      if (s === 'sw_service') obj = SW_SERVICE_SCHEMA;
      if (s === 'sw_faq') obj = SW_FAQ_SCHEMA;
      if (s === 'fr_service') obj = FR_SERVICE_SCHEMA;
      if (s === 'fr_faq') obj = FR_FAQ_SCHEMA;
      if (s === 're_service') obj = RE_SERVICE_SCHEMA;
      if (s === 're_faq') obj = RE_FAQ_SCHEMA;
      if (s === 'wd_service') obj = WD_SERVICE_SCHEMA;
      if (s === 'wd_faq') obj = WD_FAQ_SCHEMA;
      if (s === 'rt_service') obj = RT_SERVICE_SCHEMA;
      if (s === 'rt_faq') obj = RT_FAQ_SCHEMA;
      if (s === 'tt_service') obj = TT_SERVICE_SCHEMA;
      if (s === 'tt_faq') obj = TT_FAQ_SCHEMA;
      if (BLOG_SCHEMAS[s]) obj = BLOG_SCHEMAS[s];
      if (PROGRAMMATIC_SCHEMAS[s]) obj = PROGRAMMATIC_SCHEMAS[s];
      if (obj) {
        injected += '<script type="application/ld+json">' + JSON.stringify(obj) + '</script>';
      }
    });
    html = html.replace('</head>', injected + '</head>');
  }

  return html;
}

async function prerender() {
  console.log('Starting prerender...');

  const server = express();
  server.use(express.static(BUILD_DIR));
  server.get('*', (req, res) => {
    res.sendFile(path.join(BUILD_DIR, 'index.html'));
  });

  const httpServer = await new Promise((resolve) => {
    const s = server.listen(PORT, () => resolve(s));
  });
  console.log('Local server on http://localhost:' + PORT);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const routes = Object.keys(PAGES);

  for (const route of routes) {
    try {
      console.log('  Rendering ' + route + '...');
      const page = await browser.newPage();
      await page.goto('http://localhost:' + PORT + route, {
        waitUntil: 'load',
        timeout: 45000,
      });

      await new Promise((r) => setTimeout(r, 2000));

      let html = await page.content();
      html = rewriteHead(html, PAGES[route]);

      const outDir =
        route === '/'
          ? BUILD_DIR
          : path.join(BUILD_DIR, route.replace(/^\//, ''));

      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, 'index.html'), html);
      console.log('  OK: ' + route);

      await page.close();
    } catch (err) {
      console.error('  FAIL ' + route + ':', err.message);
    }
  }

  await browser.close();
  httpServer.close();
  console.log('Prerender complete.');
}

prerender().catch((err) => {
  console.error('Prerender failed:', err);
  process.exit(1);
});