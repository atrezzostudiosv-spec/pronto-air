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
 const lighthouse=(await import('lighthouse')).default;
 const chrome=await launch({chromeFlags:['--headless','--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
 const results=[],issues=[];
 try{
  for(const page of urls){
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
    const item={
      page,requestedUrl:url,finalUrl:lhr.finalDisplayedUrl,
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
 console.log('AUDIT_SUMMARY '+results.length+'/8 pages, errors='+issues.length);
 if(issues.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
