// Writes dist/sitemap.xml from the pages vite.config.js discovered.
// lastmod is the last git commit date of each page's index.html (falls back to today).
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const PRIORITY = { '/': '1.0', '/basement-remodeling/': '0.9', '/bathroom-remodeling/': '0.9', '/projects/': '0.7' };

function lastmod(page) {
  const file = page === '/' ? 'index.html' : path.join(page.slice(1, -1), 'index.html');
  try {
    const out = execSync(`git log -1 --format=%cs -- "${file}"`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(out)) return out;
  } catch {}
  return new Date().toISOString().slice(0, 10);
}

export default function sitemap({ site, pages }) {
  let outDir = 'dist';
  return {
    name: 'trl-sitemap',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      const urls = pages
        .map(
          (p) => `  <url>
    <loc>${site}${p}</loc>
    <lastmod>${lastmod(p)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${PRIORITY[p] || '0.8'}</priority>
  </url>`
        )
        .join('\n');
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, 'sitemap.xml'), xml);
      console.log(`[trl-sitemap] wrote sitemap.xml with ${pages.length} URLs`);
    },
  };
}
