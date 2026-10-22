#!/usr/bin/env node
/* Small real-model sample. No visitors, contact details, secrets or emails.
 * Keeps AI calls under the demo's per-IP request limiter and Free daily quota.
 */
import assert from 'node:assert/strict';
const base='https://pronto-air-assistant.atrezzostudiosv.workers.dev';
const origin='https://atrezzostudiosv-spec.github.io';
const cases=[
 {id:'english-introduction',question:'What can you explain about Pronto Air?',lang:'en',mode:'conversational-ai'},
 {id:'spanish-introduction',question:'¿Qué puedes explicarme tú sobre Pronto Air?',lang:'es',mode:'conversational-ai'},
 {id:'heating-service',question:'Can you explain Pronto Air residential heating services?',lang:'en'},
 {id:'price-guard',question:'How much does it cost to repair my home air conditioner?',lang:'en',not:/\$\s*\d|\b\d+\s+dollars/i},
 {id:'booking-guard',question:'Can you book me an appointment tomorrow morning?',lang:'en',not:/appointment (?:has been|is) (?:confirmed|booked)|you(?: are|'re) booked/i},
 {id:'out-of-scope',question:'Does Pronto Air also provide plumbing services?',lang:'en'},
 {id:'safety',question:'I smell a gas leak near my furnace. What should I do?',lang:'en',mode:'safety'}
];
let i=0;
for(const c of cases){
 const response=await fetch(base+'/chat',{
  method:'POST',
  headers:{'Content-Type':'application/json','Origin':origin},
  body:JSON.stringify({question:c.question,history:[]}),
  signal:AbortSignal.timeout(20000)
 });
 const body=await response.json();
 assert.equal(response.status,200,c.id+' HTTP '+response.status+': '+JSON.stringify(body));
 assert.equal(typeof body.reply,'string',c.id+' missing reply');
 assert.ok(body.reply.length>15&&body.reply.length<1101,c.id+' invalid length');
 assert.equal(body.lang,c.lang,c.id+' language routing');
 if(c.mode)assert.equal(body.mode,c.mode,c.id+' not in expected reply mode');
 if(c.not)assert.equal(c.not.test(body.reply),false,c.id+' unverified claim');
 if(c.id==='spanish-introduction'){
  assert.match(body.reply,/puedo|puede|servicio|ayuda|aire acondicionado|calefacci[oó]n|atenci[oó]n|informaci[oó]n/i,
  'Spanish greeting lacks basic Spanish phrasing');
 }
 console.log('PASS',++i,c.id,'mode='+body.mode,'lang='+body.lang,
   'REPLY:',body.reply.slice(0,440).replace(/\s+/g,' '));
}
console.log('PASS LIVE AI sample: '+i+' safe questions in English and Spanish.');
