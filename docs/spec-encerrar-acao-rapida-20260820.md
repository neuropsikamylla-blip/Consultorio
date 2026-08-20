# Spec — "Pacotes a Encerrar": mostrar onde está a sessão e marcar em um clique

Data: 20/08/2026 · Arquivo alvo: `index.html`

## Pedido dela

> "vou em abrir, abre a pagina sessoes e pacotes; nessa parte fica mto enrolada pois vc tem de
> procurar o paciente pra saber onde ficou essa sessão restante. eu preciso clicar e de fato ir
> para a sessão que esta faltando, na agenda, pois la clico realizada ou nao. lembrando que
> falta = sessao feita, ela precisa ser contabilizada como feita; a parte de falta é so para
> meu controle que o paciente faltou, mas a sessao foi feita, pois paciente que nao avisa com
> antecedencia a sessao é contabilizada normalmente"

## Diagnóstico já feito — NÃO reinvestigar

Rodando o dashboard de verdade, com `pkgStats` e `nextOpenSession`:

| Cenário | `nextOpenSession` | Resultado do clique hoje |
|---|---|---|
| A) 8 criadas, 7 marcadas, 1 `agendada` | acha `s8` | vai direto à sessão ✅ |
| B) **só 7 criadas, todas marcadas** | `null` | **cai na página Sessões/Pacotes** ❌ |
| C) 6 realizadas + 1 falta + 1 agendada | acha `s8` | vai direto ✅ |

**O caso B é o que a incomodou:** o pacote tem 8 vagas, mas só 7 viraram sessão na agenda.
Não existe sessão para abrir — falta AGENDAR a última.

Sobre "falta = sessão feita": **já está correto** e não deve ser mexido. Os seis pontos que
contam sessão usada (linhas ~553, 848, 949, 1208, 1293, 1320) incluem `'falta'`. O único que
separa é `realizadaCount` (linha ~1294), de propósito, para exibir "realizadas × faltas".

## A implementar

### A. A linha do card diz ONDE está a sessão

Hoje: `Maria Helena / Pacote Maria · 1 sessão restante`.
Passa a ser, quando existe sessão em aberto:

`Maria Helena / Pacote Maria · 1 sessão restante · 📅 15/08 09:00`

Data formatada com o `fmtDate` já existente (dia/mês) + hora `HH:MM` quando houver. Sem sessão
em aberto, no lugar da data: `· ⚠️ falta agendar` (destaque `var(--yellow)`).

### B. Ações rápidas na própria linha

Quando existe sessão em aberto, dois botões pequenos, antes do `Abrir →`:

- `✅ Feita` ⇒ `markExpiringSession(sessaoId,'realizada')`
- `⚠️ Falta` ⇒ `markExpiringSession(sessaoId,'falta')`

Ambos com `event.stopPropagation()`. `title` do segundo, explicando a regra dela:
`"Paciente faltou sem avisar — a sessão conta como feita mesmo assim"`.

```js
window.markExpiringSession=async function(sessionId,status){
  try{ await dbUpdateSession(sessionId,{status:status});
       renderDashboard();
       showToast(status==='falta'?'⚠️ Marcada como falta (conta como feita)':'✅ Sessão marcada como realizada');
  }catch(e){ showToast('❌ Não foi possível marcar. Tente de novo.',true); }
};
```

O `catch` é obrigatório: `dbUpdateSession` LANÇA quando a gravação falha, e sem ele a tela
mentiria sucesso.

Quando NÃO existe sessão em aberto, no lugar dos dois botões: `📅 Agendar`, chamando
`showSessionForm(p.clientId)` — o formulário já aceita o cliente pré-selecionado.

### C. Consertar o botão do cabeçalho

`<button ... onclick="navigate('packages')">Ver pacotes →</button>` leva a uma página que NÃO
tem item no menu (`data-page="packages"` não existe), então nada fica destacado e parece que
não saiu do lugar. Trocar por `navigate('sessions')` e rótulo `Ver sessões →`.

### D. Fronteiras

- NÃO alterar a contagem de sessões nem o tratamento de `'falta'` — já está certo.
- NÃO mexer em financeiro, gaveta, agenda, período, barra lateral.
- NÃO fragmentar o `index.html`. NÃO commitar.

## Prova de aceite — `docs/provas/prova-encerrar-acao.mjs`

Harness de `docs/provas/prova-gaveta-falha.mjs` (rede controlável + captura de toast/PATCH).

| # | Caso | Esperado |
|---|---|---|
| 1 | cenário A | a linha mostra a data da sessão restante |
| 2 | cenário B (falta agendar) | a linha mostra `falta agendar` e o botão `Agendar` |
| 3 | cenário B | NÃO aparecem os botões `Feita`/`Falta` |
| 4 | cenário A | aparecem `✅ Feita` e `⚠️ Falta`, ambos com `stopPropagation` |
| 5 | `markExpiringSession(id,'realizada')` | manda `status:'realizada'` no PATCH da sessão certa |
| 6 | `markExpiringSession(id,'falta')` | manda `status:'falta'` |
| 7 | **regra dela**: após marcar `falta` | `pkgStats.used` aumenta — falta CONTA como feita |
| 8 | rede fora ao marcar | toast de ERRO; não pode dizer sucesso |
| 9 | cabeçalho | usa `navigate('sessions')`, e `navigate('packages')` sumiu do card |

## Pronto quando

`node --check` OK, prova nova verde, e as 13 baterias existentes seguem 117/117 PASS.
