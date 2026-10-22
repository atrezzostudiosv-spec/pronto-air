#!/usr/bin/env node
'use strict';
// Tests POST construction without contacting FormSubmit or emailing anybody.
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');

const pages=[
  {file:'index.html',form:'#contactForm',submit:'#contactForm button[type="submit"]',
    source:'Home', invalid:null,
    fields:{'#fieldName':'Atrezzo Test User','#fieldPhone':'9403123081','#fieldEmail':'qa-example@example.com','#fieldMessage':'Test message, do not dispatch'},
    service:'#fieldService'},
  {file:'contact-us.html',form:'#prontoContactForm',submit:'#submitBtn',
    source:'Contact',invalid:'phone',
    fields:{'#firstName':'Atrezzo','#lastName':'Test User','#phone':'9403123081','#email':'qa-example@example.com','#message':'Test message, do not dispatch'},
    service:'#service'}
];

function serve() {
 return new Promise(resolve=>{
  const server=http.createServer((req,res)=>{
    let requested=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname).slice(1)||'index.html';
    const fp=path.resolve(root,requested);
    if(!fp.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
    const ext=path.extname(fp);
    const mime={'.html':'text/html','.css':'text/css','.js':'application/javascript','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2'}[ext]||'application/octet-stream';
    fs.readFile(fp,(err,data)=>{res.setHeader('Content-Type',mime);res.writeHead(err?404:200);res.end(err?'not found':data);});
  });
  server.listen(0,'127.0.0.1',()=>resolve({server,base:'http://127.0.0.1:'+server.address().port}));
 });
}

(async()=>{
 const {server,base}=await serve();
 const browser=await chromium.launch({headless:true});
 let testCount=0;
 try{
  for(const width of [375,768,1024,1440]){
    for(const item of pages){
     const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
     const problems=[];page.on('pageerror',e=>problems.push(String(e)));
     const captured=[];
     await page.route(/^https:\/\/formsubmit\.co\//,async route=>{
       const req=route.request();
       captured.push({url:req.url(),method:req.method(),body:req.postData()||''});
       await route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html><title>Mock FormSubmit response - test only</title><body>TEST ONLY — NO EMAIL SENT</body></html>'});
     });
     await page.goto(base+'/'+item.file,{waitUntil:'domcontentloaded'});
     const form=page.locator(item.form);
     const info=await form.evaluate(f=>({action:f.action,method:f.method,html:f.innerHTML}));
     assert.equal(info.action,'https://formsubmit.co/atrezzostudiosv@gmail.com');
     assert.equal(info.method.toLowerCase(),'post');
     assert.match(info.html,/name="_honey"/);
     assert.doesNotMatch(info.html,/name="_captcha"/); // preserve provider default reCAPTCHA
     assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'),'noindex, nofollow');
     const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
     assert.ok(overflow<3,item.file+' unexpected horizontal overflow at '+width+': '+overflow);
     assert.equal(await page.locator(item.submit).isVisible(),true,item.file+' button visibility');
     await page.locator(item.submit).click();
     await page.waitForTimeout(100);
     assert.equal(captured.length,0,item.file+' empty form unexpectedly POSTed');

     for(const [field,val] of Object.entries(item.fields)) await page.locator(field).fill(val);
     await page.locator(item.service).selectOption('Residential Cooling');
     if(item.invalid){
       await page.locator('#phone').fill('not-a-number');
       await page.locator(item.submit).click();
       await page.waitForTimeout(100);
       assert.equal(captured.length,0,'Invalid phone unexpectedly POSTed');
       assert.equal(await page.locator('#phoneError').isVisible(),true,'Custom phone validation not shown');
       await page.locator('#phone').fill('9403123081');
     }
     await page.locator(item.submit).click();
     await page.waitForTimeout(250);
     assert.equal(captured.length,1,item.file+' valid submission did not POST once');
     const req=captured[0];
     assert.equal(req.url,'https://formsubmit.co/atrezzostudiosv@gmail.com');
     assert.equal(req.method,'POST');
     const body=new URLSearchParams(req.body);
     assert.match(body.get('_subject')||'',new RegExp(item.source));
     assert.equal(body.get('_honey'),'');
     assert.equal(body.get('service'),'Residential Cooling');
     assert.equal(body.get('email'),'qa-example@example.com');
     assert.ok(body.get('message')?.includes('do not dispatch'));
     for(const key of item.source==='Home'?['name','phone']:['firstName','lastName','phone']){
       assert.ok(body.get(key),item.file+' missing '+key);
     }
     assert.equal(body.get('_url'), 'https://atrezzostudiosv-spec.github.io/pronto-air/'+item.file);
     assert.deepEqual(problems,[],item.file+' browser JS errors');
     console.log('PASS',item.file,width+'px','POST intercepted; native/JS validation correct; no data transmitted');
     testCount++;
     await page.close();
    }
  }
  const policy=fs.readFileSync(path.join(root,'privacy-policy.html'),'utf8');
  assert.match(policy,/FormSubmit/);
  assert.match(policy,/temporary/);
  assert.match(policy,/activation/);
  console.log('PASS',testCount,'browser scenarios plus demo privacy disclosure. Real email delivery NOT checked.');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1)});
