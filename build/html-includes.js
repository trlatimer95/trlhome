// Tiny build-time templating for the static multi-page site.
//
//   <!--@include name key="value" ...-->   inlines src/partials/name.html, replacing {{key}}
//   <!--@projects tags="a,b" limit="4"-->  renders portfolio cards from src/data/projects.json
//   <!--@list items="one|two|three"-->     renders a check-mark list
//   <!--@faq tags="home" title=".."-->      renders questions from src/data/faqs.json (+ FAQPage data)
//   <!--@img src="/images/x.jpg" alt=".." sizes=".." loading="lazy" lazy="data"-->
//                                          renders a responsive <img> (see build/images.js)
//   <i class="fas fa-name"></i>            is replaced by an inline SVG from Font Awesome Free
//
// Works in `vite dev` and `vite build` via transformIndexHtml.
import fs from 'node:fs';
import path from 'node:path';
import { responsiveImg } from './images.js';

const root = process.cwd();
const partialsDir = path.join(root, 'src/partials');
const projectsFile = path.join(root, 'src/data/projects.json');
const faqsFile = path.join(root, 'src/data/faqs.json');
const iconsDir = path.join(root, 'node_modules/@fortawesome/fontawesome-free/svgs');

const CARD_SIZES = '(min-width: 1024px) 400px, (min-width: 768px) 50vw, 100vw';

function parseAttrs(str = '') {
  const attrs = {};
  for (const m of str.matchAll(/(\w+)="([^"]*)"/g)) attrs[m[1]] = m[2];
  return attrs;
}

function renderPartial(name, attrs) {
  const file = path.join(partialsDir, `${name}.html`);
  if (!fs.existsSync(file)) throw new Error(`[html-includes] missing partial: ${name}`);
  return fs.readFileSync(file, 'utf8').replace(/\{\{(\w+)\}\}/g, (_, k) => attrs[k] ?? '');
}

const img = (src, alt, extra = {}) => responsiveImg({ src, alt, sizes: CARD_SIZES, loading: 'lazy', decoding: 'async', ...extra });

// Before/after pair. The handle is a real button so keyboard users can move it.
// Inactive carousel slides keep their images in data-src until shown (see main.js);
// they sit absolutely positioned inside the viewport, so loading="lazy" alone would fetch them.
function renderPair(slide, label, deferred = false) {
  const extra = deferred ? { lazy: 'data' } : {};
  return `
                <div class="ba-slider aspect-[4/3]">
                  ${img(slide.after, slide.afterAlt, extra)}
                  <div class="ba-after">${img(slide.before, slide.beforeAlt, extra)}</div>
                  <button type="button" class="ba-handle" style="left:50%" role="slider" aria-label="Compare before and after${label ? ': ' + label : ''}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50" aria-valuetext="50% after"></button>
                </div>`;
}

// Optional per-slide fields: caption (overlay label), fit: "contain" (letterbox portrait/panorama photos)
function renderSlide(slide, first, title) {
  const eager = first ? ' active' : '';
  const caption = slide.caption ? `\n                <span class="ba-carousel-label">${slide.caption}</span>` : '';
  if (slide.before) {
    return `
              <div class="ba-carousel-slide${eager}">${renderPair(slide, slide.caption || title, !first)}${caption}
              </div>`;
  }
  const fit = slide.fit === 'contain' ? ' contain' : '';
  return `
              <div class="ba-carousel-slide${eager}">
                <div class="ba-showcase${fit} aspect-[4/3]">
                  ${img(slide.after, slide.afterAlt, first ? {} : { lazy: 'data' })}
                </div>${caption}
              </div>`;
}

function renderProject(p) {
  const tags = p.tags.join(' ');
  const only = p.slides.length === 1 ? p.slides[0] : null;
  const onlyCaption = only && only.caption ? `\n            <span class="ba-carousel-label">${only.caption}</span>` : '';
  let body;
  if (only && only.before) {
    // single before/after pair
    body = `
          <div class="relative">${renderPair(only, only.caption || p.title)}${onlyCaption}
          </div>
          <div class="p-5">`;
  } else if (only) {
    // single photo, no carousel controls
    body = `
          <div class="relative">
            <div class="ba-showcase${only.fit === 'contain' ? ' contain' : ''} aspect-[4/3]">
              ${img(only.after, only.afterAlt)}
            </div>${onlyCaption}
          </div>
          <div class="p-5">`;
  } else {
    body = `
          <div class="ba-carousel" role="group" aria-roledescription="carousel" aria-label="${p.title} photos">
            <div class="ba-carousel-track aspect-[4/3]">
              <button type="button" class="ba-carousel-prev" aria-label="Previous photo"><i class="fas fa-chevron-left"></i></button>
              <button type="button" class="ba-carousel-next" aria-label="Next photo"><i class="fas fa-chevron-right"></i></button>
${p.slides.map((s, i) => renderSlide(s, i === 0, p.title)).join('')}
            </div>
            <div class="ba-carousel-dots px-5 pb-2" role="group" aria-label="Choose photo">
${p.slides.map((_, i) => `              <button type="button" class="ba-carousel-dot${i === 0 ? ' active' : ''}" aria-label="Photo ${i + 1} of ${p.slides.length}"${i === 0 ? ' aria-current="true"' : ''}></button>`).join('\n')}
            </div>
          </div>
          <div class="p-5 pt-2">`;
  }
  return `
        <article class="project-card bg-white rounded-2xl overflow-hidden shadow-md border border-gray-100 card-hover" data-tags="${tags}">${body}
            <h3 class="text-lg font-bold text-gray-900">${p.title}</h3>
            <p class="text-gray-500 text-sm mt-1">${p.desc}</p>
          </div>
        </article>`;
}

function renderProjects(attrs) {
  let projects = JSON.parse(fs.readFileSync(projectsFile, 'utf8'));
  if (attrs.ids) {
    const ids = attrs.ids.split(',').map((s) => s.trim());
    projects = ids.map((id) => projects.find((p) => p.id === id)).filter(Boolean);
  } else if (attrs.tags) {
    const tags = attrs.tags.split(',').map((s) => s.trim());
    projects = projects.filter((p) => p.tags.some((t) => tags.includes(t)));
  } else if (attrs.featured) {
    projects = projects.filter((p) => p.featured);
  }
  if (attrs.limit) projects = projects.slice(0, Number(attrs.limit));
  const cols = attrs.cols === '3' ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-2';
  return `<div class="grid ${cols} gap-8" data-project-grid>${projects.map(renderProject).join('\n')}
      </div>`;
}

function renderList(attrs) {
  const items = (attrs.items || '').split('|').map((s) => s.trim()).filter(Boolean);
  const cols = attrs.cols === '1' ? '' : 'sm:grid-cols-2';
  return `<ul class="grid ${cols} gap-x-8 gap-y-3">${items
    .map((i) => `
        <li class="flex items-start gap-3 text-gray-700"><i class="fas fa-circle-check text-primary-600 mt-1"></i><span>${i}</span></li>`)
    .join('')}
      </ul>`;
}

// ---- FAQs: <!--@faq tags="home" title="..."--> renders questions from src/data/faqs.json
// as an accordion (native <details>, no JS) plus FAQPage structured data.
const escHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function renderFaq(attrs) {
  const tags = (attrs.tags || '').split(',').map((s) => s.trim()).filter(Boolean);
  const faqs = JSON.parse(fs.readFileSync(faqsFile, 'utf8')).filter((f) => f.tags.some((t) => tags.includes(t)));
  if (!faqs.length) throw new Error(`[html-includes] no FAQs for tags: ${attrs.tags}`);
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
  const items = faqs
    .map((f) => `
        <details class="group bg-white border border-gray-200 rounded-xl">
          <summary class="flex items-center justify-between gap-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden px-6 py-5 font-bold text-gray-900">
            <span>${escHtml(f.q)}</span>
            <i class="fas fa-chevron-down text-primary-600 transition-transform group-open:rotate-180"></i>
          </summary>
          <p class="px-6 pb-5 text-gray-600 leading-relaxed">${escHtml(f.a)}</p>
        </details>`)
    .join('');
  return `<!-- ===== FAQ ===== -->
  <section id="faq" class="section-padding bg-gray-50">
    <div class="max-w-3xl mx-auto">
      <div class="text-center mb-10">
        <span class="text-primary-600 font-semibold text-sm uppercase tracking-wider">FAQ</span>
        <h2 class="text-3xl md:text-4xl font-extrabold text-gray-900 mt-2">${attrs.title || 'COMMON QUESTIONS'}</h2>
      </div>
      <div class="space-y-3">${items}
      </div>
    </div>
    <script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>
  </section>`;
}

// ---- Icons: <i class="fas fa-star text-xs"></i> -> inline <svg class="fa-icon text-xs">
const iconCache = new Map();
const STYLE_DIR = { fas: 'solid', far: 'regular', fab: 'brands' };
function iconSvg(style, name) {
  const key = `${style}/${name}`;
  if (iconCache.has(key)) return iconCache.get(key);
  const file = path.join(iconsDir, STYLE_DIR[style], `${name}.svg`);
  if (!fs.existsSync(file)) throw new Error(`[html-includes] unknown icon: ${style} fa-${name}`);
  const raw = fs.readFileSync(file, 'utf8');
  const viewBox = raw.match(/viewBox="([^"]+)"/)[1];
  const paths = raw.replace(/<!--[\s\S]*?-->/g, '').match(/<path[^>]*>/g).join('');
  iconCache.set(key, { viewBox, paths });
  return iconCache.get(key);
}

function replaceIcons(html) {
  return html.replace(
    /<i\s+class="(fas|far|fab)\s+fa-([a-z0-9-]+)([^"]*)"([^>]*)><\/i>/g,
    (_, style, name, extraClasses, extraAttrs) => {
      const { viewBox, paths } = iconSvg(style, name);
      const cls = `fa-icon${extraClasses ? ' ' + extraClasses.trim() : ''}`;
      return `<svg class="${cls}" viewBox="${viewBox}" aria-hidden="true" focusable="false"${extraAttrs}>${paths}</svg>`;
    }
  );
}

export function processHtml(html) {
  for (let depth = 0; depth < 5; depth++) {
    const next = html.replace(/<!--@(include|projects|list|img|faq)\s*([\s\S]*?)-->/g, (_, kind, rest) => {
      if (kind === 'include') {
        const [, name, attrStr] = rest.trim().match(/^([\w-]+)\s*([\s\S]*)$/);
        return renderPartial(name, parseAttrs(attrStr));
      }
      if (kind === 'projects') return renderProjects(parseAttrs(rest));
      if (kind === 'img') return responsiveImg(parseAttrs(rest));
      if (kind === 'faq') return renderFaq(parseAttrs(rest));
      return renderList(parseAttrs(rest));
    });
    if (next === html) break;
    html = next;
  }
  return replaceIcons(html);
}

export default function htmlIncludes() {
  return {
    name: 'html-includes',
    transformIndexHtml: { order: 'pre', handler: processHtml },
    handleHotUpdate({ file, server }) {
      if (file.includes(`${path.sep}partials${path.sep}`) || file.endsWith('projects.json') || file.endsWith('faqs.json')) {
        server.ws.send({ type: 'full-reload' });
        return [];
      }
    },
  };
}
