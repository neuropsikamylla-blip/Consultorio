# Spec — Gaveta dos recebimentos antigos (encerrar até agosto/2026)

Data: 20/08/2026 · Arquivo alvo: `index.html`

## Pedido dela

> "todo pacote que iniciamos até agosto zera ... faz uma pastinha (recebimentos antigos
> concluidos) e deixa meio que fechado, vou apertar tudo como recebido e vc deixa como
> escondidinho ... para todos novos pacotes que inicarmos em setembro pois eu me desorganizei"

Nada é apagado. O histórico antigo sai da vista principal e vai para uma gaveta recolhida.

## O que JÁ existe (entregue em 19/08, não refazer)

`financeStartMonth()`, `withinFinance(m)`, `financePackages(db)`, `financeSessions(db)` no
bloco `FINMARCO-CORE`, com o marco `financeStart` em `notes/app_settings`, e o campo em
Configurações. O Dashboard e o Financeiro já ignoram o que é anterior ao marco.

Falta: a gaveta com o que ficou de fora, a ativação em um clique e a quitação em massa.

## ARMADILHA — leia antes de codar

`window.markPaid` (~linha 1739) grava `paymentDate=today()`. Se os pacotes antigos forem
quitados já em setembro, `pkgMonth` vira `'2026-09'` e a dívida velha entra como receita de
setembro — o oposto do pedido. **A quitação da gaveta NÃO pode usar `today()`.**

Regra: usa `pkgMonth(p)` (que já resolve para o mês da 1ª sessão ou do `createdAt`) e grava
`paymentDate` como o ÚLTIMO DIA daquele mês. Ex.: pacote de junho ⇒ `2026-06-30`. Para
`paymentStatus==='parcela1'`, gravar `paymentDate2` pela mesma regra, preservando o
`paymentDate` que já existir. Sessão avulsa: `sessionPayStatus='paid'`, `sessionPaid=true`
(não têm data própria de pagamento — não inventar campo).

## A implementar

### A. Funções puras, em bloco delimitado (a prova depende dos marcadores)

```js
// ── GAVETA-CORE-INICIO ──
// ── GAVETA-CORE-FIM ──
```

| Função | Contrato |
|---|---|
| `lastDayOfMonth(m)` | `'2026-06'` → `'2026-06-30'`; `'2026-02'` → `'2026-02-28'` (2028 bissexto ⇒ 29). Entrada inválida ⇒ `''` |
| `legacyPackages(db)` | pacotes com `withinFinance(pkgMonth(p))===false` |
| `legacySessions(db)` | sessões com `withinFinance((s.date\|\|'').slice(0,7))===false` |
| `legacyTotals(db)` | `{recebido, pendente, qtdPendente}` — somas sobre os itens da gaveta |
| `legacyPayload(p)` | o objeto que será gravado para quitar o pacote `p`, pela regra da armadilha. NÃO grava nada, só devolve |

`legacyPackages`/`legacySessions` devolvem `[]` quando não há marco (sem marco não há gaveta).

### B. Gaveta no Financeiro

`<details class="gaveta">` FECHADO por padrão, no fim do Financeiro, visível apenas quando
`financeStartMonth()` não é vazio e a gaveta tem itens. `<summary>`:

`📦 Recebimentos antigos (encerrados até <mês do marco -1>) — recebido R$ X · pendente R$ Y`

Aberto, mostra: histórico por mês dos meses antigos, e a tabela das pendências antigas com o
botão individual que já existe. Reaproveitar as classes visuais já usadas no Financeiro.

### C. Encerrar o período com UM clique

Quando NÃO houver marco, um aviso no topo do Financeiro:

> "Fechar o período anterior? Os lançamentos até <mês anterior> saem do resumo e vão para a
> gaveta. Nada é apagado — dá para desfazer em Configurações."
> `[ Encerrar até <mês anterior> ]`

O botão grava `financeStart` = mês seguinte ao atual − 0 … precisamente: **mês corrente**
(hoje é 08/2026 ⇒ grava `'2026-09'`, ou seja, o mês seguinte ao que se quer encerrar).
Gravar via `saveAppSettings`, reaproveitando o que já existe, e re-renderizar.

### D. Quitar tudo da gaveta

Botão dentro da gaveta: `✅ Marcar todos como recebidos`.

1. `window.confirm` com a contagem e o valor: "Marcar N lançamentos como recebidos, no total
   de R$ X? Eles serão datados no mês de origem e continuarão fora do resumo. Nada é apagado."
2. Só então percorre, usando `dbUpdatePackage` / `dbUpdateSession` (que já passam pelo
   `supaFetch` com renovação de token).
3. **Resiliência**: contar sucessos e falhas; ao fim, `showToast` honesto — "N quitados" ou
   "N quitados, M falharam — tente de novo". Uma falha no meio NÃO pode abortar o resto nem
   mentir sucesso.
4. Re-renderizar o Financeiro ao final.

## Prova de aceite — `docs/provas/prova-gaveta-antigos.mjs`

Harness de `docs/provas/prova-marco-financeiro.mjs`.

| # | Caso | Esperado |
|---|---|---|
| 1 | `lastDayOfMonth('2026-06')` | `'2026-06-30'` |
| 2 | `lastDayOfMonth('2026-02')` | `'2026-02-28'` |
| 3 | `lastDayOfMonth('2028-02')` | `'2028-02-29'` (bissexto) |
| 4 | `lastDayOfMonth('xx')` | `''` |
| 5 | sem marco | `legacyPackages(db)` é `[]` |
| 6 | marco `'2026-09'` | pacote de junho ENTRA na gaveta; o de setembro NÃO |
| 7 | **a armadilha**: `legacyPayload` de um pacote de junho | `paymentDate` é `'2026-06-30'`, **nunca** a data de hoje |
| 8 | `legacyPayload` de um `parcela1` com `paymentDate` existente | preserva o `paymentDate`, preenche `paymentDate2` com o fim do mês |
| 9 | `legacyTotals` | soma recebido e pendente só dos antigos |
| 10 | quitar a gaveta NÃO altera o resumo do mês corrente | receita do mês corrente inalterada |
| 11 | a agenda segue intocada | sessão antiga ainda aparece em `buildMonthDay` |

## Fronteiras

- NÃO apagar nada, em hipótese alguma. NÃO alterar `markPaid`/`markPending` existentes.
- NÃO aplicar o corte à agenda, aos pacotes (contagem/status) nem aos boletos.
- NÃO fragmentar o `index.html`. NÃO commitar.

## Pronto quando

`node --check` OK, `prova-gaveta-antigos.mjs` verde, e as 10 baterias existentes seguem
88/88 PASS.
