// src/data/toolPages.js — Configs for programmatic SEO tool pages
const TOOL_PAGES = [
  {
    service: 'translate',
    slug: 'swahili',
    accent: '#22D3B4',
    title: 'Translate Video to Swahili — AI Dubbing | Katareel',
    description: 'Dub any video into Swahili with AI. Preserves voice tone, pacing, and meaning. Flat rate $2.32 (KES 300). Popular for Kenyan and East African audiences.',
    h1: 'Translate Your Video to Swahili',
    intro: 'Reach Swahili-speaking audiences across Kenya, Tanzania, Uganda, and the DRC. Our AI translates your video into natural-sounding Swahili while keeping the original pacing and emotion intact.',
    useCases: [
      { emoji: '📣', title: 'Kenyan marketing campaigns', desc: 'Reach local audiences in their first language. Swahili translations build trust with Kenyan viewers far better than English-only content.' },
      { emoji: '📚', title: 'E-learning for East Africa', desc: 'Localise educational content for schools, universities, and NGOs across the Swahili-speaking region.' },
      { emoji: '🏥', title: 'Public health campaigns', desc: 'Deliver health and safety information in Swahili for maximum reach in Kenya and Tanzania.' },
      { emoji: '🎬', title: 'Creator content for East Africa', desc: 'Grow your YouTube, TikTok, or Instagram following in Kenya, Tanzania, and Uganda with native-language content.' },
    ],
    faqs: [
      { q: 'How accurate is AI Swahili translation?', a: 'Our AI produces natural-sounding Swahili that a native speaker will understand. We use modern translation models trained on East African dialects.' },
      { q: 'Does it handle Kenyan Swahili slang?', a: 'It handles standard Swahili well. Very localised sheng (Swahili-English slang) may not translate perfectly, but standard Swahili is excellent.' },
      { q: 'How long does Swahili translation take?', a: 'Videos under 5 minutes are typically translated in 60 to 180 seconds.' },
      { q: 'How much does it cost?', a: 'A flat $2.32 (KES 300) per video, regardless of length up to 50 MB. No subscription.' },
      { q: 'What about the voice?', a: 'The translated voice is a natural-sounding Swahili voice. It is not a clone of the original speaker, but it matches the tone and pacing.' },
    ],
  },
  {
    service: 'translate',
    slug: 'french',
    accent: '#22D3B4',
    title: 'Translate Video to French — AI Dubbing | Katareel',
    description: 'Dub any video into French with AI. Natural tone, correct pacing. Flat rate $2.32 (KES 300). Ideal for West African, European, and Canadian audiences.',
    h1: 'Translate Your Video to French',
    intro: 'Reach over 300 million French speakers worldwide — from West and Central Africa to Europe and Canada. Our AI translates your video into natural French while preserving the original tone and timing.',
    useCases: [
      { emoji: '🌍', title: 'Francophone Africa outreach', desc: 'Reach audiences in Senegal, Ivory Coast, Cameroon, DRC, and 20+ other French-speaking African countries.' },
      { emoji: '🇨🇦', title: 'Canadian market', desc: 'Bilingual distribution for Quebec and French-speaking Canadian audiences without reshooting.' },
      { emoji: '📚', title: 'International education', desc: 'Localise courses and training for French-speaking students and employees worldwide.' },
      { emoji: '💼', title: 'Business expansion', desc: 'Localise marketing and product demos for French-speaking markets without hiring voice talent.' },
    ],
    faqs: [
      { q: 'Is the French translation European or Canadian?', a: 'Our default is standard/European French, which is widely understood globally. It works well for Canada and Africa too.' },
      { q: 'How accurate is the AI French?', a: 'Highly accurate for standard business and conversational content. Technical jargon may occasionally need small edits.' },
      { q: 'How long does French translation take?', a: 'Most videos are translated in 60 to 180 seconds.' },
      { q: 'How much does it cost?', a: 'A flat $2.32 (KES 300) per video, regardless of length up to 50 MB.' },
      { q: 'Can I use the French video for commercial purposes?', a: 'Yes. Once paid for and downloaded, you own the output and can use it commercially.' },
    ],
  },
  {
    service: 'photos-to-video',
    slug: 'real-estate',
    accent: '#8B5CF6',
    title: 'Real Estate Photo to Video — AI Listing Videos | Katareel',
    description: 'Turn property photos into a moving listing video in minutes. No videographer needed. Perfect for agents and landlords. From $2.32 (KES 300) per property.',
    h1: 'Real Estate Photo to Video',
    intro: 'Turn your property photos into a walkthrough-style video for portals, social media, and client emails. No videographer, no site visit needed — just the photos you already have.',
    useCases: [
      { emoji: '🏠', title: 'Property portal listings', desc: 'Video listings get 4x more engagement than photo-only. Turn the same photos into a video for Property24, BuyRentKenya, and international portals.' },
      { emoji: '📱', title: 'Instagram and TikTok', desc: 'Post vertical property reels that stop scrollers. Add narration with key features, price, and contact details.' },
      { emoji: '💼', title: 'Client preview emails', desc: 'Send a moving video preview to serious buyers before they visit. Saves everyone time and shows properties in their best light.' },
      { emoji: '🌍', title: 'Diaspora and remote buyers', desc: 'Give overseas buyers a proper visual preview of the property before they fly in.' },
    ],
    faqs: [
      { q: 'How many photos do I need?', a: 'Between 1 and 10 photos work best. Exterior, main rooms, and outdoor spaces each add value.' },
      { q: 'Can I add narration?', a: 'Yes. Provide a script describing the property and choose male, female, or neutral voice. We generate the audio automatically.' },
      { q: 'How long is the video?', a: 'Typically 5, 10, or 15 seconds depending on the number of photos and your chosen duration.' },
      { q: 'How much does it cost?', a: 'From $2.32 (KES 300) for a single photo in a 5-second clip. Multi-photo videos scale proportionally.' },
      { q: 'Do I own the video?', a: 'Yes. Once paid for and downloaded, the video is yours to use on portals, social media, and client communications.' },
    ],
  },
  {
    service: 'photos-to-video',
    slug: 'wedding',
    accent: '#8B5CF6',
    title: 'Wedding Photo to Video — AI Wedding Slideshow | Katareel',
    description: 'Turn wedding photos into a moving video with music and narration. Share with family, keep forever. From $2.32 (KES 300). No editing skills needed.',
    h1: 'Wedding Photo to Video',
    intro: 'Turn your favourite wedding photos into a moving slideshow video with background music and optional narration. Share with family, post on social media, or keep as a permanent memory — in minutes.',
    useCases: [
      { emoji: '💒', title: 'Wedding memories', desc: 'Turn the best shots from your wedding gallery into a moving recap to share with guests and family.' },
      { emoji: '📸', title: 'Engagement announcements', desc: 'Create a moving announcement video from your engagement photos, ready for WhatsApp, Instagram, and Facebook.' },
      { emoji: '🎂', title: 'Anniversary gifts', desc: 'Turn years of photos into a surprise anniversary video with narration and music.' },
      { emoji: '👵', title: 'Family legacy videos', desc: 'Preserve family history and generational photos as a moving video for future generations.' },
    ],
    faqs: [
      { q: 'How many photos can I include?', a: 'Between 1 and 10 photos per video. Couples usually combine a mix of portraits and candid shots.' },
      { q: 'Can I add music or narration?', a: 'Yes. Add background music and/or a voiceover script. We mix both into the final video automatically.' },
      { q: 'How long is the video?', a: 'Typically 5, 10, or 15 seconds depending on the number of photos and your chosen duration.' },
      { q: 'How much does it cost?', a: 'From $2.32 (KES 300) per video. Pricing scales with number of photos and duration.' },
      { q: 'Can I share it on WhatsApp?', a: 'Yes. The finished video is delivered as an MP4 file that works on any platform.' },
    ],
  },
  {
    service: 'brand-video',
    slug: 'restaurants',
    accent: '#F5A623',
    title: 'Restaurant Promo Video — Add Logo, Voiceover & Hours | Katareel',
    description: 'Turn your food footage into a branded restaurant promo with logo intro, AI voiceover, and closing contact card. Flat rate $1.93 (KES 250). Ready in minutes.',
    h1: 'Restaurant Promo Video',
    intro: 'Turn your food photos or footage into a professional promo video with your logo, narration, and opening hours. Perfect for Instagram, TikTok, and your Google Business Profile.',
    useCases: [
      { emoji: '🍽️', title: 'Menu showcases', desc: 'Turn dish photos into a moving showcase with narration highlighting signature dishes.' },
      { emoji: '📱', title: 'Instagram and TikTok promos', desc: 'Post weekly specials and new menu items with branded videos that build recognition.' },
      { emoji: '📍', title: 'Google Business Profile', desc: 'Add a branded video to your Google listing so customers see food and branding before they arrive.' },
      { emoji: '🎉', title: 'Special events', desc: 'Promote Valentine menus, holiday specials, or weekend brunches with quick turnaround videos.' },
    ],
    faqs: [
      { q: 'What should I upload?', a: 'Any food photos or short video clips. Kitchen footage, plated dishes, or the ambience all work well.' },
      { q: 'How do I add my logo and hours?', a: 'Upload your logo as a PNG and enter your phone, email, and any other details. We place them on the intro and outro cards automatically.' },
      { q: 'What voice is used for the narration?', a: 'A natural, friendly female voice suited to restaurant promos. You can also write your own script.' },
      { q: 'How much does it cost?', a: 'A flat $1.93 (KES 250) per video. No subscription, no hidden fees.' },
      { q: 'Can I use the video on social media and Google?', a: 'Yes. Once generated, the branded video is yours to use anywhere - Instagram, TikTok, Google Business, or your website.' },
    ],
  },
  {
    service: 'music-captions',
    slug: 'tiktok',
    accent: '#EC4899',
    title: 'Add Captions to TikTok Videos — AI Caption Tool | Katareel',
    description: 'Add burned-in captions to TikTok videos with multiple styles and positions. $1.54 (KES 200) flat rate. Works with trending-style text overlays.',
    h1: 'Add Captions to TikTok Videos',
    intro: 'Burned-in captions keep viewers watching even when they scroll with sound off. Add styled captions to your TikTok videos in minutes - no editing software required.',
    useCases: [
      { emoji: '📈', title: 'Boost watch time', desc: 'Studies show captioned videos get 12% more watch time. Every extra second of retention boosts your algorithmic reach.' },
      { emoji: '🎵', title: 'Music-driven content', desc: 'When your video is set to trending audio, captions convey the message while the music carries the mood.' },
      { emoji: '👥', title: 'Accessibility', desc: 'Deaf and hard-of-hearing viewers can follow your content. Also helps non-native speakers understand faster.' },
      { emoji: '🔍', title: 'TikTok SEO', desc: 'TikTok reads on-screen text as part of its algorithm. Captions help your video appear in more search results.' },
    ],
    faqs: [
      { q: 'What caption styles are available?', a: 'Subtle, bold, neon, classic, and karaoke styles. Each can be positioned at top, centre, or bottom of the frame.' },
      { q: 'How many captions can I add?', a: 'Unlimited. Each caption displays for 1.5 seconds by default. Add as many as your video needs.' },
      { q: 'Will the captions play on any device?', a: 'Yes. Captions are burned into the video itself, so they display on every device and platform.' },
      { q: 'How much does it cost?', a: 'A flat $1.54 (KES 200) per video. No subscription.' },
      { q: 'How fast is it?', a: 'Most videos finish in under 3 minutes.' },
    ],
  },
  {
    service: 'translate',
    slug: 'spanish',
    accent: '#22D3B4',
    title: 'Translate Video to Spanish — AI Dubbing | Katareel',
    description: 'Dub any video into Spanish with AI. Natural tone, correct pacing. Flat rate $2.32 (KES 300). Ideal for Latin America, Spain, and US Hispanic audiences.',
    h1: 'Translate Your Video to Spanish',
    intro: 'Spanish is spoken by over 500 million people across Latin America, Spain, and the United States. Translating your videos opens access to one of the largest and fastest-growing content markets in the world.',
    useCases: [
      { emoji: '🌎', title: 'Latin American market', desc: 'Reach audiences across Mexico, Colombia, Argentina, Chile, Peru, and 15+ other Spanish-speaking countries.' },
      { emoji: '🇪🇸', title: 'Spain and Europe', desc: 'Localise content for Spanish audiences in Europe without reshooting or hiring voice talent.' },
      { emoji: '🇺🇸', title: 'US Hispanic audiences', desc: 'Serve the 60+ million Spanish speakers in the United States with content in their first language.' },
      { emoji: '📚', title: 'E-learning and education', desc: 'Localise courses and training for Spanish-speaking students and employees worldwide.' }
    ],
    faqs: [
      { q: 'Is the Spanish translation Latin American or European?', a: 'Our default Spanish is neutral Latin American Spanish, widely understood in both Spain and Latin America.' },
      { q: 'How accurate is the AI Spanish?', a: 'Highly accurate for business, marketing, and conversational content. Technical jargon may occasionally need small edits.' },
      { q: 'How long does Spanish translation take?', a: 'Most videos are translated in 60 to 180 seconds.' },
      { q: 'How much does it cost?', a: 'A flat $2.32 (KES 300) per video, regardless of length up to 50 MB.' },
      { q: 'Can I use the Spanish video commercially?', a: 'Yes. Once paid for and downloaded, you own the output and can use it commercially.' }
    ]
  },
  {
    service: 'translate',
    slug: 'arabic',
    accent: '#22D3B4',
    title: 'Translate Video to Arabic — AI Dubbing | Katareel',
    description: 'Dub any video into Modern Standard Arabic with AI. Natural tone, correct pacing. Flat rate $2.32 (KES 300). Ideal for GCC, MENA, and global Arab audiences.',
    h1: 'Translate Your Video to Arabic',
    intro: 'Arabic is spoken by over 400 million people across the Middle East and North Africa, and it is one of the fastest-growing digital content markets. Reach Gulf business audiences, MENA consumers, and the global Arab diaspora with native-language video.',
    useCases: [
      { emoji: '🕌', title: 'GCC business and marketing', desc: 'Reach high-value audiences in Saudi Arabia, UAE, Qatar, Kuwait, and Bahrain with content in Modern Standard Arabic.' },
      { emoji: '🌍', title: 'MENA regional content', desc: 'Localise for Egypt, Morocco, Jordan, Lebanon, Iraq, and 15+ other Arabic-speaking countries.' },
      { emoji: '📚', title: 'E-learning and training', desc: 'Localise educational content for Arabic-speaking students and corporate teams.' },
      { emoji: '🏛️', title: 'NGOs and government', desc: 'Deliver public service and civic content across the Arab world without expensive voice talent.' }
    ],
    faqs: [
      { q: 'Is the Arabic translation Modern Standard or a dialect?', a: 'Our default is Modern Standard Arabic (MSA), understood across all Arab countries. It is the formal standard used in news, business, and education.' },
      { q: 'How accurate is the AI Arabic?', a: 'Highly accurate for business, marketing, and informational content. Dialect-heavy or poetry content may need small edits.' },
      { q: 'How long does Arabic translation take?', a: 'Most videos are translated in 60 to 180 seconds.' },
      { q: 'How much does it cost?', a: 'A flat $2.32 (KES 300) per video, regardless of length up to 50 MB.' },
      { q: 'Can I use the Arabic video commercially?', a: 'Yes. Once paid for and downloaded, you own the output and can use it commercially.' }
    ]
  },
  {
    service: 'photos-to-video',
    slug: 'product-shots',
    accent: '#8B5CF6',
    title: 'Product Photos to Video — AI E-commerce Video Maker | Katareel',
    description: 'Turn product photos into video for e-commerce, Instagram Shop, Amazon, Shopify, and social ads. No videographer needed. From $2.32 (KES 300).',
    h1: 'Product Photos to Video',
    intro: 'Product listings with video convert 2 to 3 times better than photo-only. Turn your existing product photography into a moving, narrated video for Amazon, Shopify, Instagram Shop, and paid ads — without a videographer.',
    useCases: [
      { emoji: '🛒', title: 'E-commerce listings', desc: 'Add a video to every product on Amazon, Shopify, Etsy, or your own store. Boost conversion without new shoots.' },
      { emoji: '📱', title: 'Instagram and TikTok Shop', desc: 'Create short product reels from static photography, ready to post or run as ads.' },
      { emoji: '📢', title: 'Paid ad creatives', desc: 'Test multiple ad creatives quickly from the same product photos. Iterate without a production budget.' },
      { emoji: '🎁', title: 'Seasonal campaigns', desc: 'Generate holiday, Black Friday, and launch videos from your existing product photography in minutes.' }
    ],
    faqs: [
      { q: 'What kind of product photos work best?', a: 'Clean, well-lit photos with the product as the subject. Plain backgrounds and white backgrounds work best for e-commerce.' },
      { q: 'How many photos can I use per product?', a: 'Between 1 and 10 photos. For product videos, 3 to 6 photos covering different angles work best.' },
      { q: 'Can I add a voiceover with price and features?', a: 'Yes. Provide a script with key selling points and choose a voice. The AI generates the audio automatically.' },
      { q: 'How much does it cost?', a: 'From $2.32 (KES 300) for a single-photo 5-second clip. Multi-photo videos scale proportionally.' },
      { q: 'Can I use it on Amazon and Shopify?', a: 'Yes. The output is a standard MP4 file that uploads to any e-commerce platform.' }
    ]
  },
  {
    service: 'brand-video',
    slug: 'real-estate-agents',
    accent: '#F5A623',
    title: 'Real Estate Agent Video — Intro, Listings & Promo | Katareel',
    description: 'Create branded real estate videos with logo intro, AI voiceover, and closing contact card. Flat rate $1.93 (KES 250). Perfect for agents and brokerages.',
    h1: 'Real Estate Agent Brand Videos',
    intro: 'Real estate is a trust business. A polished, branded intro video makes you look established and professional. Upload footage, add your logo, and get a finished agent video with narration and closing contact details — in minutes.',
    useCases: [
      { emoji: '👤', title: 'Agent introduction videos', desc: 'Create a branded 30-second intro for your website, LinkedIn profile, and email signature.' },
      { emoji: '🏠', title: 'Listing tour promos', desc: 'Wrap property walkthroughs in branded packaging with narration and contact details.' },
      { emoji: '📅', title: 'Open house promos', desc: 'Promote upcoming open houses with a branded video posted the same morning.' },
      { emoji: '⭐', title: 'Client testimonial reels', desc: 'Wrap testimonial clips with your branding and closing call-to-action.' }
    ],
    faqs: [
      { q: 'What should I upload?', a: 'Any agent footage — listing walkthroughs, talking-head clips, or drone shots. Up to 50 MB per video.' },
      { q: 'How do I add my logo and contact details?', a: 'Upload your logo as a PNG and enter your phone, email, and brokerage. They appear on the intro and closing card automatically.' },
      { q: 'Can I write my own voiceover script?', a: 'Yes. Provide the text and the AI reads it. Or leave blank and the AI generates a script from your name and brokerage.' },
      { q: 'How much does it cost?', a: 'A flat $1.93 (KES 250) per video. No subscription.' },
      { q: 'Can I use the video on my website and social media?', a: 'Yes. Once generated, the branded video is yours to use anywhere — website, Instagram, LinkedIn, YouTube, or email.' }
    ]
  },
  {
    service: 'music-captions',
    slug: 'instagram-reels',
    accent: '#EC4899',
    title: 'Add Captions to Instagram Reels — AI Caption Tool | Katareel',
    description: 'Add burned-in captions to Instagram Reels with multiple styles and positions. Flat rate $1.54 (KES 200). Works with trending audio and reel transitions.',
    h1: 'Add Captions to Instagram Reels',
    intro: 'Instagram Reels with captions get up to 12 percent more watch time. Since 85 percent of reels are watched on mute, burned-in captions keep viewers engaged where auto-generated subtitles often fail.',
    useCases: [
      { emoji: '👗', title: 'Fashion and beauty', desc: 'Add trending-style captions to outfit reels, hauls, and product reviews without an editor.' },
      { emoji: '💪', title: 'Fitness and wellness', desc: 'Caption workout routines, form tips, and motivational reels for maximum reach.' },
      { emoji: '🍳', title: 'Food and recipes', desc: 'Add step-by-step captions to recipe reels that work even with sound off.' },
      { emoji: '📚', title: 'Education and tips', desc: 'Turn talking-head reels into accessible, searchable content with burned-in captions.' }
    ],
    faqs: [
      { q: 'What caption styles are available?', a: 'Subtle, bold, neon, classic, and karaoke styles. Each can be positioned at the top, centre, or bottom of the frame.' },
      { q: 'Will captions work with trending audio?', a: 'Yes. Upload your reel with the trending audio already attached, and captions layer on top.' },
      { q: 'How many captions can I add?', a: 'Unlimited. Each caption displays for 1.5 seconds by default.' },
      { q: 'How much does it cost?', a: 'A flat $1.54 (KES 200) per video. No subscription.' },
      { q: 'Can I reuse the same video on TikTok and YouTube Shorts?', a: 'Yes. Burned-in captions display identically on every platform.' }
    ]
  },];

export default TOOL_PAGES;