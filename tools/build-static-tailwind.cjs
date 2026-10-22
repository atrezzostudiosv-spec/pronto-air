#!/usr/bin/env node
'use strict';
// Each existing page has its own Tailwind v3 theme. Build separate CSS bundles
// to preserve page-specific brand colours and utility behaviour exactly.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const pages = [
  'index.html',
  'residential-cooling.html',
  'residential-heating.html',
  'mobile-homes.html',
  'light-commercial.html',
  'contact-us.html',
  'service-agreement-faqs.html',
  'privacy-policy.html'
];
const baseline = path.join(root, '.tailwind-compare', 'baseline');
const tmp = path.join(root, '.tailwind-compare', 'config');
const output = path.join(root, 'assets', 'css');

fs.mkdirSync(baseline, { recursive: true });
fs.mkdirSync(tmp, { recursive: true });
fs.mkdirSync(output, { recursive: true });
const imagesLink = path.join(baseline, 'images');
if (!fs.existsSync(imagesLink)) fs.symlinkSync(path.join(root, 'images'), imagesLink, 'dir');

const cssInput = path.join(tmp, 'input.css');
fs.writeFileSync(cssInput, '@tailwind base;\n@tailwind components;\n@tailwind utilities;\n');

for (const page of pages) {
  const filename = path.join(root, page);
  const html = fs.readFileSync(filename, 'utf8');
  if (!html.includes('<meta name="robots" content="noindex, nofollow">')) {
    throw new Error('Unsafe SEO status; refusing build: ' + page);
  }
  const cdn = /<script\s+src=["']https:\/\/cdn\.tailwindcss\.com\/?["']\s*><\/script>/i;
  const cfg = /<script>\s*tailwind\.config\s*=\s*([\s\S]*?)<\/script>/i;
  const match = html.match(cfg);
  if (!cdn.test(html) || !match) throw new Error('Tailwind script or config missing: ' + page);
  fs.writeFileSync(path.join(baseline, page), html);
  let expression = match[1].trim().replace(/;\s*$/, '');
  const slug = page.replace(/\.html$/, '');
  const configPath = path.join(tmp, slug + '.config.cjs');
  fs.writeFileSync(configPath,
    'module.exports = Object.assign(' + expression +
    ', {content: [' + JSON.stringify('./' + page) + ']});\n'
  );
  const cssName = slug + '.min.css';
  const cssPath = path.join(output, cssName);
  execFileSync(path.join(root, 'node_modules', '.bin', 'tailwindcss'), [
    '-i', cssInput, '-o', cssPath, '-c', configPath, '--minify'
  ], {cwd: root, stdio: 'inherit'});
  // The Play CDN injects its generated CSS AFTER Font Awesome. Loading the
  // compiled stylesheet before Font Awesome changes icon line-heights and
  // shifts entire card grids. Preserve the original cascade intentionally.
  const fa = /<link\b[^>]*href=["']https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/font-awesome\/[^"']+["'][^>]*>/i;
  if (!fa.test(html)) throw new Error('Font Awesome stylesheet not found: ' + page);
  const result = html.replace(cdn, '')
    .replace(cfg, '<!-- Tailwind CSS compiled for production; original theme in tools/build-static-tailwind.cjs -->')
    .replace(fa, tag => tag + '\n    <link rel="stylesheet" href="assets/css/' + cssName + '">');
  if (result === html || result.includes('cdn.tailwindcss.com') || result.includes('tailwind.config =')) {
    throw new Error('Incomplete replacement: ' + page);
  }
  fs.writeFileSync(filename, result);
  console.log('Compiled', page, fs.statSync(cssPath).size, 'bytes');
}
console.log('Generated 8 page-specific static CSS files. Running regression checks next.');
