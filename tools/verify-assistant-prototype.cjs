#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require('playwright');
const AxeBuilder=require('@axe-core/playwright').default;
const root=path.resolve(__dirname,'..');
const baseline=path.join(root,'.assistant-qa-baseline');
const pages=['index.html','residential-cooling.html','residential-heating.html',
  'mobile-homes.html','light-commercial.html','contact-us.html',
  'service-agreement-faqs.html','privacy-policy.html'];
const widths=[375,768,1024,1440];
function server(dir){
  return new Promise(done=>{
    const srv=http.createServer((req,res)=>{
      let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/, '')||'index.html';
      const file=path.resolve(dir,name);
      if(!file.startsWith(path.resolve(dir)+path.sep)){res.writeHead(403);return res.end('Forbidden');}
      const type={'.html':'text/html','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.png':'image/png'}[path.extname(file)]||'application/octet-stream';
      fs.readFile(file,(e,data)=>{
        res.writeHead(e?404:200,{'Content-Type':type});
        res.end(e?'Missing':data);
      });
    });
    srv.listen(0,'127.0.0.1',()=>done({srv,url:'http://127.0.0.1:'+srv.address().port}));
  });
}
async function getPage(browser,base,name,width){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(base+'/'+name,{waitUntil:'domcontentloaded',timeout:30000});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(220);
  return {page,context,errors};
}
(async()=>{
  const original=await server(baseline),newsite=await server(root);
  const browser=await chromium.launch({headless:true});
  const problems=[];
  try{
    for(const name of pages)for(const width of widths){
      const a=await getPage(browser,original.url,name,width);
      const b=await getPage(browser,newsite.url,name,width);
      const dims=async page=>page.evaluate(()=>{
        const sections=[...document.querySelectorAll('main section')].map(x=>{
          const r=x.getBoundingClientRect();return [r.x,r.y,r.width,r.height].map(n=>Math.round(n*10)/10);
        });
        return {headings:[...document.querySelectorAll('h1,h2,h3')].map(el=>el.textContent.trim()),
          sections,overflow:document.documentElement.scrollWidth-innerWidth,
          noindex:document.querySelector('meta[name=robots]')?.content,
          mainHeight:document.querySelector('main')?.getBoundingClientRect().height};
      });
      const oldDims=await dims(a.page),newDims=await dims(b.page);
      if(JSON.stringify(oldDims)!==JSON.stringify(newDims)) {
        console.log('GEOMETRY DETAIL',name,width,JSON.stringify({original:oldDims,new:newDims}));
        problems.push(name+' '+width+' layout/SEO geometry mismatch');
      }
      if(b.errors.length)problems.push(name+' '+width+' JS errors '+b.errors);
      const toggle=b.page.getByRole('button',{name:'Ask Pronto Air'});
      if(await toggle.count()!==1||!(await toggle.isVisible()))problems.push(name+' '+width+' launcher missing');
      await toggle.click();
      const dialog=b.page.getByRole('dialog',{name:'Pronto Air service guide'});
      if(!(await dialog.isVisible()))problems.push(name+' '+width+' dialog did not open');
      if(await toggle.getAttribute('aria-expanded')!=='true')problems.push(name+' '+width+' aria-expanded not true');
      const box=await dialog.boundingBox();
      if(!box||box.x<0||box.y<0||box.x+box.width>width+2||box.height<170||box.y+box.height>901)problems.push(name+' '+width+' dialogue out of view '+JSON.stringify(box));
      if(width===375||width===1440){
        const scan=await new AxeBuilder({page:b.page}).include('.pa-guide').withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
        if(scan.violations.length)problems.push(name+' '+width+' accessibility '+JSON.stringify(scan.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))));
      }
      await b.page.keyboard.press('Escape');
      if(await dialog.isVisible()||await toggle.getAttribute('aria-expanded')!=='false')problems.push(name+' '+width+' Escape close failed');
      console.log('VIEWPORT',name,width,'launcher/dialog/escape checked');
      await a.context.close();await b.context.close();
    }

    const obj=await getPage(browser,newsite.url,'index.html',375);
    const p=obj.page;
    await p.getByRole('button',{name:'Ask Pronto Air'}).click();
    const messageCount=()=>p.locator('.pa-guide-message').count();
    await p.getByRole('button',{name:'Mobile Homes',exact:true}).click();
    assert.equal(await messageCount(),2);
    assert.match(await p.locator('.pa-guide-message.is-guide').last().innerText(),/inspections, repairs and system replacement/i);
    assert.equal(await p.locator('.pa-guide-message.is-guide a').last().getAttribute('href'),'mobile-homes.html');
    await p.locator('#pa-guide-question').fill('Do you offer plumbing?');
    await p.locator('.pa-guide-send').click();
    assert.match(await p.locator('.pa-guide-message.is-guide').last().innerText(),/cannot confirm/i);
    await p.locator('#pa-guide-question').fill('How much does AC repair cost?');
    await p.locator('.pa-guide-send').click();
    assert.match(await p.locator('.pa-guide-message.is-guide').last().innerText(),/cannot confirm a price/i);
    await p.locator('#pa-guide-question').fill('Can I book an appointment tomorrow?');
    await p.locator('.pa-guide-send').click();
    assert.match(await p.locator('.pa-guide-message.is-guide').last().innerText(),/not booked or confirmed/i);
    await p.locator('#pa-guide-question').fill('test.user@example.com');
    const prev=await messageCount();
    await p.locator('.pa-guide-send').click();
    assert.equal(await messageCount(),prev);
    assert.match(await p.locator('#pa-guide-warning').innerText(),/do not enter names, phone numbers/i);
    assert.equal(await p.locator('.pa-guide-footer-links a').first().getAttribute('href'),'contact-us.html#contact-form-section');
    assert.deepEqual(obj.errors,[]);
    console.log('LOCAL GUIDANCE PASS: service, out-of-scope, pricing, booking, PII blocking and contact CTA');
    await obj.context.close();

    if(problems.length)throw new Error('REGRESSION FAILED:\n'+problems.join('\n'));
    console.log('PASS: 32/32 pages+widths with preserved geometry and usable widget; 16 Axe scans plus question tests.');
  } finally {
    await browser.close(); original.srv.close();newsite.srv.close();
  }
})().catch(e=>{console.error(e);process.exit(1)});
