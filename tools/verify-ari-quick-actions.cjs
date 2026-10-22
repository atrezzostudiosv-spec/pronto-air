#!/usr/bin/env node
'use strict';
// Fast, dependency-free regression check of Ari's quick-topic interaction.
// This tests the actual event-handler block from the browser bundle, not a copy.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname,'..','assets/js/pronto-assistant.js'),'utf8');
const start = source.indexOf('const quick=[');
const end = source.indexOf('const callback=',start);
assert.ok(start>0 && end>start,'Quick action block not found');
const block = source.slice(start,end);
assert.ok(!/localResponse\s*\(/.test(block),'Quick topics bypass AI via local canned replies');
assert.ok(!/history\.push\s*\(/.test(block),'Quick topics bypass normal chat history');
const buttons=[];
const sent=[];
const input={value:''};
const send={disabled:false},panel={hidden:false},lead={hidden:true};
const options={append(button){buttons.push(button)}};
const document={createElement(tag){
 assert.equal(tag,'button');
 return {type:'',textContent:'',callbacks:{},addEventListener(event,callback){this.callbacks[event]=callback},click(){this.callbacks.click()}};
}};
const chatForm={requestSubmit(){sent.push(input.value)}};
vm.runInNewContext(block,{document,options,send,panel,lead,input,chatForm});
assert.deepEqual(buttons.map(x=>x.textContent),['Cooling','Heating','Mobile Homes','Commercial','Maintenance']);
for(const btn of buttons){btn.click();}
assert.equal(sent.length,5,'Every quick topic must submit the normal chat form');
assert.match(sent[0],/residential cooling services/i);
assert.match(sent[1],/residential heating services/i);
assert.match(sent[2],/mobile homes/i);
assert.match(sent[3],/light commercial/i);
assert.match(sent[4],/maintenance service agreement/i);
// No double sends during an active request, closed panel, or open lead form.
send.disabled=true;buttons[0].click();send.disabled=false;
panel.hidden=true;buttons[0].click();panel.hidden=false;
lead.hidden=false;buttons[0].click();lead.hidden=true;
assert.equal(sent.length,5,'Disabled/hidden states must prevent a new request');
assert.ok(source.includes("if(!endpoint)return localResponse(q,history);"),
 'Guided fallback must remain when Worker is unavailable');
assert.ok(source.includes("chatForm.addEventListener('submit'"),
 'Typed and quick queries must share the same submit listener');
console.log('PASS: all five Ari service topics submit through the existing AI/guided chat path; disabled states blocked.');