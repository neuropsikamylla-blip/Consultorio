// Rodar: node docs/provas/prova-marco-financeiro.mjs
// Verifica o marco financeiro e garante que a agenda continua usando as sessões completas.

import fs from 'node:fs';

const html=fs.readFileSync(new URL('../../index.html',import.meta.url),'utf8');
const m=html.match(/<script>\s*(const SUPA_URL=[\s\S]*?)<\/script>/);
if(!m)throw new Error('Bloco <script> principal não encontrado.');
const code=m[1];

function fakeEl(id){
  return{id:id,innerHTML:'',textContent:'',value:'',checked:false,style:{},dataset:{},
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
  fetch:async function(){return{ok:true,status:200,text:async()=>'',json:async()=>[]};},
  console:{log(){},error(){},warn(){}},
  setTimeout:function(){return 0;},setInterval:function(){return 0;},
  alert:function(){},atob:v=>Buffer.from(v,'base64').toString('binary'),
  Intl:Intl,URL:URL,Blob:function(){},navigator:{}
};
const names=Object.keys(ctx);
const factory=new Function(...names,code+'\nreturn {getDB:getDB,setCache:function(c){_cache=c;},financeStartMonth:financeStartMonth,withinFinance:withinFinance,financePackages:financePackages,financeSessions:financeSessions,buildMonthDay:buildMonthDay};');
const app=factory(...names.map(n=>ctx[n]));

function base(start){
  return{
    clients:[{id:'c1',name:'Paciente Agosto'}],
    packages:[
      {id:'p-ago',clientId:'c1',name:'Pacote Agosto',price:500,totalSessions:5,paymentStatus:'paid',paymentType:'pacote',paymentDate:'2026-08-10',createdAt:'2026-08-01T12:00:00'},
      {id:'p-set',clientId:'c1',name:'Pacote Setembro',price:600,totalSessions:6,paymentStatus:'paid',paymentType:'pacote',paymentDate:'2026-09-10',createdAt:'2026-09-01T12:00:00'}
    ],
    sessions:[
      {id:'s-ago',clientId:'c1',packageId:'p-ago',date:'2026-08-15',time:'09:00',status:'agendada',category:'psicoterapia'},
      {id:'s-set',clientId:'c1',packageId:'p-set',date:'2026-09-15',time:'09:00',status:'agendada',category:'psicoterapia'},
      {id:'s-sem-data',clientId:'c1',packageId:null,date:'',time:'10:00',status:'agendada',category:'psicoterapia'}
    ],
    clientStatus:{},compromissos:[],appSettings:start===undefined?{}:{financeStart:start}
  };
}
function usar(start){app.setCache(base(start));}

let passed=0;const total=10;
function test(n,desc,run){
  try{if(!run())throw new Error('resultado inesperado');passed++;console.log('PASS '+n+' — '+desc);}
  catch(e){console.log('FAIL '+n+' — '+desc+' ('+e.message+')');}
}

test(1,'sem marco gravado, financeStartMonth devolve vazio',function(){usar();return app.financeStartMonth()==='';});
test(2,'marco 2026-09 exclui agosto',function(){usar('2026-09');return app.withinFinance('2026-08')===false;});
test(3,'marco 2026-09 inclui setembro e outubro',function(){usar('2026-09');return app.withinFinance('2026-09')===true&&app.withinFinance('2026-10')===true;});
test(4,'sem marco, um mês antigo continua incluído',function(){usar();return app.withinFinance('2020-01')===true;});
test(5,'marco malformado é tratado como ausente',function(){usar('agosto');return app.financeStartMonth()===''&&app.withinFinance('2020-01')===true;});
test(6,'pacote pago em agosto fica fora do financeiro',function(){usar('2026-09');return !app.financePackages(app.getDB()).some(function(p){return p.id==='p-ago';});});
test(7,'pacote pago em setembro fica dentro do financeiro',function(){usar('2026-09');return app.financePackages(app.getDB()).some(function(p){return p.id==='p-set';});});
test(8,'sessão de agosto fica fora do financeiro',function(){usar('2026-09');return !app.financeSessions(app.getDB()).some(function(s){return s.id==='s-ago';});});
test(9,'sessão sem data permanece no financeiro',function(){usar('2026-09');return app.financeSessions(app.getDB()).some(function(s){return s.id==='s-sem-data';});});
test(10,'agenda mensal continua mostrando sessão de agosto com marco ativo',function(){
  usar('2026-09');
  var dia=new Date(2026,7,15,12,0,0);
  var out=app.buildMonthDay(dia,app.getDB(),'2026-08-15',false);
  return out.includes('cal-chip psicoterapia')&&out.includes('Paciente Agosto');
});

console.log('RESULTADO: '+passed+'/'+total+' PASS');
if(passed!==total)process.exit(1);
