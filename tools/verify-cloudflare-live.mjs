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
// Initial Workers.dev routes may not be reachable immediately after the first deploy.
// Poll only the non-inference health endpoint. Never repeat an AI query just to
// cover DNS propagation, and never treat a 404 as proof of a successful deploy.
async function waitForHealth() {
  let lastDetail='not attempted';
  const maxAttempts=30;
  for(let attempt=1;attempt<=maxAttempts;attempt++){
    try{
      const response=await fetch(base+'/health',{
        headers:{'Accept':'application/json'},
        signal:AbortSignal.timeout(10000)
      });
      if(response.ok) {
        const body=await response.json();
        if(body?.status==='ready')return body;
        throw new Error('Unexpected /health JSON response');
      }
      const text=(await response.text()).slice(0,180).replace(/\s+/g,' ');
      lastDetail='HTTP '+response.status+'; '+text;
      if(![404,429,500,502,503,520,522,523].includes(response.status)){
        throw new Error('Unrecoverable /health response: '+lastDetail);
      }
    } catch (error) {
      lastDetail=String(error?.message||error).slice(0,220);
      if(lastDetail.startsWith('Unrecoverable'))throw error;
    }
    console.log('Worker route not ready ('+attempt+'/'+maxAttempts+'): '+lastDetail);
    if(attempt<maxAttempts)await new Promise(resolve=>setTimeout(resolve,5000));
  }
  throw new Error('Worker /health not ready after first-deploy checks: '+lastDetail+
    '. Verify that the workers.dev route is enabled in Cloudflare Workers & Pages,'+
    ' and that Wrangler deployed this Worker in the correct account.');
}
async function withRetries(url,opts){
  // This helper is used only after the health endpoint responds successfully.
  // Keep AI queries to a single real call so Free Neurons are not consumed by retries.
  return fetch(url,{...opts,signal:AbortSignal.timeout(22000)});
}
const healthJson=await waitForHealth();
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
