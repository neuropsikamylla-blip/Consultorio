// Rodar: node docs/provas/prova-passo1b.mjs

import fs from 'node:fs';

const html=fs.readFileSync(new URL('../../index.html',import.meta.url),'utf8');
const scriptMatch=html.match(/<script>\s*(const SUPA_URL=[\s\S]*?)<\/script>/);
if(!scriptMatch)throw new Error('Bloco <script> principal não encontrado.');

const start='// ── SESS-BATCH-INICIO ──';
const end='// ── SESS-BATCH-FIM ──';
const startAt=scriptMatch[1].indexOf(start);
const endAt=scriptMatch[1].indexOf(end);
if(startAt<0||endAt<0||endAt<=startAt)throw new Error('Marcadores do insert em lote não encontrados.');
const sessionBatch=scriptMatch[1].slice(startAt+start.length,endAt);

function makeRows(){
  return Array.from({length:8},function(_,i){return{id:'session-'+(i+1)};});
}

function makeFunction(stub){
  const factory=new Function('supaFetch',sessionBatch+'\nreturn insertSessionRows;');
  return factory(stub);
}

let passed=0;
const total=5;
async function test(number,description,run){
  try{
    if(!await run())throw new Error('resultado inesperado');
    passed++;
    console.log('PASS '+number+' — '+description);
  }catch(error){
    console.log('FAIL '+number+' — '+description+' ('+error.message+')');
  }
}

await test(1,'8 linhas, lote aceito',async function(){
  var calls=0;
  var insertSessionRows=makeFunction(async function(method,table,body,query,opts){
    calls++;
    if(method!=='POST'||table!=='sessions'||!Array.isArray(body)||query!==null||opts.prefer!=='return=minimal')throw new Error('chamada inesperada');
    return[];
  });
  var result=await insertSessionRows(makeRows());
  return calls===1&&result.ok===true&&result.count===8;
});

await test(2,'lote recusado e 8 individuais aceitas',async function(){
  var calls=0;
  var insertSessionRows=makeFunction(async function(method,table,body,query,opts){
    calls++;
    if(method!=='POST'||table!=='sessions'||query!==null||opts.prefer!=='return=minimal')throw new Error('chamada inesperada');
    return Array.isArray(body)?null:[];
  });
  var result=await insertSessionRows(makeRows());
  return calls===9&&result.ok===true&&result.count===8;
});

await test(3,'lote recusado e só 3 individuais aceitas',async function(){
  var calls=0;
  var individualCalls=0;
  var insertSessionRows=makeFunction(async function(method,table,body){
    calls++;
    if(Array.isArray(body))return null;
    individualCalls++;
    return individualCalls<=3?[]:null;
  });
  var result=await insertSessionRows(makeRows());
  return calls===9&&result.ok===false&&result.count===3;
});

await test(4,'lote recusado e todas as individuais recusadas',async function(){
  var calls=0;
  var insertSessionRows=makeFunction(async function(){calls++;return null;});
  var result=await insertSessionRows(makeRows());
  return calls===9&&result.ok===false&&result.count===0;
});

await test(5,'array vazio não chama a rede',async function(){
  var calls=0;
  var insertSessionRows=makeFunction(async function(){calls++;return[];});
  var result=await insertSessionRows([]);
  return calls===0&&result.ok===true&&result.count===0;
});

console.log('RESULTADO: '+passed+'/'+total+' PASS');
if(passed!==total)process.exit(1);
