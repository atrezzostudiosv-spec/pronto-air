#!/usr/bin/env node
'use strict';
/* Isolated trial only. Does not modify any production HTML, CSS or assets.
 * Baseline and 3 variations receive identical local serving + Lighthouse settings.
 */
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const assert=require('node:assert/strict');
const {launch}=require('chrome-launcher');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const home=fs.readFileSync(path.join(root,'index.html'),'utf8');
const font='<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">';
const icons='<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">';
assert(home.includes(font) && home.includes(icons),'Expected original stylesheet links not found');
function lazy(link){
 const href=link.match(/href="([^"]+)"/)[1];
 return '<link rel="preload" as="style" href="'+href+'" onload="this.onload=null;this.rel=\'stylesheet\'"><noscript>'+link+'</noscript>';
}
const variants={
 base:home,
 iconsAsync:home.replace(icons,lazy(icons)),
 interAsync:home.replace(font,lazy(font)),
 bothAsync:home.replace(font,lazy(font)).replace(icons,lazy(icons))
};
// The HTML under /__trial/* must resolve all project assets against /.
const versions=Object.fromEntries(Object.entries(variants).map(([name,html])=>[name,html.replace('<head>','<head><base href="/">')]));
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
 if(pathname.startsWith('/__trial/')){
   const variant=pathname.split('/')[2];
   if(!versions[variant]){res.writeHead(404);return res.end('No variant');}
   res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});return res.end(versions[variant]);
 }
 const file=path.resolve(root,pathname.replace(/^\//,''));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end('Forbidden');}
 fs.readFile(file,(err,bytes)=>{res.writeHead(err?404:200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(err?'missing':bytes)});
});
async function start(){return new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))}
(async()=>{
 await start();const baseUrl='http://127.0.0.1:'+server.address().port;
 const lighthouse=(await import('lighthouse')).default;
 const chrome=await launch({chromeFlags:['--headless','--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
 const results=[];
 try{
  for(let iteration=0;iteration<2;iteration++){
   for(const variant of Object.keys(versions)){
    const {lhr}=await lighthouse(baseUrl+'/__trial/'+variant,{
     port:chrome.port,onlyCategories:['performance'],
     formFactor:'mobile',throttlingMethod:'simulate',
     screenEmulation:{mobile:true,width:375,height:812,deviceScaleFactor:2,disabled:false},
     maxWaitForLoad:45000,disableStorageReset:true,logLevel:'error'
    });
    const r={variant,iteration,score:Math.round(lhr.categories.performance.score*100),
     fcp:Math.round(lhr.audits['first-contentful-paint'].numericValue),
     lcp:Math.round(lhr.audits['largest-contentful-paint'].numericValue),
     tbt:Math.round(lhr.audits['total-blocking-time'].numericValue),
     cls:+lhr.audits['cumulative-layout-shift'].numericValue.toFixed(5),
     blockers:(lhr.audits['render-blocking-resources']?.details?.items||[]).map(x=>x.url.split('/').pop().slice(0,90)),
     runtimeError:lhr.runtimeError?.message||null};
    console.log('AB_LH '+JSON.stringify(r));results.push(r);
   }
  }
  const browser=await chromium.connectOverCDP('http://127.0.0.1:'+chrome.port);
  const visual=[];
  for(const width of [375,768,1024,1440]){
   for(const variant of Object.keys(versions)){
    const ctx=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
    const page=await ctx.newPage();
    await page.goto(baseUrl+'/__trial/'+variant,{waitUntil:'domcontentloaded'});
    await page.evaluate(()=>document.fonts.ready);
    await page.waitForFunction(()=>{
      const a=[...document.querySelectorAll('link[rel="preload"][as="style"]')];
      return a.every(x=>x.rel==='stylesheet') || !a.length;
    },null,{timeout:20000}).catch(()=>{});
    const m=await page.evaluate(()=>{
     const h=document.querySelector('header'),headline=document.querySelector('h1'),icon=document.querySelector('.pronto-site-utility i');
     const bounds=x=>{const r=x.getBoundingClientRect();return [r.x,r.y,r.width,r.height].map(v=>Math.round(v*10)/10)};
     const rules=[...document.styleSheets].filter(x=>x.href?.includes('font-awesome')||x.href?.includes('fonts.googleapis.com')).map(x=>x.href);
     return {header:bounds(h),headline:bounds(headline),
       fontReady:document.fonts.check('700 16px Inter'),
       iconContent:icon?getComputedStyle(icon,'::before').content:null,
       iconFont:icon?getComputedStyle(icon,'::before').fontFamily:null,
       loadedSheets:rules.length};
    });
    visual.push({variant,width,...m});
    console.log('AB_VIS '+JSON.stringify({variant,width,...m}));
    await ctx.close();
   }
  }
  await browser.close();
  fs.writeFileSync('home-render-ab.json',JSON.stringify({results,visual},null,2));
  if(results.some(x=>x.runtimeError))process.exitCode=1;
 }finally{await chrome.kill();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
