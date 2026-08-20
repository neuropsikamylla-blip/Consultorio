# Spec — "Pacotes a Encerrar": faltando 1 sessão e clique direto na sessão

Data: 20/08/2026 · Arquivo alvo: `index.html`

## Pedido dela

> "quando estiver faltando 1 sessão, mas quando eu clicar para ver ir direto para sessão que
> está restando (pois se for uma falha minha de marcar realizada eu consigo resolver)..
> problema que estou clicando e nao vai"

## Diagnóstico já feito (não repetir investigação)

Trecho atual, `renderDashboard`, ~linha 856:

```js
db.packages.forEach(function(p){
  var st=pkgStats(p);
  if(!st.isExhausted&&st.remaining<=2&&st.remaining>0){
    expiringHtml+='<div style="display:flex;...">...'+clientName(p.clientId)+'...'
      +'<button class="btn btn-ghost btn-sm" onclick="navigate(\'packages\')">Ver →</button></div>';
```

Só o `<button>` tem `onclick`; a linha não é clicável. E o destino é a lista de Pacotes, não a
sessão. `pkgStats` já dá `remaining = totalSessions - realizadas`.

## Regras a implementar

### A. Critério: faltando exatamente 1

Trocar `st.remaining<=2` por `st.remaining===1`. Manter `!st.isExhausted`.

### B. Função pura para achar a sessão restante (a prova depende dos marcadores)

```js
// ── ENCERRAR-CORE-INICIO ──
// ── ENCERRAR-CORE-FIM ──
```

`nextOpenSession(db,packageId)` devolve a sessão do pacote que ainda não foi marcada —
`status` diferente de `realizada`, `completed` e `falta` — escolhendo a de **menor data**
(desempate por `time`). Sem nenhuma, devolve `null`. Pacote inexistente ⇒ `null`.

### C. A linha inteira clicável

A `<div>` da linha recebe `cursor:pointer`, `onclick` e `title="Abrir a sessão que falta"`.
O `<button>` interno mantém o mesmo destino da linha e usa `event.stopPropagation()` para não
disparar duas vezes. Rótulo do botão passa a ser `Abrir →`.

Destino, via nova `window.openExpiringPackage(packageId)`:

1. `nextOpenSession` encontrou ⇒ `showSessionEditForm(sessao.id)` — ela marca "realizada" ali.
2. Não encontrou ⇒ `navigate('sessions')` (página que EXISTE no menu, `data-page="sessions"`)
   e `showToast('Este pacote não tem sessão em aberto — confira o pacote.')`.
   NÃO usar `navigate('packages')`: essa página não tem item de menu e parece "não sair do lugar".

### D. Não mexer

- `clientNeedsAttention` / `attentionSlots` (marcadores "?" da agenda) — assunto diferente.
- Nada de financeiro, gaveta, agenda, período ou barra lateral.

## Prova de aceite — `docs/provas/prova-encerrar-clique.mjs`

Harness de `docs/provas/prova-periodo-render.mjs`.

| # | Caso | Esperado |
|---|---|---|
| 1 | pacote 8, 7 realizadas | aparece no card (falta 1) |
| 2 | pacote 8, 6 realizadas (faltam 2) | **NÃO** aparece — critério mudou para exatamente 1 |
| 3 | pacote 8, 8 realizadas | não aparece (esgotado) |
| 4 | `nextOpenSession` com 7 de 8 marcadas | devolve a única com status `agendada` |
| 5 | várias em aberto | devolve a de MENOR data |
| 6 | nenhuma em aberto | devolve `null` |
| 7 | pacote inexistente | devolve `null`, sem lançar |
| 8 | a linha do card | contém `onclick` com `openExpiringPackage` e `cursor:pointer` |
| 9 | `openExpiringPackage` com sessão em aberto | chama `showSessionEditForm` com o id certo |
| 10 | `openExpiringPackage` sem sessão em aberto | não lança; não chama `showSessionEditForm` |

## Pronto quando

`node --check` OK, prova nova verde, e as 12 baterias existentes seguem 107/107 PASS.
NÃO commitar.
