#!/usr/bin/env node
'use strict';
// Controlled read-only Home performance experiment: actual candidate versus
// exact original HTML with original blocking assistant CSS, same assets/runner.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {launch}=require('chrome-launcher');
const {chromium}=require('playwright');
const dir=path.resolve(__dirname,'..');
const changed=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const block=changed.match(/    <!-- Home mobile: inline the same, exact assistant CSS so it does not block the LCP hero. -->[\s\S]*?    <link rel="stylesheet" href="assets\/css\/pronto-assistant.css" media="\(min-width: 768px\)">/);
if(!block)throw Error('Expected new mobile Home CSS trial fragment absent');
const original=changed.replace(block[0],'    <link rel="stylesheet" href="assets/css/pronto-assistant.css">');
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 const route=url.pathname;
 if(route==='/trial/base'||route==='/trial/mobile-css'){
  res.writeHead(200,{'Content-Type':'text/html'});
  return res.end((route.endsWith('base')?original:changed).replace('<head>','<head><base href="/">'));
 }
 const filepath=path.resolve(dir,route.replace(/^\//,''));
 if(!filepath.startsWith(dir+path.sep)){res.writeHead(403);return res.end('Forbidden')}
 const types={'.css':'text/css','.js':'application/javascript','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.svg':'image/svg+xml'};
 fs.readFile(filepath,(e,bytes)=>{res.writeHead(e?404:200,{'Content-Type':types[path.extname(filepath)]||'application/octet-stream'});res.end(e?'not found':bytes)});
});
const sleep=t=>new Promise(done=>setTimeout(done,t));
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const lighthouse=(await import('lighthouse')).default;
 const chrome=await launch({chromeFlags:['--headless','--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
 const results=[],geometries=[];
 try {
   for(let cycle=0;cycle<3;cycle++){
    const cases=cycle%2?['mobile-css','base']:['base','mobile-css'];
    for(const test of cases){
     const {lhr}=await lighthouse(base+'/trial/'+test,{
      port:chrome.port,onlyCategories:['performance'],formFactor:'mobile',
      throttlingMethod:'simulate',disableStorageReset:false,maxWaitForLoad:50000,logLevel:'error',
      screenEmulation:{mobile:true,width:375,height:812,deviceScaleFactor:2,disabled:false}
     });
     const r={cycle,test,score:Math.round(lhr.categories.performance.score*100),
       fcp:Math.round(lhr.audits['first-contentful-paint'].numericValue),
       lcp:Math.round(lhr.audits['largest-contentful-paint'].numericValue),
       tbt:Math.round(lhr.audits['total-blocking-time'].numericValue),
       cls:lhr.audits['cumulative-layout-shift'].numericValue,
       blockers:(lhr.audits['render-blocking-resources']?.details?.items||[]).map(x=>x.url.split('/').pop())};
     results.push(r);console.log('HOME_CSS_AB '+JSON.stringify(r));
    }
   }
   const browser=await chromium.connectOverCDP('http://127.0.0.1:'+chrome.port);
   for(const width of [375,768,1024,1440]){
    for(const test of ['base','mobile-css']){
     const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
     const page=await context.newPage();
     await page.goto(base+'/trial/'+test,{waitUntil:'load',timeout:45000});
     await page.evaluate(()=>document.fonts.ready);
     const d=await page.evaluate(()=>{
      const rect=e=>{const x=e.getBoundingClientRect();return [x.x,x.y,x.width,x.height].map(t=>Math.round(t*10)/10)};
      return {header:rect(document.querySelector('header')),hero:rect(document.querySelector('main #home')),
       launcher:rect(document.querySelector('.pa-guide-launcher')),mainHeight:document.querySelector('main').getBoundingClientRect().height,
       launcherBg:getComputedStyle(document.querySelector('.pa-guide-launcher')).backgroundColor,
       horzOverflow:document.documentElement.scrollWidth-innerWidth};
     });
     geometries.push({width,test,...d});
     console.log('HOME_CSS_GEOMETRY '+JSON.stringify({width,test,...d}));
     await context.close();
    }
   }
   await browser.close();
 } finally{await chrome.kill();await new Promise(resolve=>server.close(resolve))}
 const output={results,geometries};
 fs.writeFileSync('home-css-render-comparison.json',JSON.stringify(output,null,2));
 for(const width of [375,768,1024,1440]){
  const before=geometries.find(x=>x.width===width && x.test==='base');
  const after=geometries.find(x=>x.width===width && x.test==='mobile-css');
  for(const prop of ['header','hero','launcher']){
   if(before[prop].some((x,i)=>Math.abs(x-after[prop][i])>1))throw Error('Visual geometry change '+width+' '+prop);
  }
  if(Math.abs(before.mainHeight-after.mainHeight)>1)throw Error('Main height changed '+width);
  if(after.horzOverflow>2)throw Error('Horizontal overflow '+width);
  if(before.launcherBg!==after.launcherBg)throw Error('Assistant launcher color changed '+width);
 }
 console.log('HOME_CSS_LAYOUT_UNCHANGED');
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
