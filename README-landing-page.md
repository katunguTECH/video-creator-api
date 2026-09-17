# New homepage — setup notes

## 1. Files to drop in
- Replace `src/pages/Home.jsx` with the new `Home.jsx`.
- Copy the three files from the `demo/` folder into `public/demo/` in your
  React project (create the folder if it doesn't exist):
  - `public/demo/translate-original.mp4`
  - `public/demo/translate-chinese.mp4`
  - `public/demo/brand-video-demo.mp4`

  These are compressed, trimmed versions of the videos you shared (the
  brand video had its last few seconds — a real person's phone number and
  email — cut off before compression, since that shouldn't be public).

No new npm packages are needed. Fonts (Fraunces + Inter) load via a Google
Fonts `@import` inside the component, so nothing else to configure.

## 2. Before you publish this, please check
- **Permission to show client work.** Both demo videos are real outputs you
  made for real clients (a car-dealer brand video, and what looks like a
  WorldTV/diaspora promo translated to Chinese). I kept captions generic —
  no client names — but you should confirm you're OK using this footage
  publicly, or swap in a demo you're sure about.
- **Admin password.** `AdminDashboard.jsx` has `ADMIN_PASSWORD = 'Work@2026'`
  written directly in the React source, which means it ships to every
  visitor's browser and can be read via view-source or dev tools. This is
  a real vulnerability — anyone who looks can get into your admin panel.
  Fix: move the check to your server (`server.js`), store the password as
  an environment variable there, and have the frontend send the entered
  password to an API endpoint that returns a session token if it matches.
  I removed the public "Admin Dashboard" card from the homepage in the new
  version, but the route itself (`/admin`) is still reachable until the
  password check is moved server-side.
- **Real testimonials.** I didn't invent customer quotes — with 2 real
  users, fake reviews would do more harm than good if noticed. There's a
  `TODO` comment in the code marking where to add a genuine quote once you
  have one. Katungu1@gmail.com is your one paying customer — a quick
  WhatsApp asking "mind if I quote you on the site?" is worth doing.

## 3. What changed, and why
- **Brand name fixed**: hero said "VidAI Creator," now says "Katareel" to
  match your domain and support emails.
- **Led with proof, not claims**: the hero is now an actual before/after
  demo (English vs. Chinese dub) the visitor can toggle and play, instead
  of a generic headline and icon grid.
- **Translation is the flagship**: it's your only proven revenue source
  (Ksh 300 from your one sale), so it gets the biggest visual space and the
  first CTA. Other services are still there, just not competing for
  top billing until they've proven themselves too.
- **Brand Video got its own showcase** since you have a strong real sample
  — shown in a vertical phone frame, matching how it'll actually be viewed
  on WhatsApp/TikTok.
- **Admin Dashboard removed from public view** — see security note above.
