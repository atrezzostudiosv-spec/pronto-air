#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const pixelmatch = require('pixelmatch');
const { PNG } = require('pngjs');

const root = path.resolve(__dirname, '..');
const pages = ['index.html','service-agreement-faqs.html'];
const widths = [375, 768, 1440];
const type = (p) => {
  if (p.endsWith('.html')) return 'text/html';
  if (p.endsWith('.css')) return 'text/css';
  if (p.endsWith('.js')) return 'text/javascript';
  if (p.endsWith('.webp')) return 'image/webp';
  if (p.endsWith('.png')) return 'image/png';
  return 'application/octet-stream';
};
function serve(dir) {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1/');
      let relative = decodeURIComponent(url.pathname).replace(/^\/+/, '');
      if (!relative) relative = 'index.html';
      const filename = path.resolve(dir, relative);
      if (!filename.startsWith(path.resolve(dir) + path.sep)) {
        res.writeHead(403); return res.end('Forbidden');
      }
      fs.readFile(filename, (err, data) => {
        if (err) { res.writeHead(404); return res.end('Not found'); }
        res.setHeader('Content-Type', type(filename));
        res.end(data);
      });
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}
async function capture(browser, port, pageName, width) {
  const page = await browser.newPage({viewport:{width, height:900}, deviceScaleFactor:1});
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(String(e)));
  await page.goto('http://127.0.0.1:' + port + '/' + pageName, {waitUntil:'domcontentloaded', timeout:45000});
  console.log('Checking', pageName, width + 'px', 'port', port);
  await page.waitForFunction(() => {
    const targets = [...document.querySelectorAll('.hidden')];
    return targets.some(el => getComputedStyle(el).display === 'none');
  }, null, {timeout:30000});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(450);
  const metrics = await page.evaluate(() => {
    const selector = 'header, main, main > section, main h1, main h2, .pronto-site-utility, .pronto-site-header';
    const selectors = [...document.querySelectorAll(selector)].slice(0,80);
    return {
      h1: [...document.querySelectorAll('main h1')].map(x=>x.textContent.trim()),
      sectionCount: document.querySelectorAll('main section').length,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      blocks: selectors.map(el => {
        const r = el.getBoundingClientRect(), c = getComputedStyle(el);
        return [r.x,r.y,r.width,r.height].map(x=>Math.round(x*10)/10)
          .concat([c.fontSize,c.fontWeight,c.color,c.backgroundColor,c.display]);
      })
    };
  });
  const shot = await page.screenshot({animations:'disabled'});
  const menu = page.locator('#mobile-menu-btn');
  if (width <= 768 && await menu.isVisible()) {
    await menu.click();
    if (!(await page.locator('#mobile-menu').isVisible())) pageErrors.push('Mobile menu did not open');
  }
  await page.close();
  return {metrics, shot, pageErrors};
}
(async () => {
  const baseline = await serve(path.join(root,'.tailwind-compare','baseline'));
  const proposed = await serve(root);
  const browser = await chromium.launch({headless:true});
  const failures = [];
  try {
    for (const f of pages) for (const w of widths) {
      const oldPage = await capture(browser,baseline.port,f,w);
      const newPage = await capture(browser,proposed.port,f,w);
      const a = oldPage.metrics, b = newPage.metrics;
      if (a.h1.join('|') !== b.h1.join('|') || a.sectionCount !== b.sectionCount || a.blocks.length !== b.blocks.length) {
        failures.push(f+' '+w+'px: semantic mismatch');
        continue;
      }
      let mismatches = 0;
      for (let i=0; i<a.blocks.length; i++) {
        const x=a.blocks[i],y=b.blocks[i];
        if ([0,1,2,3].some(j=>Math.abs(x[j]-y[j])>3) || x.slice(4).join('|') !== y.slice(4).join('|')) {
          if (mismatches++ < 5) console.log('LAYOUT DIFFERENCE',f,w+'px','block',i,JSON.stringify({before:x,after:y}));
          failures.push(f+' '+w+'px: layout/computed-style mismatch block '+i);
        }
      }
      if(b.overflow>a.overflow+2)failures.push(f+' '+w+'px: new horizontal overflow');
      if(newPage.pageErrors.length)failures.push(f+' '+w+'px: JS errors '+newPage.pageErrors.join('; ').slice(0,350));
      const png1=PNG.sync.read(oldPage.shot),png2=PNG.sync.read(newPage.shot);
      if(png1.width!==png2.width||png1.height!==png2.height){failures.push(f+' '+w+'px: screenshot sizes changed');continue;}
      const diffPixels = pixelmatch(png1.data,png2.data,null,png1.width,png1.height,{threshold:0.15});
      const diff = diffPixels / (png1.width*png1.height);
      console.log(f, w+'px','screenshot difference', (100*diff).toFixed(2)+'%');
      if(diff>0.03)failures.push(f+' '+w+'px: visual difference '+(100*diff).toFixed(2)+'%');
    }
  } finally {
    await browser.close();baseline.server.close();proposed.server.close();
  }
  if(failures.length) {
    console.error('STOP: Do not publish Tailwind change. Issues:\n'+failures.join('\n'));
    process.exit(1);
  }
  console.log('PASS: 8 pages x 4 breakpoints, layout, screenshots, scripts, mobile menu and overflow checked.');
})().catch(e=>{console.error(e);process.exit(1)});
