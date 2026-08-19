// Rodar: node docs/provas/prova-periodo-render.mjs
//
// Prova do caso relatado por ela em 19/08/2026:
//   "a supervisão era 14h até 15:30, aí fica parecendo que 15h está livre"
// Carrega o <script> INTEIRO do index.html num DOM de mentira e verifica o HTML
// que a agenda REALMENTE produz — não as funções puras isoladas.

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
const factory=new Function(...names,code+'\nreturn {getDB:getDB,setCache:function(c){_cache=c;},buildMonthDay:buildMonthDay,buildWeekGrid:buildWeekGrid};');
const app=factory(...names.map(n=>ctx[n]));

const hoje=new Date();
const dia=new Date(hoje.getFullYear(),hoje.getMonth(),hoje.getDate(),12,0,0);
const ds=dia.toISOString().split('T')[0];

app.setCache({
  clients:[{id:'c1',name:'Idalice Moreira Lima'}],
  packages:[],
  sessions:[{id:'s1',clientId:'c1',packageId:null,date:ds,time:'09:00',status:'agendada',category:'psicoterapia'}],
  clientStatus:{},
  compromissos:[{id:'k1',groupId:'g1',date:ds,time:'14:00',endTime:'15:30',title:'Supervisão',kind:'supervisao',notes:''}],
  appSettings:{}   // sem preferência gravada => duração padrão de 50 min
});

const semana=app.buildWeekGrid(app.getDB(),ds);

// A grade vai das 7h às 21h. Recorta as células do dia de hoje, em ordem de hora.
function celulasDoDia(htmlSemana,dataStr){
  const marca='<div class="week-cell';
  const alvo="dayClick('"+dataStr+"')";
  const partes=htmlSemana.split(marca).slice(1);
  return partes.filter(p=>p.includes(alvo)).map(p=>marca+p);
}
const cels=celulasDoDia(semana,ds);
const idx=h=>h-7;                       // 7h => 0
const cel=h=>cels[idx(h)]||'';

let passed=0;const total=9;
function test(n,desc,run){
  try{ if(!run())throw new Error('resultado inesperado');
    passed++;console.log('PASS '+n+' — '+desc);
  }catch(e){console.log('FAIL '+n+' — '+desc+' ('+e.message+')');}
}

test(1,'a semana rendeu as 15 faixas de hora do dia',function(){
  return cels.length===15;
});
test(2,'faixa das 14h mostra a supervisão com o período 14:00–15:30',function(){
  return cel(14).includes('week-event compromisso')&&cel(14).includes('14:00–15:30')&&cel(14).includes('Supervisão');
});
test(3,'CASO DELA: a faixa das 15h NÃO fica parecendo livre (classe ocupado)',function(){
  return cel(15).includes('week-cell ocupado');
});
test(4,'a faixa das 15h não ganhou bloco novo (o pedido: sem ocupar mais espaço)',function(){
  return !cel(15).includes('week-event');
});
test(5,'fim exclusivo: a faixa das 16h continua livre',function(){
  return !cel(16).includes('ocupado')&&!cel(16).includes('week-event');
});
test(6,'a faixa das 13h, antes do início, continua livre',function(){
  return !cel(13).includes('ocupado')&&!cel(13).includes('week-event');
});
test(7,'sessão de paciente mostra o período pela duração padrão de 50 min',function(){
  return cel(9).includes('09:00–09:50')&&cel(9).includes('Idalice');
});
test(8,'a faixa das 10h fica livre: sessão de 50 min não vaza para a hora seguinte',function(){
  return !cel(10).includes('ocupado');
});

const mes=app.buildMonthDay(dia,app.getDB(),ds,false);
test(9,'no mês o nome do paciente não é espremido: chip da sessão traz só a hora inicial',function(){
  return mes.includes('cal-chip psicoterapia')&&mes.includes('<strong>09:00</strong>')
      &&!mes.includes('09:00–09:50')            // período NÃO entra no chip da sessão
      &&mes.includes('14:00–15:30');            // mas o compromisso mantém o período
});

console.log('RESULTADO: '+passed+'/'+total+' PASS');
if(passed!==total)process.exit(1);
