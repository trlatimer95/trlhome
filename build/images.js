// Responsive image pipeline for photos under public/images.
//
// Originals stay as JPEG/PNG in public/ (max 1600 px on the long edge). This plugin
// generates WebP variants at several widths:
//   /images/portfolio/x/photo.jpg  ->  /images/portfolio/x/photo-480.webp, -800, -1200, -1600
//
// - `vite dev`: variants are generated on demand by a middleware and cached.
// - `vite build`: every variant is written into dist/images after the bundle.
// - `responsiveImg()` builds an <img> with srcset/sizes/width/height for html-includes.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { imageSize } from 'image-size';

const root = process.cwd();
const publicDir = path.join(root, 'public');
const cacheDir = path.join(root, 'node_modules', '.cache', 'trl-images');
export const WIDTHS = [480, 800, 1200, 1600];
const QUALITY = 78;
const SOURCE_RE = /\.(jpe?g|png)$/i;
const VARIANT_RE = /^(.*)-(\d+)\.webp$/;
// Logos and icons are not photos
const SKIP = /\/images\/logo\//;

const dimCache = new Map();
export function dimensions(urlPath) {
  if (dimCache.has(urlPath)) return dimCache.get(urlPath);
  const file = path.join(publicDir, urlPath);
  if (!fs.existsSync(file)) throw new Error(`[images] missing image: ${urlPath}`);
  const d = imageSize(fs.readFileSync(file));
  // EXIF orientation 5-8 means the stored pixels are rotated 90 degrees
  const rotated = d.orientation >= 5;
  const out = { width: rotated ? d.height : d.width, height: rotated ? d.width : d.height };
  dimCache.set(urlPath, out);
  return out;
}

function variantWidths(srcWidth) {
  const ws = WIDTHS.filter((w) => w < srcWidth);
  ws.push(Math.min(srcWidth, 1600));
  return ws;
}

export function variantsFor(urlPath) {
  if (SKIP.test(urlPath) || !SOURCE_RE.test(urlPath)) return [];
  const { width } = dimensions(urlPath);
  const base = urlPath.replace(SOURCE_RE, '');
  return variantWidths(width).map((w) => ({ url: `${base}-${w}.webp`, width: w }));
}

function esc(s = '') {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

// attrs: src, alt, class, sizes, loading, fetchpriority, lazy ("data" keeps the image in
// data-src/data-srcset until JS loads it), decoding
export function responsiveImg(attrs) {
  const src = attrs.src;
  if (!src) throw new Error('[images] @img needs src');
  const { width, height } = dimensions(src);
  const variants = variantsFor(src);
  const srcset = variants.map((v) => `${v.url} ${v.width}w`).join(', ');
  const dataPrefix = attrs.lazy === 'data' ? 'data-' : '';
  const parts = [
    `${dataPrefix}src="${esc(src)}"`,
    srcset ? `${dataPrefix}srcset="${esc(srcset)}"` : '',
    srcset ? `sizes="${esc(attrs.sizes || '100vw')}"` : '',
    `width="${width}"`,
    `height="${height}"`,
    `alt="${esc(attrs.alt ?? '')}"`,
    attrs.class ? `class="${esc(attrs.class)}"` : '',
    attrs.loading ? `loading="${esc(attrs.loading)}"` : '',
    attrs.fetchpriority ? `fetchpriority="${esc(attrs.fetchpriority)}"` : '',
    attrs.decoding ? `decoding="${esc(attrs.decoding)}"` : '',
  ].filter(Boolean);
  return `<img ${parts.join(' ')}>`;
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]
  );
}

// Generate (or reuse from cache) one WebP variant; returns the file bytes.
async function renderVariant(sourceFile, width) {
  const stat = fs.statSync(sourceFile);
  const rel = path.relative(publicDir, sourceFile).replace(/\\/g, '/');
  const key = `${rel.replace(SOURCE_RE, '')}-${width}.${stat.size}-${Math.floor(stat.mtimeMs)}.webp`;
  const cached = path.join(cacheDir, key);
  if (fs.existsSync(cached)) return fs.readFileSync(cached);
  const buf = await sharp(fs.readFileSync(sourceFile))
    .rotate()
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toBuffer();
  fs.mkdirSync(path.dirname(cached), { recursive: true });
  fs.writeFileSync(cached, buf);
  return buf;
}

function sourceForVariant(urlPath) {
  const m = urlPath.match(VARIANT_RE);
  if (!m) return null;
  for (const ext of ['.jpg', '.jpeg', '.png', '.JPG']) {
    const f = path.join(publicDir, m[1] + ext);
    if (fs.existsSync(f)) return { file: f, width: Number(m[2]) };
  }
  return null;
}

export default function images() {
  let outDir = 'dist';
  return {
    name: 'trl-images',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const urlPath = decodeURIComponent((req.url || '').split('?')[0]);
        if (!urlPath.startsWith('/images/') || !urlPath.endsWith('.webp')) return next();
        const src = sourceForVariant(urlPath);
        if (!src) return next();
        try {
          const buf = await renderVariant(src.file, src.width);
          res.setHeader('Content-Type', 'image/webp');
          res.setHeader('Cache-Control', 'no-cache');
          res.end(buf);
        } catch (err) {
          next(err);
        }
      });
    },
    async closeBundle() {
      const files = walk(path.join(publicDir, 'images')).filter(
        (f) => SOURCE_RE.test(f) && !SKIP.test(f.replace(/\\/g, '/'))
      );
      let count = 0;
      const queue = [...files];
      const worker = async () => {
        while (queue.length) {
          const f = queue.shift();
          const rel = '/' + path.relative(publicDir, f).replace(/\\/g, '/');
          for (const v of variantsFor(rel)) {
            const out = path.join(root, outDir, v.url);
            fs.mkdirSync(path.dirname(out), { recursive: true });
            fs.writeFileSync(out, await renderVariant(f, v.width));
            count++;
          }
        }
      };
      await Promise.all(Array.from({ length: 4 }, worker));
      console.log(`[trl-images] wrote ${count} WebP variants for ${files.length} images`);
    },
  };
}
