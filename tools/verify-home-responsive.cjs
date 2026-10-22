#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require('playwright');
const {PNG}=require('pngjs');
const pixelmatch=require('pixelmatch');
const root=path.resolve(__dirname,'..');
const original=path.join(root,'.image-compare','before');
const targets=['home-hero-mobile.webp','pronto-home-family-team.webp','home-maintenance-tuneup.webp'];
const widths=[375,768,1024,1440];
function server(dir) {
  return new Promise(resolve=>{
    const srv=http.createServer((req,res)=>{
      const pathname=decodeURIComponent(new URL(req.url,'http://localhost/').pathname);
      const fp=path.resolve(dir,'.'+pathname);
      if(!fp.startsWith(path.resolve(dir)+path.sep)){res.writeHead(403);return res.end('Forbidden');}
      const type=fp.endsWith('.html')?'text/html':fp.endsWith('.css')?'text/css':fp.endsWith('.js')?'text/javascript':fp.endsWith('.webp')?'image/webp':fp.endsWith('.png')?'image/png':'application/octet-stream';
      fs.readFile(fp,(err,data)=>{if(err){res.writeHead(404);return res.end('Not found')}res.setHeader('Content-Type',type);res.end(data)});
    });
    srv.listen(0,'127.0.0.1',()=>resolve({srv,port:srv.address().port}));
  });
}
async function inspect(browser,port,width,isAfter){
  const ctx=await browser.newContext({viewport:{width,height:860},deviceScaleFactor:width===375?1.75:1,reducedMotion:'reduce'});
  const page=await ctx.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:'+port+'/index.html',{waitUntil:'domcontentloaded',timeout:30000});
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForTimeout(250);
  const structure=await page.evaluate(()=>{
    const main=document.querySelector('main');
    const rect=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};};
    return {h1:[...document.querySelectorAll('h1')].map(x=>x.textContent.trim()),
      headings:[...document.querySelectorAll('h2')].map(x=>x.textContent.trim()),
      sections:[...document.querySelectorAll('main > section')].map(el=>({id:el.id,box:rect(el)})),
      overflow:document.documentElement.scrollWidth-innerWidth,
      mainHeight:main.getBoundingClientRect().height,
      noindex:document.querySelector('meta[name=robots]')?.content,
      cssPresent:!!document.querySelector('link[href="assets/css/index.min.css"]')};
  });
  const imgs={};
  for(const filename of targets){
    const el=page.locator('img[src="images/'+filename+'"]');
    await el.scrollIntoViewIfNeeded();
    await el.evaluate(img=>img.decode().catch(()=>{}));
    const data=await el.evaluate(img=>({src:img.getAttribute('src'),srcset:img.getAttribute('srcset'),chosen:img.currentSrc,loaded:img.complete&&img.naturalWidth>0,width:img.getBoundingClientRect().width,height:img.getBoundingClientRect().height}));
    const screenshot=await el.screenshot({animations:'disabled'});
    imgs[filename]={...data,screenshot};
  }
  await page.close();await ctx.close();
  return {structure,imgs,errors};
}
(async()=>{
  if(!fs.existsSync(path.join(original,'index.html')))throw new Error('Missing original HTML fixture');
  const before=await server(original),after=await server(root),browser=await chromium.launch({headless:true});
  const faults=[];
  try{
    for(const w of widths){
      const a=await inspect(browser,before.port,w,false),b=await inspect(browser,after.port,w,true);
      if(JSON.stringify(a.structure.h1)!==JSON.stringify(b.structure.h1)||JSON.stringify(a.structure.headings)!==JSON.stringify(b.structure.headings))faults.push(w+' headings modified');
      if(b.structure.noindex!=='noindex, nofollow'||!b.structure.cssPresent)faults.push(w+' preview protection/CSS regression');
      if(a.structure.sections.length!==b.structure.sections.length)faults.push(w+' section count changed');
      for(let i=0;i<Math.min(a.structure.sections.length,b.structure.sections.length);i++){
        const u=a.structure.sections[i].box,v=b.structure.sections[i].box;
        if(Object.keys(u).some(k=>Math.abs(u[k]-v[k])>2))faults.push(w+' layout changed at section '+i+': '+JSON.stringify({before:u,after:v}));
      }
      if(b.structure.overflow>a.structure.overflow+2)faults.push(w+' new horizontal overflow');
      if(b.errors.length)faults.push(w+' JS errors: '+b.errors.join('; '));
      for(const filename of targets){
        const u=a.imgs[filename],v=b.imgs[filename];
        if(!u.loaded||!v.loaded)faults.push(w+' failed image load '+filename);
        if(!v.srcset||!v.chosen.includes('/images/'))faults.push(w+' no responsive source '+filename);
        if(Math.abs(u.width-v.width)>1||Math.abs(u.height-v.height)>1)faults.push(w+' image geometry changed '+filename);
        const p=PNG.sync.read(u.screenshot),q=PNG.sync.read(v.screenshot);
        if(p.width!==q.width||p.height!==q.height){faults.push(w+' screenshot geometry mismatch '+filename);continue;}
        const diff=pixelmatch(p.data,q.data,null,p.width,p.height,{threshold:0.17})/(p.width*p.height);
        console.log(w+'px',filename,'source',v.chosen.split('/').pop(),'image difference',Math.round(diff*10000)/100+'%');
        if(diff>0.16)faults.push(w+' image degradation or crop mismatch '+filename+' '+(diff*100).toFixed(2)+'%');
      }
    }
  } finally {before.srv.close();after.srv.close();await browser.close();}
  if(faults.length){console.error('STOP: '+faults.join('\n'));process.exit(1);}
  console.log('PASS: four widths, unchanged document geometry/headings, correct responsive sources, screenshots and no added overflows.');
})().catch(e=>{console.error(e);process.exit(1)});
