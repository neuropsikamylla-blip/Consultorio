// Rodar: node docs/provas/prova-sidebar.mjs
// Verifica o núcleo da barra lateral em um DOM de mentira, incluindo as
// chamadas recebidas por classList e localStorage.

import fs from 'node:fs';

const html=fs.readFileSync(new URL('../../index.html',import.meta.url),'utf8');
const m=html.match(/\/\/ ── SIDEBAR-CORE-INICIO ──\s*([\s\S]*?)\/\/ ── SIDEBAR-CORE-FIM ──/);
if(!m)throw new Error('Bloco SIDEBAR-CORE não encontrado.');

function criarApp(comBotao){
  const chamadas=[];
  const classes=new Set();
  const botao=comBotao?{
    textContent:'',title:'',setAttribute(nome,valor){this[nome]=valor;}
  }:null;
  const document={
    body:{classList:{
      add(nome){chamadas.push(['add',nome]);classes.add(nome);},
      remove(nome){chamadas.push(['remove',nome]);classes.delete(nome);},
      contains(nome){return classes.has(nome);}
    }},
    getElementById(id){return id==='sidebar-toggle'?botao:null;}
  };
  const gravacoes=[];
  const localStorage={
    valores:new Map(),
    getItem(chave){return this.valores.has(chave)?this.valores.get(chave):null;},
    setItem(chave,valor){gravacoes.push([chave,String(valor)]);this.valores.set(chave,String(valor));}
  };
  const factory=new Function('document','localStorage',m[1]+'\nreturn {isSidebarCollapsed:isSidebarCollapsed,setSidebarCollapsed:setSidebarCollapsed,toggleSidebar:toggleSidebar};');
  return{api:factory(document,localStorage),classes:classes,chamadas:chamadas,localStorage:localStorage,gravacoes:gravacoes};
}

let passed=0;const total=8;
function test(n,descricao,rodar){
  try{
    if(!rodar())throw new Error('resultado inesperado');
    passed++;console.log('PASS '+n+' — '+descricao);
  }catch(e){console.log('FAIL '+n+' — '+descricao+' ('+e.message+')');}
}

test(1,'sem preferência gravada, começa expandida',function(){
  return criarApp(true).api.isSidebarCollapsed()===false;
});
test(2,'setSidebarCollapsed(true) grava collapsed',function(){
  const app=criarApp(true);app.api.setSidebarCollapsed(true);
  return app.localStorage.getItem('neuropsi_sidebar')==='collapsed'
      &&app.gravacoes.at(-1)[1]==='collapsed';
});
test(3,'setSidebarCollapsed(true) adiciona a classe no body',function(){
  const app=criarApp(true);app.api.setSidebarCollapsed(true);
  return app.classes.has('sidebar-collapsed')
      &&app.chamadas.some(c=>c[0]==='add'&&c[1]==='sidebar-collapsed');
});
test(4,'setSidebarCollapsed(false) grava expanded e remove a classe',function(){
  const app=criarApp(true);app.api.setSidebarCollapsed(true);app.api.setSidebarCollapsed(false);
  return app.localStorage.getItem('neuropsi_sidebar')==='expanded'
      &&!app.classes.has('sidebar-collapsed')
      &&app.chamadas.some(c=>c[0]==='remove'&&c[1]==='sidebar-collapsed');
});
test(5,'toggleSidebar a partir de expandida recolhe',function(){
  const app=criarApp(true);app.api.toggleSidebar();
  return app.api.isSidebarCollapsed()&&app.classes.has('sidebar-collapsed');
});
test(6,'toggleSidebar duas vezes volta ao estado inicial',function(){
  const app=criarApp(true);app.api.toggleSidebar();app.api.toggleSidebar();
  return !app.api.isSidebarCollapsed()&&!app.classes.has('sidebar-collapsed');
});
test(7,'valor estranho é tratado como expandida sem lançar',function(){
  const app=criarApp(true);app.localStorage.valores.set('neuropsi_sidebar','xyz');
  return app.api.isSidebarCollapsed()===false;
});
test(8,'setSidebarCollapsed funciona sem botão no DOM',function(){
  const app=criarApp(false);app.api.setSidebarCollapsed(true);
  return app.api.isSidebarCollapsed()&&app.classes.has('sidebar-collapsed');
});

console.log('RESULTADO: '+passed+'/'+total+' PASS');
if(passed!==total)process.exit(1);
