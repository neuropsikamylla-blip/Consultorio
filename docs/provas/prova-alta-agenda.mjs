// Rodar: node docs/provas/prova-alta-agenda.mjs
// Prova a alta com liberação seletiva de horários e falhas de rede honestas.

import fs from 'node:fs';

const html=fs.readFileSync(new URL('../../index.html',import.meta.url),'utf8');
const m=html.match(/<script>\s*(const SUPA_URL=[\s\S]*?)<\/script>/);
if(!m)throw new Error('Bloco <script> principal não encontrado.');
const code=m[1];

const toasts=[];
const deletes=[];
const rede={modo:'ok',falhaId:null};
let backend=null;
let clientLoads=0;

function fakeEl(id){
  return{id:id,innerHTML:'',textContent:'',value:'',checked:false,style:{cssText:''},dataset:{},
    classList:{add(){},remove(){},toggle(){},contains(){return false;}},
    addEventListener(){},removeEventListener(){},remove(){},appendChild(){},insertBefore(){},
    querySelector(){return null;},querySelectorAll(){return[];}};
}
const known={};
const document={
  getElementById(id){return known[id]||(known[id]=fakeEl(id));},
  querySelector(){return null;},querySelectorAll(){return[];},
  createElement(){return fakeEl('novo');},addEventListener(){},
  body:{classList:{add(){},remove(){},toggle(){},contains(){return false;}},appendChild(el){
    if(el&&typeof el.textContent==='string'&&el.textContent)toasts.push({text:el.textContent,error:(el.style.cssText||'').includes('background:var(--red-bg)')});
  }}
};
const localStorage={_v:new Map(),getItem(k){return this._v.has(k)?this._v.get(k):null;},setItem(k,v){this._v.set(k,String(v));},removeItem(k){this._v.delete(k);}};

function rows(table,url){
  if(table==='clients'){clientLoads++;return backend.clients;}
  if(table==='packages')return backend.packages.map(function(p){return Object.assign({},p,{client_id:p.clientId,total_sessions:p.totalSessions,payment_status:p.paymentStatus||'pending',payment_type:p.paymentType||'pacote',created_at:p.createdAt||null});});
  if(table==='sessions')return backend.sessions.map(function(s){return Object.assign({},s,{client_id:s.clientId,package_id:s.packageId,interval_days:s.intervalDays||null,created_at:s.createdAt||null,session_paid:s.sessionPaid||false,session_pay_status:s.sessionPayStatus||'pending',session_price:s.sessionPrice||null});});
  if(table==='notes'&&url.includes('id=eq.client_status'))return[{id:'client_status',content:JSON.stringify(backend.clientStatus||{})}];
  return[];
}
async function fetchStub(url,opts){
  const method=(opts&&opts.method)||'GET';
  const table=(url.match(/\/rest\/v1\/([^?]+)/)||[])[1];
  if(method==='DELETE'&&table==='sessions'){
    const id=(url.match(/id=eq\.([^&]+)/)||[])[1];
    deletes.push(id);
    const falha=rede.modo==='falha'||(rede.modo==='parcial'&&id===rede.falhaId);
    if(falha)return{ok:false,status:500,text:async()=>'erro',json:async()=>({})};
    const removed=backend.sessions.filter(function(s){return s.id===id;});
    backend.sessions=backend.sessions.filter(function(s){return s.id!==id;});
    return{ok:true,status:200,text:async()=>JSON.stringify(removed),json:async()=>removed};
  }
  const data=rows(table,url);
  return{ok:true,status:200,text:async()=>JSON.stringify(data),json:async()=>data};
}

const ctx={
  document:document,localStorage:localStorage,sessionStorage:{getItem(){return null;},setItem(){}},
  location:{protocol:'file:',pathname:'/index.html',replace(){}},window:{confirm(){return true;}},fetch:fetchStub,
  console:{log(){},error(){},warn(){}},setTimeout(){return 0;},setInterval(){return 0;},alert(){},
  atob:v=>Buffer.from(v,'base64').toString('binary'),Intl:Intl,URL:URL,Blob:function(){},navigator:{}
};
const names=Object.keys(ctx);
const factory=new Function(...names,code+'\nreturn {setCache:function(c){_cache=c;},getDB:getDB,today:today,futureOpenSessions:futureOpenSessions,confirmAltaPaciente:confirmAltaPaciente,releaseFutureSessions:window.releaseFutureSessions,dbDeleteSession:dbDeleteSession,attentionSlots:attentionSlots};');
const app=factory(...names.map(n=>ctx[n]));

const hoje=app.today();
function addDays(ds,n){const d=new Date(ds+'T12:00:00');d.setDate(d.getDate()+n);return d.toISOString().slice(0,10);}
function baseDb(){
  return{
    clients:[{id:'c1',name:'Maria Helena'},{id:'c2',name:'Sem Sessões'}],
    packages:[{id:'p1',clientId:'c1',name:'Pacote Maria',totalSessions:8,price:0}],
    sessions:[
      {id:'aberta-hoje',clientId:'c1',packageId:'p1',date:hoje,time:'10:00',status:'agendada'},
      {id:'aberta-futura',clientId:'c1',packageId:'p1',date:addDays(hoje,2),time:'09:00',status:'agendada'},
      {id:'realizada-futura',clientId:'c1',packageId:'p1',date:addDays(hoje,3),time:'09:00',status:'realizada'},
      {id:'falta-futura',clientId:'c1',packageId:'p1',date:addDays(hoje,4),time:'09:00',status:'falta'},
      {id:'passada-aberta',clientId:'c1',packageId:'p1',date:addDays(hoje,-1),time:'09:00',status:'agendada'}
    ],
    clientStatus:{},compromissos:[],appSettings:{}
  };
}
function preparar(){
  backend=structuredClone(baseDb());app.setCache(structuredClone(backend));
  toasts.length=0;deletes.length=0;clientLoads=0;rede.modo='ok';rede.falhaId=null;
  known['modal-container']=fakeEl('modal-container');
}
function modalHtml(){return known['modal-container'].innerHTML;}
function ultimoToast(){return toasts.at(-1)||{text:'',error:false};}

let passed=0;const total=12;
async function test(n,desc,run){
  try{if(!await run())throw new Error('resultado inesperado');passed++;console.log('PASS '+n+' — '+desc);}
  catch(e){console.log('FAIL '+n+' — '+desc+' ('+e.message+')');}
}

await test(1,'futureOpenSessions traz só hoje em diante ainda não marcadas',async function(){
  preparar();return app.futureOpenSessions(app.getDB(),'c1',hoje).map(s=>s.id).join(',')==='aberta-hoje,aberta-futura';
});
await test(2,'sessão futura realizada não entra',async function(){
  return !app.futureOpenSessions(app.getDB(),'c1',hoje).some(s=>s.id==='realizada-futura');
});
await test(3,'sessão futura com falta não entra',async function(){
  return !app.futureOpenSessions(app.getDB(),'c1',hoje).some(s=>s.id==='falta-futura');
});
await test(4,'sessão passada agendada não entra',async function(){
  return !app.futureOpenSessions(app.getDB(),'c1',hoje).some(s=>s.id==='passada-aberta');
});
await test(5,'cliente sem sessões devolve lista vazia sem lançar',async function(){
  try{return app.futureOpenSessions(app.getDB(),'c2',hoje).length===0;}catch(e){return false;}
});
await test(6,'modal com 3 futuras mostra aviso e os três botões',async function(){
  preparar();backend.sessions.push({id:'terceira-aberta',clientId:'c1',packageId:'p1',date:addDays(hoje,1),time:'08:00',status:'agendada'});app.setCache(structuredClone(backend));
  app.confirmAltaPaciente('c1');const out=modalHtml();
  return out.includes('3 sessões futuras')&&out.includes('>Cancelar<')&&out.includes('>Dar alta e manter<')&&out.includes('>✅ Dar alta e liberar horários<');
});
await test(7,'modal sem futuras mantém os dois botões atuais',async function(){
  preparar();backend.sessions=backend.sessions.filter(s=>s.status==='realizada'||s.status==='falta'||s.date<hoje);app.setCache(structuredClone(backend));
  app.confirmAltaPaciente('c1');const out=modalHtml();
  return out.includes('>Cancelar<')&&out.includes('>✅ Confirmar alta<')&&!out.includes('Dar alta e manter')&&!out.includes('liberar horários')&&!out.includes('sessões futuras');
});
await test(8,'releaseFutureSessions apaga só ids futuros em aberto e recarrega uma vez',async function(){
  preparar();await app.releaseFutureSessions('c1');
  return deletes.join(',')==='aberta-hoje,aberta-futura'&&clientLoads===1;
});
await test(9,'rede fora mostra erro e não anuncia alta com sucesso',async function(){
  preparar();rede.modo='falha';await app.releaseFutureSessions('c1');const t=ultimoToast();
  return t.error&&/0 liberados, 2 falharam/.test(t.text)&&!/Alta concedida/.test(t.text);
});
await test(10,'falha parcial relata liberados e falhas sem abortar',async function(){
  preparar();rede.modo='parcial';rede.falhaId='aberta-hoje';await app.releaseFutureSessions('c1');const t=ultimoToast();
  return deletes.length===2&&t.error&&/1 liberados, 1 falharam/.test(t.text);
});
await test(11,'dbDeleteSession lança quando a rede falha',async function(){
  preparar();rede.modo='falha';try{await app.dbDeleteSession('aberta-hoje');return false;}catch(e){return e.message==='Falha ao excluir. Verifique sua conexão ou faça login novamente.';}
});
await test(12,'paciente em alta segue sem marcador de atenção',async function(){
  preparar();backend.clientStatus={c1:'alta'};app.setCache(structuredClone(backend));return app.attentionSlots().length===0;
});

console.log('RESULTADO: '+passed+'/'+total+' PASS');
if(passed!==total)process.exit(1);
