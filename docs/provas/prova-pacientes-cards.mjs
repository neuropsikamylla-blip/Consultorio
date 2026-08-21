// Rodar: node docs/provas/prova-pacientes-cards.mjs
//
// Prova de aceite da tela Pacientes em cards. Carrega o script inteiro em um
// DOM de mentira e verifica o HTML realmente produzido por renderClients().

import crypto from 'node:crypto';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('../../index.html',import.meta.url),'utf8');
const scriptMatch=html.match(/<script>\s*(const SUPA_URL=[\s\S]*?)<\/script>/);
if(!scriptMatch)throw new Error('Bloco <script> principal não encontrado.');
const code=scriptMatch[1];

function fakeEl(id){
  return{id:id,innerHTML:'',textContent:'',value:'',checked:false,disabled:false,className:'',style:{},dataset:{},
    classList:{add(){},remove(){},toggle(){return false;},contains(){return false;}},
    addEventListener(){},removeEventListener(){},remove(){},appendChild(){},insertBefore(){},setAttribute(){},
    querySelector(){return null;},querySelectorAll(){return[];},getContext(){return null;}};
}
const known={};
const document={
  getElementById(id){return known[id]||(known[id]=fakeEl(id));},
  querySelector(){return null;},querySelectorAll(){return[];},
  createElement(){return fakeEl('novo');},addEventListener(){},body:fakeEl('body')
};
const localStorage={
  _v:new Map(),getItem(k){return this._v.has(k)?this._v.get(k):null;},
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
const factory=new Function(...names,code+'\nreturn {renderClients:renderClients,setCache:function(c){_cache=c;}};');
const app=factory(...names.map(function(n){return ctx[n];}));

const cache={
  clients:[
    {id:'c1',name:'Ana Martins'},
    {id:'c2',name:'Bruno Lima'},
    {id:'c3',name:'Carla Souza'}
  ],
  packages:[
    {id:'p1',clientId:'c1',name:'Pacote Ana',totalSessions:3,paymentType:'pacote',paymentStatus:'paid'},
    {id:'p2',clientId:'c3',name:'Pacote Carla',totalSessions:1,paymentType:'sessao',paymentStatus:'pending'}
  ],
  sessions:[
    {id:'s1',clientId:'c1',packageId:'p1',date:'2026-08-21',time:'09:00',status:'agendada',category:'psicoterapia'},
    {id:'s2',clientId:'c1',packageId:'p1',date:'2026-08-14',time:'09:00',status:'realizada',category:'psicoterapia'},
    {id:'s3',clientId:'c1',packageId:'p1',date:'2026-08-07',time:'09:00',status:'falta',category:'psicoterapia'},
    {id:'s4',clientId:'c3',packageId:'p2',date:'2026-08-22',time:'10:00',status:'agendada',category:'avaliacao'}
  ],
  clientStatus:{},compromissos:[],appSettings:{}
};
app.setCache(cache);
app.renderClients();

function page(){return document.getElementById('page-content').innerHTML;}
function topbar(){return document.getElementById('topbar-actions').innerHTML;}
function cardCount(markup){return(markup.match(/class="card sess-client-card"/g)||[]).length;}
function cardFor(name,markup=page()){
  const start=markup.indexOf('data-s="'+name.toLowerCase()+'"');
  if(start<0)return'';
  const next=markup.indexOf('<div class="card sess-client-card"',start);
  return markup.slice(start,next<0?markup.length:next);
}

let passed=0;const total=14;
function test(n,desc,run){
  try{
    if(!run())throw new Error('resultado inesperado');
    passed++;console.log('PASS '+n+' — '+desc);
  }catch(e){console.log('FAIL '+n+' — '+desc+' ('+e.message+')');}
}

test(1,'Pacientes usa os cards de Sessões/Pacotes e remove a tabela simples',function(){
  return page().includes('class="card sess-client-card"')&&!page().includes('<th>Telefone</th>');
});
test(2,'os 3 pacientes cadastrados rendem 3 cards',function(){return cardCount(page())===3;});
test(3,'paciente sem sessão continua visível com o vazio previsto',function(){
  const card=cardFor('Bruno Lima');
  return card.includes('Bruno Lima')&&card.includes('<div class="empty" style="padding:18px"><p>Nenhuma sessão registrada</p></div>');
});
test(4,'card traz iniciais e nome do paciente',function(){
  const card=cardFor('Ana Martins');return card.includes('>AM</div>')&&card.includes('>Ana Martins</div>');
});
test(5,'card resume realizadas e faltas',function(){
  const card=cardFor('Ana Martins');return card.includes('3 sessões:')&&card.includes('1 realizada')&&card.includes('1 falta');
});
test(6,'card com sessões preserva todas as colunas de Sessões/Pacotes',function(){
  const card=cardFor('Ana Martins');
  return ['Nº','Data','Hora','Categoria','Pacote','Status','Pgto','Ações'].every(function(label){return card.includes('<th>'+label+'</th>');});
});
test(7,'card tem Prontuário, perfil, editar e excluir com as funções existentes',function(){
  const card=cardFor('Bruno Lima');
  return card.includes("showProntuario('c2')")&&card.includes("showClientDetail('c2')")
    &&card.includes("showClientForm('c2')")&&card.includes("deleteClientConfirm('c2')")
    &&(card.match(/class="btn-icon"/g)||[]).length===2;
});
test(8,'busca e botão Novo Paciente permanecem presentes',function(){
  return page().includes('class="search-input-wrap"')&&page().includes('class="search-icon"')
    &&page().includes('oninput="window._cs(this.value)"')&&topbar().includes('+ Novo Paciente');
});
test(9,'há os 5 filtros pedidos e não há filtro Supervisão',function(){
  const buttons=Array.from(page().matchAll(/onclick="window\._clientFilter\('[^']+'\)">([^<]+)<\/button>/g),function(m){return m[1];});
  return JSON.stringify(buttons)===JSON.stringify(['Todos','Psicoterapia','Avaliação','Reabilitação','Encerrados'])
    &&!buttons.includes('Supervisão');
});
test(10,'filtro Psicoterapia mostra somente pacientes dessa categoria',function(){
  ctx.window._clientFilter('psicoterapia');
  return cardCount(page())===1&&page().includes('Ana Martins')&&!page().includes('Bruno Lima')&&!page().includes('Carla Souza');
});
test(11,'filtro Encerrados mostra somente pacientes em alta',function(){
  cache.clientStatus.c3='alta';ctx.window._clientFilter('encerrados');
  return cardCount(page())===1&&page().includes('Carla Souza')&&!page().includes('Ana Martins')&&!page().includes('Bruno Lima');
});
test(12,'Todos não inclui paciente encerrado',function(){
  ctx.window._clientFilter('todos');
  return cardCount(page())===2&&page().includes('Ana Martins')&&page().includes('Bruno Lima')&&!page().includes('Carla Souza');
});
test(13,'busca por nome e filtro de categoria são aplicados juntos',function(){
  ctx.window._clientFilter('psicoterapia');ctx.window._cs('bruno');
  const nenhum=cardCount(page())===0;
  ctx.window._cs('ana');
  return nenhum&&cardCount(page())===1&&page().includes('Ana Martins')&&!page().includes('Bruno Lima');
});
test(14,'o bloco CSS permanece exatamente sem regras novas',function(){
  const style=html.match(/<style>([\s\S]*?)<\/style>/);
  return !!style&&crypto.createHash('sha256').update(style[1]).digest('hex')==='7b53498616dc66f048993f0b457c0a100e8dd9d545fb0f172e4e321cfc04e6f6';
});

console.log('RESULTADO: '+passed+'/'+total+' PASS');
if(passed!==total)process.exit(1);
