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
  const responses=[],requestFailures=[],browserErrors=[];
  page.on('requestfailed',request=>{
   if(request.url().startsWith('https://formsubmit.co/'))requestFailures.push(request.failure()?.errorText||'network failure');
  });
  page.on('pageerror',err=>browserErrors.push(err.message));
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
  try {
   // Watch the status element itself, not its children (which it does not have).
   await page.waitForFunction(()=>{
    const message=document.querySelector('.pa-guide-lead-status')?.textContent||'';
    return /accepted by the form service|could not verify the request/i.test(message);
   },null,{timeout:25000});
  } catch(e) {
   console.error('ARI_TEST_TIMEOUT:',e.message);
  }
  const finalStatus=(await status.innerText()).trim();
  console.log('ARI_FORM_STATUS:',JSON.stringify(finalStatus.slice(0,300)));
  console.log('FORM_RELAY_RESPONSES:',JSON.stringify(responses));
  console.log('FORM_REQUEST_FAILURES:',JSON.stringify(requestFailures));
  console.log('BROWSER_ERRORS:',JSON.stringify(browserErrors.slice(0,3)));
  assert.match(finalStatus,/Your request was accepted by the form service/i,
   'The live Ari form did not report FormSubmit acceptance');
  assert.equal(responses.length,1,'Expected exactly one submission to the real form service');
  assert.equal(responses[0].status,200,'Provider failed to accept the submission');
  assert.equal(responses[0].urlMatched,true,'Unexpected form destination');
  console.log('PASS: Ari form on live GitHub Pages accepted exactly one synthetic test lead through FormSubmit AJAX.');
  console.log('IMPORTANT: HTTP acceptance does not verify arrival in the Atrezzo inbox or human processing.');
  await context.close();
 }finally{await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1});
