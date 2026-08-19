// Rodar: node docs/provas/prova-periodo-agenda.mjs

import fs from 'node:fs';

const html=fs.readFileSync(new URL('../../index.html',import.meta.url),'utf8');
const scriptMatch=html.match(/<script>\s*(const SUPA_URL=[\s\S]*?)<\/script>/);
if(!scriptMatch)throw new Error('Bloco <script> principal não encontrado.');

const start='// ── PERIODO-CORE-INICIO ──';
const end='// ── PERIODO-CORE-FIM ──';
const startAt=scriptMatch[1].indexOf(start);
const endAt=scriptMatch[1].indexOf(end);
if(startAt<0||endAt<0||endAt<=startAt)throw new Error('Marcadores do core de período não encontrados.');
const core=scriptMatch[1].slice(startAt+start.length,endAt);
const factory=new Function(core+'\nreturn {hhmmToMin:hhmmToMin,minToHhmm:minToHhmm,slotSpan:slotSpan,sessionEnd:sessionEnd,periodLabel:periodLabel};');
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

test(1,'14:00–15:30 ocupa as faixas 14 e 15',function(){
  return JSON.stringify(api.slotSpan('14:00','15:30'))===JSON.stringify(['14','15']);
});

test(2,'fim às 16:00 é exclusivo e deixa a faixa 16 livre',function(){
  return JSON.stringify(api.slotSpan('14:00','16:00'))===JSON.stringify(['14','15']);
});

test(3,'sessão de 50 minutos ocupa sua faixa inicial',function(){
  return JSON.stringify(api.slotSpan('09:00','09:50'))===JSON.stringify(['09']);
});

test(4,'sem horário final ocupa somente a faixa inicial',function(){
  return JSON.stringify(api.slotSpan('14:00',''))===JSON.stringify(['14']);
});

test(5,'sem horário inicial não ocupa faixa',function(){
  return JSON.stringify(api.slotSpan('',''))===JSON.stringify([]);
});

test(6,'sessão de 50 minutos termina às 09:50',function(){
  return api.sessionEnd('09:00',50)==='09:50';
});

test(7,'sessão no fim do dia satura às 23:59',function(){
  return api.sessionEnd('23:30',50)==='23:59';
});

test(8,'rótulo de período usa travessão',function(){
  return api.periodLabel('14:00','15:30')==='14:00–15:30';
});

test(9,'rótulo sem fim mostra somente o início',function(){
  return api.periodLabel('14:00','')==='14:00';
});

test(10,'caso da supervisão ocupa 14h e 15h',function(){
  var slots=api.slotSpan('14:00','15:30');
  return slots.includes('14')&&slots.includes('15')&&slots.length===2;
});

test(11,'sessão com duração padrão mostra 09:00–09:50',function(){
  return api.periodLabel('09:00',api.sessionEnd('09:00',50))==='09:00–09:50';
});

test(12,'duração alterada para 60 mostra 09:00–10:00',function(){
  return api.periodLabel('09:00',api.sessionEnd('09:00',60))==='09:00–10:00';
});

console.log('RESULTADO: '+passed+'/'+total+' PASS');
if(passed!==total)process.exit(1);
