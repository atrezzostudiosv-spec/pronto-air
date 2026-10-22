/* Pronto Air AI intent-only classifier (Cloudflare Workers Free).
 * The LLM never writes customer-facing claims. Client responses are fixed,
 * source-grounded content inside assets/js/pronto-assistant.js.
 */
const ALLOWED_INTENTS = new Set([
  'cooling','heating','mobile','commercial','maintenance',
  'faqs','contact','pricing','booking','urgent','unknown'
]);
const MODEL = '@cf/meta/llama-3.1-8b-instruct-fp8-fast';
const PII = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|(?:\+?\d[\d ()-]{7,}\d)|\b(?:address|my address|i live at|i'm at|street address|ssn|social security)\b/i;

function corsHeaders(origin,allowed) {
  const headers = {
    'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'no-store',
    'Vary':'Origin',
    'X-Content-Type-Options':'nosniff',
    'Access-Control-Allow-Methods':'POST, OPTIONS',
    'Access-Control-Allow-Headers':'Content-Type'
  };
  if (allowed.includes(origin)) headers['Access-Control-Allow-Origin']=origin;
  return headers;
}
function json(body,status,headers){
  return new Response(JSON.stringify(body),{status,headers});
}
export default {
  async fetch(request,env){
    const url=new URL(request.url);
    const origin=request.headers.get('Origin')||'';
    const origins=(env.ALLOWED_ORIGINS||'https://atrezzostudiosv-spec.github.io')
      .split(',').map(x=>x.trim()).filter(Boolean);
    const headers=corsHeaders(origin,origins);
    if (request.method==='GET'&&url.pathname==='/health') {
      return json({status:'ready',modelConfigured:!!env.AI},200,headers);
    }
    if(url.pathname!=='/classify')return json({error:'Not found'},404,headers);
    if(!origins.includes(origin))return json({error:'Origin not allowed'},403,headers);
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
    if(request.method!=='POST')return json({error:'Method not allowed'},405,headers);
    if(!(request.headers.get('Content-Type')||'').toLowerCase().startsWith('application/json')){
      return json({error:'JSON required'},415,headers);
    }
    if(Number(request.headers.get('Content-Length')||0)>1000)return json({error:'Request too large'},413,headers);
    let body;
    try{body=await request.text();}catch(_){return json({error:'Invalid request'},400,headers);}
    if(body.length>1000)return json({error:'Request too large'},413,headers);
    let data;
    try{data=JSON.parse(body);}catch(_){return json({error:'Invalid JSON'},400,headers);}
    const input=data&&typeof data.question==='string'?data.question.trim():'';
    if(input.length<3||input.length>220)return json({error:'Question must be 3–220 characters'},400,headers);
    if(PII.test(input))return json({error:'Do not enter personal contact details in chat'},422,headers);
    if(!env.AI)return json({error:'AI not configured'},503,headers);
    // Approximate abuse-limiting. Worker Free can be accessed directly by scripts
    // spoofing Origin; rate limits and Cloudflare account quota remain essential.
    if(env.REQUEST_LIMITER) {
      const ip=request.headers.get('CF-Connecting-IP')||'unknown';
      const response=await env.REQUEST_LIMITER.limit({key:ip});
      if(!response.success)return json({error:'Rate limit exceeded'},429,headers);
    }
    // This classification has no authority to add products, promises or service claims.
    const system=[
      'Classify the user question about Pronto Air HVAC service navigation.',
      'Output exactly ONE label, no punctuation or explanation:',
      'cooling, heating, mobile, commercial, maintenance, faqs, contact, pricing, booking, urgent, unknown.',
      'Priorities: dangerous gas smell/fire => urgent; prices/quotes => pricing;',
      'appointment/time/availability => booking; out-of-scope requests => unknown.',
      'mobile home/manufactured home => mobile, light business/office/rooftop => commercial.',
      'Use unknown for ambiguous or non-HVAC requests.',
      'You are NOT answering the visitor. Do not generate advice, promises or prices.'
    ].join(' ');
    let result;
    try{
      result=await env.AI.run(MODEL,{
        messages:[{role:'system',content:system},{role:'user',content:input}],
        temperature:0,max_tokens:12
      });
    }catch(_){
      return json({error:'Inference temporarily unavailable'},503,headers);
    }
    const raw=String((result&&result.response)||'').trim().toLowerCase();
    const label=raw.replace(/[^a-z]/g,'');
    const intent=ALLOWED_INTENTS.has(label)?label:'unknown';
    return json({intent,source:'workers-ai-classifier'},200,headers);
  }
};
