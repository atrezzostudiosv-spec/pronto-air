#!/usr/bin/env node
'use strict';
// Prueba temporal. No envía formularios ni modifica web pública.
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const cp=require('node:child_process'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const baseline=cp.execFileSync('git',['show','origin/main:contact-us.html'],{cwd:root,encoding:'utf8'});
const candidate=fs.readFileSync(path.join(root,'contact-us.html'),'utf8');
assert.equal(baseline.slice(baseline.indexOf('</head>')),candidate.slice(candidate.indexOf('</head>')),'Body, content or scripts have changed');
assert.match(candidate,/rel="preload" as="style" href="https:\/\/fonts.googleapis.com\/css2\?family=Inter/);
assert.match(candidate,/media="\(\s*max-width:\s*767px\s*\)" onload=/);
assert.match(candidate,/media="\(\s*min-width:\s*768px\s*\)"/);
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
const pageWithBase=s=>s.replace('<head>','<head><base href="/">');
const srv=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1'),target=decodeURIComponent(url.pathname);
 if(target==='/baseline'||target==='/candidate'){
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
  return res.end(pageWithBase(target==='/baseline'?baseline:candidate));
 }
 const f=path.resolve(root,target.replace(/^\/+/,''));if(!f.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 fs.readFile(f,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});res.end(e?'missing':b)});
});
async function measure(browser,origin,width,label,noJS=false){
 const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',javaScriptEnabled:!noJS});
 const p=await context.newPage(),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 await p.goto(origin+'/'+label,{waitUntil:'networkidle',timeout:45000});
 if(!noJS)await p.waitForFunction(()=>Array.from(document.querySelectorAll('link[as="style"]')).filter(x=>matchMedia(x.media||'all').matches).every(x=>x.rel==='stylesheet'),null,{timeout:15000});
 await p.evaluate(()=>document.fonts.ready);
 const state=await p.evaluate(()=>{
  const box=q=>{const n=document.querySelector(q);if(!n)return null;const r=n.getBoundingClientRect();return [r.x,r.y,r.width,r.height].map(x=>+x.toFixed(1))};
  const glyph=document.querySelector('.pronto-site-utility .fa-shield-halved');
  const related=[...document.querySelectorAll('link[href*="fonts.googleapis.com/css2"],link[href*="font-awesome/6.4.0/css"]')];
  return {header:box('header'),h1:box('h1'),heroCopy:box('main p'),form:box('form'),main:box('main'),
    fontLoaded:document.fonts.check('700 16px Inter'),
    iconFont:glyph?getComputedStyle(glyph,'::before').fontFamily:null,
    iconContent:glyph?getComputedStyle(glyph,'::before').content:null,
    overflow:document.documentElement.scrollWidth-innerWidth,
    styleLinks:related.map(x=>({rel:x.rel,media:x.media,match:matchMedia(x.media||'all').matches})),
    forms:[...document.forms].map(f=>({action:f.getAttribute('action'),method:f.method,fields:[...f.elements].filter(e=>e.name).map(e=>e.name)}))}
 });
 if(!noJS){assert.deepEqual(errors,[],'JS exceptions '+width+'/'+label);}
 assert(state.fontLoaded,'Inter failed '+width+'/'+label);
 assert.match(state.iconFont||'',/Font Awesome 6 Free/,'Font Awesome failed '+width+'/'+label);
 assert(state.iconContent && state.iconContent!=='none','Icon invisible '+width+'/'+label);
 assert(state.overflow<=2,'Horizontal overflow '+width+'/'+label);
 if(label==='candidate'){
  const active=state.styleLinks.filter(x=>x.match && x.rel==='stylesheet');
  assert.equal(active.length,2,'Expected 2 active CSS links at '+width);
  assert(active.every(x=>x.rel==='stylesheet'),'Expected loaded CSS at '+width);
  if(width>=768)assert(active.every(x=>x.media.includes('min-width')),'Desktop/tablet CSS must remain original blocking stylesheet');
  else if(!noJS)assert(active.every(x=>x.media.includes('max-width')),'Mobile styles should be nonblocking');
 }
 console.log('CONTACT_CSS_CHECK '+JSON.stringify({width,label,noJS,...state}));
 await context.close();return state;
}
(async()=>{
 await new Promise(resolve=>srv.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+srv.address().port;
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [375,768,1024,1440]){
   const a=await measure(browser,origin,width,'baseline');
   const b=await measure(browser,origin,width,'candidate');
   for(const field of ['header','h1','heroCopy','form','main']){
    assert.deepEqual(b[field]!==null,a[field]!==null,'Missing '+field);
    if(a[field])for(let n=0;n<4;n++)assert(Math.abs(a[field][n]-b[field][n])<=1,'Geometry change '+field+'/'+width+'/'+n);
   }
   assert.deepEqual(a.forms,b.forms,'Form markup changed '+width);
  }
  await measure(browser,origin,375,'candidate',true);
  console.log('CONTACT_MOBILE_CSS_PASS all 4 widths, desktop original media, no-JS fallback');
 }finally{await browser.close();srv.close();}
})().catch(e=>{console.error(e);srv.close();process.exitCode=1});
