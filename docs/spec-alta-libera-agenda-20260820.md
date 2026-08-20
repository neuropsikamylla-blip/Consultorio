# Spec — Alta encerra o paciente e libera os horários futuros

Data: 20/08/2026 · Arquivo alvo: `index.html`

## Pedido dela

> "quando eu der alta e encerrar o paciente precisa sair da lista da agenda"

**Decisão dela**, escolhida entre três opções: ao dar alta, o app PERGUNTA quantas sessões
futuras existem e as apaga se ela confirmar. Descartado "apagar sem perguntar" e descartado
"apenas ocultar" — este último porque a checagem de conflito continuaria bloqueando o horário
invisível, e ela receberia "já existe atendimento com <paciente em alta>" sem ver nada.

## Diagnóstico já feito — NÃO reinvestigar

O marcador "?" JÁ some com a alta (`attentionSlots` chama `isClientAlta`). O que permanece são
as sessões futuras. Medido rodando a agenda: antes 1 marcador / depois 0; sessão futura
aparece nos dois casos.

## A implementar

### A. Consertar `dbDeleteSession` (defeito preexistente)

```js
async function dbDeleteSession(id){
  await supaFetch('DELETE','sessions',null,'?id=eq.'+id);   // <- retorno ignorado
  _cache=null; await loadFromSupabase();
}
```

Falha de DELETE passa silenciosa. As irmãs verificam (`dbDeletePackage`, `dbDeleteClient`).
Passar a guardar o retorno e `throw new Error('Falha ao excluir. Verifique sua conexão ou faça
login novamente.')` quando for `null`, no mesmo texto das outras.

Os 2 chamadores (`showClientDetail` ~1031 e `deleteSessionConfirm` ~1513) passam a envolver a
chamada em `try/catch`, com `showToast('❌ Não foi possível excluir. Tente de novo.',true)` no
catch. Sem isso, o conserto troca "erro silencioso" por "erro não tratado".

### B. Funções puras, em bloco delimitado

```js
// ── ALTA-CORE-INICIO ──
// ── ALTA-CORE-FIM ──
```

`futureOpenSessions(db,clientId,hojeStr)` — sessões do cliente que serão liberadas:
`date >= hojeStr` **e** status ainda não marcado (diferente de `realizada`, `completed`,
`falta`). Ordenadas por data. Sem cliente/db ⇒ `[]`.

Sessão futura JÁ marcada como realizada/falta **não** é removida: conta no pacote e é
histórico dela.

### C. Modal de alta com três saídas

Em `confirmAltaPaciente(id)`, calcular `futureOpenSessions`. O texto atual ("O paciente sai dos
alertas da agenda...") ganha, quando `n > 0`:

> "<nome> tem **N sessões futuras** marcadas na agenda."

Botões:

| Rótulo | Ação |
|---|---|
| `Cancelar` | fecha, nada acontece (como hoje) |
| `Dar alta e manter` | `setClientAlta(id,true)` apenas |
| `✅ Dar alta e liberar horários` | `setClientAlta(id,true)` + remove as futuras |

Com `n === 0`, manter exatamente o modal de hoje (dois botões) — sem passo inútil.

### D. Remoção em massa honesta e com UMA recarga

`dbDeleteSession` recarrega todo o banco a cada chamada; para N sessões seriam N recargas.
Criar `window.releaseFutureSessions(clientId)`:

1. `supaFetch('DELETE','sessions',null,'?id=eq.'+id)` para cada id, contando sucesso quando o
   retorno **não** é `null` e falha quando é. Uma falha NÃO aborta as demais.
2. Ao final, UMA única vez: `_cache=null; await loadFromSupabase();`
3. `showToast` honesto: `'🏁 Alta concedida · N horários liberados'` ou, havendo falhas,
   `'N liberados, M falharam — tente de novo'` com `error=true`.

### E. Fronteiras

- NÃO tocar em financeiro, pacotes, gaveta, período, barra lateral ou card de encerrar.
- NÃO remover sessões passadas nem futuras já marcadas.
- NÃO alterar a regra de `'falta'`. NÃO fragmentar o `index.html`. NÃO commitar.

## Prova de aceite — `docs/provas/prova-alta-agenda.mjs`

Harness de `docs/provas/prova-gaveta-falha.mjs` (rede controlável, captura de toast e das
chamadas que saem).

| # | Caso | Esperado |
|---|---|---|
| 1 | `futureOpenSessions` | traz só as de hoje em diante ainda não marcadas |
| 2 | sessão futura já `realizada` | NÃO entra na lista |
| 3 | sessão futura já `falta` | NÃO entra (é histórico dela) |
| 4 | sessão passada `agendada` | NÃO entra (não é horário futuro) |
| 5 | cliente sem sessões | `[]`, sem lançar |
| 6 | modal com 3 futuras | mostra "3 sessões futuras" e os três botões |
| 7 | modal sem futuras | mantém os dois botões de hoje |
| 8 | `releaseFutureSessions` | manda DELETE só dos ids futuros em aberto |
| 9 | rede fora | toast de ERRO; não diz sucesso |
| 10 | falha parcial | relata liberados E falhas |
| 11 | `dbDeleteSession` com rede fora | LANÇA (não passa silenciosa) |
| 12 | paciente em alta | segue sem marcador "?" na agenda |

## Pronto quando

`node --check` OK, prova nova verde, e as 14 baterias existentes seguem 126/126 PASS.
