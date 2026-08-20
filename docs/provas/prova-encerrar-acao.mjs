// Rodar: node docs/provas/prova-encerrar-acao.mjs
// Prova o card "Pacotes a Encerrar": localização, ações rápidas e falha de rede.

import fs from 'node:fs';

const html=fs.readFileSync(new URL('../../index.html',import.meta.url),'utf8');
const m=html.match(/<script>\s*(const SUPA_URL=[\s\S]*?)<\/script>/);
if(!m)throw new Error('Bloco <script> principal não encontrado.');
const code=m[1];
const toasts=[];
const patches=[];
const rede={modo:'ok'};
let backend=null;

function fakeEl(id){
  return{id:id,innerHTML:'',textContent:'',value:'',checked:false,style:{cssText:''},dataset:{},
    classList:{add(){},remove(){},toggle(){},contains(){return false;}},
    addEventListener(){},removeEventListener(){},remove(){},appendChild(){},insertBefore(){},
    querySelector(){return null;},querySelectorAll(){return[];}};
}
const known={};
const document={
  getElementById(id){return known[id]||(known[id]=fakeEl(id));},
  querySelector(){return null;},querySelectorAll(){return[];},createElement(){return fakeEl('novo');},addEventListener(){},
  body:{classList:{add(){},remove(){},toggle(){},contains(){return false;}},appendChild(el){if(el.textContent)toasts.push(el.textContent);}}
};
const localStorage={_v:new Map(),getItem(k){return this._v.has(k)?this._v.get(k):null;},setItem(k,v){this._v.set(k,String(v));},removeItem(k){this._v.delete(k);}};

function rows(table){
  if(table==='clients')return backend.clients;
  if(table==='packages')return backend.packages.map(function(p){return Object.assign({},p,{client_id:p.clientId,total_sessions:p.totalSessions,payment_status:p.paymentStatus||'pending',payment_type:p.paymentType||'pacote',created_at:p.createdAt||null});});
  if(table==='sessions')return backend.sessions.map(function(s){return Object.assign({},s,{client_id:s.clientId,package_id:s.packageId,interval_days:s.intervalDays||null,created_at:s.createdAt||null,session_paid:s.sessionPaid||false,session_pay_status:s.sessionPayStatus||'pending',session_price:s.sessionPrice||null});});
  return[];
}
async function fetchStub(url,opts){
  const method=(opts&&opts.method)||'GET';
  const table=(url.match(/\/rest\/v1\/([^?]+)/)||[])[1];
  if(method==='PATCH'&&table==='sessions'){
    const body=JSON.parse(opts.body);patches.push({url:url,body:body});
    if(rede.modo==='falha')return{ok:false,status:500,text:async()=>'erro',json:async()=>({})};
    const id=(url.match(/id=eq\.([^&]+)/)||[])[1];
    const session=backend.sessions.find(function(s){return s.id===id;});
    if(session)Object.assign(session,body);
    return{ok:true,status:200,text:async()=>'[]',json:async()=>[]};
  }
  return{ok:true,status:200,text:async()=>JSON.stringify(rows(table)),json:async()=>rows(table)};
}
const ctx={
  document:document,localStorage:localStorage,sessionStorage:{getItem(){return null;},setItem(){}},
  location:{protocol:'file:',pathname:'/index.html',replace(){}},window:{},fetch:fetchStub,
  console:{log(){},error(){},warn(){}},setTimeout(){return 0;},setInterval(){return 0;},alert(){},
  atob:v=>Buffer.from(v,'base64').toString('binary'),Intl:Intl,URL:URL,Blob:function(){},navigator:{}
};
const names=Object.keys(ctx);
const factory=new Function(...names,code+'\nreturn {setCache:function(c){_cache=c;},getDB:getDB,pkgStats:pkgStats,renderDashboard:renderDashboard,markExpiringSession:window.markExpiringSession};');
const app=factory(...names.map(n=>ctx[n]));

function makeDb(kind){
  const sessions=[];
  const count=kind==='sem-agendar'?7:8;
  for(let i=0;i<count;i++)sessions.push({id:'s'+(i+1),clientId:'c1',packageId:'p1',date:i===7?'2026-08-15':'2026-08-'+String(i+1).padStart(2,'0'),time:i===7?'09:00':'10:00',status:i<7?'realizada':'agendada',category:'psicoterapia'});
  return{clients:[{id:'c1',name:'Maria Helena'}],packages:[{id:'p1',clientId:'c1',name:'Pacote Maria',totalSessions:8,price:0}],sessions:sessions,clientStatus:{},compromissos:[],appSettings:{}};
}
function preparar(kind){backend=makeDb(kind);app.setCache(structuredClone(backend));patches.length=0;toasts.length=0;rede.modo='ok';}
function cardHtml(){app.renderDashboard();return known['page-content'].innerHTML;}

let passed=0;const total=9;
async function test(n,desc,run){
  try{if(!await run())throw new Error('resultado inesperado');passed++;console.log('PASS '+n+' — '+desc);}
  catch(e){console.log('FAIL '+n+' — '+desc+' ('+e.message+')');}
}

await test(1,'cenário A mostra data e horário da sessão restante',async function(){preparar('aberta');return /📅 15\/08 09:00/.test(cardHtml());});
await test(2,'cenário B informa falta agendar e oferece Agendar',async function(){preparar('sem-agendar');const out=cardHtml();return out.includes('⚠️ falta agendar')&&out.includes('📅 Agendar');});
await test(3,'cenário B não oferece Feita nem Falta',async function(){preparar('sem-agendar');const out=cardHtml();return !out.includes('✅ Feita')&&!out.includes('⚠️ Falta');});
await test(4,'cenário A oferece Feita e Falta com stopPropagation',async function(){preparar('aberta');const out=cardHtml();return out.includes("event.stopPropagation();window.markExpiringSession('s8','realizada')")&&out.includes("event.stopPropagation();window.markExpiringSession('s8','falta')");});
await test(5,'Feita envia realizada no PATCH da sessão certa',async function(){preparar('aberta');await app.markExpiringSession('s8','realizada');return patches.length===1&&patches[0].url.includes('id=eq.s8')&&patches[0].body.status==='realizada';});
await test(6,'Falta envia falta no PATCH da sessão certa',async function(){preparar('aberta');await app.markExpiringSession('s8','falta');return patches.length===1&&patches[0].url.includes('id=eq.s8')&&patches[0].body.status==='falta';});
await test(7,'após Falta, a falta conta como sessão usada',async function(){return app.pkgStats(app.getDB().packages[0]).used===8;});
await test(8,'rede fora exibe erro e não confirma sucesso',async function(){preparar('aberta');rede.modo='falha';await app.markExpiringSession('s8','falta');const toast=toasts.at(-1)||'';return /Não foi possível marcar/.test(toast)&&!/Marcada como falta/.test(toast);});
await test(9,'cabeçalho abre Sessões e não referencia Pacotes',async function(){preparar('aberta');const out=cardHtml();const card=out.slice(out.indexOf('Pacotes a Encerrar'));return card.includes("navigate('sessions')")&&card.includes('Ver sessões →')&&!card.includes("navigate('packages')");});

console.log('RESULTADO: '+passed+'/'+total+' PASS');
if(passed!==total)process.exit(1);
