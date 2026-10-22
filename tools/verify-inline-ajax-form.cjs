#!/usr/bin/env node
'use strict';
// No real FormSubmit traffic is permitted by this test. All AJAX calls are intercepted.
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const destination='https://formsubmit.co/ajax/atrezzostudiosv@gmail.com';
const specs=[
 {file:'index.html',id:'contactForm',submit:'#contactForm button[type=submit]',status:'#homeFormStatus',
  data:{'#fieldName':'Test Sender','#fieldPhone':'9403123081','#fieldEmail':'noreply-test@example.com','#fieldMessage':'Test only — do not deliver'},
  select:'#fieldService',invalid:'#fieldEmail', expectedName:'name'},
 {file:'contact-us.html',id:'prontoContactForm',submit:'#submitBtn',status:'#formStatusBanner',
  data:{'#firstName':'Test','#lastName':'Sender','#phone':'9403123081','#email':'noreply-test@example.com','#message':'Test only — do not deliver'},
  select:'#service',invalid:'#phone', expectedName:'firstName'}
];
function host(){
  return new Promise(resolve=>{
    const server=http.createServer((req,res)=>{
      const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html';
      const filename=path.resolve(root,pathname);
      if(!filename.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
      const ext=path.extname(filename),ct={'.html':'text/html','.js':'application/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png'}[ext]||'application/octet-stream';
      fs.readFile(filename,(e,buf)=>{res.writeHead(e?404:200,{'Content-Type':ct});res.end(e?'not found':buf);});
    });
    server.listen(0,'127.0.0.1',()=>resolve({server,url:'http://127.0.0.1:'+server.address().port}));
  });
}
(async()=>{
 const h=await host(), browser=await chromium.launch({headless:true});
 let passed=0;
 try{
  for(const width of [375,768,1024,1440])for(const spec of specs){
    const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
    let mode='success',count=0,captured;
    const pageErrors=[];
    page.on('pageerror',e=>pageErrors.push(e.message));
    await page.route(/^https:\/\/formsubmit\.co\/ajax\//,async route=>{
      const req=route.request();
      if(req.method()==='OPTIONS'){
        await route.fulfill({status:204,headers:{
          'Access-Control-Allow-Origin':'*',
          'Access-Control-Allow-Methods':'POST, OPTIONS',
          'Access-Control-Allow-Headers':'Content-Type, Accept'
        },body:''});return;
      }
      ++count;
      captured={url:req.url(),body:req.postData(),method:req.method()};
      if(mode==='network'){
        await route.abort('failed');return;
      }
      const accepted=mode==='success';
      await route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},
        body:JSON.stringify({success:accepted?'true':'false',message:accepted?'accepted':'activation required'})});
    });
    await page.goto(h.url+'/'+spec.file,{waitUntil:'domcontentloaded'});
    assert.equal(await page.locator('meta[name=robots]').getAttribute('content'),'noindex, nofollow');
    assert.equal(await page.locator('form#'+spec.id).getAttribute('action'),'https://formsubmit.co/atrezzostudiosv@gmail.com');
    assert.equal(await page.locator('script[src="assets/js/pronto-form-inline.js"]').count(),1);
    assert.equal(await page.locator(spec.submit).isVisible(),true);

    await page.locator(spec.submit).click();
    await page.waitForTimeout(100);
    assert.equal(count,0,'Invalid empty form submitted');
    for(const [selector,value] of Object.entries(spec.data))await page.locator(selector).fill(value);
    await page.locator(spec.select).selectOption('Residential Cooling');
    await page.locator(spec.invalid).fill(spec.invalid==='#phone'?'nope':'not-an-email');
    await page.locator(spec.submit).click();
    await page.waitForTimeout(100);
    assert.equal(count,0,'Invalid email or phone submitted');
    await page.locator(spec.invalid).fill(spec.invalid==='#phone'?'9403123081':'noreply-test@example.com');

    const start=page.url();
    await page.locator(spec.submit).click();
    await page.waitForFunction(selector=>document.querySelector(selector)?.textContent?.includes('accepted by the form service'),spec.status,{timeout:5000});
    assert.equal(page.url(),start,'Navigated away on successful AJAX submission');
    assert.equal(count,1,'expected exactly one fetch call');
    assert.equal(captured.url,destination);
    assert.equal(captured.method,'POST');
    const body=JSON.parse(captured.body);
    assert.equal(body.email,'noreply-test@example.com');
    assert.equal(body.service,'Residential Cooling');
    assert.ok(body[spec.expectedName],'Name missing');
    assert.equal(body._honey,'');
    assert.equal(await page.locator(spec.submit).isEnabled(),true,'button stuck disabled');
    assert.equal(await page.locator(spec.status).isVisible(),true,'status hidden');

    for(const [selector,value] of Object.entries(spec.data))await page.locator(selector).fill(value);
    await page.locator(spec.select).selectOption('Residential Cooling');
    mode='denied';
    await page.locator(spec.submit).click();
    await page.waitForFunction(selector=>document.querySelector(selector)?.textContent?.includes('could not verify'),spec.status,{timeout:5000});
    assert.equal(page.url(),start,'Navigated away on rejection');
    assert.equal(await page.locator(spec.invalid).inputValue(),spec.invalid==='#phone'?'9403123081':'noreply-test@example.com','data lost after failed attempt');

    mode='network';
    await page.locator(spec.submit).click();
    await page.waitForFunction(selector=>document.querySelector(selector)?.textContent?.includes('could not verify'),spec.status,{timeout:5000});
    assert.equal(page.url(),start,'Navigated away on network failure');
    assert.equal(await page.locator(spec.submit).isEnabled(),true);
    assert.deepEqual(pageErrors,[],'JS errors');
    console.log('PASS',spec.file,width+'px','validation, AJAX acceptance, denial, network error, no redirect');
    passed++;
    await page.close();
  }
  console.log('PASS',passed,'scenarios; no network submissions went to the actual FormSubmit server.');
 }finally{await browser.close();h.server.close();}
})().catch(e=>{console.error(e);process.exit(1);});
