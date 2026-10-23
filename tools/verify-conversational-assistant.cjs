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
   if(file==='index.html'){
    const links=await p2.evaluate(()=>[...document.querySelectorAll('link[as="style"]')]
      .filter(x=>x.href.includes('fonts.googleapis.com') || x.href.includes('font-awesome/6.4.0'))
      .map(x=>({href:x.href,rel:x.rel})));
    assert.equal(links.length,2,'Home should asynchronously load the two original external styles');
    await p2.waitForFunction(()=>[...document.querySelectorAll('link[as="style"]')]
      .filter(x=>x.href.includes('fonts.googleapis.com') || x.href.includes('font-awesome/6.4.0'))
      .every(x=>x.rel==='stylesheet'),null,{timeout:20000});
    await p2.evaluate(()=>document.fonts.ready);
    const styleProof=await p2.evaluate(()=>{
      const mark=document.querySelector('.pronto-site-utility .fa-shield-halved');
      const face=getComputedStyle(mark,'::before');
      return {inter:document.fonts.check('700 16px Inter'),
        iconFont:face.fontFamily,iconContent:face.content};
    });
    assert.equal(styleProof.inter,true,'Inter failed to load');
    assert.match(styleProof.iconFont,/Font Awesome 6 Free/,'Font Awesome face missing');
    assert.ok(styleProof.iconContent && styleProof.iconContent!=='none','Header icon glyph missing');
   }
   await p1.evaluate(()=>document.fonts.ready);await p2.evaluate(()=>document.fonts.ready);
   await p1.waitForTimeout(200);await p2.waitForTimeout(200);
   if(file==='index.html'){
    const preload=await p2.evaluate(()=>{
     const link=document.querySelector('link[rel="preload"][imagesrcset]');
     const hero=document.querySelector('img[src*="home-hero-mobile"]');
     return {found:!!link,correctAsset:link?.imageSrcset===hero?.srcset,
       correctSizes:link?.imageSizes===hero?.sizes,
       active:link?matchMedia(link.media).matches:null};
    });
    assert.equal(preload.found,true,'Home missing mobile hero preload');
    assert.equal(preload.correctAsset,true,'Preload asset differs from approved hero srcset');
    assert.equal(preload.correctSizes,true,'Preload uses different responsive sizes');
    assert.equal(preload.active,width<768,'Mobile hero preload media condition incorrect');
    if(width===375){
     await p2.waitForFunction(()=>{
      const img=document.querySelector('img[src*="home-hero-mobile"]');
      return img?.complete && img.naturalWidth>0;
     });
     const mobileResources=await p2.evaluate(()=>performance.getEntriesByType('resource')
      .filter(entry=>/\/images\/home-hero-mobile(?:-640|-820)?\.webp(?:\?|$)/.test(entry.name))
      .map(entry=>entry.name));
     assert.equal(mobileResources.length,1,'Mobile hero downloaded more than once: '+mobileResources.join(','));
    }
   }
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
   if(file==='index.html' && (width===375 || width===1440)){
     const backdrop=p2.locator('.pronto-maintenance-backdrop');
     const imageBefore=await backdrop.evaluate(x=>getComputedStyle(x).backgroundImage);
     if(width===375){
       assert.equal(imageBefore,'none','Unsplash below-fold image must not fetch during initial mobile render');
       await backdrop.scrollIntoViewIfNeeded();
       await p2.waitForFunction(()=>document.querySelector('.pronto-maintenance-backdrop')
         ?.classList.contains('pronto-backdrop-in-view'),null,{timeout:10000});
       const imageAfter=await backdrop.evaluate(x=>getComputedStyle(x).backgroundImage);
       assert.ok(imageAfter.includes('images.unsplash.com/photo-1513694203232-719a280e022f'),
         'Approved existing background must appear when Maintenance becomes visible');
     }else{
       assert.ok(imageBefore.includes('images.unsplash.com/photo-1513694203232-719a280e022f'),
         'Desktop Maintenance image must remain unchanged');
     }
   }
   if(file==='index.html' && (width===375||width===1440)){
     const imageRefs=await p2.evaluate(()=>{
       const team=document.querySelector('img[src*="pronto-home-family-team.webp"]');
       const cooling=document.getElementById('detail-img');
       return {teamSrcset:team?.srcset,coolingSrcset:cooling?.srcset};
     });
     assert.ok(imageRefs.teamSrcset.includes('pronto-home-family-team-840-optimized.webp'));
     assert.ok(imageRefs.coolingSrcset.includes('home-service-cooling-640.webp'));
     await p2.evaluate(()=>selectService('heating'));
     assert.ok((await p2.locator('#detail-img').getAttribute('src')).endsWith('residential-heating-hero.webp'));
     assert.equal(await p2.locator('#detail-img').getAttribute('srcset'),null,
       'Heating service must not use cooling srcset');
     await p2.evaluate(()=>selectService('commercial'));
     assert.ok((await p2.locator('#detail-img').getAttribute('src')).endsWith('light-commercial-hero.webp'));
     assert.equal(await p2.locator('#detail-img').getAttribute('srcset'),null);
     await p2.evaluate(()=>selectService('cooling'));
     assert.ok((await p2.locator('#detail-img').getAttribute('srcset')).includes('home-service-cooling-640.webp'));
     assert.ok((await p2.locator('#detail-img').getAttribute('src')).endsWith('home-service-cooling.webp'));
   }
   const launcher=p2.getByRole('button',{name:'Chat with Ari'});
   assert.equal(await launcher.isVisible(),true);
   await launcher.click();
   const dialog=p2.getByRole('dialog',{name:'Ari, Pronto Air virtual assistant'});
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
  let deliveryCount=0,lastPayload=null,deliveryMode='reject',preflightCount=0;
  let directCount=0,directPayload=null;
  await context.route('https://formsubmit.co/**',async route=>{
    if(route.request().method()==='OPTIONS'){
      preflightCount++;
      return route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'POST,OPTIONS'}});
    }
    if(route.request().url().includes('/ajax/')){
      deliveryCount++;
      assert.match(route.request().headers()['content-type'],/application\/x-www-form-urlencoded/i,
        'Ari should use simple form encoding without an OPTIONS preflight');
      lastPayload=Object.fromEntries(new URLSearchParams(route.request().postData()));
      return route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},
        body:deliveryMode==='reject'?'{"success":"false"}':'{"success":"true"}'});
    }
    directCount++;
    assert.equal(route.request().method(),'POST','Native fallback must not place customer information in URL');
    directPayload=Object.fromEntries(new URLSearchParams(route.request().postData()));
    return route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><title>Simulated FormSubmit page (test only)</title>'});
  });
  // This segment verifies offline guidance and lead intake; it must never call live AI.
  await page.route(after.url+'/index.html',async route=>{
    const html=fs.readFileSync(path.join(root,'index.html'),'utf8')
      .replace(/ data-ai-endpoint="[^"]*"/,'');
    await route.fulfill({status:200,contentType:'text/html',body:html});
  });
  await page.goto(after.url+'/index.html',{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'Chat with Ari'}).click();
  await page.locator('#pa-guide-question').fill('¿Qué puedes explicarme tú?');
  await page.locator('.pa-guide-send').click();
  await page.waitForFunction(()=>document.querySelectorAll('.pa-guide-message.is-guide').length>0);
  assert.match(await page.locator('.pa-guide-message.is-guide').last().innerText(),/Soy Ari/i);
  await page.locator('#pa-guide-question').fill('john.smith@example.com');
  const n=await page.locator('.pa-guide-message').count();
  await page.locator('.pa-guide-send').click();
  assert.equal(await page.locator('.pa-guide-message').count(),n,'Personal info accepted into chat');
  await page.getByRole('button',{name:'Leave a Message'}).click();
  assert.equal(await page.locator('.pa-guide-lead').isVisible(),true);
  await page.locator('.pa-guide-lead-form button[type="submit"]').click();
  assert.equal(deliveryCount,0,'Empty lead submitted');
  await page.locator('.pa-guide-lead-form [name="name"]').fill('QA Visitor');
  await page.locator('.pa-guide-lead-form [name="phone"]').fill('9403123081');
  await page.locator('.pa-guide-lead-form [name="email"]').fill('qa@example.com');
  await page.locator('.pa-guide-lead-form [name="message"]').fill('Test only, please do not call.');
  await page.locator('.pa-guide-lead-form [name="service"]').selectOption('Residential Cooling');
  await page.locator('.pa-guide-lead-form [name="consent"]').check();
  // Even HTTP 200 is NOT success if the relay's JSON says success:false.
  await page.locator('.pa-guide-lead-form button[type="submit"]').click();
  await page.waitForFunction(()=>document.querySelector('.pa-guide-lead-status')?.textContent?.includes('We could not verify the request.'));
  assert.equal(deliveryCount,1,'Rejection did not reach the mocked provider');
  assert.equal(await page.locator('.pa-guide-lead-form [name="message"]').inputValue(),'Test only, please do not call.',
    'Failed request should preserve visitor data for retry');
  assert.equal(await page.locator('.pa-guide-lead-form button[type="submit"]').isEnabled(),true,
    'Failed request should release the submit button');
  assert.equal(await page.locator('.pa-guide-message.is-guide').count(),1,
    'Failed request displayed a false success message');
  assert.equal(preflightCount,0,'URL-encoded AJAX still triggered a blocked CORS preflight');
  const direct=page.locator('.pa-guide-lead-direct');
  assert.equal(await direct.isVisible(),true,'Direct fallback missing after provider rejected AJAX');
  const popupEvent=context.waitForEvent('page');
  await direct.click();
  const directPage=await popupEvent;
  await directPage.waitForLoadState('domcontentloaded');
  assert.equal(directCount,1,'Native fallback did not submit to FormSubmit');
  assert.equal(directPayload.name,'QA Visitor');
  assert.match(directPayload.message,/Test only/);
  assert.equal(directPayload.phone,'9403123081');
  assert.equal(await direct.isVisible(),false,'Direct fallback should hide after use');
  await directPage.close();
  // Reattempt with a mocked positive FormSubmit response. No actual email is sent.
  deliveryMode='accept';
  await page.locator('.pa-guide-lead-form button[type="submit"]').click();
  await page.waitForFunction(()=>document.querySelector('.pa-guide-lead-status')?.textContent?.includes('accepted by the form service'));
  assert.equal(deliveryCount,2);
  assert.equal(preflightCount,0,'Unexpected AJAX CORS preflight');
  assert.equal(lastPayload.name,'QA Visitor');
  assert.equal(lastPayload.phone,'9403123081');
  assert.equal(lastPayload.email,'qa@example.com');
  assert.equal(lastPayload.service,'Residential Cooling');
  assert.ok(lastPayload.source.includes('assistant'));
  assert.equal(lastPayload.callbackRequested.startsWith('Yes'),true);
  assert.equal(lastPayload._subject.includes('Pronto Air'),true);
  assert.equal(page.url(),after.url+'/index.html');
  console.log('PASS contact: no CORS preflight; native fallback POST; rejection preserves data; AJAX retry succeeds; no actual email sent');
  await context.close();

  const ai=await browser.newContext({viewport:{width:375,height:900},reducedMotion:'reduce'});
  const p=await ai.newPage();let modelCount=0,sentQuestions=[],mode='answer';
  await p.route(after.url+'/index.html?assistant-ai-test',async route=>{
   const html=fs.readFileSync(path.join(root,'index.html'),'utf8')
     .replace(/src="assets\/js\/pronto-assistant\.js"(?: data-ai-endpoint="[^"]*")?/,
       'src="assets/js/pronto-assistant.js" data-ai-endpoint="https://ai.example.test/chat"');
   await route.fulfill({status:200,contentType:'text/html',body:html});
  });
  await p.route('https://ai.example.test/chat',async route=>{
   if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type'}});
   modelCount++;sentQuestions.push(JSON.parse(route.request().postData()));
   const reply=mode==='spanish'
    ? {reply:'Podemos ayudarte con nuestros servicios de calefacción.',topic:'heating',offerContact:true,lang:'es'}
    : mode==='wrong-language'
    ? {reply:'Puedes dejarnos un mensaje para nuestro equipo.',topic:null,offerContact:true,lang:'en'}
    : {reply:'Hi! We can explain our heating and cooling services. Would you like to call us?',topic:null,offerContact:true,lang:'en'};
   await route.fulfill({status:mode==='fail'?503:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},
     body:mode==='fail'?'{"error":"quota"}':JSON.stringify(reply)});
  });
  await p.goto(after.url+'/index.html?assistant-ai-test',{waitUntil:'domcontentloaded'});
  await p.getByRole('button',{name:'Chat with Ari'}).click();
  await p.locator('#pa-guide-question').fill('What can you do?');
  await p.locator('.pa-guide-send').click();
  await p.waitForFunction(()=>document.querySelectorAll('.pa-guide-message.is-guide').length===1);
  assert.match(await p.locator('.pa-guide-message.is-guide').last().innerText(),/explain (?:our )?heating and cooling/i);
  assert.equal(modelCount,1);
  await p.waitForFunction(()=>!document.querySelector('.pa-guide-send').disabled);
  await p.locator('#pa-guide-question').fill('sí quiero dejar un mensaje');
  await p.locator('.pa-guide-send').click();
  await p.waitForFunction(()=>document.querySelectorAll('.pa-guide-message.is-guide').length===2);
  assert.match(await p.locator('.pa-guide-message.is-guide').last().innerText(),/nuestro equipo/i);
  assert.equal(modelCount,1,'Contact action should not use AI or depend on Cloudflare redeploy');
  // The previous Spanish exchange must not switch an English question to Spanish.
  await p.waitForFunction(()=>!document.querySelector('.pa-guide-send').disabled);
  await p.locator('#pa-guide-question').fill('My AC is not cooling. Can you help me?');
  await p.locator('.pa-guide-send').click();
  await p.waitForFunction(()=>document.querySelectorAll('.pa-guide-message.is-guide').length===3);
  assert.match(await p.locator('.pa-guide-message.is-guide').last().innerText(),/We can explain our heating/i);
  assert.equal(modelCount,2);
  assert.equal(sentQuestions[1].language,'en');
  assert.equal(sentQuestions[1].history.every(m=>!/dejarnos|nuestro equipo/i.test(m.content)),true,
    'Old Spanish history leaked into English request');
  mode='spanish';
  await p.waitForFunction(()=>!document.querySelector('.pa-guide-send').disabled);
  await p.locator('#pa-guide-question').fill('Necesito ayuda con mi calefacción');
  await p.locator('.pa-guide-send').click();
  await p.waitForFunction(()=>document.querySelectorAll('.pa-guide-message.is-guide').length===4);
  assert.match(await p.locator('.pa-guide-message.is-guide').last().innerText(),/Podemos ayudarte/i);
  assert.equal(sentQuestions[2].language,'es');
  mode='wrong-language';
  await p.waitForFunction(()=>!document.querySelector('.pa-guide-send').disabled);
  await p.locator('#pa-guide-question').fill('What heating services do you offer?');
  await p.locator('.pa-guide-send').click();
  await p.waitForFunction(()=>document.querySelectorAll('.pa-guide-message.is-guide').length===5);
  assert.match(await p.locator('.pa-guide-message.is-guide').last().innerText(),/Our residential heating services/i);
  assert.equal(sentQuestions[3].language,'en');
  mode='fail';
  await p.waitForFunction(()=>!document.querySelector('.pa-guide-send').disabled);
  await p.locator('#pa-guide-question').fill('My furnace is not heating');
  await p.locator('.pa-guide-send').click();
  await p.waitForFunction(()=>document.querySelectorAll('.pa-guide-message.is-guide').length===6);
  assert.match(await p.locator('.pa-guide-message.is-guide').last().innerText(),/Our residential heating services/i);
  assert.equal(modelCount,5);
  const requestsBefore=modelCount;
  await p.locator('#pa-guide-question').fill('My phone number is 9403123081');
  await p.locator('.pa-guide-send').click();
  assert.equal(modelCount,requestsBefore,'PII transferred to AI');
  assert.equal(sentQuestions.every(s=>!JSON.stringify(s).includes('9403123081')),true);
  // Exercise the real quick topic buttons via the same form/AI route.
  mode='answer';
  await p.waitForFunction(()=>!document.querySelector('.pa-guide-send').disabled);
  await p.getByRole('button',{name:'Cooling',exact:true}).click();
  await p.waitForFunction(()=>document.querySelectorAll('.pa-guide-message.is-guide').length===7);
  assert.equal(modelCount,6,'Cooling quick action bypassed the conversational backend');
  assert.match(sentQuestions[5].question,/residential cooling services/i);
  assert.equal(sentQuestions[5].language,'en');
  mode='fail';
  await p.waitForFunction(()=>!document.querySelector('.pa-guide-send').disabled);
  await p.getByRole('button',{name:'Maintenance',exact:true}).click();
  await p.waitForFunction(()=>document.querySelectorAll('.pa-guide-message.is-guide').length===8);
  assert.equal(modelCount,7,'Maintenance quick action did not attempt the backend');
  assert.match(await p.locator('.pa-guide-message.is-guide').last().innerText(),/maintenance service agreement/i);
  console.log('PASS bilingual switching, quick topics AI and 503 fallback, correct locale and PII exclusion');
  await ai.close();
  console.log('PASS ALL',checks,'viewport checks + 16 axe scans and follow-up / mocked AI flow');
 }finally{await browser.close();before.server.close();after.server.close();}
})().catch(e=>{console.error(e);process.exit(1);});
