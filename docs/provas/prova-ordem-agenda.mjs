// Rodar: node docs/provas/prova-ordem-agenda.mjs
// Verifica no HTML efetivamente renderizado a ordem cronológica do mês e do detalhe do dia.

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
const factory=new Function(...names,code+'\nreturn {getDB:getDB,setCache:function(c){_cache=c;},setAttnSlots:function(slots){_attnSlots=slots;},buildMonthDay:buildMonthDay,dayClick:window.dayClick};');
const app=factory(...names.map(n=>ctx[n]));

const hoje=new Date();
const dia=new Date(hoje.getFullYear(),hoje.getMonth(),hoje.getDate(),12,0,0);
const ds=dia.toISOString().split('T')[0];
const clients=['Sem horário','Sessão 09','Sessão 10','Sessão 14','Sessão 15','Sessão 16','Sessão 17','Reserva Alert'];

function sess(id,time,clientId){return{id:id,clientId:clientId||id,packageId:null,date:ds,time:time,status:'agendada',category:'psicoterapia'};}
function compromisso(id,time,title,endTime){return{id:id,date:ds,time:time,endTime:endTime||'',title:title,kind:'supervisao',notes:''};}
function preparar(sessions,compromissos,slots){
  app.setCache({
    clients:clients.map(function(name){return{id:name,name:name};}),packages:[],sessions:sessions,
    clientStatus:{},compromissos:compromissos||[],appSettings:{}
  });
  app.setAttnSlots(slots||[]);
}
function mes(){return app.buildMonthDay(dia,app.getDB(),ds,false);}
function detalhe(){app.dayClick(ds);return known['modal-container'].innerHTML;}
function antes(conteudo,a,b){return conteudo.indexOf(a)!==-1&&conteudo.indexOf(b)!==-1&&conteudo.indexOf(a)<conteudo.indexOf(b);}

let passed=0;const total=9;
function test(n,desc,run){
  try{if(!run())throw new Error('resultado inesperado');passed++;console.log('PASS '+n+' — '+desc);}
  catch(e){console.log('FAIL '+n+' — '+desc+' ('+e.message+')');}
}

test(1,'mês ordena sessão 09:00, compromisso 14:00 e sessão 17:00',function(){
  preparar([sess('Sessão 09','09:00'),sess('Sessão 17','17:00')],[compromisso('c14','14:00','Compromisso 14')]);
  var out=mes();return antes(out,'Sessão 09','Compromisso 14')&&antes(out,'Compromisso 14','Sessão 17');
});
test(2,'CASO DELA: compromisso 14:00 vem antes das sessões 15:00 e 16:00',function(){
  preparar([sess('Sessão 15','15:00'),sess('Sessão 16','16:00')],[compromisso('c14','14:00','Supervisão 14')]);
  var out=mes();return antes(out,'Supervisão 14','Sessão 15')&&antes(out,'Supervisão 14','Sessão 16');
});
test(3,'mês posiciona alerta reservado 11:00 entre sessões 10:00 e 14:00',function(){
  preparar([sess('Sessão 10','10:00'),sess('Sessão 14','14:00')],[],[{clientId:'Reserva Alert',start:ds,interval:7,time:'11:00',short:'Reserva Alert'}]);
  var out=mes();return antes(out,'Sessão 10','? Reserva Alert')&&antes(out,'? Reserva Alert','Sessão 14');
});
test(4,'no empate às 14:00 compromisso vem antes da sessão',function(){
  preparar([sess('Sessão 14','14:00')],[compromisso('c14','14:00','Compromisso Empate')]);
  return antes(mes(),'Compromisso Empate','Sessão 14');
});

var htmlLimite='';
test(5,'com 10 sessões, compromisso às 14:00 continua aparecendo no mês',function(){
  var horarios=['08:00','09:00','10:00','11:00','12:00','13:00','15:00','16:00','17:00','18:00'];
  preparar(horarios.map(function(time,i){return sess('Sessão '+i,time,'Sessão 09');}),[compromisso('c14','14:00','Compromisso no Limite')]);
  htmlLimite=mes();return htmlLimite.includes('Compromisso no Limite');
});
test(6,'o +2 mais do mês conta somente as duas sessões omitidas',function(){return htmlLimite.includes('<div class="cal-more">+2 mais</div>');});
test(7,'sessão sem horário fica antes das demais no mês',function(){
  preparar([sess('Sem horário',''),sess('Sessão 09','09:00')],[]);
  return antes(mes(),'Sem horário','Sessão 09');
});
test(8,'detalhe do dia segue a mesma ordem cronológica',function(){
  preparar([sess('Sessão 09','09:00'),sess('Sessão 17','17:00')],[compromisso('c14','14:00','Detalhe 14')]);
  var out=detalhe();return antes(out,'Sessão 09','Detalhe 14')&&antes(out,'Detalhe 14','Sessão 17');
});
test(9,'chip mensal preserva o período do compromisso',function(){
  preparar([],[compromisso('c14','14:00','Supervisão período','15:30')]);
  return mes().includes('14:00–15:30');
});

console.log('RESULTADO: '+passed+'/'+total+' PASS');
if(passed!==total)process.exit(1);
