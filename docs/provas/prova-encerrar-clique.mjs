// Rodar: node docs/provas/prova-encerrar-clique.mjs
// Prova o card de pacote com uma sessão restante e seu destino direto à sessão aberta.

import fs from 'node:fs';

const html=fs.readFileSync(new URL('../../index.html',import.meta.url),'utf8');
const m=html.match(/<script>\s*(const SUPA_URL=[\s\S]*?)<\/script>/);
if(!m)throw new Error('Bloco <script> principal não encontrado.');
const code=m[1];

function fakeEl(id){
  return {id:id,innerHTML:'',textContent:'',value:'',checked:false,style:{},dataset:{},
    classList:{add(){},remove(){},toggle(){},contains(){return false;}},
    addEventListener(){},removeEventListener(){},remove(){},appendChild(){},insertBefore(){},
    querySelector(){return null;},querySelectorAll(){return[];}};
}
const known={};
const document={
  getElementById(id){return known[id]||(known[id]=fakeEl(id));},
  querySelector(){return null;},querySelectorAll(){return[];},
  createElement(){return fakeEl('novo');},addEventListener(){},
  body:{classList:{add(){},remove(){},toggle(){},contains(){return false;}},appendChild(){}}
};
const localStorage={_v:new Map(),getItem(k){return this._v.has(k)?this._v.get(k):null;},setItem(k,v){this._v.set(k,String(v));},removeItem(k){this._v.delete(k);}};
const ctx={
  document:document,localStorage:localStorage,sessionStorage:{getItem(){return null;},setItem(){}},
  location:{protocol:'file:',pathname:'/index.html',replace(){}},window:{},
  fetch:async function(){return {ok:true,status:200,text:async()=>'',json:async()=>[]};},
  console:{log(){},error(){},warn(){}},setTimeout:function(){return 0;},setInterval:function(){return 0;},
  alert:function(){},atob:v=>Buffer.from(v,'base64').toString('binary'),Intl:Intl,URL:URL,Blob:function(){},navigator:{}
};
const names=Object.keys(ctx);
const factory=new Function(...names,code+'\nreturn {getDB:getDB,setCache:function(c){_cache=c;},nextOpenSession:nextOpenSession,renderDashboard:renderDashboard,openExpiringPackage:window.openExpiringPackage};');
const app=factory(...names.map(n=>ctx[n]));

function makeDb(realizadas,extras){
  const sessions=[];
  for(let i=0;i<8;i++)sessions.push({id:'s'+(i+1),clientId:'c1',packageId:'p1',date:'2026-08-'+String(i+1).padStart(2,'0'),time:'10:00',status:i<realizadas?'realizada':'agendada',category:'psicoterapia'});
  return {clients:[{id:'c1',name:'Idalice Moreira Lima'}],packages:[{id:'p1',clientId:'c1',name:'Pacote',totalSessions:8,price:0}],sessions:sessions.concat(extras||[]),clientStatus:{},compromissos:[],appSettings:{}};
}
function cardHtml(){app.renderDashboard();return known['page-content'].innerHTML;}

let passed=0;const total=10;
function test(n,desc,run){
  try{if(!run())throw new Error('resultado inesperado');passed++;console.log('PASS '+n+' — '+desc);}
  catch(e){console.log('FAIL '+n+' — '+desc+' ('+e.message+')');}
}

test(1,'pacote de 8 com 7 realizadas aparece no card',function(){app.setCache(makeDb(7));return cardHtml().includes('Idalice Moreira Lima');});
test(2,'pacote de 8 com 6 realizadas não aparece no card',function(){app.setCache(makeDb(6));return !cardHtml().includes('Idalice Moreira Lima');});
test(3,'pacote de 8 com 8 realizadas não aparece no card',function(){app.setCache(makeDb(8));return !cardHtml().includes('Idalice Moreira Lima');});
test(4,'nextOpenSession com 7 de 8 marcadas devolve a agendada',function(){const db=makeDb(7);return app.nextOpenSession(db,'p1')===db.sessions[7]&&app.nextOpenSession(db,'p1').status==='agendada';});
test(5,'nextOpenSession escolhe a menor data e desempata por horário',function(){const db=makeDb(8,[{id:'late',packageId:'p1',date:'2026-10-02',time:'09:00',status:'agendada'},{id:'early-time',packageId:'p1',date:'2026-10-01',time:'11:00',status:'agendada'},{id:'early',packageId:'p1',date:'2026-10-01',time:'08:00',status:'agendada'}]);return app.nextOpenSession(db,'p1').id==='early';});
test(6,'nextOpenSession sem sessão em aberto devolve null',function(){return app.nextOpenSession(makeDb(8),'p1')===null;});
test(7,'nextOpenSession para pacote inexistente devolve null sem lançar',function(){return app.nextOpenSession(makeDb(7),'inexistente')===null;});
test(8,'a linha do card tem cursor, onclick e destino openExpiringPackage',function(){app.setCache(makeDb(7));const out=cardHtml();return out.includes('cursor:pointer')&&out.includes('onclick="window.openExpiringPackage(\'p1\')"')&&out.includes('title="Abrir a sessão que falta"');});
test(9,'openExpiringPackage abre a edição da sessão em aberto certa',function(){app.setCache(makeDb(7));app.openExpiringPackage('p1');return known['modal-container'].innerHTML.includes("saveSessionEdit('s8')");});
test(10,'openExpiringPackage sem sessão aberta não lança nem abre edição',function(){app.setCache(makeDb(8));known['modal-container']=fakeEl('modal-container');try{app.openExpiringPackage('p1');}catch(e){return false;}return known['modal-container'].innerHTML==='';});

console.log('RESULTADO: '+passed+'/'+total+' PASS');
if(passed!==total)process.exit(1);
