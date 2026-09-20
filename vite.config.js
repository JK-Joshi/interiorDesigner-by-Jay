import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { projects } from './src/data/projects.js';

const FALLBACK_SITE_URL = 'https://www.rustdesignstudio.example';

/**
 * Preloads the above-the-fold font files (Playfair Display variable + Manrope 400/500,
 * latin subset) once Vite has hashed them.
 *
 * The <link rel="preload"> tags are written by a tiny inline script, only on the first
 * page load of a session: on later full reloads Chrome serves the fonts from its
 * in-memory cache without using the preload, and logs "preloaded but not used".
 */
function preloadCriticalFonts() {
  const critical = /(playfair-display-latin-wght-normal|manrope-latin-(400|500)-normal)-[\w-]+\.woff2$/;
  return {
    name: 'rust:preload-critical-fonts',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!ctx.bundle) return html;
        const files = Object.keys(ctx.bundle)
          .filter((file) => critical.test(file))
          .map((file) => `/${file}`);
        if (!files.length) return html;
        const script = `(function(){try{if(sessionStorage.getItem('rust:fonts'))return;sessionStorage.setItem('rust:fonts','1')}catch(e){}${JSON.stringify(files)}.forEach(function(h){var l=document.createElement('link');l.rel='preload';l.as='font';l.type='font/woff2';l.crossOrigin='anonymous';l.href=h;document.head.appendChild(l)})})();`;
        return [{ tag: 'script', children: script, injectTo: 'head-prepend' }];
      },
    },
  };
}

/**
 * Writes dist/sitemap.xml and dist/robots.txt for the configured VITE_SITE_URL
 * (public/ keeps copies with the placeholder domain for local previews).
 */
function seoFiles(siteUrl) {
  let outDir = 'dist';
  return {
    name: 'rust:seo-files',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const base = siteUrl.replace(/\/$/, '');
      const today = new Date().toISOString().slice(0, 10);
      const pages = [
        { loc: '/', priority: '1.0', freq: 'weekly' },
        { loc: '/about', priority: '0.8', freq: 'monthly' },
        { loc: '/book', priority: '0.9', freq: 'monthly' },
        ...projects.map((p) => ({ loc: `/project/${p.slug}`, priority: '0.7', freq: 'monthly', image: p.cover, title: p.title })),
      ];
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${pages
  .map(
    (p) => `  <url>
    <loc>${base}${p.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.freq}</changefreq>
    <priority>${p.priority}</priority>${
      p.image
        ? `
    <image:image>
      <image:loc>${base}${p.image}</image:loc>
      <image:title>${p.title.replace(/&/g, '&amp;')}</image:title>
    </image:image>`
        : ''
    }
  </url>`,
  )
  .join('\n')}
</urlset>
`;
      const robots = `User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap.xml\n`;
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, 'sitemap.xml'), xml);
      fs.writeFileSync(path.join(outDir, 'robots.txt'), robots);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const siteUrl = env.VITE_SITE_URL || FALLBACK_SITE_URL;

  return {
    plugins: [react(), preloadCriticalFonts(), seoFiles(siteUrl)],
    server: { port: 5173, open: false },
    preview: { port: 4173 },
    build: {
      target: 'es2022',
      cssCodeSplit: true,
      sourcemap: false,
      // three.js is lazy-loaded with the hero scene; its core chunk is legitimately large.
      chunkSizeWarningLimit: 1100,
      rollupOptions: {
        onwarn(warning, warn) {
          // zod ships explanatory comments next to /*#__PURE__*/ markers; Rollup just drops them.
          if (warning.code === 'INVALID_ANNOTATION' && /node_modules/.test(warning.id || '')) return;
          warn(warning);
        },
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('/three/')) return 'three-core';
            if (
              id.includes('@react-three') ||
              id.includes('three-stdlib') ||
              id.includes('troika') ||
              id.includes('maath') ||
              id.includes('camera-controls') ||
              id.includes('stats')
            )
              return 'three-react';
            if (id.includes('/gsap/') || id.includes('@gsap')) return 'gsap';
            if (id.includes('react-hook-form') || id.includes('zod') || id.includes('@hookform')) return 'forms';
            if (
              id.includes('/react-dom/') ||
              id.includes('/react/') ||
              id.includes('/scheduler/') ||
              id.includes('react-router') ||
              id.includes('react-helmet-async')
            )
              return 'react-vendor';
            return undefined;
          },
        },
      },
    },
  };
});
