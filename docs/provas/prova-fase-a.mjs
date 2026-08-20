// Rodar: node docs/provas/prova-fase-a.mjs
//
// Prova da Fase A: renomea somente textos visíveis, reorganiza a sidebar e
// preserva todas as chaves internas, inclusive a rota oculta de Anamnese.

import fs from 'node:fs';

const html=fs.readFileSync(new URL('../../index.html',import.meta.url),'utf8');
const scriptMatch=html.match(/<script>\s*(const SUPA_URL=[\s\S]*?)<\/script>/);
if(!scriptMatch)throw new Error('Bloco <script> principal não encontrado.');
const code=scriptMatch[1];

const navMatch=html.match(/<div class="nav">([\s\S]*?)<\/div>\s*<div class="sidebar-footer">/);
if(!navMatch)throw new Error('Sidebar não encontrada.');
const nav=navMatch[1];
const navPages=Array.from(nav.matchAll(/data-page="([^"]+)"/g),function(m){return m[1];});

const footerMatch=html.match(/<div class="sidebar-footer">([\s\S]*?)<\/div>\s*<\/nav>/);
if(!footerMatch)throw new Error('Rodapé da sidebar não encontrado.');
const footer=footerMatch[1];

function fakeEl(id){
  return{id:id,innerHTML:'',textContent:'',value:'',checked:false,disabled:false,className:'',style:{},dataset:{},
    classList:{add(){},remove(){},toggle(){return false;},contains(){return false;}},
    addEventListener(){},removeEventListener(){},remove(){},appendChild(){},insertBefore(){},
    querySelector(){return null;},querySelectorAll(){return[];},getContext(){return null;}};
}
const known={};
const document={
  getElementById(id){return known[id]||(known[id]=fakeEl(id));},
  querySelector(selector){return selector==='.main'?fakeEl('main'):null;},querySelectorAll(){return[];},
  createElement(){return fakeEl('novo');},addEventListener(){},body:fakeEl('body')
};
const localStorage={
  _v:new Map(),
  getItem(k){return this._v.has(k)?this._v.get(k):null;},
  setItem(k,v){this._v.set(k,String(v));},removeItem(k){this._v.delete(k);}
};
const ctx={
  document:document,localStorage:localStorage,sessionStorage:{getItem(){return null;},setItem(){}},
  location:{protocol:'file:',pathname:'/index.html',replace(){}},window:{},
  fetch:async function(){return{ok:true,status:200,text:async function(){return'';},json:async function(){return[];}};},
  console:{log(){},error(){},warn(){}},setTimeout(){return 0;},setInterval(){return 0;},clearTimeout(){},
  alert(){},prompt(){return'';},atob:v=>Buffer.from(v,'base64').toString('binary'),
  btoa:v=>Buffer.from(v,'binary').toString('base64'),Intl:Intl,URL:URL,Blob:function(){},navigator:{}
};
const names=Object.keys(ctx);
const factory=new Function(...names,code+'\nreturn {navigate:navigate,setCache:function(c){_cache=c;}};');
const app=factory(...names.map(function(n){return ctx[n];}));
app.setCache({clients:[],packages:[],sessions:[],clientStatus:{},compromissos:[],appSettings:{}});

let passed=0;const total=12;
function test(n,desc,run){
  try{
    if(!run())throw new Error('resultado inesperado');
    passed++;console.log('PASS '+n+' — '+desc);
  }catch(e){console.log('FAIL '+n+' — '+desc+' ('+e.message+')');}
}

test(1,'sidebar segue a ordem pedida, com Sessões/Pacotes após Pacientes',function(){
  return JSON.stringify(navPages)===JSON.stringify(['dashboard','agenda','clients','sessions','anexos','financial','bills','notes','settings']);
});
test(2,'Anamnese não aparece mais na sidebar',function(){
  return !nav.includes('data-page="anamnese"');
});
test(3,'renderAnamnese e _ANA_SECS continuam no código',function(){
  return /function\s+renderAnamnese\s*\(/.test(code)&&/\b(?:var|let|const)\s+_ANA_SECS\s*=/.test(code);
});
test(4,'objeto pages preserva a rota anamnese',function(){
  return /\banamnese\s*:\s*renderAnamnese\b/.test(code);
});
test(5,"navigate('anamnese') renderiza sem lançar",function(){
  app.navigate('anamnese');
  return document.getElementById('page-title').textContent==='Anamnese Neuropsicológica'
    &&document.getElementById('page-content').innerHTML.length>0;
});
test(6,'rodapé preserva Backup, Restaurar, Sair e Atualizar App',function(){
  return ['⬇️ Backup','⬆️ Restaurar','Sair','🔄 Atualizar App'].every(function(label){return footer.includes(label);});
});
test(7,'menu mostra Pacientes e não Clientes',function(){
  return />\s*Pacientes\s*<\/button>/.test(nav)&&!/>\s*Clientes\s*<\/button>/.test(nav);
});
test(8,'menu mostra Documentos e não Anexos',function(){
  return />\s*Documentos\s*<\/button>/.test(nav)&&!/>\s*Anexos\s*<\/button>/.test(nav);
});
test(9,'menu mostra Contas a Pagar e não Boletos',function(){
  return />\s*Contas a Pagar\s*<\/button>/.test(nav)&&!/>\s*Boletos\s*<\/button>/.test(nav);
});
test(10,'titles usa os novos rótulos',function(){
  const expected={clients:'Pacientes',anexos:'Documentos',bills:'Contas a Pagar'};
  return Object.keys(expected).every(function(route){
    app.navigate(route);
    return document.getElementById('page-title').textContent===expected[route];
  });
});
test(11,'todas as rotas visíveis e Sessões/Pacotes renderizam sem lançar',function(){
  return ['dashboard','agenda','clients','anexos','financial','bills','notes','settings','sessions'].every(function(route){
    app.navigate(route);return true;
  });
});
test(12,'chaves internas clients, anexos e bills permanecem na sidebar',function(){
  return ['clients','anexos','bills'].every(function(route){return nav.includes('data-page="'+route+'"');});
});

console.log('RESULTADO: '+passed+'/'+total+' PASS');
if(passed!==total)process.exit(1);
