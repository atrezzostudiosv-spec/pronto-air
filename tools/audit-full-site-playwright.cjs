#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const {chromium}=require('playwright');
const AxeBuilder=require('@axe-core/playwright').default;
const base='https://atrezzostudiosv-spec.github.io/pronto-air/';
const pages=['index.html','residential-cooling.html','residential-heating.html',
  'mobile-homes.html','light-commercial.html','contact-us.html',
  'service-agreement-faqs.html','privacy-policy.html'];
const widths=[375,768,1024,1440];
const report={timestamp:new Date().toISOString(),target:base,checks:[],linkResults:[],axe:[],summary:{}};
async function run(){
 const browser=await chromium.launch({headless:true});
 try{
  const lookup=new Set();
  for(const filename of pages){
    let current=base+filename;
    try{
      const page=await browser.newPage();
      const res=await page.goto(current,{waitUntil:'domcontentloaded',timeout:30000});
      const hrefs=await page.locator('a[href]').evaluateAll(els=>els.map(el=>el.getAttribute('href')));
      for(const href of hrefs){
        if(!href||href.startsWith('#')||href.startsWith('tel:')||href.startsWith('mailto:'))continue;
        const url=new URL(href,current);
        if(url.origin===new URL(base).origin&&url.pathname.startsWith(new URL(base).pathname))lookup.add(url.href.split('#')[0]);
      }
      report.linkResults.push({url:current,http:res?.status(),linksFound:hrefs.length});
      await page.close();
    }catch(e){report.linkResults.push({url:current,error:String(e)});}
  }
  for(const url of lookup){
    try{
      const response=await fetch(url,{method:'GET',signal:AbortSignal.timeout(18000)});
      report.linkResults.push({url,http:response.status});
    }catch(e){report.linkResults.push({url,error:String(e)});}
  }
  for(const filename of pages)for(const width of widths){
    const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1,reducedMotion:'reduce'});
    const page=await context.newPage();
    const errors=[],missing=[],netfail=[];
    page.on('pageerror',e=>errors.push(String(e)));
    page.on('response',res=>{if(res.status()>=400 && !res.url().includes('favicon'))missing.push({status:res.status(),url:res.url()})});
    page.on('requestfailed',req=>{if(req.url().startsWith(base))netfail.push(req.url()+' '+req.failure()?.errorText)});
    const result={filename,width,okay:false};
    try{
      const response=await page.goto(base+filename,{waitUntil:'domcontentloaded',timeout:35000});
      await page.waitForTimeout(600);
      result.http=response?.status();
      const facts=await page.evaluate(()=>{
        const meta=document.querySelector('meta[name="robots"]');
        const body=document.body;
        const header=document.querySelector('header');
        const main=document.querySelector('main');
        const nodes=[...document.querySelectorAll('img')];
        return {
          title:document.title,
          h1:document.querySelectorAll('h1').length,
          h1Text:document.querySelector('h1')?.textContent?.trim().slice(0,120),
          desc:!!document.querySelector('meta[name="description"]'),
          noindex:meta?.content,
          width:innerWidth,
          horizontalOverflow:Math.max(0,document.documentElement.scrollWidth-innerWidth),
          headerVisible:!!header&&getComputedStyle(header).display!=='none',
          mainVisible:!!main&&getComputedStyle(main).display!=='none',
          imgCount:nodes.length,
          imgsWithoutAlt:nodes.filter(n=>!n.hasAttribute('alt')).map(n=>n.src),
          imagesWithoutDimensions:nodes.filter(n=>!n.hasAttribute('width')||!n.hasAttribute('height')).map(n=>n.src),
          usableLinkCount:document.querySelectorAll('a[href]').length,
          formCount:document.querySelectorAll('form').length,
          responsiveHint:!!document.querySelector('meta[name="viewport"]')
        };
      });
      Object.assign(result,facts);
      const menu=page.locator('#mobile-menu-btn');
      if(await menu.count() && await menu.isVisible()){
        result.mobileMenuTest='not tested';
        try{
          const nav=page.locator('#mobile-menu');
          await menu.click({timeout:2500});
          const expanded=await menu.getAttribute('aria-expanded');
          result.mobileMenuTest=(await nav.isVisible()) && expanded==='true'?'PASS':'FAIL';
          await menu.click({timeout:2500});
          result.mobileMenuClosed=(await nav.isHidden()) && await menu.getAttribute('aria-expanded')==='false';
        }catch(e){result.mobileMenuTest='FAIL '+String(e).slice(0,150);}
      }else result.mobileMenuTest='not visible';
      result.badImages=[];
      const imgs=await page.locator('img').all();
      for(let k=0;k<imgs.length;k++){
        try{
          if(await imgs[k].isVisible()){
            await imgs[k].scrollIntoViewIfNeeded({timeout:2500});
            await imgs[k].evaluate(img=>img.decode().catch(()=>{}),{timeout:5500});
            const imgdata=await imgs[k].evaluate(img=>({src:img.currentSrc||img.src,complete:img.complete,naturalWidth:img.naturalWidth}));
            if(!imgdata.complete||!imgdata.naturalWidth)result.badImages.push(imgdata);
          }
        }catch(e){result.badImages.push({index:k,error:String(e).slice(0,120)});}
      }
      if(filename==='service-agreement-faqs.html'){
        const q=page.locator('details summary').first();
        if(await q.count()){
          await q.click({timeout:3000});
          result.faqOpens=await q.evaluate(el=>el.closest('details')?.open);
        }else{result.faqOpens='no details element';}
      }
      if(filename==='index.html'){
        const carousel=page.locator('#services-cards-carousel');
        result.homeCarouselPresent=!!(await carousel.count());
      }
      result.scriptErrors=errors;
      result.httpErrors=missing;
      result.failedFirstPartyRequests=netfail;
      result.okay=result.http===200&&result.h1===1&&result.noindex==='noindex, nofollow'&&
        result.horizontalOverflow<=2&&result.badImages.length===0&&errors.length===0&&missing.length===0&&
        !String(result.mobileMenuTest).startsWith('FAIL')&&result.mobileMenuClosed!==false;
      console.log('PAGE',JSON.stringify({page:filename,width,http:result.http,overflow:result.horizontalOverflow,
        menu:result.mobileMenuTest,imagesFailed:result.badImages.length,errors:errors.length,HTTPerrors:missing.length,passed:result.okay}));
      if(width===375||width===1440){
        try{
          const scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze();
          report.axe.push({filename,width,violations:scan.violations.map(v=>({id:v.id,impact:v.impact,count:v.nodes.length,
            description:v.help,nodes:v.nodes.slice(0,5).map(n=>({target:n.target,summary:n.failureSummary?.slice(0,210)}))}))});
          console.log('AXE',filename,width,JSON.stringify(scan.violations.map(v=>({id:v.id,count:v.nodes.length,impact:v.impact}))));
        }catch(e){report.axe.push({filename,width,error:String(e).slice(0,300)});}
      }
    }catch(e){result.error=String(e).slice(0,350);console.log('PAGE-FAIL',filename,width,result.error)}
    report.checks.push(result);
    await context.close();
  }
  report.summary={total:report.checks.length,pass:report.checks.filter(x=>x.okay).length,
    fail:report.checks.filter(x=>!x.okay).map(x=>({page:x.filename,width:x.width,overflow:x.horizontalOverflow,
      menu:x.mobileMenuTest,badImages:x.badImages?.length,errors:x.scriptErrors,
      httpErrors:x.httpErrors,error:x.error})),
    accessibilityScans:report.axe.length,violations:report.axe.filter(x=>x.violations?.length).map(x=>({
      page:x.filename,width:x.width,issues:x.violations.map(z=>z.id+'('+z.count+')')
    })),linkProblems:report.linkResults.filter(x=>x.error||(x.http&&x.http>=400))
  };
  fs.mkdirSync('audit',{recursive:true});
  fs.writeFileSync('audit/protocol-browser-results.json',JSON.stringify(report,null,2));
  console.log('SUMMARY',JSON.stringify(report.summary));
 } finally{await browser.close();}
}
run().catch(e=>{console.error(e);process.exit(1)});
