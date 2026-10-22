#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const site='https://atrezzostudiosv-spec.github.io/pronto-air/index.html';
const endpoint='https://pronto-air-assistant.atrezzostudiosv.workers.dev/chat';
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [375,1440]){
   const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
   const page=await context.newPage();
   const scriptErrors=[];page.on('pageerror',e=>scriptErrors.push(String(e)));
   const res=await page.goto(site,{waitUntil:'domcontentloaded',timeout:35000});
   assert.equal(res.status(),200);
   assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'),'noindex, nofollow');
   const liveUrl=await page.locator('script[src="assets/js/pronto-assistant.js"]').getAttribute('data-ai-endpoint');
   assert.equal(liveUrl,endpoint,'GitHub Pages has not deployed the verified AI endpoint');
   await page.getByRole('button',{name:'Ask Pronto Air'}).click();
   const dialog=page.getByRole('dialog',{name:'Pronto Air service assistant'});
   assert.equal(await dialog.isVisible(),true);
   assert.match(await page.locator('.pa-guide-mode').innerText(),/AI-powered assistance/);
   assert.equal(await page.locator('.pa-guide-ai-disclosure').isVisible(),true);
   assert.match(await page.locator('.pa-guide-ai-disclosure').innerText(),/Cloudflare Workers AI/);
   assert.ok((await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth))<=2);
   if(width===375) {
    const spoken='¿Qué puedes explicarme de Pronto Air?';
    const awaited=page.waitForResponse(response=>
      response.url()===endpoint&&response.request().method()==='POST',{timeout:22000});
    await page.locator('#pa-guide-question').fill(spoken);
    await page.locator('.pa-guide-send').click();
    const api=await awaited;
    assert.equal(api.status(),200,'Cloudflare AI did not return success');
    const data=await api.json();
    assert.equal(data.mode,'conversational-ai','Received guided fallback instead of real AI response');
    assert.equal(data.lang,'es');
    assert.equal(typeof data.reply,'string');
    await page.waitForFunction(()=>document.querySelectorAll('.pa-guide-message.is-guide').length>0,{timeout:10000});
    const displayed=await page.locator('.pa-guide-message.is-guide').last().innerText();
    assert.ok(displayed.includes(data.reply),'UI did not render actual model answer');
    assert.match(displayed,/ayud|puedo|aire acondicionado|servicio|Pronto Air|calefacci[oó]n/i);
    assert.equal(await page.locator('.pa-guide-warning').innerText(),'');
    assert.ok(page.url().startsWith(site),'The assistant navigated away from Pronto Air');
    console.log('PASS REAL MOBILE: cloud-hosted conversational model answered Spanish question in '+data.reply.length+' characters');
   }
   await page.keyboard.press('Escape');
   assert.equal(await dialog.isVisible(),false);
   assert.deepEqual(scriptErrors,[],'Browser JavaScript errors');
   console.log('PASS LIVE GUI',width+'px','AI disclosure, overlay and close');
   await context.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
