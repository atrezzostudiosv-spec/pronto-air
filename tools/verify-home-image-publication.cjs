#!/usr/bin/env node
'use strict';
// Read-only post-deployment verification: source files remain unchanged.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base='https://atrezzostudiosv-spec.github.io/pronto-air/';
const names=[
 {file:'pronto-home-family-team-840-optimized.webp',expected:63608},
 {file:'home-service-cooling-640.webp',expected:30198}
];
const nap=ms=>new Promise(done=>setTimeout(done,ms));
async function get(url){
 const r=await fetch(url+'?check='+Date.now(),{headers:{'Cache-Control':'no-cache'}});
 if(!r.ok)throw Error('HTTP '+r.status+' '+url);
 return r;
}
(async()=>{
 let html=null;
 for(let i=0;i<12;i++){
  try{
   const res=await get(base+'index.html');
   html=await res.text();
   if(names.every(x=>html.includes('images/'+x.file)))break;
  }catch(e){if(i===11)throw e}
  if(i===11)throw Error('Public Home still shows older image references after 12 deploy checks');
  await nap(5000);
 }
 const assets=[];
 for(const {file,expected} of names){
  const response=await get(base+'images/'+file);
  const bytes=new Uint8Array(await response.arrayBuffer());
  assert.equal(bytes.length,expected,'Deployed WebP size differs from verified branch: '+file);
  const header=String.fromCharCode(...bytes.slice(0,4));
  const webp=String.fromCharCode(...bytes.slice(8,12));
  assert.equal(header,'RIFF');assert.equal(webp,'WEBP');
  assets.push({file,bytes:bytes.length,contentType:response.headers.get('content-type')});
 }
 console.log('DEPLOYED_IMAGES_VERIFIED '+JSON.stringify(assets));
 const lighthouse=(await import('lighthouse')).default;
 const {launch}=require('chrome-launcher');
 const chrome=await launch({chromeFlags:['--headless','--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
 const reports=[];
 try{
  for(let attempt=0;attempt<2;attempt++){
   const {lhr}=await lighthouse(base+'index.html',{
    port:chrome.port,onlyCategories:['performance'],
    formFactor:'mobile',throttlingMethod:'simulate',
    screenEmulation:{mobile:true,width:375,height:812,deviceScaleFactor:2,disabled:false},
    disableStorageReset:false,maxWaitForLoad:50000,logLevel:'error'
   });
   const item={attempt,performance:Math.round(lhr.categories.performance.score*100),
    lcpMs:Math.round(lhr.audits['largest-contentful-paint'].numericValue),
    fcpMs:Math.round(lhr.audits['first-contentful-paint'].numericValue),
    cls:+lhr.audits['cumulative-layout-shift'].numericValue.toFixed(4),
    tbtMs:Math.round(lhr.audits['total-blocking-time'].numericValue)};
   reports.push(item);console.log('HOME_POST_IMAGES_LH '+JSON.stringify(item));
  }
 }finally{await chrome.kill()}
 fs.writeFileSync('home-image-live-verify.json',JSON.stringify({assets,reports},null,2));
 console.log('HOME_IMAGE_RELEASE_CHECK_OK');
})().catch(e=>{console.error(e);process.exitCode=1});
