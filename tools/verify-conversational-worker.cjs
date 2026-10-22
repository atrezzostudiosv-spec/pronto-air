#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const js=fs.readFileSync(path.join(__dirname,'..','assistant-worker/src/index.js'),'utf8');
 const worker=(await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'))).default;
 const origin='https://atrezzostudiosv-spec.github.io';
 const modelMessages=[];
 const env={ALLOWED_ORIGINS:origin,
  AI:{run:async(model,options)=>{modelMessages.push(options.messages);assert.equal(options.temperature<=.2,true);return {response:'Hello! We provide residential cooling repairs and maintenance. Would you like to call us or leave our team a request?'};}},
  REQUEST_LIMITER:{limit:async()=>({success:true})}
 };
 const post=(question,history=[],site=origin)=>new Request('https://pronto.example.workers.dev/chat',{method:'POST',headers:{'Content-Type':'application/json','Origin':site},body:JSON.stringify({question,history})});
 const ok=await worker.fetch(post('Do you repair home AC?'),env);
 assert.equal(ok.status,200);const value=await ok.json();
 assert.match(value.reply,/We provide residential cooling/i);
 assert.equal(value.topic,'cooling');assert.equal(value.offerContact,true);
 assert.equal(ok.headers.get('Access-Control-Allow-Origin'),origin);
 assert.equal(modelMessages.length,1);
 assert.match(JSON.stringify(modelMessages[0]),/Your name is Ari/);
 assert.match(JSON.stringify(modelMessages[0]),/company voice/);
 const follow=await worker.fetch(post('sí quiero dejar un mensaje'),env);
 const followJson=await follow.json();
 assert.equal(followJson.mode,'guided-contact');
 assert.equal(followJson.offerContact,true);
 assert.equal(followJson.lang,'es');
 assert.match(followJson.reply,/dejarnos un mensaje a nuestro equipo/i);
 assert.equal(modelMessages.length,1,'Contact request unnecessarily used AI model');
 const drift=await worker.fetch(post('Tell me about heating services'),{...env,AI:{run:async()=>({response:'Pronto Air offers services on their website.'})}});
 assert.equal((await drift.json()).mode,'safe-fallback','Third-person voice should not be shown');
 assert.ok(JSON.stringify(modelMessages[0]).includes('FACTS:'));
 // Current visitor language overrides older turns and model responses.
 const previousSpanish=[
  {role:'user',content:'Hola, necesito ayuda con la calefacción'},
  {role:'assistant',content:'Podemos ayudarte con nuestros servicios de calefacción.'}
 ];
 const switched=await worker.fetch(post('My AC is not cooling. Can you help me?',previousSpanish),env);
 const switchedBody=await switched.json();
 assert.equal(switchedBody.mode,'conversational-ai');
 assert.equal(switchedBody.lang,'en');
 assert.match(switchedBody.reply,/We provide residential cooling/i);
 const switchedMessages=modelMessages.at(-1);
 assert.match(switchedMessages[0].content,/RESPONSE LANGUAGE: ENGLISH/);
 assert.equal(switchedMessages.length,2,'Spanish messages leaked into the English model prompt');
 const spanishEnv={...env,AI:{run:async(_model,args)=>{
  assert.match(args.messages[0].content,/RESPONSE LANGUAGE: SPANISH/);
  return {response:'Podemos ayudarte con nuestros servicios de calefacción.'};
 }}};
 const spanishAnswer=await worker.fetch(post('Hola, necesito ayuda con la calefacción'),spanishEnv);
 const spanishJson=await spanishAnswer.json();
 assert.equal(spanishJson.lang,'es');assert.equal(spanishJson.mode,'conversational-ai');
 const wrongLang=await worker.fetch(post('My AC is not cooling. Can you help me?'),
  {...env,AI:{run:async()=>({response:'Puedes dejarnos un mensaje para nuestro equipo.'})}});
 const wrongJson=await wrongLang.json();
 assert.equal(wrongJson.mode,'safe-fallback','Spanish generated for English visitor must be rejected');
 assert.equal(wrongJson.lang,'en');
 assert.match(wrongJson.reply,/our confirmed services/i);
 const explicit=await worker.fetch(post('Please answer in Spanish: what heating services do you offer?'),spanishEnv);
 assert.equal((await explicit.json()).lang,'es');
 assert.equal((await worker.fetch(post('My phone is 9403123081'),env)).status,422);
 assert.equal((await worker.fetch(post('Hello',[{role:'user',content:'john@example.com'}]),env)).status,422);
 assert.equal((await worker.fetch(post('Hello',[],'https://evil.example'),env)).status,403);
 assert.equal((await worker.fetch(post('Need heating help'),{...env,REQUEST_LIMITER:{limit:async()=>({success:false})}})).status,429);
 assert.equal((await worker.fetch(post('Need heating help'),{...env,AI:null})).status,503);
 assert.equal((await worker.fetch(post('Need heating help'),{...env,AI:{run:async()=>{throw Error('quota')}}})).status,503);
 const bad=await worker.fetch(post('How much to repair AC?'),{...env,AI:{run:async()=>({response:'Our guaranteed repairs cost $45 and we provide 24/7 service.'})}});
 assert.equal(bad.status,200);assert.equal((await bad.json()).mode,'safe-fallback');
 const safe=await worker.fetch(post('I smell gas in my home'),env);
 assert.equal(safe.status,200);assert.equal((await safe.json()).mode,'safety');
 const opt=await worker.fetch(new Request('https://pronto.example.workers.dev/chat',{method:'OPTIONS',headers:{'Origin':origin}}),env);assert.equal(opt.status,204);
 const health=await worker.fetch(new Request('https://pronto.example.workers.dev/health'),env);
 assert.equal((await health.json()).modelConfigured,true);
 console.log('PASS Worker conversational tests including language switching, wrong-language fallback, grounded prompt, model response, PII, CORS, limits, quota, suspicious output and safety');
})().catch(e=>{console.error(e);process.exit(1)});
