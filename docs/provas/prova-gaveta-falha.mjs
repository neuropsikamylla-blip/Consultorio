// Rodar: node docs/provas/prova-gaveta-falha.mjs
//
// A pergunta que esta prova responde: quando a gravação FALHA, a quitação em massa
// conta certo, ou mente sucesso? E a data que vai ao banco é a do mês de ORIGEM
// (nunca a de hoje, que jogaria a dívida velha dentro de setembro)?
// Aqui a rede é controlada de fora e o que sai no PATCH é inspecionado.

import fs from 'node:fs';

const html=fs.readFileSync(new URL('../../index.html',import.meta.url),'utf8');
const m=html.match(/<script>\s*(const SUPA_URL=[\s\S]*?)<\/script>/);
if(!m)throw new Error('Bloco <script> principal não encontrado.');
const code=m[1];

const toasts=[];          // tudo que showToast exibiu
const patches=[];         // tudo que saiu para o Supabase
const rede={modo:'ok'};   // 'ok' | 'falha' | 'falha-packages'

function fakeEl(id){
  return{id:id,innerHTML:'',textContent:'',value:'',checked:false,style:{cssText:''},dataset:{},
    classList:{add(){},remove(){},toggle(){},contains(){return false;}},
    addEventListener(){},removeEventListener(){},remove(){},appendChild(){},insertBefore(){},
    querySelector(){return null;},querySelectorAll(){return[];}};
}
const known={};
const criados=[];
const document={
  getElementById(id){return known[id]||(known[id]=fakeEl(id));},
  querySelector(){return null;},querySelectorAll(){return[];},
  createElement(){const el=fakeEl('novo');criados.push(el);return el;},
  addEventListener(){},
  body:{classList:{add(){},remove(){},toggle(){},contains(){return false;}},
        appendChild(el){if(el&&typeof el.textContent==='string'&&el.textContent)toasts.push(el.textContent);}}
};
const localStorage={_v:new Map(),getItem(k){return this._v.has(k)?this._v.get(k):null;},setItem(k,v){this._v.set(k,String(v));},removeItem(k){this._v.delete(k);}};

async function fetchStub(url,opts){
  const method=(opts&&opts.method)||'GET';
  const alvoPacotes=url.indexOf('/rest/v1/packages')>=0;
  if(method==='PATCH')patches.push({url:url,body:opts&&opts.body?JSON.parse(opts.body):null});
  const deveFalhar = rede.modo==='falha' || (rede.modo==='falha-packages'&&alvoPacotes);
  if(method==='PATCH'&&deveFalhar)return{ok:false,status:500,text:async()=>'erro',json:async()=>({})};
  return{ok:true,status:200,text:async()=>'[]',json:async()=>[]};
}

let confirmaResposta=true;
const ctx={
  document:document,localStorage:localStorage,sessionStorage:{getItem(){return null;},setItem(){}},
  location:{protocol:'file:',pathname:'/index.html',replace(){}},
  window:{confirm(){return confirmaResposta;}},
  fetch:fetchStub,console:{log(){},error(){},warn(){}},
  setTimeout:function(){return 0;},setInterval:function(){return 0;},
  alert:function(){},atob:v=>Buffer.from(v,'base64').toString('binary'),
  Intl:Intl,URL:URL,Blob:function(){},navigator:{}
};
const names=Object.keys(ctx);
const factory=new Function(...names,code+'\nreturn {setCache:function(c){_cache=c;},getDB:getDB,markAllLegacyPaid:window.markAllLegacyPaid,legacyPayload:legacyPayload,legacyTotals:legacyTotals};');
const app=factory(...names.map(n=>ctx[n]));

// Dois pacotes pendentes de JUNHO e uma sessão avulsa pendente de JULHO. Marco em setembro.
function preparar(){
  toasts.length=0;patches.length=0;
  app.setCache({
    clients:[{id:'c1',name:'Wini'}],
    packages:[
      {id:'p-jun',clientId:'c1',name:'Wini',price:1000,totalSessions:10,paymentStatus:'pending',paymentType:'pacote',paymentDate:null,createdAt:'2026-06-05T12:00:00'},
      {id:'p-mai',clientId:'c1',name:'Antigo 2',price:800,totalSessions:8,paymentStatus:'parcela1',paymentType:'pacote',paymentDate:'2026-05-03',createdAt:'2026-05-01T12:00:00'}
    ],
    sessions:[
      {id:'s-jul',clientId:'c1',packageId:null,date:'2026-07-10',time:'09:00',status:'agendada',category:'psicoterapia',sessionPayStatus:'pending',sessionPrice:200}
    ],
    clientStatus:{},compromissos:[],appSettings:{financeStart:'2026-09'}
  });
}

let passed=0;const total=8;
async function test(n,desc,run){
  try{ if(!await run())throw new Error('resultado inesperado');
    passed++;console.log('PASS '+n+' — '+desc);
  }catch(e){console.log('FAIL '+n+' — '+desc+' ('+e.message+')');}
}
const ultimoToast=()=>toasts[toasts.length-1]||'';
const corpoDe=id=>{const p=patches.filter(x=>x.url.indexOf(id)>=0).pop();return p?p.body:null;};

await test(1,'a data gravada é o fim do mês de ORIGEM, nunca a de hoje',async function(){
  preparar();rede.modo='ok';
  await app.markAllLegacyPaid();
  const b=corpoDe('p-jun');
  return b&&b.payment_date==='2026-06-30';
});

await test(2,'nenhum lançamento antigo é datado no mês corrente',async function(){
  const hojeMes=new Date().toISOString().slice(0,7);
  return patches.every(p=>!p.body||!p.body.payment_date||p.body.payment_date.slice(0,7)!==hojeMes);
});

await test(3,'parcela1 preserva o pagamento original e fecha a 2ª parcela no mês de origem',async function(){
  const b=corpoDe('p-mai');
  return b&&b.payment_date==='2026-05-03'&&b.payment_date2==='2026-05-31';
});

await test(4,'com tudo certo, o aviso informa os 3 quitados',async function(){
  return /3 quitados/.test(ultimoToast())&&!/falharam/.test(ultimoToast());
});

await test(5,'REDE FORA: o aviso NÃO pode dizer sucesso',async function(){
  preparar();rede.modo='falha';
  await app.markAllLegacyPaid();
  return /falharam/.test(ultimoToast());
});

await test(6,'REDE FORA: nenhum sucesso é contado',async function(){
  return /^0 quitados/.test(ultimoToast())||/\b0 quitados/.test(ultimoToast());
});

await test(7,'falha parcial: relata quitados E falhas, sem abortar no meio',async function(){
  preparar();rede.modo='falha-packages';   // pacotes falham, sessão avulsa passa
  await app.markAllLegacyPaid();
  const t=ultimoToast();
  return /1 quitados/.test(t)&&/2 falharam/.test(t);
});

await test(8,'recusar a confirmação não grava nada',async function(){
  preparar();rede.modo='ok';confirmaResposta=false;
  await app.markAllLegacyPaid();
  confirmaResposta=true;
  return patches.length===0;
});

console.log('RESULTADO: '+passed+'/'+total+' PASS');
if(passed!==total)process.exit(1);
