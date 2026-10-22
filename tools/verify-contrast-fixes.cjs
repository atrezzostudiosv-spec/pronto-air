#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require('playwright');
const AxeBuilder=require('@axe-core/playwright').default;
const root=path.resolve(__dirname,'..');
const targets=['residential-cooling.html','residential-heating.html'];
const widths=[375,768,1024,1440];
function makeServer(dir){return new Promise(resolve=>{
 const srv=http.createServer((req,res)=>{
  const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/,'')||'index.html';
  const file=path.resolve(dir,rel);
  if(!file.startsWith(path.resolve(dir)+path.sep)){res.writeHead(403);return res.end();}
  const t={'.html':'text/html','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.png':'image/png'}[path.extname(file)]||'application/octet-stream';
  fs.readFile(file,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':t});res.end(e?'not found':b)});
 });
 srv.listen(0,'127.0.0.1',()=>resolve({srv,port:srv.address().port}));
})}
(async()=>{
 const old=await makeServer(path.join(root,'.a11y-baseline')),now=await makeServer(root),browser=await chromium.launch({headless:true});
 const fail=[];
 try{
  for(const f of targets)for(const width of widths){
    const views=[];
    for(const server of [old,now]){
      const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
      const jsErrors=[];page.on('pageerror',e=>jsErrors.push(String(e)));
      await page.goto('http://127.0.0.1:'+server.port+'/'+f,{waitUntil:'domcontentloaded'});
      await page.evaluate(()=>document.fonts.ready);
      const metrics=await page.evaluate(()=>{
       const headings=[...document.querySelectorAll('h1,h2,h3')].map(x=>x.textContent.trim());
       const sections=[...document.querySelectorAll('main section')].map(n=>{const r=n.getBoundingClientRect();return [r.x,r.y,r.width,r.height].map(x=>+x.toFixed(1))});
       return {headings,sections,overflow:document.documentElement.scrollWidth-innerWidth,noindex:document.querySelector('meta[name=robots]')?.content};
      });
      const scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze();
      views.push({metrics,scan:scan.violations.map(v=>({id:v.id,impact:v.impact,count:v.nodes.length,targets:v.nodes.map(n=>n.target)})),jsErrors});
      await page.close();
    }
    const [a,b]=views;
    if(JSON.stringify(a.metrics)!==JSON.stringify(b.metrics))fail.push(f+' '+width+': layout/heading/overflow changed');
    if(a.jsErrors.length||b.jsErrors.length)fail.push(f+' '+width+': JS errors '+JSON.stringify({before:a.jsErrors,after:b.jsErrors}));
    const beforeContrast=a.scan.filter(v=>v.id==='color-contrast').reduce((n,v)=>n+v.count,0);
    const afterContrast=b.scan.filter(v=>v.id==='color-contrast').reduce((n,v)=>n+v.count,0);
    if(afterContrast!==0)fail.push(f+' '+width+': remaining contrast issues '+JSON.stringify(b.scan));
    if(b.scan.length)fail.push(f+' '+width+': accessibility violations '+JSON.stringify(b.scan));
    if(f==='residential-cooling.html'&&beforeContrast!==5)fail.push(f+' '+width+': expected five baseline contrast defects but found '+beforeContrast);
    if(f==='residential-heating.html'&&beforeContrast!==1)fail.push(f+' '+width+': expected one baseline contrast defect but found '+beforeContrast);
    console.log('CHECK',f,width,'old contrast',beforeContrast,'new contrast',afterContrast,'layout match',JSON.stringify(a.metrics)===JSON.stringify(b.metrics));
  }
 }finally{await browser.close();old.srv.close();now.srv.close()}
 if(fail.length){console.error('FAIL\n'+fail.join('\n'));process.exit(1)}
 console.log('PASS 8/8 viewport tests; six previously found contrast violations fixed without affecting geometry.');
})().catch(e=>{console.error(e);process.exit(1)});
