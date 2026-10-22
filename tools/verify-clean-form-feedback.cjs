#!/usr/bin/env node
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require('playwright');
const dir=path.resolve(__dirname,'..');
const cases=[
 {path:'index.html',form:'#contactForm',button:'#contactForm button[type=submit]',status:'#homeFormStatus',email:'#fieldEmail',service:'#fieldService', fields:{'#fieldName':'Pronto Test','#fieldPhone':'9403123081','#fieldEmail':'atrezzo-test@example.com','#fieldMessage':'Test only'}},
 {path:'contact-us.html',form:'#prontoContactForm',button:'#submitBtn',status:'#formStatusBanner',email:'#email',service:'#service',fields:{'#firstName':'Pronto','#lastName':'Test','#phone':'9403123081','#email':'atrezzo-test@example.com','#message':'Test only'}}
];
const server=http.createServer((req,res)=>{let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html';
const fp=path.resolve(dir,name);if(!fp.startsWith(dir+path.sep)){res.writeHead(403);return res.end('403');}
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.png':'image/png'}[path.extname(fp)]||'application/octet-stream';
fs.readFile(fp,(err,data)=>{res.writeHead(err?404:200,{'Content-Type':mime});res.end(err?'404':data)})});
server.listen(0,'127.0.0.1',async()=>{
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [375,768,1024,1440])for(const c of cases){
   const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
   let calls=0,success=true;
   await page.route('https://formsubmit.co/ajax/**',route=>{if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'POST,OPTIONS'}});calls++;return route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({success:success?'true':'false'})})});
   await page.goto(base+'/'+c.path,{waitUntil:'domcontentloaded'});
   const originalUrl=page.url();
   assert.equal(await page.locator('meta[name=robots]').getAttribute('content'),'noindex, nofollow');
   assert.equal(await page.locator(c.status).count(),1);
   assert.equal(await page.locator(c.status).isVisible(),false);
   assert.equal(await page.locator(c.button).isVisible(),true);
   const formHtml=await page.locator(c.form).innerHTML();
   assert.ok(!formHtml.includes('Preview form — delivery not yet verified'));
   assert.ok(!formHtml.includes('Preview Form — Delivery Not Yet Verified'));
   assert.ok(formHtml.indexOf('id="'+c.status.slice(1)+'"')>formHtml.indexOf('type="submit"'));
   assert.equal(await page.locator('a[href="privacy-policy.html"]').count()>0,true);
   await page.locator(c.button).click();await page.waitForTimeout(100);assert.equal(calls,0);
   for(const [selector,value] of Object.entries(c.fields))await page.locator(selector).fill(value);
   await page.locator(c.service).selectOption('Residential Cooling');
   await page.locator(c.button).click();
   await page.waitForFunction(sel=>document.querySelector(sel)?.textContent.includes('Thank you! Your request has been submitted successfully.'),c.status);
   assert.equal(page.url(),originalUrl);assert.equal(calls,1);
   for(const [selector,value] of Object.entries(c.fields))await page.locator(selector).fill(value);
   await page.locator(c.service).selectOption('Residential Cooling');
   success=false;await page.locator(c.button).click();
   await page.waitForFunction(sel=>document.querySelector(sel)?.textContent.includes('We could not verify'),c.status);
   assert.equal(page.url(),originalUrl);assert.equal(calls,2);
   console.log('PASS',c.path,width+'px, success and error states without navigation');
   await page.close();
  }
  console.log('PASS: 8 form-layout/behavior combinations.');
 }catch(e){console.error(e);process.exitCode=1}finally{await browser.close();server.close()}
});
