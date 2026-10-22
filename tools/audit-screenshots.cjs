#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const base='https://atrezzostudiosv-spec.github.io/pronto-air/';
const pages=['index.html','residential-cooling.html','residential-heating.html','mobile-homes.html','light-commercial.html','contact-us.html','service-agreement-faqs.html','privacy-policy.html'];
const widths=[375,768,1440];
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  fs.mkdirSync('audit/screenshots',{recursive:true});
  for(const width of widths){
   for(const p of pages){
     const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1,reducedMotion:'reduce'});
     await page.goto(base+p,{waitUntil:'domcontentloaded',timeout:35000});
     await page.evaluate(()=>document.fonts.ready).catch(()=>{});
     await page.waitForTimeout(600);
     const name=p.replace('.html','')+'-'+width;
     await page.screenshot({path:'audit/screenshots/'+name+'.png',animations:'disabled'});
     if(width===375&&['index.html','contact-us.html','residential-cooling.html','residential-heating.html'].includes(p)){
       await page.screenshot({path:'audit/screenshots/'+name+'-full.png',fullPage:true,animations:'disabled'});
     }
     const dim=await page.evaluate(()=>[document.documentElement.scrollHeight,document.documentElement.scrollWidth]);
     console.log('CAPTURED',name,dim);
     await page.close();
   }
  }
  console.log('DONE 24 first-view screenshots and 4 mobile full-page screenshots');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
