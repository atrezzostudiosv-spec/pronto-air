/* ATREZZO · Pronto Air conversational assistant.
 * A real Cloudflare Worker can answer via data-ai-endpoint="/chat".
 * Without a deployed Worker this is explicitly a guided, local fallback.
 * Contact requests go DIRECTLY to the existing temporary FormSubmit mailbox,
 * never through the language model.
 */
(()=>{'use strict';
const site='Pronto Air',phone='(940) 312-3081',phoneHref='tel:+19403123081';
const tempDestination='atrezzostudiosv@gmail.com';
const formRelay='https://formsubmit.co/ajax/'+tempDestination;
const endpoint=(document.currentScript?.dataset.aiEndpoint||'').trim();
const topics={
 cooling:{name:'Residential Cooling',href:'residential-cooling.html',
  en:'Pronto Air lists residential air conditioning repair, maintenance and installation, including central and ductless systems.',
  es:'Pronto Air ofrece reparación, mantenimiento e instalación de aire acondicionado residencial, incluidos sistemas centrales y sin conductos.'},
 heating:{name:'Residential Heating',href:'residential-heating.html',
  en:'Pronto Air lists residential heating inspections, repair, maintenance and new system installation.',
  es:'Pronto Air ofrece inspección, reparación, mantenimiento e instalación de sistemas de calefacción residencial.'},
 mobile:{name:'Mobile Home HVAC',href:'mobile-homes.html',
  en:'Pronto Air provides heating and cooling inspections, repair and system replacement for mobile homes.',
  es:'Pronto Air ofrece inspección, reparación y sustitución de sistemas de calefacción y aire acondicionado para casas móviles.'},
 commercial:{name:'Light Commercial HVAC',href:'light-commercial.html',
  en:'Pronto Air lists heating and cooling repair, service and new equipment installation for light commercial applications.',
  es:'Pronto Air ofrece reparación y servicio de climatización e instalación de equipos para aplicaciones comerciales ligeras.'},
 maintenance:{name:'Maintenance & Service Agreement',href:'service-agreement-faqs.html',
  en:'Pronto Air describes a maintenance service agreement that includes two tune-ups per year.',
  es:'Pronto Air describe un acuerdo de mantenimiento que incluye dos revisiones al año.'},
 faqs:{name:'Frequently Asked Questions',href:'service-agreement-faqs.html',
  en:'Pronto Air has answers about AC efficiency, equipment maintenance and indoor air quality.',
  es:'Pronto Air responde preguntas sobre eficiencia del aire acondicionado, mantenimiento y calidad del aire interior.'}
};
const pii=/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}|(?:\+?\d[\d ()-]{7,}\d)|\b(?:my address|street address|i live at|my name is|social security|ssn|mi direcci[oó]n|vivo en la calle)\b/i;
const forbiddenService=/\b(plumb(?:ing|er)|roof(?:ing|er)?|pest control|septic|landscap(?:ing|er)|pool cleaning|garage door)\b|fontaner[ií]a|techos y tejados/i;
const safety=/\b(gas leak|smell gas|gas odor|carbon monoxide|smoke from|sparks|fire)\b|olor a gas|fuga de gas|mon[oó]xido/i;
const msgPrice=/\b(price|prices|pricing|cost|how much|estimate|quote|discount)\b|precios?|cu[aá]nto cuesta|presupuesto/i;
const msgBooking=/\b(book|appointment|reservation|available today|available tomorrow|schedule|24.?7)\b|reservar|cita|disponibilidad|hoy mismo/i;
const msgGreeting=/^(?:\s*(?:hi|hello|hey|hola)[!?.\s]*)$|\b(what can you do|what can you tell me|who are you)\b|qu[eé] puede(?:s)?(?: explicarme| decirme| hacer)?|qu[eé] haces|que puedes explicarme/i;
const msgCall=/\b(call|phone|speak to|talk to|contact|number|telephone)\b|llamar|marcar|tel[eé]fono|hablar con/i;
const msgFollow=/\b(callback|call back|leave a message|send a message|follow up|contact me)\b|dejar (?:un )?mensaje|que me llamen|devuelvan la llamada|contacten/i;
const list=[
 ['mobile',/\b(mobile home|mobile homes|manufactured home)\b|casa m[oó]vil|casa prefabricada/i],
 ['commercial',/\b(commercial|business|store|office|rooftop units?)\b|comercial|negocio|oficina/i],
 ['maintenance',/\b(maintenance|tune.?up|service agreement|filter|seasonal)\b|mantenimiento|revisi[oó]n/i],
 ['heating',/\b(heat|heating|furnace|heat pump|heater|winter)\b|calefacci[oó]n|calentar/i],
 ['cooling',/\b(air conditioning|air conditioner|ac|a\/c|cool|cooling|cold air|ductless|summer)\b|aire acondicionado|enfri|refrigeraci[oó]n/i],
 ['faqs',/\b(faq|seer|efficiency|indoor air quality|lifespan)\b|preguntas frecuentes|eficiencia/i]
];
function inSpanish(s){return /\b(hola|qué|que|cómo|como|puedes|tengo|quiero|necesito|aire acondicionado|calefacción|llamar|mensaje|cita|precio|mantenimiento|tienen|gracias|español)\b/i.test(s);}
function availability(){
 const formatted=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
 const get=t=>formatted.find(x=>x.type===t)?.value;
 const weekday=get('weekday'),hour=+(get('hour')||0),minute=+(get('minute')||0);
 const weekdaySchedule=['Mon','Tue','Wed','Thu','Fri'].includes(weekday);
 return {weekday,afterHours:!weekdaySchedule||hour*60+minute<480||hour*60+minute>=1080,
  note:weekdaySchedule?
   'Published weekday hours: Monday–Friday, 8 AM–6 PM (Denton time). Actual availability is not confirmed.':
   'Published weekend hours: by appointment only. Actual availability is not confirmed.'};
}
function localResponse(input,history){
 const es=inSpanish(input)||history.slice(-2).some(x=>x.lang==='es');const lang=es?'es':'en';
 const av=availability();
 if(safety.test(input))return {reply:es?'Si hay peligro inmediato, por ejemplo posible fuga de gas, aléjate del área y llama a los servicios de emergencia o a la compañía de gas. Este chat no atiende emergencias.':'If there is immediate danger, such as a possible gas leak, leave the area and contact emergency services or the gas utility. This chat is not an emergency-response service.',topic:null,offerContact:true,lang};
 if(msgGreeting.test(input))return {reply:es?'Puedo explicarte los servicios confirmados de Pronto Air: aire acondicionado, calefacción, climatización de casas móviles, servicios comerciales ligeros y mantenimiento. También puedo ayudarte a contactar con el equipo. ¿Qué necesitas?':'I can explain Pronto Air’s verified services—cooling, heating, mobile home HVAC, light commercial HVAC and maintenance—and help you contact the team. What would you like help with?',topic:null,offerContact:false,lang};
 if(msgFollow.test(input))return {reply:es?'Puedes dejar tus datos y una descripción de tu solicitud para que el equipo tenga la información. Es una solicitud de contacto, no una cita confirmada.':'You can leave your contact details and a short description for follow-up. This sends a request; it does not book an appointment.',topic:null,offerContact:true,lang};
 if(msgCall.test(input))return {reply:(es?'Puedes llamar al '+phone+'. ¿Prefieres marcar ahora o dejar una solicitud para seguimiento?':'You can call '+phone+'. Would you prefer to dial now or leave a follow-up request?'),topic:null,offerContact:true,lang};
 if(msgPrice.test(input))return {reply:es?'No tengo un precio confirmado para tu caso. Pronto Air puede darte información si explicas tu solicitud. ¿Quieres llamar o dejar un mensaje?':'I do not have a verified price for your situation. Please contact Pronto Air with details so the team can respond. Would you like to call or leave a message?',topic:null,offerContact:true,lang};
 if(msgBooking.test(input))return {reply:es?'No puedo consultar disponibilidad ni reservar una cita. Puedes llamar o dejar una solicitud para que el equipo la revise.':'I cannot check real-time availability or book appointments. You can call or send a request for the team to review.',topic:null,offerContact:true,lang};
 if(forbiddenService.test(input))return {reply:es?'No encuentro ese servicio entre los servicios publicados de Pronto Air y prefiero no confirmarlo. ¿Quieres consultar directamente al equipo?':'That service is not among the published Pronto Air services I can verify, so I cannot confirm it. Would you like to contact the team?',topic:null,offerContact:true,lang};
 for(const [key,rx] of list)if(rx.test(input)){
   const t=topics[key];
   return {reply:t[lang]+(es?' ¿Quieres más información, llamar o dejar una solicitud?':' Would you like more details, to call, or to leave a request?'),topic:key,offerContact:true,lang};
 }
 if(av.afterHours)return {reply:es?'No puedo confirmar esa información. Fuera del horario habitual indicado puedes dejar una solicitud para seguimiento o consultar los servicios disponibles.':'I cannot confirm that detail. Outside the published weekday hours, you can leave a follow-up request or explore the listed services.',offerContact:true,lang};
 return {reply:es?'No puedo confirmar ese detalle a partir de la información publicada. Cuéntame si necesitas aire acondicionado, calefacción u otro servicio listado; también puedes contactar al equipo.':'I cannot confirm that detail from the published information. Tell me whether you need cooling, heating or another listed service, or contact the team directly.',offerContact:true,lang};
}
const root=document.createElement('div');
root.className='pa-guide';
root.innerHTML=[
 '<button type="button" class="pa-guide-launcher" aria-haspopup="dialog" aria-expanded="false" aria-controls="pa-guide-panel">',
 '<span class="pa-guide-launcher-mark" aria-hidden="true"><i class="fa-regular fa-comments"></i></span><span>Ask Pronto Air</span></button>',
 '<section class="pa-guide-panel" id="pa-guide-panel" role="dialog" aria-label="Pronto Air service assistant" aria-modal="false" hidden>',
 '<header class="pa-guide-top"><span class="pa-guide-brand-icon" aria-hidden="true"><i class="fa-regular fa-comments"></i></span>',
 '<span class="pa-guide-heading"><strong>How can we help?</strong><small class="pa-guide-mode"></small></span>',
 '<button type="button" class="pa-guide-close" aria-label="Close assistant"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button></header>',
 '<div class="pa-guide-scroll" tabindex="0">',
 '<div class="pa-guide-intro">Ask a question about Pronto Air, call the team or leave a follow-up request. No appointments are confirmed in chat.</div>',
 '<div class="pa-guide-hours"></div>',
 '<div class="pa-guide-messages" aria-live="polite" aria-relevant="additions"></div>',
 '<div class="pa-guide-options" aria-label="Common questions"></div>',
 '<div class="pa-guide-lead" hidden>',
 '<div class="pa-guide-lead-head"><strong>Request a Follow-up</strong><button type="button" class="pa-guide-lead-cancel">Back to chat</button></div>',
 '<p class="pa-guide-lead-copy">Leave your details and a brief description. Sending this request does not confirm an appointment or response time.</p>',
 '<form class="pa-guide-lead-form">',
 '<label>Your name <span aria-hidden="true">*</span><input name="name" type="text" autocomplete="name" maxlength="100" required></label>',
 '<label>Phone number <span aria-hidden="true">*</span><input name="phone" type="tel" autocomplete="tel" maxlength="35" required></label>',
 '<label>Email (optional)<input name="email" type="email" autocomplete="email" maxlength="130"></label>',
 '<label>Service needed<select name="service"><option value="Not selected">Select a service</option><option value="Residential Cooling">Residential Cooling</option><option value="Residential Heating">Residential Heating</option><option value="Mobile Homes">Mobile Homes</option><option value="Light Commercial">Light Commercial</option><option value="Maintenance">Maintenance</option></select></label>',
 '<label>How can we help? <span aria-hidden="true">*</span><textarea name="message" rows="3" maxlength="1400" required></textarea></label>',
 '<label class="pa-guide-consent"><input name="consent" type="checkbox" required><span>I agree to send my information through FormSubmit to the temporary Atrezzo project inbox for follow-up. <a href="privacy-policy.html">Privacy information</a>.</span></label>',
 '<div class="pa-guide-honey" aria-hidden="true"><label>Leave blank<input name="_honey" type="text" autocomplete="off" tabindex="-1"></label></div>',
 '<button type="submit" class="pa-guide-lead-send">Send Request</button>',
 '<p class="pa-guide-lead-status" role="status" aria-live="polite"></p>',
 '</form></div></div>',
 '<form class="pa-guide-form" novalidate>',
 '<label class="pa-guide-input-label" for="pa-guide-question">Ask a question <span>(no personal details here)</span></label>',
 '<div class="pa-guide-input-wrap"><input id="pa-guide-question" type="text" maxlength="300" autocomplete="off" placeholder="How can Pronto Air help me?">',
 '<button type="submit" class="pa-guide-send" aria-label="Send question"><i class="fa-solid fa-arrow-right" aria-hidden="true"></i></button></div>',
 '<div class="pa-guide-warning" role="status"></div>',
 '<div class="pa-guide-footer-links"><a href="'+phoneHref+'" class="pa-guide-phone">Call '+phone+'</a><button type="button" class="pa-guide-contact">Leave a Message</button></div>',
 '<p class="pa-guide-footnote">Information only · No diagnosis, emergency service or confirmed booking</p></form>',
 '</section>'
].join('');
document.body.append(root);
const one=x=>root.querySelector(x);
const launcher=one('.pa-guide-launcher'),panel=one('.pa-guide-panel'),close=one('.pa-guide-close'),
 scroll=one('.pa-guide-scroll'),messages=one('.pa-guide-messages'),options=one('.pa-guide-options'),
 input=one('#pa-guide-question'),warning=one('.pa-guide-warning'),send=one('.pa-guide-send'),
 chatForm=one('.pa-guide-form'),lead=one('.pa-guide-lead'),leadForm=one('.pa-guide-lead-form'),
 leadStatus=one('.pa-guide-lead-status');
one('.pa-guide-mode').textContent=endpoint?'AI-powered assistance':'Service assistant · guided mode';
one('.pa-guide-hours').textContent=availability().note;
const history=[];let request=null,turns=0,requestCount=0;
function open(){panel.hidden=false;launcher.setAttribute('aria-expanded','true');launcher.classList.add('is-open');input.focus({preventScroll:true});}
function closePanel(){panel.hidden=true;launcher.setAttribute('aria-expanded','false');launcher.classList.remove('is-open');request?.abort();request=null;send.disabled=false;launcher.focus({preventScroll:true});}
launcher.addEventListener('click',()=>panel.hidden?open():closePanel());
close.addEventListener('click',closePanel);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden)closePanel();});
function message(type,content,topic=null,actions=false){
 const box=document.createElement('div');box.className='pa-guide-message '+(type==='user'?'is-visitor':'is-guide');
 const text=document.createElement('p');text.textContent=content;box.append(text);
 if(type==='assistant'&&(topic&&topics[topic]||actions)){
  const buttons=document.createElement('div');buttons.className='pa-guide-message-actions';
  if(topic&&topics[topic]){const a=document.createElement('a');a.href=topics[topic].href;a.textContent='Service details';buttons.append(a);}
  if(actions){
   const a=document.createElement('a');a.href=phoneHref;a.textContent='Call now';buttons.append(a);
   const b=document.createElement('button');b.type='button';b.textContent='Leave a request';b.addEventListener('click',openLead);buttons.append(b);
  }
  box.append(buttons);
 }
 messages.append(box);box.scrollIntoView({block:'nearest',behavior:'instant'});
}
function openLead(){
 lead.hidden=false;chatForm.hidden=true;options.hidden=true;leadStatus.textContent='';
 if(!leadForm.elements.message.value.trim()){
  const last=history.filter(m=>m.role==='user').slice(-1)[0];
  if(last)leadForm.elements.message.value=last.content.slice(0,300);
 }
 lead.scrollIntoView({block:'nearest',behavior:'instant'});
 leadForm.elements.name.focus({preventScroll:true});
}
function returnToChat(){lead.hidden=true;chatForm.hidden=false;options.hidden=false;input.focus({preventScroll:true});}
one('.pa-guide-contact').addEventListener('click',openLead);
one('.pa-guide-lead-cancel').addEventListener('click',returnToChat);
const quick=[['Cooling','cooling'],['Heating','heating'],['Mobile Homes','mobile'],['Commercial','commercial'],['Maintenance','maintenance']];
quick.forEach(([name,key])=>{
 const button=document.createElement('button');button.type='button';button.textContent=name;
 button.addEventListener('click',()=>{
  const result=localResponse(name==='Commercial'?'light commercial':name,history);
  message('user',name);message('assistant',result.reply,key,true);
  history.push({role:'user',content:name,lang:result.lang},{role:'assistant',content:result.reply,lang:result.lang});
  history.splice(0,Math.max(0,history.length-8));
 });options.append(button);
});
const callback=document.createElement('button');callback.type='button';callback.textContent='Request a call back';callback.addEventListener('click',openLead);options.append(callback);
async function respond(q,signal){
 if(!endpoint)return localResponse(q,history);
 const safeHistory=history.filter(m=>!pii.test(m.content)).slice(-6).map(m=>({role:m.role,content:m.content.slice(0,300)}));
 const res=await fetch(endpoint,{method:'POST',mode:'cors',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({question:q,history:safeHistory}),signal});
 if(!res.ok)throw new Error('assistant unavailable');
 const obj=await res.json();
 if(typeof obj.reply!=='string'||obj.reply.length>1100)throw new Error('invalid response');
 const key=typeof obj.topic==='string'&&topics[obj.topic]?obj.topic:null;
 return {reply:obj.reply,topic:key,offerContact:obj.offerContact===true,lang:obj.lang==='es'?'es':'en'};
}
chatForm.addEventListener('submit',async e=>{
 e.preventDefault();const q=input.value.trim();warning.textContent='';
 if(!q)return;
 if(pii.test(q)){warning.textContent='Please use Leave a Message for contact details. Do not enter them in chat.';return;}
 if(turns>=10){warning.textContent='Please call or leave a message for further help.';return;}
 message('user',q);input.value='';turns++;const controller=new AbortController();request=controller;send.disabled=true;
 const fallback=localResponse(q,history);const timer=setTimeout(()=>controller.abort(),8000);
 try{
  const reply=safety.test(q)?fallback:await respond(q,controller.signal);
  if(!panel.hidden){message('assistant',reply.reply,reply.topic,reply.offerContact);history.push({role:'user',content:q,lang:reply.lang},{role:'assistant',content:reply.reply,lang:reply.lang});history.splice(0,Math.max(0,history.length-8));}
 }catch{
  if(!panel.hidden){message('assistant',fallback.reply,fallback.topic,fallback.offerContact);
   if(endpoint)warning.textContent='AI response unavailable. Basic guidance is available.';
   history.push({role:'user',content:q,lang:fallback.lang},{role:'assistant',content:fallback.reply,lang:fallback.lang});history.splice(0,Math.max(0,history.length-8));}
 }finally{clearTimeout(timer);send.disabled=false;if(request===controller)request=null;}
});
leadForm.addEventListener('submit',async e=>{
 e.preventDefault();leadStatus.textContent='';if(!leadForm.reportValidity())return;
 if(requestCount>=2){leadStatus.textContent='For more requests, please contact Pronto Air directly.';return;}
 const data=Object.fromEntries(new FormData(leadForm).entries());
 if(data._honey)return;
 if(!/^[+\d ()-]{7,35}$/.test(data.phone||'')){leadStatus.textContent='Enter a valid phone number.';return;}
 if((data.message||'').trim().length<8){leadStatus.textContent='Please add a short description of your request.';return;}
 if(data.consent!=='on'){leadStatus.textContent='Please confirm consent to send this request.';return;}
 const av=availability();
 const payload={
  _subject:'Pronto Air — Assistant follow-up request'+(av.afterHours?' (Outside published weekday hours)':''),
  _url:location.href.split('#')[0],
  _honey:'',
  source:'Website service assistant',
  publishedHoursContext:av.note,
  callbackRequested:'Yes — please contact visitor, if and when available',
  name:data.name.trim(),phone:data.phone.trim(),email:(data.email||'').trim(),
  service:data.service||'Not selected',message:data.message.trim()
 };
 const button=leadForm.querySelector('button[type=submit]');button.disabled=true;
 leadStatus.textContent='Sending request…';
 try{
  const res=await fetch(formRelay,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(payload)});
  const result=await res.json();
  if(!res.ok||!(result.success===true||result.success==='true'))throw new Error('relay rejected');
  requestCount++;leadForm.reset();
  leadStatus.textContent='Your request was accepted by the form service. This is not a confirmed appointment. For urgent concerns, call Pronto Air directly.';
  message('assistant','A follow-up request was submitted to the form service. This does not confirm an appointment or response time.',null,false);
 }catch{leadStatus.textContent='We could not verify the request. Please call Pronto Air directly at '+phone+' or use the Contact page. Your information is still in the form.';}
 finally{button.disabled=false;}
});
})();
