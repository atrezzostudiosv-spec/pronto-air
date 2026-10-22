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
  en:'We offer residential air conditioning repair, maintenance and installation, including central and ductless systems.',
  es:'Ofrecemos reparación, mantenimiento e instalación de aire acondicionado residencial, incluidos sistemas centrales y sin conductos.'},
 heating:{name:'Residential Heating',href:'residential-heating.html',
  en:'Our residential heating services include inspections, repair, maintenance and new system installation.',
  es:'Nuestros servicios de calefacción residencial incluyen inspección, reparación, mantenimiento e instalación de sistemas nuevos.'},
 mobile:{name:'Mobile Home HVAC',href:'mobile-homes.html',
  en:'We provide heating and cooling inspections, repairs and system replacement for mobile homes.',
  es:'Ofrecemos inspecciones, reparación y sustitución de sistemas de calefacción y aire acondicionado para casas móviles.'},
 commercial:{name:'Light Commercial HVAC',href:'light-commercial.html',
  en:'We offer heating and cooling repair, service and new equipment installation for light commercial applications.',
  es:'Ofrecemos reparación y servicio de climatización e instalación de equipos para aplicaciones comerciales ligeras.'},
 maintenance:{name:'Maintenance & Service Agreement',href:'service-agreement-faqs.html',
  en:'Our maintenance service agreement includes two tune-ups per year.',
  es:'Nuestro acuerdo de mantenimiento incluye dos revisiones al año.'},
 faqs:{name:'Frequently Asked Questions',href:'service-agreement-faqs.html',
  en:'We have information about AC efficiency, equipment maintenance and indoor air quality.',
  es:'Compartimos información sobre eficiencia del aire acondicionado, mantenimiento y calidad del aire interior.'}
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
function detectLanguage(text,fallback='en'){
 const value=String(text||'').trim().toLowerCase();
 if(/\b(?:reply|respond|answer|speak|write)\b.{0,22}\benglish\b|\b(?:responde|contesta|habla|escribe)\b.{0,18}\bingl[eé]s\b/i.test(value))return 'en';
 if(/\b(?:reply|respond|answer|speak|write)\b.{0,22}\bspanish\b|\b(?:responde|contesta|habla|escribe)\b.{0,18}\bespa[nñ]ol\b/i.test(value))return 'es';
 const es=(value.match(/\b(?:hola|quiero|quisiera|necesito|puedo|puedes|podemos|tengo|tienes|estoy|est[aá]|funciona|funcionando|enfr[ií]a|calefacci[oó]n|cu[aá]nto|c[oó]mo|qu[eé]|por|para|nuestro|nuestra|nosotros|dejarnos|dejar|mensaje|equipo|hablar|llamar|gracias|ayuda|ayudar|con|los|las|una|tambi[eé]n|servicio|servicios|usted|quieres|podr[ií]a|espa[nñ]ol)\b/g)||[]).length+(/[¿¡áéíóúñ]/.test(value)?2:0);
 const en=(value.match(/\b(?:hi|hello|hey|what|why|how|when|where|who|which|please|can|could|should|would|want|need|help|my|your|our|we|you|they|have|has|do|does|is|are|the|this|that|about|with|for|from|leave|send|message|call|contact|team|heating|cooling|furnace|repair|services|appointment|thanks|thank|english|broken|working|air|conditioner)\b/g)||[]).length;
 if(es>en&&es>0)return 'es';
 if(en>es&&en>0)return 'en';
 return fallback;
}
function wrongLanguage(reply,expected){
 const detected=detectLanguage(reply,null);
 if(detected&&detected!==expected)return true;
 return expected==='en'
  ? /[¿¡]|\b(?:puedes|podemos|nuestro|nuestros|nuestra|necesitas|dejarnos|llamarnos|calefacci[oó]n|estamos|mensaje|solicitud)\b/i.test(reply)
  : /\b(?:you|your|we|our|would|please|can|could|call us|leave a request|our team)\b/i.test(reply);
}
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
 const lastUserLanguage=history.filter(x=>x.role==='user').slice(-1)[0]?.lang||'en';
 const lang=detectLanguage(input,lastUserLanguage);const es=lang==='es';
 const av=availability();
 if(safety.test(input))return {reply:es?'Si hay peligro inmediato, por ejemplo posible fuga de gas, aléjate del área y llama a los servicios de emergencia o a la compañía de gas. Este chat no atiende emergencias.':'If there is immediate danger, such as a possible gas leak, leave the area and contact emergency services or the gas utility. This chat is not an emergency-response service.',topic:null,offerContact:true,lang};
 if(msgGreeting.test(input))return {reply:es?'Soy Ari, el asistente virtual de Pronto Air. Puedo orientarte sobre nuestros servicios de climatización y ayudarte a contactar con nuestro equipo. ¿En qué podemos ayudarte?':"I'm Ari, Pronto Air's virtual assistant. I can explain our heating and cooling services and help you contact our team. How can we help?",topic:null,offerContact:true,lang};
 if(msgFollow.test(input))return {reply:es?'Claro. Puedes dejarnos un mensaje a nuestro equipo aquí mismo. Pulsa «Leave a request» para abrir nuestro formulario. El envío solicita seguimiento, pero no confirma una cita ni un plazo de respuesta.':"Of course. You can leave our team a message right here. Select 'Leave a request' to open our form. Submitting it requests follow-up; it does not confirm an appointment or response time.",topic:null,offerContact:true,lang};
 if(msgCall.test(input))return {reply:(es?'Puedes llamarnos al '+phone+'. ¿Prefieres llamar ahora o dejarnos una solicitud para que nuestro equipo la revise?':'You can call us at '+phone+'. Would you prefer to call now or leave a request for our team to review?'),topic:null,offerContact:true,lang};
 if(msgPrice.test(input))return {reply:es?'No tengo un precio confirmado para tu caso. Puedes llamar o dejarnos un mensaje con los detalles para que nuestro equipo revise la solicitud.':'I don’t have a confirmed price for your situation. You can call us or leave our team a message with the details so they can review your request.',topic:null,offerContact:true,lang};
 if(msgBooking.test(input))return {reply:es?'No puedo confirmar disponibilidad ni reservar una cita desde este chat. Puedes llamarnos o dejarnos una solicitud para que nuestro equipo la revise.':'I can’t confirm availability or book appointments in this chat. You can call us or leave a request for our team to review.',topic:null,offerContact:true,lang};
 if(forbiddenService.test(input))return {reply:es?'No tengo confirmación de que ofrezcamos ese servicio. ¿Quieres dejarnos una consulta para nuestro equipo?':'I can’t confirm that we offer that service. Would you like to leave our team a question?',topic:null,offerContact:true,lang};
 for(const [key,rx] of list)if(rx.test(input)){
   const t=topics[key];
   return {reply:t[lang]+(es?' ¿Quieres más información, llamar o dejar una solicitud?':' Would you like more details, to call, or to leave a request?'),topic:key,offerContact:true,lang};
 }
 if(av.afterHours)return {reply:es?'No puedo confirmar ese dato. Fuera del horario publicado puedes dejarnos una solicitud para que nuestro equipo la revise cuando esté disponible.':'I can’t confirm that detail. Outside our published hours, you can leave our team a request for review when available.',offerContact:true,lang};
 return {reply:es?'No puedo confirmar ese detalle con nuestra información publicada. ¿Necesitas ayuda con aire acondicionado, calefacción u otro servicio que ofrecemos? También puedes dejarnos un mensaje.':'I can’t confirm that detail from our published information. Do you need help with cooling, heating or another listed service? You can also leave our team a message.',offerContact:true,lang};
}
const root=document.createElement('div');
root.className='pa-guide';
root.innerHTML=[
 '<button type="button" class="pa-guide-launcher" aria-haspopup="dialog" aria-expanded="false" aria-controls="pa-guide-panel">',
 '<span class="pa-guide-launcher-mark" aria-hidden="true"><i class="fa-regular fa-comments"></i></span><span>Chat with Ari</span></button>',
 '<section class="pa-guide-panel" id="pa-guide-panel" role="dialog" aria-label="Ari, Pronto Air virtual assistant" aria-modal="false" hidden>',
 '<header class="pa-guide-top"><span class="pa-guide-brand-icon" aria-hidden="true"><i class="fa-regular fa-comments"></i></span>',
 '<span class="pa-guide-heading"><strong>Ari</strong><small class="pa-guide-mode"></small></span>',
 '<button type="button" class="pa-guide-close" aria-label="Close assistant"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button></header>',
 '<div class="pa-guide-scroll" tabindex="0">',
 '<div class="pa-guide-intro">Hi, I’m Ari, Pronto Air’s virtual assistant. Ask me about our services, call us, or leave our team a message. Appointments aren’t confirmed in chat.</div>',
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
 '<p class="pa-guide-ai-disclosure" hidden>AI demo: chat questions are processed by Cloudflare Workers AI. Please do not share personal details in the chat; use Leave a Message instead.</p>',
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
one('.pa-guide-mode').textContent=endpoint?'Pronto Air · Virtual AI assistant':'Pronto Air · Guided assistant';
if(endpoint)one('.pa-guide-ai-disclosure').hidden=false;
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
 const lastUserLanguage=history.filter(m=>m.role==='user').slice(-1)[0]?.lang||'en';
 const lang=detectLanguage(q,lastUserLanguage);
 const safeHistory=history.filter(m=>!pii.test(m.content)&&m.lang===lang).slice(-6).map(m=>({role:m.role,content:m.content.slice(0,300)}));
 const res=await fetch(endpoint,{method:'POST',mode:'cors',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({question:q,history:safeHistory,language:lang}),signal});
 if(!res.ok)throw new Error('assistant unavailable');
 const obj=await res.json();
 if(typeof obj.reply!=='string'||obj.reply.length>1100)throw new Error('invalid response');
 if((obj.lang==='en'||obj.lang==='es')&&obj.lang!==lang)throw new Error('wrong response locale');
 if(wrongLanguage(obj.reply,lang))throw new Error('response in another language');
 const key=typeof obj.topic==='string'&&topics[obj.topic]?obj.topic:null;
 return {reply:obj.reply,topic:key,offerContact:obj.offerContact===true,lang};
}
chatForm.addEventListener('submit',async e=>{
 e.preventDefault();const q=input.value.trim();warning.textContent='';
 if(!q)return;
 if(pii.test(q)){warning.textContent='Please use Leave a Message for contact details. Do not enter them in chat.';return;}
 if(turns>=10){warning.textContent='Please call or leave a message for further help.';return;}
 message('user',q);input.value='';turns++;const controller=new AbortController();request=controller;send.disabled=true;
 const fallback=localResponse(q,history);const timer=setTimeout(()=>controller.abort(),8000);
 try{
  // Handle message requests locally: the integrated form is verified and available
  // immediately, even before the live AI Worker has been redeployed.
  const reply=(safety.test(q)||msgFollow.test(q))?fallback:await respond(q,controller.signal);
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
  message('assistant','Your message was accepted by our contact form for follow-up. This does not confirm an appointment or response time.',null,false);
 }catch{leadStatus.textContent='We could not verify the request. Please call Pronto Air directly at '+phone+' or use the Contact page. Your information is still in the form.';}
 finally{button.disabled=false;}
});
})();
