#!/usr/bin/env node
'use strict';
// A/B solo lectura. No modifica HTML publicado ni comunica datos de formularios.
const fs=require('node:fs'), http=require('node:http'), path=require('node:path');
const assert=require('node:assert/strict');
const {launch}=require('chrome-launcher');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const page=fs.readFileSync(path.join(root,'contact-us.html'),'utf8');
const font='<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">';
const icon='<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">';
assert(page.includes(font)&&page.includes(icon),'Contact links changed; recheck actual source.');
const asyncLink=(markup)=>{
 const href=markup.match(/href="([^"]+)"/)[1];
 return '<link rel="preload" as="style" href="'+href+'" onload="this.onload=null;this.rel=\'stylesheet\'"><noscript>'+markup+'</noscript>';
};
const variants={
 baseline:page,
 nonblocking:page.replace(font,asyncLink(font)).replace(icon,asyncLink(icon))
};
for(const key in variants) variants[key]=variants[key].replace('<head>','<head><base href="/">');
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
 if(pathname.startsWith('/__contact_ab/')){
  const variant=pathname.split('/')[2];
  res.writeHead(variants[variant]?200:404,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
  return res.end(variants[variant]||'not found');
 }
 const file=path.resolve(root,pathname.replace(/^\/+/,''));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end('Forbidden');}
 fs.readFile(file,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(e?'missing':b)});
});
async function listen(){await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));}
(async()=>{
 await listen();
 const baseUrl='http://127.0.0.1:'+server.address().port;
 const lighthouse=(await import('lighthouse')).default;
 const chrome=await launch({chromeFlags:['--headless','--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
 const metrics=[],layout=[];
 try{
  for(let round=0;round<3;round++){
   const order=round%2?['nonblocking','baseline']:['baseline','nonblocking'];
   for(const variant of order){
    const {lhr}=await lighthouse(baseUrl+'/__contact_ab/'+variant,{
     port:chrome.port,onlyCategories:['performance'],formFactor:'mobile',
     throttlingMethod:'simulate',maxWaitForLoad:45000,
     disableStorageReset:false,logLevel:'error',
     screenEmulation:{mobile:true,width:375,height:812,deviceScaleFactor:2,disabled:false}
    });
    assert(!lhr.runtimeError,JSON.stringify(lhr.runtimeError));
    const item={round,variant,score:Math.round(lhr.categories.performance.score*100),
     fcpMs:Math.round(lhr.audits['first-contentful-paint'].numericValue),
     lcpMs:Math.round(lhr.audits['largest-contentful-paint'].numericValue),
     tbtMs:Math.round(lhr.audits['total-blocking-time'].numericValue),
     cls:+lhr.audits['cumulative-layout-shift'].numericValue.toFixed(5),
     blockers:(lhr.audits['render-blocking-resources']?.details?.items||[]).map(x=>({url:x.url,wastedMs:x.wastedMs}))
    };
    metrics.push(item);console.log('CONTACT_AB_LH '+JSON.stringify(item));
   }
  }
  const browser=await chromium.connectOverCDP('http://127.0.0.1:'+chrome.port);
  try{
   for(const width of [375,768,1024,1440]){
    for(const variant of Object.keys(variants)){
     const ctx=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
     const p=await ctx.newPage();
     await p.goto(baseUrl+'/__contact_ab/'+variant,{waitUntil:'networkidle',timeout:35000});
     await p.evaluate(()=>document.fonts.ready);
     await p.waitForFunction(()=>[...document.querySelectorAll('link[rel="preload"][as="style"]')].every(x=>x.rel==='stylesheet'),null,{timeout:12000});
     const m=await p.evaluate(()=>{
      const bounds=el=>{const r=el.getBoundingClientRect();return [r.x,r.y,r.width,r.height].map(x=>+x.toFixed(1))};
      const ic=document.querySelector('.pronto-site-utility i');
      return {header:bounds(document.querySelector('header')),h1:bounds(document.querySelector('h1')),
        fontLoaded:document.fonts.check('700 16px Inter'),
        iconContent:ic?getComputedStyle(ic,'::before').content:null,
        iconFont:ic?getComputedStyle(ic,'::before').fontFamily:null,
        hasHorizontalOverflow:document.documentElement.scrollWidth>innerWidth+1,
        stylesheetCount:[...document.styleSheets].filter(s=>/font-awesome|fonts.googleapis.com/.test(s.href||'')).length};
     });
     assert(m.fontLoaded,'Inter not active '+variant+' '+width);
     assert(m.stylesheetCount===2,'External stylesheet not active '+variant+' '+width);
     assert(m.iconContent && m.iconContent!=='none','Font Awesome absent '+variant+' '+width);
     assert(!m.hasHorizontalOverflow,'Horizontal overflow '+variant+' '+width);
     layout.push({width,variant,...m});console.log('CONTACT_AB_LAYOUT '+JSON.stringify({width,variant,...m}));
     await ctx.close();
    }
    const a=layout.find(x=>x.width===width&&x.variant==='baseline');
    const b=layout.find(x=>x.width===width&&x.variant==='nonblocking');
    for(const group of ['header','h1'])for(let i=0;i<4;i++){
     assert(Math.abs(a[group][i]-b[group][i])<=1,'Geometry changed on '+width+' '+group+' index '+i);
    }
   }
  }finally{await browser.close();}
  fs.writeFileSync('contact-mobile-ab.json',JSON.stringify({metrics,layout},null,2));
 }finally{await chrome.kill();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
