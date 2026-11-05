import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';
import htmlIncludes from './build/html-includes.js';
import images from './build/images.js';
import sitemap from './build/sitemap.js';

// Every index.html at the project root or one folder deep is a page
// (e.g. /basement-remodeling/index.html -> /basement-remodeling/).
const skip = new Set(['node_modules', 'dist', 'public', 'src', 'build', 'docs', 'social', '.git', '.github', '.claude', '.vs']);
const input = { main: path.resolve('index.html'), notFound: path.resolve('404.html') };
const pages = ['/'];
for (const entry of fs.readdirSync('.', { withFileTypes: true })) {
  if (entry.isDirectory() && !skip.has(entry.name) && fs.existsSync(path.join(entry.name, 'index.html'))) {
    input[entry.name] = path.resolve(entry.name, 'index.html');
    pages.push(`/${entry.name}/`);
  }
}

export default defineConfig({
  plugins: [htmlIncludes(), images(), sitemap({ site: 'https://trlhomesolutions.com', pages }), tailwindcss()],
  base: '/',
  build: {
    outDir: 'dist',
    rollupOptions: { input },
  },
});
