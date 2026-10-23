#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const url='https://atrezzostudiosv-spec.github.io/pronto-air/contact-us.html';
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [375,1440]){
   const ctx=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
   const page=await ctx.newPage(); const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   const resp=await page.goto(url+'?atrezzo-verify='+width,{waitUntil:'networkidle',timeout:45000});
   assert(resp&&resp.ok(),'Contact public URL unavailable');
   const result=await page.evaluate(async()=>{
    await document.fonts.ready;
    const icon=document.querySelector('.pronto-site-utility .fa-shield-halved');
    const links=[...document.querySelectorAll('link[href*="fonts.googleapis.com/css2"],link[href*="font-awesome/6.4.0/css"]')];
    return {h1:document.querySelector('h1')?.textContent.trim(),
      fontLoaded:document.fonts.check('700 16px Inter'),
      iconFont:icon?getComputedStyle(icon,'::before').fontFamily:null,
      iconGlyph:icon?getComputedStyle(icon,'::before').content:null,
      cssLinks:links.map(x=>({rel:x.rel,media:x.media,match:matchMedia(x.media||'all').matches})),
      forms:[...document.forms].map(x=>x.getAttribute('action')),
      overflow:document.documentElement.scrollWidth-innerWidth,
      robots:document.querySelector('meta[name="robots"]')?.content};
   });
   assert.equal(result.fontLoaded,true);
   assert.match(result.iconFont,/Font Awesome 6 Free/);
   assert(result.iconGlyph && result.iconGlyph!=='none');
   assert(result.overflow<=2);
   assert.equal(result.robots,'noindex, nofollow');
   assert.equal(result.cssLinks.filter(x=>x.match).length,2,'Exactly 2 matching CSS styles on live Contact');
   assert(result.cssLinks.filter(x=>x.match).every(x=>x.rel==='stylesheet'),'CSS not fully loaded on live Contact');
   if(width===375)assert(result.cssLinks.filter(x=>x.match).every(x=>x.media.includes('max-width')),'Missing mobile-only CSS optimization on live Contact');
   if(width===1440)assert(result.cssLinks.filter(x=>x.match).every(x=>x.media.includes('min-width')),'Desktop baseline behavior changed');
   assert.deepEqual(errors,[]);
   console.log('PUBLIC_CONTACT_VERIFIED '+JSON.stringify({width,...result}));
   await ctx.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
