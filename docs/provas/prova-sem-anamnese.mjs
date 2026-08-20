// Rodar: node docs/provas/prova-sem-anamnese.mjs
//
// Prova da remoção do módulo de Anamnese: verifica tanto o HTML estático
// quanto a carga e navegação do script principal real.

import fs from 'node:fs';

const html=fs.readFileSync(new URL('../../index.html',import.meta.url),'utf8');
const tamanhoAntes=701742;
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

let passed=0;const total=10;
function test(n,desc,run){
  try{if(!run())throw new Error('resultado inesperado');
    passed++;console.log('PASS '+n+' — '+desc);
  }catch(e){console.log('FAIL '+n+' — '+desc+' ('+e.message+')');}
}

test(1,'index.html não contém anamnese',function(){return !/anamnese/i.test(html);});
test(2,'index.html não contém _ANA_',function(){return !/_ANA_/.test(html);});
test(3,'index.html não contém jspdf ou jsPDF',function(){return !/jspdf/i.test(html);});
test(4,'index.html não aponta scripts para CDN externo',function(){return !/<script\b[^>]*\bsrc\s*=\s*["']https?:\/\//i.test(html);});

let app;
test(5,'script principal carrega sem lançar',function(){
  const names=Object.keys(ctx);
  const factory=new Function(...names,code+'\nreturn {navigate:navigate};');
  app=factory(...names.map(n=>ctx[n]));
  return typeof app.navigate==='function';
});

function navega(page){
  app.navigate(page);
  return known['page-content'];
}
test(6,"navigate('dashboard') continua renderizando",function(){return navega('dashboard').innerHTML.length>0;});
test(7,"navigate('agenda') continua renderizando",function(){return navega('agenda').innerHTML.length>0;});
test(8,"navigate('financial') continua renderizando",function(){return navega('financial').innerHTML.length>0;});
test(9,"navigate('anamnese') não lança e não renderiza página",function(){return navega('anamnese').innerHTML==='';});
test(10,'index.html ficou menor que antes da remoção',function(){return Buffer.byteLength(html,'utf8')<tamanhoAntes;});

console.log('RESULTADO: '+passed+'/'+total+' PASS');
if(passed!==total)process.exit(1);
