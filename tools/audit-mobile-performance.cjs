#!/usr/bin/env node
'use strict';

/* Production-domain performance audit. Read-only: no website files, forms or emails changed.
 * Uses one CI runner and mobile Lighthouse simulated throttling.
 * CI results are lab diagnostics, NOT directly comparable to an independent PageSpeed run.
 */
const fs=require('node:fs');
const path=require('node:path');
const {launch}=require('chrome-launcher');
const urls=[
  'index.html',
  'residential-cooling.html',
  'residential-heating.html',
  'mobile-homes.html',
  'light-commercial.html',
  'contact-us.html',
  'service-agreement-faqs.html',
  'privacy-policy.html'
];
const root='https://atrezzostudiosv-spec.github.io/pronto-air/';
const fmt=v=>v==null?'n/a':String(Math.round(v));
const auditInfo=(lhr,key)=>{
  const item=lhr.audits[key];
  return item?.numericValue == null ? null : +item.numericValue.toFixed(0);
};
(async()=>{
 // Verify the public GitHub Pages deployment includes PR #27 before measuring it.
 // A successful source commit alone does not prove the published website was updated.
 const expected=['fonts.googleapis.com/css2?family=Inter','font-awesome/6.4.0/css/all.min.css'];
 let published=false;
 for(let attempt=0;attempt<12;attempt++){
  const res=await fetch(root+'index.html?atest='+Date.now(),{headers:{'Cache-Control':'no-cache'}});
  if(res.ok){
   const html=await res.text();
   const found=(html.match(/rel="preload" as="style" href="https:\/\//g)||[]).length;
   if(found>=2 && expected.every(x=>html.includes(x))){published=true;break;}
  }
  if(attempt<11) await new Promise(resolve=>setTimeout(resolve,5000));
 }
 if(!published) throw new Error('The live Home is not showing the two non-blocking CSS links yet; do not report metrics from stale publication');
 console.log('LIVE_DEPLOY_VERIFIED Home has the two approved non-blocking external styles');
 const lighthouse=(await import('lighthouse')).default;
 const chrome=await launch({chromeFlags:['--headless','--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
 const results=[],issues=[];
 try{
  // Measure Home a second time to estimate ordinary run-to-run variability.
  for(const page of [...urls,'index.html']){
   const url=root+page;
   try{
    const {lhr}=await lighthouse(url,{
      port:chrome.port,onlyCategories:['performance'],
      formFactor:'mobile',throttlingMethod:'simulate',
      screenEmulation:{mobile:true,width:375,height:812,deviceScaleFactor:2,disabled:false},
      maxWaitForLoad:55000,disableStorageReset:false,logLevel:'error'
    });
    const opportunities=Object.entries(lhr.audits).filter(([id,a])=>
      a?.details?.type==='opportunity' && a.details.overallSavingsMs>100)
      .sort((a,b)=>b[1].details.overallSavingsMs-a[1].details.overallSavingsMs)
      .slice(0,5).map(([id,a])=>({id,title:a.title,savingsMs:Math.round(a.details.overallSavingsMs)}));
    const blockers=(lhr.audits['render-blocking-resources']?.details?.items||[])
      .slice(0,10).map(x=>({url:x.url,transferSize:x.transferSize,wastedMs:x.wastedMs}));
    const longTasks=(lhr.audits['long-tasks']?.details?.items||[])
      .sort((a,b)=>(b.duration||0)-(a.duration||0)).slice(0,5)
      .map(x=>({durationMs:Math.round(x.duration||0),url:x.url||null}));
    const lcpElement=lhr.audits['largest-contentful-paint-element']?.details?.items?.[0]?.items?.[0]?.node?.snippet
      ||lhr.audits['largest-contentful-paint-element']?.details?.items?.[0]?.node?.snippet||null;
    const item={
      page,requestedUrl:url,finalUrl:lhr.finalDisplayedUrl,
      blockers,longTasks,lcpElement,
      fetchTime:lhr.fetchTime,performanceScore:Math.round(lhr.categories.performance.score*100),
      fcpMs:auditInfo(lhr,'first-contentful-paint'),
      lcpMs:auditInfo(lhr,'largest-contentful-paint'),
      tbtMs:auditInfo(lhr,'total-blocking-time'),
      cls:lhr.audits['cumulative-layout-shift']?.numericValue,
      speedIndexMs:auditInfo(lhr,'speed-index'),
      opportunities,
      runtimeError:lhr.runtimeError||null
    };
    results.push(item);
    console.log('MOBILE_LH '+JSON.stringify(item));
    if(item.runtimeError)issues.push(page+': '+item.runtimeError.message);
   }catch(e){issues.push(page+': '+String(e));console.error('AUDIT_ERROR '+page+' '+String(e));}
  }
 }finally{await chrome.kill()}
 const target=path.join(process.cwd(),'mobile-performance-audit.json');
 fs.writeFileSync(target,JSON.stringify({auditedAt:new Date().toISOString(),source:'GitHub Actions Lighthouse 12 mobile simulated laboratory; not PageSpeed Insights infrastructure',results,issues},null,2));
 console.log('AUDIT_SUMMARY '+results.length+'/9 measurements (8 unique pages; Home twice), errors='+issues.length);
 if(issues.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
