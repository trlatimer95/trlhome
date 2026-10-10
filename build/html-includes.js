// Tiny build-time templating for the static multi-page site.
//
//   <!--@include name key="value" ...-->   inlines src/partials/name.html, replacing {{key}}
//   <!--@projects tags="a,b" limit="4"-->  renders portfolio cards from src/data/projects.json
//   <!--@list items="one|two|three"-->     renders a check-mark list
//
// Works in `vite dev` and `vite build` via transformIndexHtml.
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const partialsDir = path.join(root, 'src/partials');
const projectsFile = path.join(root, 'src/data/projects.json');

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

// Optional per-slide fields: caption (overlay label), fit: "contain" (letterbox portrait/panorama photos)
function renderSlide(slide, first) {
  const eager = first ? ' active' : '';
  const caption = slide.caption ? `\n                <span class="ba-carousel-label">${slide.caption}</span>` : '';
  if (slide.before) {
    return `
              <div class="ba-carousel-slide${eager}">
                <div class="ba-slider aspect-[4/3]">
                  <img src="${slide.after}" alt="${slide.afterAlt}" loading="lazy">
                  <div class="ba-after"><img src="${slide.before}" alt="${slide.beforeAlt}" loading="lazy"></div>
                  <div class="ba-handle" style="left:50%"></div>
                </div>${caption}
              </div>`;
  }
  const fit = slide.fit === 'contain' ? ' contain' : '';
  return `
              <div class="ba-carousel-slide${eager}">
                <div class="ba-showcase${fit} aspect-[4/3]">
                  <img src="${slide.after}" alt="${slide.afterAlt}" loading="lazy">
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
          <div class="relative">
            <div class="ba-slider aspect-[4/3]">
              <img src="${only.after}" alt="${only.afterAlt}" loading="lazy">
              <div class="ba-after"><img src="${only.before}" alt="${only.beforeAlt}" loading="lazy"></div>
              <div class="ba-handle" style="left:50%"></div>
            </div>${onlyCaption}
          </div>
          <div class="p-5">`;
  } else if (only) {
    // single photo, no carousel controls
    body = `
          <div class="relative">
            <div class="ba-showcase${only.fit === 'contain' ? ' contain' : ''} aspect-[4/3]">
              <img src="${only.after}" alt="${only.afterAlt}" loading="lazy">
            </div>${onlyCaption}
          </div>
          <div class="p-5">`;
  } else {
    body = `
          <div class="ba-carousel">
            <div class="ba-carousel-track aspect-[4/3]">
              <button class="ba-carousel-prev" aria-label="Previous"><i class="fas fa-chevron-left"></i></button>
              <button class="ba-carousel-next" aria-label="Next"><i class="fas fa-chevron-right"></i></button>
${p.slides.map((s, i) => renderSlide(s, i === 0)).join('')}
            </div>
            <div class="ba-carousel-dots px-5 pb-2">
${p.slides.map((_, i) => `              <button class="ba-carousel-dot${i === 0 ? ' active' : ''}" aria-label="Slide ${i + 1}"></button>`).join('\n')}
            </div>
          </div>
          <div class="p-5 pt-2">`;
  }
  return `
        <div class="project-card bg-white rounded-2xl overflow-hidden shadow-md border border-gray-100 card-hover" data-tags="${tags}">${body}
            <h3 class="text-lg font-bold text-gray-900">${p.title}</h3>
            <p class="text-gray-500 text-sm mt-1">${p.desc}</p>
          </div>
        </div>`;
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

export function processHtml(html) {
  for (let depth = 0; depth < 5; depth++) {
    const next = html.replace(/<!--@(include|projects|list)\s*([\s\S]*?)-->/g, (_, kind, rest) => {
      if (kind === 'include') {
        const [, name, attrStr] = rest.trim().match(/^([\w-]+)\s*([\s\S]*)$/);
        return renderPartial(name, parseAttrs(attrStr));
      }
      if (kind === 'projects') return renderProjects(parseAttrs(rest));
      return renderList(parseAttrs(rest));
    });
    if (next === html) break;
    html = next;
  }
  return html;
}

export default function htmlIncludes() {
  return {
    name: 'html-includes',
    transformIndexHtml: { order: 'pre', handler: processHtml },
    handleHotUpdate({ file, server }) {
      if (file.includes(`${path.sep}partials${path.sep}`) || file.endsWith('projects.json')) {
        server.ws.send({ type: 'full-reload' });
        return [];
      }
    },
  };
}
