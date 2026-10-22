#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
// Import Worker ESM via data URI without changing the root static package type.
(async()=>{
  const filename=path.join(__dirname,'..','assistant-worker','src','index.js');
  const code=fs.readFileSync(filename,'utf8');
  const worker=(await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))).default;
  const origin='https://atrezzostudiosv-spec.github.io';
  let prompts=0;
  const env={
    ALLOWED_ORIGINS:origin,
    AI:{run:async(_model,config)=>{prompts++;assert.ok(config.max_tokens<=12);return {response:'mobile'};}},
    REQUEST_LIMITER:{limit:async()=>({success:true})}
  };
  function post(value,overrides={}){
    return new Request('https://example.workers.dev/classify',{
      method:'POST',headers:{'Origin':origin,'Content-Type':'application/json',...overrides},
      body:JSON.stringify({question:value})});
  }
  let res=await worker.fetch(post('Do you service mobile homes?'),env);
  assert.equal(res.status,200);assert.deepEqual(await res.json(),{intent:'mobile',source:'workers-ai-classifier'});
  assert.equal(res.headers.get('Access-Control-Allow-Origin'),origin);
  assert.equal(prompts,1);
  res=await worker.fetch(post('My email is test@example.com'),env);
  assert.equal(res.status,422);assert.equal(prompts,1);
  res=await worker.fetch(post('Call me at 9403123081'),env);
  assert.equal(res.status,422);assert.equal(prompts,1);
  res=await worker.fetch(post('How are you?',{'Origin':'https://untrusted.example'}),env);
  assert.equal(res.status,403);assert.equal(prompts,1);
  const limited={...env,REQUEST_LIMITER:{limit:async()=>({success:false})}};
  res=await worker.fetch(post('Mobile home HVAC'),limited);
  assert.equal(res.status,429);assert.equal(prompts,1);
  const fail={...env,AI:{run:async()=>{throw Error('Free quota hit');}}};
  res=await worker.fetch(post('Mobile home HVAC'),fail);
  assert.equal(res.status,503);
  const absent={...env,AI:null};
  res=await worker.fetch(post('Mobile home HVAC'),absent);
  assert.equal(res.status,503);
  const bad={...env,AI:{run:async()=>({response:'Pronto Air gives 24/7 service and $50 prices'})}};
  res=await worker.fetch(post('Tell me about mobile homes'),bad);
  assert.equal(res.status,200);assert.equal((await res.json()).intent,'unknown');
  res=await worker.fetch(new Request('https://example.workers.dev/classify',{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST'}}),env);
  assert.equal(res.status,204);
  res=await worker.fetch(new Request('https://example.workers.dev/health'),env);
  assert.equal((await res.json()).modelConfigured,true);
  console.log('PASS: Cloudflare Worker origin, PII, rate limit, Free quota error, model output whitelist, CORS and health checks');
})().catch(e=>{console.error(e);process.exit(1)});
