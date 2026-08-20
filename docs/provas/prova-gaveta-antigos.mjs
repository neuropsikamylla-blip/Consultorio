// Rodar: node docs/provas/prova-gaveta-antigos.mjs
// Verifica a gaveta financeira, a data de quitação antiga e as fronteiras da agenda.

import fs from 'node:fs';

const html=fs.readFileSync(new URL('../../index.html',import.meta.url),'utf8');
const m=html.match(/<script>\s*(const SUPA_URL=[\s\S]*?)<\/script>/);
if(!m)throw new Error('Bloco <script> principal não encontrado.');
const code=m[1];

function fakeEl(id){
  return{id:id,innerHTML:'',textContent:'',value:'',checked:false,style:{},dataset:{},disabled:false,
    classList:{add(){},remove(){},toggle(){},contains(){return false;}},
    addEventListener(){},removeEventListener(){},remove(){},appendChild(){},insertBefore(){},setAttribute(){},
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
  location:{protocol:'file:',pathname:'/index.html',replace(){}},window:{confirm(){return true;}},
  fetch:async function(){return{ok:true,status:200,text:async()=>'',json:async()=>[]};},
  console:{log(){},error(){},warn(){}},
  setTimeout:function(){return 0;},setInterval:function(){return 0;},
  alert:function(){},atob:v=>Buffer.from(v,'base64').toString('binary'),
  Intl:Intl,URL:URL,Blob:function(){},navigator:{}
};
const names=Object.keys(ctx);
const factory=new Function(...names,code+'\nreturn {getDB:getDB,setCache:function(c){_cache=c;},lastDayOfMonth:lastDayOfMonth,legacyPackages:legacyPackages,legacySessions:legacySessions,legacyTotals:legacyTotals,legacyPayload:legacyPayload,financePackages:financePackages,buildMonthDay:buildMonthDay};');
const app=factory(...names.map(n=>ctx[n]));

function base(start){
  return{
    clients:[{id:'c1',name:'Paciente Antiga'}],
    packages:[
      {id:'p-jun',clientId:'c1',name:'Junho',price:300,totalSessions:1,paymentStatus:'pending',paymentType:'pacote',paymentDate:null,createdAt:'2026-06-01T12:00:00'},
      {id:'p-jul-paid',clientId:'c1',name:'Julho pago',price:200,totalSessions:1,paymentStatus:'paid',paymentType:'pacote',paymentDate:'2026-07-10',createdAt:'2026-07-01T12:00:00'},
      {id:'p-mai-part',clientId:'c1',name:'Maio parcelado',price:400,totalSessions:1,paymentStatus:'parcela1',paymentType:'pacote',paymentDate:'2026-05-15',paymentDate2:null,createdAt:'2026-05-01T12:00:00'},
      {id:'p-per',clientId:'c1',name:'Por sessão',price:400,totalSessions:2,paymentStatus:'paid',paymentType:'sessao',paymentDate:null,createdAt:'2026-06-01T12:00:00'},
      {id:'p-set',clientId:'c1',name:'Setembro',price:600,totalSessions:1,paymentStatus:'paid',paymentType:'pacote',paymentDate:'2026-09-10',createdAt:'2026-09-01T12:00:00'}
    ],
    sessions:[
      {id:'s-jun',clientId:'c1',packageId:'p-jun',date:'2026-06-15',time:'09:00',status:'agendada',category:'psicoterapia',sessionPayStatus:'pending'},
      {id:'s-jul-paid',clientId:'c1',packageId:'p-jul-paid',date:'2026-07-10',time:'09:00',status:'realizada',category:'psicoterapia',sessionPayStatus:'pending'},
      {id:'s-mai',clientId:'c1',packageId:'p-mai-part',date:'2026-05-10',time:'09:00',status:'realizada',category:'psicoterapia',sessionPayStatus:'pending'},
      {id:'s-per-paid',clientId:'c1',packageId:'p-per',date:'2026-06-05',time:'10:00',status:'realizada',category:'psicoterapia',sessionPayStatus:'paid'},
      {id:'s-per-pending',clientId:'c1',packageId:'p-per',date:'2026-06-12',time:'10:00',status:'realizada',category:'psicoterapia',sessionPayStatus:'pending'},
      {id:'s-av-paid',clientId:'c1',packageId:null,date:'2026-07-06',time:'11:00',status:'realizada',category:'psicoterapia',sessionPayStatus:'paid',sessionPrice:100},
      {id:'s-av-pending',clientId:'c1',packageId:null,date:'2026-07-13',time:'11:00',status:'realizada',category:'psicoterapia',sessionPayStatus:'pending',sessionPrice:150},
      {id:'s-set',clientId:'c1',packageId:'p-set',date:'2026-09-15',time:'09:00',status:'agendada',category:'psicoterapia',sessionPayStatus:'pending'}
    ],
    clientStatus:{},compromissos:[],appSettings:start===undefined?{}:{financeStart:start}
  };
}
function usar(start){const db=base(start);app.setCache(db);return db;}

let passed=0;const total=11;
function test(n,desc,run){
  try{if(!run())throw new Error('resultado inesperado');passed++;console.log('PASS '+n+' — '+desc);}
  catch(e){console.log('FAIL '+n+' — '+desc+' ('+e.message+')');}
}

test(1,'junho termina no dia 30',function(){return app.lastDayOfMonth('2026-06')==='2026-06-30';});
test(2,'fevereiro de 2026 termina no dia 28',function(){return app.lastDayOfMonth('2026-02')==='2026-02-28';});
test(3,'fevereiro bissexto de 2028 termina no dia 29',function(){return app.lastDayOfMonth('2028-02')==='2028-02-29';});
test(4,'mês inválido devolve vazio',function(){return app.lastDayOfMonth('xx')==='';});
test(5,'sem marco não há pacotes na gaveta',function(){const db=usar();return app.legacyPackages(db).length===0&&app.legacySessions(db).length===0;});
test(6,'com marco em setembro, junho entra e setembro não entra',function(){const db=usar('2026-09');const ids=app.legacyPackages(db).map(p=>p.id);return ids.includes('p-jun')&&!ids.includes('p-set');});
test(7,'pacote de junho é quitado no fim de junho, nunca hoje',function(){const db=usar('2026-09');const p=db.packages.find(p=>p.id==='p-jun');const payload=app.legacyPayload(p);return payload.paymentStatus==='paid'&&payload.paymentDate==='2026-06-30';});
test(8,'segunda parcela preserva a primeira e usa o fim do mês',function(){usar('2026-09');const payload=app.legacyPayload({id:'p-x',paymentStatus:'parcela1',paymentDate:'2026-06-15',createdAt:'2026-06-01T12:00:00'});return payload.paymentDate==='2026-06-15'&&payload.paymentDate2==='2026-06-30';});
test(9,'totais somam somente recebimentos e pendências antigos',function(){const db=usar('2026-09');const totals=app.legacyTotals(db);return totals.recebido===700&&totals.pendente===850&&totals.qtdPendente===4;});
test(10,'quitar pacote antigo não altera a receita do mês corrente',function(){const db=usar('2026-09');const receitaAtual=()=>app.financePackages(db).filter(p=>p.paymentStatus==='paid'&&p.paymentType!=='sessao'&&p.paymentDate&&p.paymentDate.slice(0,7)==='2026-09').reduce((sum,p)=>sum+p.price,0);const before=receitaAtual();const p=db.packages.find(p=>p.id==='p-jun');Object.assign(p,app.legacyPayload(p));const after=receitaAtual();return before===600&&after===before&&!app.financePackages(db).some(p=>p.id==='p-jun');});
test(11,'agenda continua mostrando sessão antiga',function(){usar('2026-09');const out=app.buildMonthDay(new Date(2026,5,15,12,0,0),app.getDB(),'2026-08-20',false);return out.includes('cal-chip psicoterapia')&&out.includes('Paciente Antiga');});

console.log('RESULTADO: '+passed+'/'+total+' PASS');
if(passed!==total)process.exit(1);
