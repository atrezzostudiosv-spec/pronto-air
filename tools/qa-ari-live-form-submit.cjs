#!/usr/bin/env node
'use strict';
// One-off authorized QA of the public Pronto Air DEMO: submits synthetic test
// information directly from the Ari form to the temporary Atrezzo test inbox.
// Never run automatically on PRs, main, or production customer domains.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const url='https://atrezzostudiosv-spec.github.io/pronto-air/index.html';
(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  const context=await browser.newContext({viewport:{width:375,height:850},reducedMotion:'reduce'});
  const page=await context.newPage();
  const responses=[];
  page.on('response',r=>{
   if(r.url().startsWith('https://formsubmit.co/ajax/')&&r.request().method()==='POST'){
    responses.push({status:r.status(),urlMatched:r.url().includes('atrezzostudiosv'),type:r.headers()['content-type']||''});
   }
  });
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
  const launcher=page.getByRole('button',{name:'Chat with Ari'});
  await launcher.waitFor({state:'visible',timeout:15000});
  await launcher.click();
  await page.getByRole('button',{name:'Leave a Message'}).click();
  const form=page.locator('.pa-guide-lead-form');
  assert.equal(await form.isVisible(),true,'Ari contact form is not visible');
  await form.locator('[name="name"]').fill('ATREZZO QA TEST ONLY');
  await form.locator('[name="phone"]').fill('0000000000');
  // Omit optional email to avoid creating any person-specific information.
  await form.locator('[name="message"]').fill(
   '[ATREZZO AUTHORIZED QA — TEST ONLY] Synthetic Ari form acceptance test from the public demo. No service requested, no appointment, no callback. Please disregard.'
  );
  await form.locator('[name="consent"]').check();
  await form.getByRole('button',{name:'Send Request'}).click();
  const status=page.locator('.pa-guide-lead-status');
  try{
   await status.getByText(/Your request was accepted by the form service/i).waitFor({timeout:25000});
  }catch(e){
   console.error('ARI_LIVE_FORM_STATUS:',JSON.stringify((await status.innerText()).slice(0,230)));
   console.error('FORM_RELAY_RESPONSE:',JSON.stringify(responses));
   throw e;
  }
  assert.equal(responses.length,1,'Expected exactly one submission to the real form service');
  assert.equal(responses[0].status,200,'Provider failed to accept the submission');
  assert.equal(responses[0].urlMatched,true,'Unexpected form destination');
  console.log('PASS: Ari form on live GitHub Pages accepted exactly one synthetic test lead through FormSubmit AJAX.');
  console.log('IMPORTANT: HTTP acceptance does not verify arrival in the Atrezzo inbox or human processing.');
  await context.close();
 }finally{await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1});
