// Rodar: node docs/provas/prova-compromissos.mjs

import fs from 'node:fs';

const html=fs.readFileSync(new URL('../../index.html',import.meta.url),'utf8');
const scriptMatch=html.match(/<script>\s*(const SUPA_URL=[\s\S]*?)<\/script>/);
if(!scriptMatch)throw new Error('Bloco <script> principal não encontrado.');

const start='// ── COMPROMISSOS-CORE-INICIO ──';
const end='// ── COMPROMISSOS-CORE-FIM ──';
const startAt=scriptMatch[1].indexOf(start);
const endAt=scriptMatch[1].indexOf(end);
if(startAt<0||endAt<0||endAt<=startAt)throw new Error('Marcadores do core de compromissos não encontrados.');
const core=scriptMatch[1].slice(startAt+start.length,endAt);
const factory=new Function(core+'\nreturn {compromissoKindMeta:compromissoKindMeta,compromissoOccurrences:compromissoOccurrences,compromissosOnDate:compromissosOnDate,compromissoValida:compromissoValida};');
const api=factory();

let passed=0;
const total=12;
function test(number,description,run){
  try{
    if(!run())throw new Error('resultado inesperado');
    passed++;
    console.log('PASS '+number+' — '+description);
  }catch(error){
    console.log('FAIL '+number+' — '+description+' ('+error.message+')');
  }
}

const base={id:'comp-1',groupId:'group-1',date:'2026-08-20',time:'09:00',endTime:'',title:'Entrega',kind:'laudo',notes:'',createdAt:'2026-08-17T12:00:00.000Z'};

test(1,'metadados de supervisão',function(){
  var meta=api.compromissoKindMeta('supervisao');
  return meta.lbl==='Supervisão'&&meta.emoji==='👥';
});

test(2,'tipo ausente usa rótulo genérico',function(){
  return api.compromissoKindMeta(undefined).lbl==='Compromisso';
});

test(3,'sem repetição mantém uma ocorrência na data original',function(){
  var items=api.compromissoOccurrences(base,0,1);
  return items.length===1&&items[0].date==='2026-08-20'&&items[0]!==base;
});

test(4,'repetição semanal gera quatro datas, grupo comum e ids distintos',function(){
  var items=api.compromissoOccurrences(base,7,4);
  var dates=items.map(function(item){return item.date;});
  var ids=items.map(function(item){return item.id;});
  return JSON.stringify(dates)===JSON.stringify(['2026-08-20','2026-08-27','2026-09-03','2026-09-10'])&&items.every(function(item){return item.groupId==='group-1';})&&new Set(ids).size===4;
});

test(5,'repetição mensal no fim do mês produz datas válidas e crescentes',function(){
  var monthBase=Object.assign({},base,{date:'2026-01-31'});
  var items=api.compromissoOccurrences(monthBase,30,3);
  return items.length===3&&items.every(function(item){return /^\d{4}-\d{2}-\d{2}$/.test(item.date)&&!Number.isNaN(new Date(item.date+'T12:00:00').getTime());})&&items[0].date<items[1].date&&items[1].date<items[2].date;
});

test(6,'quantidade de ocorrências respeita teto de 52',function(){
  return api.compromissoOccurrences(base,7,999).length<=52;
});

test(7,'filtro por data ordena compromissos por hora',function(){
  var items=[Object.assign({},base,{id:'b',time:'15:00'}),Object.assign({},base,{id:'x',date:'2026-08-21',time:'08:00'}),Object.assign({},base,{id:'a',time:'08:30'})];
  var result=api.compromissosOnDate(items,'2026-08-20');
  return result.length===2&&result[0].id==='a'&&result[1].id==='b';
});

test(8,'filtro tolera lista nula',function(){
  var result=api.compromissosOnDate(null,'2026-08-20');
  return Array.isArray(result)&&result.length===0;
});

test(9,'validação recusa compromisso sem data',function(){
  return api.compromissoValida({time:'09:00',title:'Reunião'})==='Informe a data';
});

test(10,'validação recusa compromisso sem hora',function(){
  return api.compromissoValida({date:'2026-08-20',title:'Reunião'})==='Informe o horário';
});

test(11,'validação recusa horário final menor ou igual ao inicial',function(){
  return api.compromissoValida({date:'2026-08-20',time:'09:00',endTime:'09:00',title:'Reunião'})==='O horário final tem de ser depois do inicial';
});

test(12,'validação aceita compromisso completo',function(){
  return api.compromissoValida(base)==='';
});

console.log('RESULTADO: '+passed+'/'+total+' PASS');
if(passed!==total)process.exit(1);
