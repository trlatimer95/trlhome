# TRL Home Solutions site audit (November 2026)

Scope: hosting review, Lighthouse on four pages (mobile and desktop), SEO, accessibility, mobile layout at 375px, and security headers. Audited the local production build (`npm run build`, served with `vite preview`) plus live-site header and DNS checks. No code was changed; this report is the only deliverable.

Lighthouse 12.8.2, headless Chrome, default mobile throttling (slow 4G, 4x CPU) and the desktop preset. Mobile numbers are the ones Google uses for Core Web Vitals, so treat them as the target.

## 0. Update: fixes implemented (same day)

Everything in sections 3 to 5 except the optional gtag deferral (P4) and the reviews markup (S2) was implemented on 2026-11-04 in the working tree. Lighthouse was re-run on the rebuilt `dist/` with the same settings:

| Page | Form factor | Perf (before → after) | A11y | Best Practices | SEO | LCP (before → after) |
|------|-------------|-----------------------|------|----------------|-----|----------------------|
| `/` | Mobile | 67 → 86 | 92 → 100 | 100 | 100 | 8.6 s → 4.1 s |
| `/` | Desktop | 89 → 95 | 92 → 100 | 100 | 100 | 2.2 s → 1.5 s |
| `/kitchens/` | Mobile | 66 → 90 | 96 → 100 | 100 | 100 | 10.7 s → 3.6 s |
| `/kitchens/` | Desktop | 91 → 100 | 95 → 100 | 100 | 100 | 1.9 s → 0.8 s |
| `/punchlists/` | Mobile | 67 → 95 | 96 → 100 | 100 | 100 | 7.7 s → 2.9 s |
| `/punchlists/` | Desktop | 89 → 98 | 95 → 100 | 100 | 100 | 2.1 s → 1.1 s |
| `/projects/` | Mobile | 67 → 80 | 95 → 100 | 100 | 100 | 9.2 s → 5.4 s |
| `/projects/` | Desktop | 87 → 94 | 94 → 100 | 100 | 100 | 2.4 s → 1.7 s |

What changed:

- `build/images.js` (new): Vite plugin that generates 480/800/1200/1600 px WebP variants for every photo under `public/images` (on demand in `vite dev`, into `dist/` on build, cached in `node_modules/.cache/trl-images`). `<!--@img src alt sizes loading fetchpriority lazy-->` renders a responsive `<img>` with `srcset`, `sizes`, `width` and `height`.
- `build/html-includes.js`: uses `@img` for hero, page-hero and all project cards; replaces every `<i class="fas fa-...">` with an inline SVG from `@fortawesome/fontawesome-free` at build time; project cards are `<article>`; the before/after handle is a `<button role="slider">`.
- `build/sitemap.js` (new): writes `dist/sitemap.xml` from the discovered pages with git-based `lastmod`. `public/sitemap.xml` removed.
- 27 source photos over 1600 px or 450 KB were recompressed in place (12.3 MB → 7.9 MB). Logo replaced by `TRLbutton-96.png`, `favicon-32.png`, `apple-touch-icon.png`, `icon-512.png`; the 792 KB original is removed.
- `src/partials/head.html`: Google Fonts and Font Awesome CDN links removed; CSP tightened (`style-src`/`font-src` self only, `form-action` added); proper favicon set and `theme-color`.
- `src/css/main.css`: Inter Variable self-hosted via `@fontsource-variable/inter`; `.fa-icon`; global `:focus-visible` ring; skip link; 24 px hit areas for hero dots, carousel dots and the slider handle; 40 px carousel arrows.
- `src/js/main.js`: menu toggle sets `aria-expanded` and swaps inline icons; slider handle supports arrow keys, Home and End with `aria-valuenow`; hero lazy slides copy `data-srcset`; carousel dots set `aria-current`.
- Header: skip link, logo `alt=""`, visible "Call" label on mobile, 48 px menu button. Footer: `h4` → `h3`. Reviews: dates `text-gray-400`. All pages wrapped in `<main id="main">`. `/projects/` has a visually hidden `<h2>`.
- Schema: service pages pass `image`; `Service` now has `serviceType`, `image`, provider `address` and `@id` linking to the home `HomeAndConstructionBusiness`; `areaServed` as `City` objects.
- `public/_headers` (new): CSP, HSTS, nosniff, referrer and permissions policies, one-year cache for `/assets/*`. Ignored by GitHub Pages; takes effect on Cloudflare Pages.

Still open: the Cloudflare Pages migration itself (dashboard and DNS steps in section 6), the "Licensed & Insured" wording check (S5), optional gtag deferral (P4) and `review` schema items (S2). `/projects/` mobile is at 80 because it loads 20 carousels; a further step would be lazy-loading non-active carousel slides.

## 1. Summary

The site is in good shape on SEO, best practices and most accessibility checks (100 / 100 / 92-96). The one real problem is **mobile performance**: every page scores in the mid-60s because hero images are 400-800 KB JPEGs served at full size, plus three render-blocking third-party requests (Google Fonts, Font Awesome, gtag). Largest Contentful Paint on throttled mobile is 8-11 seconds against a 2.5 s target. Fixing images alone should move mobile into the 85-95 range.

**Hosting:** the memory note is out of date. The domain's nameservers are GoDaddy's and the A records point directly at GitHub Pages. Cloudflare is not in the path at all, so there is no CDN caching, no custom headers and `Cache-Control: max-age=600` on everything including hashed assets. Recommendation: move to **Cloudflare Pages** (details in section 6).

### Top five findings

| # | Priority | Finding | Fix |
|---|----------|---------|-----|
| 1 | High | Portfolio JPEGs are 400-830 KB each, up to 2048 px wide, no WebP/AVIF, no `srcset`. Home page is 13.4 MB on desktop. | Add an image pipeline (`vite-imagetools` or a one-off `sharp` script): resize to 1600 max, emit WebP + JPEG fallback, add `srcset`/`sizes`. |
| 2 | High | Logo `TRLbutton.png` is 864x864 and 792 KB, used as favicon, header and footer logo on every page. | Export a 96x96 PNG (and 192/512 for icons), under 10 KB. Instant win on every page. |
| 3 | High | Hosting has no CDN, no security headers and 10-minute cache on hashed assets. | Move to Cloudflare Pages; add `public/_headers`. |
| 4 | Medium | Three render-blocking third-party requests (Google Fonts CSS, Font Awesome CSS, gtag) cost about 2.9 s on mobile. | Self-host Inter (2 weights), replace Font Awesome with inline SVG icons or a subset, keep gtag `async`. |
| 5 | Medium | Tap targets: hero dots and carousel dots are 10x10 px (31 failures on home, 72 at 375px on /projects/). Review dates fail contrast (3.24:1). | Give dots a 24 px hit area via padding; change `text-gray-500` to `text-gray-400` on review cards. |

## 2. Lighthouse scores

| Page | Form factor | Perf | A11y | Best Practices | SEO | FCP | LCP | TBT | CLS |
|------|-------------|------|------|----------------|-----|-----|-----|-----|-----|
| `/` | Mobile | 67 | 92 | 100 | 100 | 3.7 s | 8.6 s | 30 ms | 0 |
| `/` | Desktop | 89 | 92 | 100 | 100 | 0.9 s | 2.2 s | 0 ms | 0.022 |
| `/kitchens/` | Mobile | 66 | 96 | 100 | 100 | 3.7 s | 10.7 s | 10 ms | 0 |
| `/kitchens/` | Desktop | 91 | 95 | 100 | 100 | 0.9 s | 1.9 s | 0 ms | 0.001 |
| `/punchlists/` | Mobile | 67 | 96 | 100 | 100 | 3.6 s | 7.7 s | 20 ms | 0 |
| `/punchlists/` | Desktop | 89 | 95 | 100 | 100 | 0.9 s | 2.1 s | 0 ms | 0.011 |
| `/projects/` | Mobile | 67 | 95 | 100 | 100 | 3.6 s | 9.2 s | 30 ms | 0.032 |
| `/projects/` | Desktop | 87 | 94 | 100 | 100 | 0.9 s | 2.4 s | 0 ms | 0.013 |

`/projects/` weighs 15.8 MB on desktop (all 100 images) and is the one page where Lighthouse flags heading order (h1 straight to h3), see S4.

Full HTML reports are in the scratchpad folder `C:\Users\trlat\AppData\Local\Temp\claude\ecce5e9c8c11683a\c463b5de-6475-4261-a23d-02dd61ca329d\scratchpad\lh\` (one `*.report.html` per page and form factor). They are temporary; re-run with `npx lighthouse http://localhost:4173/ --preset=desktop` after serving `dist/` if needed.

Accessibility deductions are the same on every page: tap target size, the review-date contrast on the home page, and a redundant logo alt on pages where the header logo text is visible.

## 3. Performance findings

### High

**P1. Unoptimized portfolio images.** `public/images/portfolio/` holds 105 JPEGs totalling 30 MB. 11 are wider than 1600 px, the largest are 830 KB, and 23 are over 400 KB. No WebP or AVIF exists and no `<img>` has `srcset` or `sizes`, so a 375 px phone downloads the same 1600-2048 px file as a desktop. Lighthouse estimates 11.8 MB of savings on the home page and 1.6-1.9 MB on the service pages. The hero image is the LCP element on every page.

- Files: `public/images/portfolio/**`, `src/partials/page-hero.html`, `index.html` hero slides, `build/html-includes.js` (`renderSlide`, `renderProject`).
- Fix: add `vite-imagetools` (or run the existing sharp scratch script as `scripts/optimize-images.mjs`) to generate 480/800/1200/1600 widths in WebP with JPEG fallback. In `renderSlide`/`renderProject` emit `<picture>` or `srcset` + `sizes="(min-width:1024px) 33vw, (min-width:768px) 50vw, 100vw"`. For the hero, add `<link rel="preload" as="image" imagesrcset=...>` for the first slide. Target: hero under 150 KB on mobile, cards under 60 KB.

**P2. Logo PNG is 792 KB at 864x864.** `public/images/logo/TRLbutton.png` is loaded three times per page (favicon, header, footer) and rendered at 40-48 px. It is also flagged as an unsized image (CLS risk) because it has no `width`/`height`.

- Files: `public/images/logo/TRLbutton.png`, `src/partials/head.html` (favicon), `src/partials/header.html`, `src/partials/footer.html`.
- Fix: export `TRLbutton-96.png` (about 5 KB) for header/footer, `favicon-32.png`, `apple-touch-icon-180.png`, and an SVG if available. Add `width="48" height="48"` to the header and footer `<img>`.

### Medium

**P3. Render-blocking third-party CSS.** Google Fonts (6 weights of Inter) and the full Font Awesome 6.5.1 stylesheet from cdnjs block first paint. Lighthouse estimates 2.9 s of render delay on mobile and 18 KB of unused Font Awesome CSS. `font-display` on the Font Awesome webfonts also causes invisible-icon flashes.

- File: `src/partials/head.html` lines 44-50.
- Fix: self-host Inter 400/600/800 as WOFF2 in `public/fonts/` with `@font-face { font-display: swap }` in `src/css/main.css` and drop the Google Fonts link (also removes two DNS lookups and the Cloudflare/GitHub CSP entry). Replace Font Awesome with inline SVGs (the site uses about 30 icons) or a Font Awesome subset built with `fontawesome-subset`. Both are mechanical changes across partials and page HTML.

**P4. gtag.js is 70 KB of unused JavaScript and legacy polyfills.** It is already `async`, so it is not blocking, but it is the largest script on the page.

- File: `src/partials/head.html` lines 19-26.
- Fix: optional. Load gtag after `window.load` or on first interaction, or switch to Cloudflare Web Analytics (free, no cookies, 1 KB) once on Cloudflare Pages. Leave as is if GA4 reports matter to the user.

### Low

**P5. Hero slides and the projects carousel load every slide eagerly on `/`.** Home carries 62 images, 45 lazy. The hero correctly uses `data-src` for slides 2-5, but each project card carousel loads all slides with `loading="lazy"` which browsers still fetch once near the viewport.

- File: `build/html-includes.js` `renderSlide`.
- Fix: after P1 the cost drops enough to ignore. If still needed, keep non-active carousel slides in `data-src` and load on first `goTo`.

**P6. Forced reflow in `main.js`.** The smooth-scroll handler reads `header.offsetHeight` and `target.offsetTop` on click. Harmless; Lighthouse flags it. Could use `scroll-margin-top` (already in CSS) and plain anchor navigation instead of JavaScript scrolling.

## 4. SEO findings

All four pages score 100. What is in place and correct: unique `<title>` and `<meta description>` per page, Open Graph and Twitter cards with absolute image URLs, canonical URLs with trailing slash matching the sitemap, `robots.txt` pointing at `sitemap.xml`, `HomeAndConstructionBusiness` JSON-LD on the home page with `aggregateRating`, `Service` JSON-LD on each service page, `lang="en"`, a custom 404 with `noindex`, and `/kitchens` redirecting 301 to `/kitchens/`.

### Medium

**S1. Service schema is missing `image`, `serviceType` and `areaServed` as structured places.** Google's rich result eligibility for local services is improved by `areaServed` as `City` objects and an `image`. The provider block also lacks `address`, which Google uses to tie the service to the business.

- File: `src/partials/service-schema.html`.
- Fix: add `"image": "https://trlhomesolutions.com{{image}}"` (pass `image` from each page like `head` does), `"serviceType": "{{name}}"`, and expand the provider to include the same `address` block as the home page schema. Alternatively reference the home entity with `"@id": "https://trlhomesolutions.com/#business"` and give the home schema that `@id`.

**S2. `aggregateRating` without `review` items.** Google may flag self-serving reviews markup on a `LocalBusiness`. The 8 reviews are already in `src/partials/reviews.html`, so the data exists.

- File: `index.html` lines 4-37.
- Fix: either add a `review` array (author, datePublished, reviewRating, reviewBody) for a few reviews, or remove `aggregateRating` and rely on the Google Business Profile. Low risk either way; this is a policy nuance, not a penalty.

### Low

**S3. Sitemap `lastmod` is static (2026-10-08).** With the phone change on 2026-11-04 it is already stale.

- File: `public/sitemap.xml`.
- Fix: generate the sitemap at build time from the discovered pages in `vite.config.js` (same loop that builds `input`) with today's date, or at minimum update it on each content change.

**S4. Projects page heading outline skips h2.** `/projects/` goes h1 then h3 project titles, and Lighthouse's `heading-order` audit fails there (it passes on the other three pages). Footer columns use h4 after h3.

- Files: `projects/index.html`, `src/partials/footer.html`.
- Fix: add a visually hidden `<h2>All projects</h2>` above the grid; change footer `h4` to `h3` or `<p class="font-bold">`.

**S5. Copy claim to verify.** The hero and About section say "Licensed & Insured". The memory notes say not to add insurance details without confirmation. If TRL carries general liability (required for a WA contractor registration, so almost certainly true), keep it; otherwise soften to "Licensed in WA & ID".

- File: `index.html` lines 98 and 313.

## 5. Accessibility and mobile findings

Lighthouse accessibility is 92 on the home page and 95-96 elsewhere. Manual checks at 375 px: no horizontal scroll on any page, h1 renders at 30 px, smallest text is 11 px (carousel labels and BEFORE/AFTER badges, decorative), forms have proper `<label for>` on every field including the realtor form, focus rings exist on inputs via Tailwind `focus:ring-2`, and `prefers-reduced-motion` stops the hero carousel and scroll animations.

### Medium

**A1. Tap targets under 24 px.** Hero dots (10x10), project carousel dots (10x10), the mobile menu toggle (21x32) and carousel arrows (32x32 but adjacent). Home has 31 failures; `/projects/` has 72 at phone width.

- Files: `src/css/main.css` (`.hero-dot`, `.ba-carousel-dot`, `.ba-carousel-prev/next`), `src/partials/header.html` (`#mobile-toggle`).
- Fix: keep the 10 px visual but set `min-width:24px; min-height:24px` with the dot drawn via a `::before` pseudo-element, or add `padding:7px; background-clip:content-box`. Give `#mobile-toggle` `p-2` (44x44 total). Make carousel arrows 40 px.

**A2. Review date contrast 3.24:1.** `text-gray-500 text-xs` on the navy review cards (#6a7282 on #1b2335). Nine instances on the home page.

- File: `src/partials/reviews.html`.
- Fix: change the date `<span>` to `text-gray-400` (about 6:1).

**A3. Before/after slider handle is mouse and touch only.** `.ba-handle` is a `<div>` with no `tabindex`, `role` or keyboard handling, so keyboard users cannot compare photos. Screen readers also get two unrelated images with no indication they are a pair.

- Files: `build/html-includes.js` (`renderSlide`, `renderProject`), `src/js/main.js` (`initSlider`).
- Fix: render the handle as `<button class="ba-handle" role="slider" aria-label="Compare before and after" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50">` and add an arrow-key handler in `initSlider` that moves 5% per press. Wrap each pair in `<figure>` with a `<figcaption>` or `aria-label` naming the project.

### Low

**A4. Redundant alt on the header logo.** The header `<img alt="TRL Home Solutions">` sits next to visible text "TRL HOME SOLUTIONS", so screen readers hear it twice.

- File: `src/partials/header.html` line 7.
- Fix: `alt=""` on the header logo (the link text still names the site). Keep the footer alt as is.

**A5. No `<main>` landmark or skip link.** Every page has `<header>` and `<footer>` but content sits in bare `<section>`s. Keyboard users have to tab through 20+ nav links on every page.

- Files: every page `index.html`, `src/partials/header.html`.
- Fix: wrap page sections in `<main id="main">` and add `<a href="#main" class="sr-only focus:not-sr-only ...">Skip to content</a>` as the first child of `<body>`.

**A6. Mobile call button loses its text below 640 px.** The header call button shows only a phone icon at 375 px. It has `aria-label="Call now"`, so it passes, but a visible label converts better.

- File: `src/partials/header.html` line 36-39.
- Fix: optional. Show "Call" at all widths; there is room.

**A7. Hero caption is `aria-live="off"`.** Intentional (avoids chatter during auto-rotation), fine as is. Noted so nobody "fixes" it.

## 6. Hosting: current state and Cloudflare Pages recommendation

### What is actually running

| Check | Result |
|-------|--------|
| Nameservers | `ns53/ns54.domaincontrol.com` (GoDaddy) |
| A records | 185.199.108-111.153 (GitHub Pages) |
| Response headers | `Server: GitHub.com`, Fastly `X-Served-By`, no `cf-ray` |
| Deploy | `.github/workflows/deploy.yml` builds and deploys `dist/` on push to `main` |
| Custom domain | `public/CNAME` = `trlhomesolutions.com`; `www` 301s to apex; HTTP 301s to HTTPS |
| 404 | Custom `404.html` served with a real 404 status |
| Cache headers | `Cache-Control: max-age=600` on HTML, images and hashed `assets/*` alike |
| Security headers | None. CSP is a `<meta>` tag; no HSTS, no `X-Frame-Options`/`frame-ancestors`, no `X-Content-Type-Options`, no `Referrer-Policy`, no `Permissions-Policy` |
| Compression | gzip, HTTP/1.1 from this client (GitHub Pages does serve HTTP/2 to browsers) |

So the site is plain GitHub Pages through Fastly. The `site-architecture` memory note saying Cloudflare proxies the domain is wrong and should be corrected.

### What Cloudflare Pages changes

| Area | GitHub Pages (now) | Cloudflare Pages |
|------|--------------------|------------------|
| Build | Actions workflow, `npm ci && npm run build`, upload `dist` | Pages project connected to the GitHub repo. Build command `npm run build`, output directory `dist`, Node 20 via `NODE_VERSION` env var. The Actions workflow is deleted. |
| Custom domain | `public/CNAME` file | Set in Pages dashboard. `public/CNAME` can be deleted (harmless if left). DNS must move to Cloudflare, or a CNAME at GoDaddy pointing to `<project>.pages.dev` for `www` plus a `CNAME` flattening workaround for the apex, which GoDaddy does not support. Practical answer: move nameservers to Cloudflare (free). |
| 404 | `404.html` at root of `dist` | Same file, same behaviour. Pages serves `/404.html` with a 404 status automatically. |
| Trailing slash | `/kitchens` 301 to `/kitchens/` | Same by default. |
| Headers | None configurable | `public/_headers` file: CSP as a real header (lets `frame-ancestors` work and removes the meta tag), HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and `Cache-Control: public, max-age=31536000, immutable` for `/assets/*` and `/images/*`. |
| Redirects | None | `public/_redirects` if ever needed (old URLs, campaign links). |
| Preview deploys | None | Every branch and PR gets a `<branch>.<project>.pages.dev` URL. This is the biggest workflow gain given the site-refresh branch pattern already used. |
| CDN and speed | Fastly, 600 s cache, no Brotli from the origin | 300+ Cloudflare POPs, Brotli, HTTP/3, early hints, tiered cache. Images get edge-cached for a year with the headers above. |
| Analytics | GA4 only | Optional free Cloudflare Web Analytics with no cookie banner concern. |
| Cost | Free | Free (500 builds/month, unlimited bandwidth on the free plan). |

### Risks

- **DNS move is the only real risk.** Moving nameservers from GoDaddy to Cloudflare means copying every existing record (MX for `tyler@trlhomesolutions.com` email, any TXT/SPF/DKIM, verification records). Cloudflare's import scans and prefills them, but check email records before switching. Propagation takes up to 24-48 h; keep GitHub Pages live until the Cloudflare deployment is verified at `<project>.pages.dev`.
- **Email deliverability.** If mail is hosted at GoDaddy/Microsoft 365, the MX and SPF records must come across unchanged. Do this during business hours and send a test email after the switch.
- **Google Search Console** does not care which host serves the pages; nothing to redo. The sitemap URL is unchanged.
- **CSP in `_headers` must be tested** on the preview URL first. A too-strict header breaks Web3Forms, gtag or Google Fonts silently.
- **Rollback** is trivial: point nameservers back to GoDaddy (or the A records back to GitHub) and re-enable the workflow.

### Recommendation

Move to Cloudflare Pages. The site already lives in GitHub and builds in one command, so the migration is about an hour of work plus DNS propagation. The gains that matter for this business are preview URLs for reviewing copy changes before they go live, proper cache headers for the image-heavy portfolio, and real security headers. None of these are possible on GitHub Pages.

Do the image optimisation (P1, P2) either before or after; it is independent of hosting and is the larger performance win.

### Migration steps

1. In Cloudflare, add the site `trlhomesolutions.com` (Free plan). Review the imported DNS records against GoDaddy's DNS page, especially MX, TXT and any `_dmarc`/`_domainkey` records. Do not change nameservers yet.
2. Workers & Pages, Create, Pages, Connect to Git, pick `trlatimer95/trl-website`, branch `main`, framework preset Vite (or None), build command `npm run build`, output directory `dist`, environment variable `NODE_VERSION=20`. Deploy and verify `<project>.pages.dev`.
3. Add `public/_headers` (see below) and push; confirm headers on the preview deployment and that the contact form still submits.
4. Custom domains tab: add `trlhomesolutions.com` and `www.trlhomesolutions.com`. Cloudflare will create the CNAME records once the zone is active.
5. At GoDaddy, change nameservers to the two Cloudflare assigns. Wait for the zone to show Active.
6. Verify: `curl -sI https://trlhomesolutions.com/` shows `cf-ray` and the new headers; `www` redirects; `/kitchens` redirects to `/kitchens/`; a bogus URL returns the custom 404; send a test email to `tyler@trlhomesolutions.com`.
7. Delete `.github/workflows/deploy.yml`, optionally `public/CNAME`, and disable GitHub Pages in the repo settings. Update `C:\Users\trlat\.claude\projects\D--Dev-Projects-trl-website\memory\site-architecture.md`.
8. Set `www` redirect to apex in Cloudflare (Bulk Redirects or a Pages redirect), and enable HTTP/3, Brotli and Early Hints under Speed.

Suggested `public/_headers` (adjust CSP to match `src/partials/head.html`, then remove the meta tag):

```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com data:; img-src 'self' https: data:; connect-src 'self' https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com https://api.web3forms.com; frame-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self' https://api.web3forms.com
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/images/*
  Cache-Control: public, max-age=2592000
```

## 7. Suggested order of work

1. Logo PNG resize and `width`/`height` attributes (15 minutes, every page benefits).
2. Image pipeline for portfolio photos with WebP and `srcset` (half a day; biggest score change).
3. Cloudflare Pages migration with `_headers` (one hour plus DNS wait).
4. Tap targets, review-date contrast, slider keyboard support, skip link (one to two hours).
5. Self-host Inter and replace Font Awesome (two to three hours; optional but worth it for mobile).
6. Service schema and sitemap generation (one hour).

Re-run Lighthouse on mobile after steps 1-2; expect performance in the 85-95 range with LCP under 2.5 s on the desktop preset and under 4 s on throttled mobile.
