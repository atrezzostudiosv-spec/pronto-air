#!/usr/bin/env node
/*
 * ATREZZO: activate the eight-page Worker URL only after real tests.
 * This script NEVER deploys, commits, publishes or handles contact data.
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const files=[
 'index.html','residential-cooling.html','residential-heating.html',
 'mobile-homes.html','light-commercial.html','contact-us.html',
 'service-agreement-faqs.html','privacy-policy.html'
];
const [url,operation]=process.argv.slice(2);
if(!url||!['--check','--apply'].includes(operation)){
 console.error('Usage: node tools/attach-pronto-ai-endpoint.mjs https://REAL-WORKER.workers.dev/chat --check|--apply');
 process.exit(2);
}
const endpoint=new URL(url);
if(endpoint.protocol!=='https:'|| !/^[a-z0-9.-]+\.workers\.dev$/i.test(endpoint.hostname) ||
 endpoint.pathname!=='/chat'||endpoint.search||endpoint.hash||endpoint.username||endpoint.password){
 throw new Error('Use only the verified HTTPS Cloudflare Worker /chat URL, without tokens.');
}
const loader='<script src="assets/js/pronto-assistant.js"></script>';
const activePattern=/<script src="assets\/js\/pronto-assistant\.js" data-ai-endpoint="[^"]*"><\/script>/g;
const activated='<script src="assets/js/pronto-assistant.js" data-ai-endpoint="'+endpoint.href+'"></script>';
const changes=files.map(file=>{
 const html=fs.readFileSync(path.join(root,file),'utf8');
 const plainCount=html.split(loader).length-1;
 const activeCount=[...html.matchAll(activePattern)].length;
 if(plainCount+activeCount!==1)throw new Error(file+': expected exactly one assistant script');
 if(!html.includes('<meta name="robots" content="noindex, nofollow">'))throw new Error(file+': preserve demo noindex');
 const next=plainCount===1?html.replace(loader,activated):html.replace(activePattern,activated);
 assert.equal(next.slice(0,next.indexOf('<main')),html.slice(0,html.indexOf('<main')),
  file+': unexpected head/content change');
 return {file,before:html,after:next,changed:html!==next};
});
console.log('Endpoint:',endpoint.href);
console.log('Mode:',operation,'Pages:',changes.length,'Changed:',changes.filter(c=>c.changed).length);
for(const entry of changes){
 console.log(entry.changed?'UPDATE':'UNCHANGED',entry.file);
 if(operation==='--apply'&&entry.changed)fs.writeFileSync(path.join(root,entry.file),entry.after);
}
if(operation==='--check')console.log('No files written. Run --apply only after the real Worker QA passes.');
