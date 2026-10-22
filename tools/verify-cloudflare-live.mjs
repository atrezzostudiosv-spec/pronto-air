#!/usr/bin/env node
/* Remote smoke test: ONE harmless real AI query, no form data or personal details.
 * Usage: WORKER_URL=https://<real-deployment>.workers.dev node tools/verify-cloudflare-live.mjs
 */
import assert from 'node:assert/strict';

const input=(process.env.WORKER_URL||'').trim();
if(!input || !/^https:\/\/[a-z0-9.-]+\.workers\.dev\/?$/i.test(input)){
  throw new Error('WORKER_URL must be the REAL https://*.workers.dev base URL returned by Wrangler.');
}
const base=input.replace(/\/$/,'');
const allowedOrigin='https://atrezzostudiosv-spec.github.io';
async function withRetries(url,opts){
  for(let i=0;i<5;i++){
    try{
      const controller=AbortSignal.timeout(14000);
      const response=await fetch(url,{...opts,signal:controller});
      if(response.status<500||i===4)return response;
    }catch(error){if(i===4)throw error;}
    await new Promise(resolve=>setTimeout(resolve,1200));
  }
}
const health=await withRetries(base+'/health',{headers:{'Accept':'application/json'}});
assert.equal(health.status,200,'Worker /health is not responding');
const healthJson=await health.json();
assert.equal(healthJson.status,'ready');
assert.equal(healthJson.modelConfigured,true,'Cloudflare Workers AI binding is missing or disabled');
assert.equal(healthJson.conversationPath,'/chat');
console.log('PASS Worker health and AI binding on authenticated deployment URL');

const denied=await withRetries(base+'/chat',{
 method:'POST',
 headers:{'Content-Type':'application/json','Origin':'https://unauthorized.example'},
 body:JSON.stringify({question:'Hello, what can you do?'})
});
assert.equal(denied.status,403,'Untrusted origin unexpectedly allowed');
console.log('PASS invalid browser origin rejected');

const preflight=await withRetries(base+'/chat',{
 method:'OPTIONS',
 headers:{'Origin':allowedOrigin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type'}
});
assert.equal(preflight.status,204,'Browser CORS preflight failed');
assert.equal(preflight.headers.get('access-control-allow-origin'),allowedOrigin);
console.log('PASS official site origin authorized by CORS');

const response=await withRetries(base+'/chat',{
 method:'POST',
 headers:{'Content-Type':'application/json','Origin':allowedOrigin},
 body:JSON.stringify({question:'Hi, what can you help me with?',history:[]})
});
if(response.status!==200){
  const err=await response.text();
  throw new Error('Real Cloudflare AI response failed (HTTP '+response.status+'): '+err.slice(0,220));
}
const chat=await response.json();
assert.equal(chat.mode,'conversational-ai',
  'Model reply was rejected or replaced by fallback; review grounding and live model output');
assert.equal(typeof chat.reply,'string');
assert.ok(chat.reply.length>=12&&chat.reply.length<1101);
assert.equal(chat.offerContact,true);
assert.equal(chat.lang,'en');
assert.match(chat.reply,/Pronto|cooling|heating|HVAC|service|contact/i);
console.log('PASS real AI generated conversational English response, '+chat.reply.length+' characters.');
console.log('READY_TO_CONNECT '+base+'/chat');
