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
};

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
    { '@type': 'Question', name: 'How much does video translation cost?', acceptedAnswer: { '@type': 'Answer', text: 'Translation is a flat rate of KES 300 per video, regardless of length up to 50 MB.' } },
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
        waitUntil: 'networkidle0',
        timeout: 60000,
      });

      await new Promise((r) => setTimeout(r, 800));

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