// Rodar: node docs/provas/prova-render-agenda.mjs
//
// Carrega o <script> INTEIRO do index.html num DOM mínimo de mentira (sem rede,
// sem dados reais), injeta um _cache falso e verifica o HTML que as funções de
// agenda realmente produzem. É a prova de que os compromissos aparecem no mês,
// na semana e no dia — e de que as sessões continuam aparecendo como antes.

import fs from 'node:fs';

const html=fs.readFileSync(new URL('../../index.html',import.meta.url),'utf8');
const m=html.match(/<script>\s*(const SUPA_URL=[\s\S]*?)<\/script>/);
if(!m)throw new Error('Bloco <script> principal não encontrado.');
const code=m[1];

// ── DOM de mentira: o suficiente para o script carregar sem explodir ──
const modalHolder={innerHTML:''};
const topbarHolder={innerHTML:''};
const pageHolder={innerHTML:''};
function fakeEl(id){
  return{
    id:id,
    innerHTML:'',textContent:'',value:'',checked:false,
    style:{},dataset:{},
    classList:{add(){},remove(){},toggle(){},contains(){return false;}},
    addEventListener(){},removeEventListener(){},remove(){},
    appendChild(){},insertBefore(){},querySelector(){return null;},
    querySelectorAll(){return[];}
  };
}
const known={'modal-container':modalHolder,'topbar-actions':topbarHolder,'page-content':pageHolder};
const document={
  getElementById(id){return known[id]||(known[id]=Object.assign(fakeEl(id),id==='modal-container'?modalHolder:{}));},
  querySelector(){return null;},
  querySelectorAll(){return[];},
  createElement(){return fakeEl('novo');},
  addEventListener(){},
  body:{classList:{add(){},remove(){},toggle(){},contains(){return false;}},appendChild(){}}
};
const localStorage={_v:new Map(),getItem(k){return this._v.has(k)?this._v.get(k):null;},setItem(k,v){this._v.set(k,String(v));},removeItem(k){this._v.delete(k);}};
const sessionStorage={getItem(){return null;},setItem(){}};
const location={protocol:'file:',pathname:'/index.html',replace(){}};
const win={};
// Rede de mentira: registra o que sairia para o Supabase e devolve sucesso vazio.
const rede={chamadas:[],modo:'ok'};
async function fetchStub(url,opts){
  rede.chamadas.push({url:url,method:(opts&&opts.method)||'GET',body:opts&&opts.body?JSON.parse(opts.body):null});
  if(rede.modo==='falha')return{ok:false,status:500,text:async function(){return'erro';},json:async function(){return{};}};
  return{ok:true,status:200,text:async function(){return'';},json:async function(){return[];}};
}
const ctx={
  document:document,localStorage:localStorage,sessionStorage:sessionStorage,
  location:location,window:win,
  fetch:fetchStub,
  console:{log(){},error(){},warn(){}},
  setTimeout:function(){return 0;},setInterval:function(){return 0;},
  alert:function(){},atob:function(v){return Buffer.from(v,'base64').toString('binary');},
  Intl:Intl,URL:URL,Blob:function(){},navigator:{}
};
const names=Object.keys(ctx);
const factory=new Function(...names,code+'\nreturn {getDB:getDB,setCache:function(c){_cache=c;},buildMonthDay:buildMonthDay,buildWeekGrid:buildWeekGrid,dayClick:window.dayClick||dayClick,renderAgenda:renderAgenda,showCompromissoForm:showCompromissoForm,compromissosOnDate:compromissosOnDate,saveCompromisso:saveCompromisso,confirmDeleteCompromisso:confirmDeleteCompromisso};');
const app=factory(...names.map(function(n){return ctx[n];}));

// ── Dados falsos ──
function iso(d){return d;}
// Tem de ser HOJE: buildWeekGrid renderiza a semana de calDate, que nasce em new Date().
const hoje=new Date();
const dia=new Date(hoje.getFullYear(),hoje.getMonth(),hoje.getDate(),12,0,0);
const ds=dia.toISOString().split('T')[0];
app.setCache({
  clients:[{id:'c1',name:'Joana Ribeiro Souza'}],
  packages:[{id:'p1',clientId:'c1',name:'Joana Souza',totalSessions:8,price:800,paymentStatus:'paid',paymentType:'pacote'}],
  sessions:[{id:'p1_s1',clientId:'c1',packageId:'p1',date:iso(ds),time:'14:00',status:'agendada',category:'psicoterapia'}],
  clientStatus:{},
  compromissos:[
    {id:'k1',groupId:'g1',date:iso(ds),time:'09:00',endTime:'10:00',title:'Entrega de Laudo — Joana',kind:'laudo',notes:'levar 2 vias'},
    {id:'k2',groupId:'g2',date:iso(ds),time:'16:00',endTime:'',title:'Supervisão',kind:'supervisao',notes:''}
  ]
});

let passed=0;const total=12;
function test(n,desc,run){
  try{
    if(!run())throw new Error('resultado inesperado');
    passed++;console.log('PASS '+n+' — '+desc);
  }catch(e){console.log('FAIL '+n+' — '+desc+' ('+e.message+')');}
}
async function testAsync(n,desc,run){
  try{
    if(!await run())throw new Error('resultado inesperado');
    passed++;console.log('PASS '+n+' — '+desc);
  }catch(e){console.log('FAIL '+n+' — '+desc+' ('+e.message+')');}
}
// Preenche os campos do formulário no DOM de mentira e devolve o que foi gravado.
async function salvarPeloForm(campos,id){
  Object.keys(campos).forEach(function(k){document.getElementById(k).value=campos[k];});
  rede.chamadas.length=0;
  await app.saveCompromisso(id||'');
  var gravou=rede.chamadas.filter(function(c){return c.method==='POST'&&c.url.indexOf('/rest/v1/notes')>=0;});
  if(!gravou.length)return null;
  return JSON.parse(gravou[gravou.length-1].body.content).items;
}

const mesHtml=app.buildMonthDay(dia,app.getDB(),iso(ds),false);

test(1,'mês mostra o compromisso de laudo com hora e emoji',function(){
  return mesHtml.includes('cal-chip compromisso')&&mesHtml.includes('09:00')&&mesHtml.includes('📄')&&mesHtml.includes('Entrega de Laudo — Joana');
});
test(2,'mês mostra também a supervisão',function(){
  return mesHtml.includes('👥')&&mesHtml.includes('Supervisão')&&mesHtml.includes('16:00');
});
test(3,'mês NÃO perdeu a sessão do paciente',function(){
  return mesHtml.includes('cal-chip psicoterapia')&&mesHtml.includes('Joana Ribeiro')&&mesHtml.includes('14:00');
});
test(4,'clicar no compromisso abre o form daquele id',function(){
  return mesHtml.includes("showCompromissoForm(null,'k1')")&&mesHtml.includes("showCompromissoForm(null,'k2')");
});

const semanaHtml=app.buildWeekGrid(app.getDB(),iso(ds));
test(5,'semana coloca o compromisso na faixa de hora certa',function(){
  return semanaHtml.includes('week-event compromisso')&&semanaHtml.includes('📄')&&semanaHtml.includes('👥');
});
test(6,'semana NÃO perdeu a sessão do paciente',function(){
  return semanaHtml.includes('week-event psicoterapia');
});

app.dayClick(iso(ds));
const diaHtml=modalHolder.innerHTML;
test(7,'detalhe do dia lista compromisso com faixa de horário, tipo e observação',function(){
  return diaHtml.includes('09:00–10:00')&&diaHtml.includes('Entrega de Laudo')&&diaHtml.includes('levar 2 vias')&&diaHtml.includes('+ Compromisso');
});

app.renderAgenda();
test(8,'topo da agenda tem os dois botões',function(){
  return topbarHolder.innerHTML.includes('+ Compromisso')&&topbarHolder.innerHTML.includes('+ Nova Sessão');
});

// ── O que sai para o banco quando ela salva pelo formulário ──
const cacheBase=JSON.parse(JSON.stringify(app.getDB()));
function resetCache(){app.setCache(JSON.parse(JSON.stringify(cacheBase)));}

await testAsync(9,'salvar sem repetição grava 1 item com os campos certos',async function(){
  resetCache();
  var items=await salvarPeloForm({'cf-kind':'laudo','cf-title':'Entrega de Laudo — Pedro','cf-date':'2026-09-10','cf-time':'11:00','cf-end':'12:00','cf-repeat':'0','cf-count':'4','cf-notes':'imprimir colorido'});
  if(!items)throw new Error('nada foi gravado');
  var novo=items[items.length-1];
  return items.length===3&&novo.title==='Entrega de Laudo — Pedro'&&novo.date==='2026-09-10'&&novo.time==='11:00'&&novo.endTime==='12:00'&&novo.kind==='laudo'&&novo.notes==='imprimir colorido'&&!!novo.groupId&&!!novo.createdAt;
});

await testAsync(10,'salvar com repetição semanal 3x grava 3 itens no mesmo grupo',async function(){
  resetCache();
  var items=await salvarPeloForm({'cf-kind':'supervisao','cf-title':'','cf-date':'2026-09-01','cf-time':'19:00','cf-end':'','cf-repeat':'7','cf-count':'3','cf-notes':''});
  if(!items)throw new Error('nada foi gravado');
  var novos=items.slice(2);
  var datas=novos.map(function(i){return i.date;}).join(',');
  var grupos=new Set(novos.map(function(i){return i.groupId;}));
  var ids=new Set(novos.map(function(i){return i.id;}));
  return novos.length===3&&datas==='2026-09-01,2026-09-08,2026-09-15'&&grupos.size===1&&ids.size===3&&novos[0].title==='Supervisão';
});

await testAsync(11,'sem data não grava nada e mostra o erro no formulário',async function(){
  resetCache();
  var erroEl=document.getElementById('cf-error');erroEl.textContent='';erroEl.style={};
  var items=await salvarPeloForm({'cf-kind':'reuniao','cf-title':'Reunião','cf-date':'','cf-time':'10:00','cf-end':'','cf-repeat':'0','cf-count':'2','cf-notes':''});
  return items===null&&erroEl.textContent==='Informe a data'&&erroEl.style.display==='flex';
});

await testAsync(12,'excluir a série inteira remove as duas ocorrências do grupo',async function(){
  var comSerie=JSON.parse(JSON.stringify(cacheBase));
  comSerie.compromissos=[
    {id:'s1',groupId:'gg',date:'2026-09-01',time:'19:00',endTime:'',title:'Supervisão',kind:'supervisao',notes:''},
    {id:'s2',groupId:'gg',date:'2026-09-08',time:'19:00',endTime:'',title:'Supervisão',kind:'supervisao',notes:''},
    {id:'z9',groupId:'outro',date:'2026-09-02',time:'08:00',endTime:'',title:'Reunião',kind:'reuniao',notes:''}
  ];
  app.setCache(comSerie);
  app.confirmDeleteCompromisso('s1');
  if(!modalHolder.innerHTML.includes('Toda a série (2)'))throw new Error('não ofereceu excluir a série');
  rede.chamadas.length=0;
  await win._deleteCompromisso(true);
  var gravou=rede.chamadas.filter(function(c){return c.method==='POST'&&c.url.indexOf('/rest/v1/notes')>=0;});
  var restaram=JSON.parse(gravou[gravou.length-1].body.content).items;
  return restaram.length===1&&restaram[0].id==='z9';
});

console.log('RESULTADO: '+passed+'/'+total+' PASS');
if(passed!==total)process.exit(1);
