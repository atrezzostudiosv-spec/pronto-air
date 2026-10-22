#!/usr/bin/env node
'use strict';
// Rebuild static Tailwind v3 CSS after changes to HTML classes.
// Each page retains its original theme in tools/tailwind-themes/*.cjs.
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const pages=['index.html','residential-cooling.html','residential-heating.html','mobile-homes.html','light-commercial.html','contact-us.html','service-agreement-faqs.html','privacy-policy.html'];
const output=path.join(root,'assets','css');
const tmp=path.join(root,'.tailwind-compare','config');
fs.mkdirSync(output,{recursive:true});
fs.mkdirSync(tmp,{recursive:true});
const source=path.join(tmp,'input.css');
fs.writeFileSync(source,'@tailwind base;\n@tailwind components;\n@tailwind utilities;\n');
for(const page of pages){
  const slug=page.replace(/\.html$/,'');
  const theme=path.join(root,'tools','tailwind-themes',slug+'.cjs');
  if(!fs.existsSync(theme))throw new Error('Missing theme snapshot for '+page);
  const config=path.join(tmp,slug+'.config.cjs');
  fs.writeFileSync(config,'const theme=require('+JSON.stringify(theme)+');\nmodule.exports=Object.assign({},theme,{content:['+JSON.stringify('./'+page)+']});\n');
  const cssName=slug+'.min.css';
  const out=path.join(output,cssName);
  execFileSync(path.join(root,'node_modules','.bin','tailwindcss'),['-i',source,'-o',out,'-c',config,'--minify'],{cwd:root,stdio:'inherit'});
  const filename=path.join(root,page);
  let html=fs.readFileSync(filename,'utf8');
  const cdn=/<script\s+src=["']https:\/\/cdn\.tailwindcss\.com\/?["']\s*><\/script>/i;
  const oldConfig=/<script>\s*tailwind\.config\s*=\s*[\s\S]*?<\/script>/i;
  const cssLink='<link rel="stylesheet" href="assets/css/'+cssName+'">';
  if(cdn.test(html)){
    const fa=/<link\b[^>]*href=["']https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/font-awesome\/[^"']+["'][^>]*>/i;
    if(!fa.test(html)||!oldConfig.test(html))throw new Error('Legacy Tailwind integration incomplete: '+page);
    html=html.replace(cdn,'')
      .replace(oldConfig,'<!-- Static Tailwind CSS built from tools/tailwind-themes -->')
      .replace(fa,tag=>tag+'\n    '+cssLink);
    fs.writeFileSync(filename,html);
  }else if(!html.includes(cssLink)){
    throw new Error('Expected compiled CSS link missing: '+page);
  }
  console.log('CSS ready:',page,(fs.statSync(out).size/1024).toFixed(1)+' KB');
}
