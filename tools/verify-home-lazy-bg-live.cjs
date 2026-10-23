#!/usr/bin/env node
'use strict';
// Read-only check of the live demo: no website edits, forms or emails.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {launch}=require('chrome-launcher');
const home='https://atrezzostudiosv-spec.github.io/pronto-air/index.html';
const photo='images.unsplash.com/photo-1513694203232-719a280e022f';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  let found=false;
  for(let i=0;i<10;i++){
   const p=await browser.newPage();
   const res=await p.goto(home+'?nocache='+Date.now(),{waitUntil:'domcontentloaded',timeout:30000});
   found=!!res?.ok() && await p.locator('.pronto-maintenance-backdrop').count()===1;
   await p.close();
   if(found)break;
   if(i<9)await sleep(5000);
  }
  assert.equal(found,true,'Live GitHub Pages has not deployed updated Maintenance image behavior');
  for(const width of [375,1440]){
   const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
   const requests=[];
   page.on('request',req=>{if(req.url().includes(photo))requests.push(req.url())});
   await page.goto(home+'?audit='+Date.now(),{waitUntil:'domcontentloaded',timeout:30000});
   await page.waitForTimeout(500);
   const before=await page.locator('.pronto-maintenance-backdrop').evaluate(e=>getComputedStyle(e).backgroundImage);
   if(width===375){
    assert.equal(before,'none','Home mobile must not render/download Maintenance background initially');
    assert.equal(requests.length,0,'Mobile Unsplash request still blocks initial page');
    await page.locator('.pronto-maintenance-backdrop').scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>document.querySelector('.pronto-maintenance-backdrop')?.classList.contains('pronto-backdrop-in-view'),null,{timeout:15000});
    await page.waitForTimeout(400);
    assert.equal(requests.length,1,'Mobile backdrop request must start once upon scroll');
   }else{
    assert.ok(before.includes(photo),'Desktop approved photo was changed');
   }
   console.log('LIVE_LAZY_BACKGROUND '+JSON.stringify({width,initialBackground:before,requests:requests.length}));
   await page.close();
  }
 }finally{await browser.close()}
 const lighthouse=(await import('lighthouse')).default;
 const chrome=await launch({chromeFlags:['--headless','--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
 try{
  for(let i=0;i<2;i++){
   const {lhr}=await lighthouse(home,{port:chrome.port,onlyCategories:['performance'],formFactor:'mobile',
    throttlingMethod:'simulate',disableStorageReset:false,maxWaitForLoad:45000,logLevel:'error',
    screenEmulation:{mobile:true,width:375,height:812,deviceScaleFactor:2,disabled:false}});
   if(lhr.runtimeError)throw Error(JSON.stringify(lhr.runtimeError));
   console.log('MOBILE_AFTER_BG '+JSON.stringify({run:i,score:Math.round(lhr.categories.performance.score*100),
    fcpMs:Math.round(lhr.audits['first-contentful-paint'].numericValue),
    lcpMs:Math.round(lhr.audits['largest-contentful-paint'].numericValue),
    tbtMs:Math.round(lhr.audits['total-blocking-time'].numericValue),
    cls:lhr.audits['cumulative-layout-shift'].numericValue}));
  }
 }finally{await chrome.kill()}
})().catch(e=>{console.error(e);process.exitCode=1});
