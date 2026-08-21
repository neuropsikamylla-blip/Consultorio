// Rodar: node docs/provas/prova-paridade-pacientes.mjs
//
// A pergunta que esta prova responde: a tela Pacientes ja faz TUDO que Sessoes/Pacotes faz?
// So com essa paridade demonstrada e seguro tirar Sessoes/Pacotes da sidebar (regra dela:
// "So remover Sessoes/Pacotes da sidebar quando todas as funcoes importantes estiverem
// acessiveis dentro de Pacientes").
//
// Compara o CODIGO das duas funcoes de render, nao a aparencia.

import fs from 'node:fs';

const html=fs.readFileSync(new URL('../../index.html',import.meta.url),'utf8');

function corpoDaFuncao(nome){
  const i=html.indexOf('function '+nome+'(');
  if(i<0)throw new Error('função '+nome+' não encontrada');
  // varre ate a chave que fecha, contando profundidade
  let d=0,inicio=html.indexOf('{',i);
  for(let k=inicio;k<html.length;k++){
    if(html[k]==='{')d++;
    else if(html[k]==='}'){d--;if(d===0)return html.slice(inicio,k+1);}
  }
  throw new Error('fim de '+nome+' não encontrado');
}
const sessoes=corpoDaFuncao('renderSessions');
const pacientes=corpoDaFuncao('renderClients');

const acoes=txt=>new Set((txt.match(/onclick=\\?"([a-zA-Z_]+)\(/g)||[]).map(m=>m.replace(/onclick=\\?"/,'').replace('(','')));
const aSessoes=acoes(sessoes), aPacientes=acoes(pacientes);

let passed=0;const total=8;
function test(n,desc,run){
  try{ const r=run(); if(r!==true)throw new Error(typeof r==='string'?r:'resultado inesperado');
    passed++;console.log('PASS '+n+' — '+desc);
  }catch(e){console.log('FAIL '+n+' — '+desc+' ('+e.message+')');}
}

test(1,'toda ação de Sessões/Pacotes existe em Pacientes',function(){
  const faltando=[...aSessoes].filter(a=>!aPacientes.has(a));
  return faltando.length===0 || ('faltam em Pacientes: '+faltando.join(', '));
});
test(2,'Pacientes permite AGENDAR nova sessão (showSessionForm)',function(){
  return aPacientes.has('showSessionForm');
});
test(3,'Pacientes permite EDITAR sessão (showSessionEditForm)',function(){
  return aPacientes.has('showSessionEditForm');
});
test(4,'Pacientes permite EXCLUIR sessão (deleteSessionConfirm)',function(){
  return aPacientes.has('deleteSessionConfirm');
});
test(5,'Pacientes tem a troca rápida de status (quickStatusMenu)',function(){
  return aPacientes.has('quickStatusMenu');
});
test(6,'Pacientes abre Prontuário e a ficha completa',function(){
  return aPacientes.has('showProntuario')&&aPacientes.has('showClientDetail');
});
test(7,'Pacientes mantém o que era só dele: novo/editar e excluir paciente',function(){
  return aPacientes.has('showClientForm')&&aPacientes.has('deleteClientConfirm');
});
test(8,'a barra superior de Pacientes traz + Nova Sessão e + Novo Paciente',function(){
  return pacientes.includes('+ Nova Sessão')&&pacientes.includes('+ Novo Paciente');
});

console.log('');
console.log('Ações em Sessões/Pacotes: '+[...aSessoes].sort().join(', '));
console.log('Ações em Pacientes:       '+[...aPacientes].sort().join(', '));
console.log('RESULTADO: '+passed+'/'+total+' PASS');
if(passed!==total)process.exit(1);
