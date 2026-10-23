#!/usr/bin/env node
'use strict';
// Transient, read-only diagnostic of the exact user-provided PageSpeed report.
const {chromium}=require('playwright');
const url='https://pagespeed.web.dev/analysis/https-atrezzostudiosv-spec-github-io-pronto-air-index-html/ug9ld0c7d7?hl=es&form_factor=mobile';
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  page.on('console',msg=>{if(msg.type()==='error')console.log('REPORT_PAGE_CONSOLE_ERROR',msg.text().slice(0,200))});
  const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
  console.log('REPORT_HTTP',response?.status(),'FINAL_URL',page.url());
  try{await page.getByText('Diagnostica problemas de rendimiento').first().waitFor({timeout:40000})}catch(e){console.log('REPORT_WAIT_DIAGNOSTICS_UNAVAILABLE',String(e).slice(0,200))}
  await page.waitForTimeout(3500);
  // Expand the actual detailed PageSpeed opportunities to identify specific files.
  const panels=[
    'Usar tiempos de vida de caché eficientes',
    'Mejorar la entrega de imágenes',
    'Solicitudes que bloquean el renderizado',
    'Reduce el contenido CSS que no se use',
    'Visualización de fuentes',
    'Desglose de LCP',
    'Árbol de dependencia de red',
    'Terceros'
  ];
  for(const label of panels){
   try{
    const item=page.getByText(label,{exact:false}).first();
    await item.click({timeout:4500});
    console.log('EXPANDED',label);
   }catch(e){console.log('EXPAND_FAILED',label,String(e).slice(0,150))}
  }
  await page.waitForTimeout(1100);
    const title=await page.title();
  const body=await page.locator('body').innerText({timeout:20000});
  console.log('REPORT_TITLE',title);
  console.log('REPORT_CHARS',body.length);
  console.log('EXACT_REPORT_TEXT_START\n'+body.slice(0,49000)+'\nEXACT_REPORT_TEXT_END');
 }finally{await browser.close()}
})().catch(e=>{console.error('REPORT_BROWSER_ERROR',String(e));process.exitCode=1});
