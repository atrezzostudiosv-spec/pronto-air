#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const AxeBuilder=require('@axe-core/playwright').default;
const root=path.resolve(__dirname,'..');
const pages=['index.html','residential-cooling.html','residential-heating.html','mobile-homes.html','light-commercial.html','contact-us.html','service-agreement-faqs.html','privacy-policy.html'];
const widths=[375,768,1024,1440];
const mkServer=dir=>new Promise(resolve=>{
 const server=http.createServer((req,res)=>{
  const relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/,'')||'index.html';
  const filename=path.resolve(dir,relative);
  if(!filename.startsWith(dir+path.sep)){res.writeHead(403);return res.end();}
  const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp'}[path.extname(filename)]||'application/octet-stream';
  fs.readFile(filename,(error,bytes)=>{res.writeHead(error?404:200,{'Content-Type':mime});res.end(error?'missing':bytes)});
 });
 server.listen(0,'127.0.0.1',()=>resolve({server,url:'http://127.0.0.1:'+server.address().port}));
});
(async()=>{
 const before=await mkServer(path.join(root,'.assistant-qa-baseline'));
 const after=await mkServer(root);
 const browser=await chromium.launch({headless:true});
 let checks=0;
 try{
  const geom=page=>page.evaluate(()=>({
    sections:[...document.querySelectorAll('main section')].map(n=>{const r=n.getBoundingClientRect();return [r.x,r.y,r.width,r.height]}),
    mainH:document.querySelector('main')?.getBoundingClientRect().height,
    h1:[...document.querySelectorAll('h1')].map(x=>x.innerText),
    overflow:document.documentElement.scrollWidth-innerWidth,
    robots:document.querySelector('meta[name="robots"]')?.content
  }));
  for(const file of pages)for(const width of widths){
   const c1=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
   const c2=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
   const p1=await c1.newPage(),p2=await c2.newPage();const jsErrors=[];
   p2.on('pageerror',e=>jsErrors.push(e.message));
   await p1.goto(before.url+'/'+file,{waitUntil:'domcontentloaded'});
   await p2.goto(after.url+'/'+file,{waitUntil:'domcontentloaded'});
   await p1.evaluate(()=>document.fonts.ready);await p2.evaluate(()=>document.fonts.ready);
   await p1.waitForTimeout(200);await p2.waitForTimeout(200);
   const a=await geom(p1),b=await geom(p2);
   assert.equal(JSON.stringify(a.h1),JSON.stringify(b.h1),'H1 changed: '+file);
   assert.equal(a.robots,'noindex, nofollow');assert.equal(b.robots,a.robots);
   assert.equal(a.sections.length,b.sections.length);
   assert.ok(Math.abs(a.mainH-b.mainH)<1,'Main height changed: '+file+'/'+width);
   assert.ok(Math.abs(a.overflow-b.overflow)<=1,'Unexpected scroll change: '+file+'/'+width);
   assert.ok(b.overflow<=2,'Horizontal overflow: '+file+'/'+width);
   for(let i=0;i<a.sections.length;i++)for(let j=0;j<4;j++){
     assert.ok(Math.abs(a.sections[i][j]-b.sections[i][j])<=1,'Layout modified: '+file+'/'+width+' section '+i+' coordinate '+j+' baseline '+a.sections[i][j]+' new '+b.sections[i][j]);
   }
   const launcher=p2.getByRole('button',{name:'Ask Pronto Air'});
   assert.equal(await launcher.isVisible(),true);
   await launcher.click();
   const dialog=p2.getByRole('dialog',{name:'Pronto Air service assistant'});
   assert.equal(await dialog.isVisible(),true);
   const rect=await dialog.boundingBox();
   assert.ok(rect && rect.x>=0 && rect.y>=0 && rect.x+rect.width<=width+1 && rect.y+rect.height<=901,
     'Panel outside viewport: '+file+'/'+width+' '+JSON.stringify(rect));
   assert.equal(await p2.locator('.pa-guide-lead').isVisible(),false);
   const btn=p2.getByRole('button',{name:'Request a call back'});
   await btn.click();
   assert.equal(await p2.locator('.pa-guide-lead').isVisible(),true);
   assert.equal(await p2.locator('.pa-guide-form').isVisible(),false);
   await p2.getByRole('button',{name:'Back to chat'}).click();
   assert.equal(await p2.locator('.pa-guide-form').isVisible(),true);
   if(width===375||width===1440){
     const axe=await new AxeBuilder({page:p2}).include('.pa-guide').withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
     assert.deepEqual(axe.violations.map(x=>({id:x.id,nodes:x.nodes.map(y=>y.target)})),[],'Axe issues '+file+'/'+width);
   }
   await p2.keyboard.press('Escape');
   assert.equal(await dialog.isVisible(),false);
   assert.deepEqual(jsErrors,[],'JS errors '+file+'/'+width);
   console.log('PASS viewport',file,width);checks++;
   await c1.close();await c2.close();
  }

  const context=await browser.newContext({viewport:{width:375,height:900},reducedMotion:'reduce'});
  const page=await context.newPage();
  let deliveryCount=0,lastPayload=null;
  await page.route('https://formsubmit.co/ajax/**',async route=>{
    if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'POST,OPTIONS'}});
    deliveryCount++;
    lastPayload=JSON.parse(route.request().postData());
    await route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:'{"success":"true"}'});
  });
  await page.goto(after.url+'/index.html',{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'Ask Pronto Air'}).click();
  await page.locator('#pa-guide-question').fill('¿Qué puedes explicarme tú?');
  await page.locator('.pa-guide-send').click();
  await page.waitForFunction(()=>document.querySelectorAll('.pa-guide-message.is-guide').length>0);
  assert.match(await page.locator('.pa-guide-message.is-guide').last().innerText(),/Puedo explicarte/i);
  await page.locator('#pa-guide-question').fill('john.smith@example.com');
  const n=await page.locator('.pa-guide-message').count();
  await page.locator('.pa-guide-send').click();
  assert.equal(await page.locator('.pa-guide-message').count(),n,'Personal info accepted into chat');
  await page.getByRole('button',{name:'Leave a Message'}).click();
  assert.equal(await page.locator('.pa-guide-lead').isVisible(),true);
  await page.locator('.pa-guide-lead-send').click();
  assert.equal(deliveryCount,0,'Empty lead submitted');
  await page.locator('.pa-guide-lead-form [name="name"]').fill('QA Visitor');
  await page.locator('.pa-guide-lead-form [name="phone"]').fill('9403123081');
  await page.locator('.pa-guide-lead-form [name="email"]').fill('qa@example.com');
  await page.locator('.pa-guide-lead-form [name="message"]').fill('Test only, please do not call.');
  await page.locator('.pa-guide-lead-form [name="service"]').selectOption('Residential Cooling');
  await page.locator('.pa-guide-lead-form [name="consent"]').check();
  await page.locator('.pa-guide-lead-send').click();
  await page.waitForFunction(()=>document.querySelector('.pa-guide-lead-status')?.textContent?.includes('accepted by the form service'));
  assert.equal(deliveryCount,1);
  assert.equal(lastPayload.name,'QA Visitor');
  assert.equal(lastPayload.phone,'9403123081');
  assert.equal(lastPayload.email,'qa@example.com');
  assert.equal(lastPayload.service,'Residential Cooling');
  assert.ok(lastPayload.source.includes('assistant'));
  assert.equal(lastPayload.callbackRequested.startsWith('Yes'),true);
  assert.equal(lastPayload._subject.includes('Pronto Air'),true);
  assert.equal(page.url(),after.url+'/index.html');
  console.log('PASS callback intake: validated, consented POST intercepted; no actual email sent');
  await context.close();

  const ai=await browser.newContext({viewport:{width:375,height:900},reducedMotion:'reduce'});
  const p=await ai.newPage();let modelCount=0,sentQuestions=[],mode='answer';
  await p.route(after.url+'/index.html?assistant-ai-test',async route=>{
   const html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace('src="assets/js/pronto-assistant.js"','src="assets/js/pronto-assistant.js" data-ai-endpoint="https://ai.example.test/chat"');
   await route.fulfill({status:200,contentType:'text/html',body:html});
  });
  await p.route('https://ai.example.test/chat',async route=>{
   if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type'}});
   modelCount++;sentQuestions.push(JSON.parse(route.request().postData()));
   await route.fulfill({status:mode==='answer'?200:503,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},
     body:mode==='answer'?'{"reply":"Hi! I can explain heating and cooling options and help you reach the team. Would you like me to arrange a contact request?","topic":null,"offerContact":true,"lang":"en"}':'{"error":"quota"}'});
  });
  await p.goto(after.url+'/index.html?assistant-ai-test',{waitUntil:'domcontentloaded'});
  await p.getByRole('button',{name:'Ask Pronto Air'}).click();
  await p.locator('#pa-guide-question').fill('What can you do?');
  await p.locator('.pa-guide-send').click();
  await p.waitForFunction(()=>document.querySelectorAll('.pa-guide-message.is-guide').length===1);
  assert.match(await p.locator('.pa-guide-message.is-guide').last().innerText(),/explain heating and cooling/i);
  assert.equal(modelCount,1);
  mode='fail';
  await p.locator('#pa-guide-question').fill('Residential heating maintenance help');
  await p.locator('.pa-guide-send').click();
  await p.waitForFunction(()=>document.querySelectorAll('.pa-guide-message.is-guide').length===2);
  assert.match(await p.locator('.pa-guide-message.is-guide').last().innerText(),/Pronto Air lists residential heating/i);
  assert.equal(modelCount,2);
  const requestsBefore=modelCount;
  await p.locator('#pa-guide-question').fill('My phone number is 9403123081');
  await p.locator('.pa-guide-send').click();
  assert.equal(modelCount,requestsBefore,'PII transferred to AI');
  assert.equal(sentQuestions.every(s=>!JSON.stringify(s).includes('9403123081')),true);
  console.log('PASS bilingual chat, mocked conversational reply, AI 503 fallback and PII exclusion');
  await ai.close();
  console.log('PASS ALL',checks,'viewport checks + 16 axe scans and follow-up / mocked AI flow');
 }finally{await browser.close();before.server.close();after.server.close();}
})().catch(e=>{console.error(e);process.exit(1);});
