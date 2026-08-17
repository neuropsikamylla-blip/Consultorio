// Rodar: node docs/provas/prova-renovar-pacote.mjs
//
// A prova do problema que ela relatou em 17/08/2026: "dá erro quando tento
// renovar pacote; fechei e abri de novo e deu certo".
//
// Reproduz a situação exata — app aberto há mais de uma hora, access_token
// vencido — e verifica que renovar o pacote agora FUNCIONA: o app renova o
// token sozinho e grava. O mesmo teste, rodado contra a versão antiga do
// savePackage, falharia com "Erro ao criar pacote".

import fs from 'node:fs';

// Aceita um caminho alternativo de index.html no argv — é assim que se roda a
// prova contra a versão ANTIGA para confirmar que lá ela falha.
const alvo=process.argv[2]?new URL('file://'+process.argv[2]):new URL('../../index.html',import.meta.url);
const html=fs.readFileSync(alvo,'utf8');
const m=html.match(/<script>\s*(const SUPA_URL=[\s\S]*?)<\/script>/);
if(!m)throw new Error('Bloco <script> principal não encontrado.');
const code=m[1];

function jwt(expSegundos){
  return 'h.'+Buffer.from(JSON.stringify({exp:expSegundos})).toString('base64url')+'.s';
}
const agora=Math.floor(Date.now()/1000);
const TOKEN_VENCIDO=jwt(agora-600);   // venceu há 10 minutos
const TOKEN_NOVO=jwt(agora+3600);

// ── DOM de mentira ──
const modalHolder={innerHTML:''};
const known={'modal-container':modalHolder};
function fakeEl(id){
  return{id:id,innerHTML:'',textContent:'',value:'',checked:false,style:{},dataset:{},
    classList:{add(){},remove(){},toggle(){},contains(){return false;}},
    addEventListener(){},removeEventListener(){},remove(){},appendChild(){},insertBefore(){},
    querySelector(){return null;},querySelectorAll(){return[];}};
}
const document={
  getElementById(id){return known[id]||(known[id]=fakeEl(id));},
  querySelector(){return null;},querySelectorAll(){return[];},
  createElement(){return fakeEl('novo');},addEventListener(){},
  body:{classList:{add(){},remove(){},toggle(){},contains(){return false;}},appendChild(){}}
};
const localStorage={_v:new Map(),getItem(k){return this._v.has(k)?this._v.get(k):null;},
  setItem(k,v){this._v.set(k,String(v));},removeItem(k){this._v.delete(k);}};

// ── Servidor de mentira que se comporta como o Supabase com token vencido ──
const log={refreshes:0,pacotes:[],sessoes:[],recusas:0};
function bearer(opts){
  var h=(opts&&opts.headers)||{};
  return String(h['Authorization']||'').replace('Bearer ','');
}
async function fetchStub(url,opts){
  const metodo=(opts&&opts.method)||'GET';
  const corpo=opts&&opts.body?JSON.parse(opts.body):null;
  const ok=function(dados){return{ok:true,status:200,text:async()=>dados==null?'':JSON.stringify(dados),json:async()=>dados};};
  const naoAutorizado=function(){log.recusas++;return{ok:false,status:401,text:async()=>'JWT expired',json:async()=>({message:'JWT expired'})};};

  if(url.includes('/auth/v1/token')){
    log.refreshes++;
    return ok({access_token:TOKEN_NOVO,refresh_token:'refresh-novo'});
  }
  // O PostgREST recusa qualquer coisa que não venha com o token novo.
  if(bearer(opts)!==TOKEN_NOVO)return naoAutorizado();
  if(url.includes('/rest/v1/packages')&&metodo==='POST'){log.pacotes.push(corpo);return ok(null);}
  if(url.includes('/rest/v1/sessions')&&metodo==='POST'){
    (Array.isArray(corpo)?corpo:[corpo]).forEach(function(s){log.sessoes.push(s);});
    return ok(null);
  }
  return ok([]);
}

const ctx={
  document:document,localStorage:localStorage,sessionStorage:{getItem:()=>null,setItem(){}},
  location:{protocol:'file:',pathname:'/index.html',replace(){}},window:{},
  fetch:fetchStub,console:{log(){},error(){},warn(){}},
  setTimeout:()=>0,setInterval:()=>0,alert(){},
  atob:v=>Buffer.from(v,'base64').toString('binary'),
  Intl:Intl,URL:URL,Blob:function(){},navigator:{}
};
const names=Object.keys(ctx);
const app=new Function(...names,code+'\nreturn {savePackage:savePackage,setCache:function(c){_cache=c;},getDB:getDB};')(...names.map(n=>ctx[n]));

// Estado: ela está logada, mas o token venceu enquanto o app ficava aberto.
localStorage.setItem('consultorio_auth',JSON.stringify({access_token:TOKEN_VENCIDO,refresh_token:'refresh-valido',email:'ela@exemplo.com'}));
app.setCache({clients:[{id:'c1',name:'Joana Ribeiro Souza'}],packages:[],sessions:[],clientStatus:{},compromissos:[]});

// O formulário de renovação, preenchido como ela preencheria.
const campos={'pf-client':'c1','pf-name':'Joana Souza','pf-sessions':'8','pf-price':'800',
  'pf-payment':'pending','pf-type':'pacote','pf-payment-date':'','pf-payment-date2':'',
  'pf-first-date':'2026-08-20','pf-time':'14:00','pf-interval':'7','pf-category':'psicoterapia'};
Object.keys(campos).forEach(k=>{document.getElementById(k).value=campos[k];});

let passed=0;const total=5;
function test(n,desc,cond){
  if(cond){passed++;console.log('PASS '+n+' — '+desc);}
  else console.log('FAIL '+n+' — '+desc);
}

await app.savePackage('');

test(1,'o app percebeu o token vencido e renovou sozinho',log.refreshes>=1);
test(2,'o pacote foi criado (antes falhava com "Erro ao criar pacote")',log.pacotes.length===1&&log.pacotes[0].name==='Joana Souza'&&log.pacotes[0].total_sessions===8);
test(3,'as 8 sessões foram criadas',log.sessoes.length===8);
test(4,'as sessões saíram semanais a partir da data escolhida',
  log.sessoes[0]&&log.sessoes[0].date==='2026-08-20'&&log.sessoes[1].date==='2026-08-27'&&log.sessoes[7].date==='2026-10-08'&&log.sessoes.every(s=>s.time==='14:00'));
test(5,'nenhuma gravação ficou pendurada com o token vencido',log.pacotes.concat(log.sessoes).length===9);

console.log('RESULTADO: '+passed+'/'+total+' PASS');
if(passed!==total)process.exit(1);
