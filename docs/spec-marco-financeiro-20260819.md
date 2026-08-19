# Spec — Marco de corte do financeiro (recomeçar em setembro/2026)

Data: 19/08/2026 · Arquivo alvo: `index.html`

## Pedido dela

> "resete o financeiro (até o mes de agosto) para voltarmos a computar a partir de setembro!"

Decisão dela, escolhida entre três opções em 19/08/2026: **marco de corte, NÃO apagar nada.**
Os dados históricos permanecem intactos no Supabase; o Financeiro e o Dashboard passam a
ignorá-los. Precisa ser REVERSÍVEL: se ela limpar o marco, tudo volta a computar.

## Regra central

Nova preferência `financeStart`, formato `'YYYY-MM'` (ex.: `'2026-09'`), guardada no registro
`notes/app_settings` já criado hoje — o mesmo objeto de `sessionDurationMin`, sem coluna nova.

Ausente, vazio ou malformado ⇒ **sem corte**, comportamento atual preservado.

## Bloco de funções puras (a prova depende dos marcadores)

```js
// ── FINMARCO-CORE-INICIO ──
// ── FINMARCO-CORE-FIM ──
```

| Função | Contrato |
|---|---|
| `financeStartMonth()` | lê `app_settings.financeStart`; devolve `''` se ausente ou fora do padrão `^\d{4}-(0[1-9]\|1[0-2])$` |
| `withinFinance(month)` | `true` se não há marco, ou se `month >= marco`. `month` vazio/nulo ⇒ `true` (não sumir com dado sem data) |
| `financePackages(db)` | `db.packages` filtrado por `withinFinance(pkgMonth(p))` |
| `financeSessions(db)` | `db.sessions` filtrado por `withinFinance((s.date\|\|'').slice(0,7))` |

## Onde aplicar — e onde NÃO aplicar

Trocar `db.packages` por `financePackages(db)` e `db.sessions` por `financeSessions(db)`
**somente nos cálculos de dinheiro**, hoje espalhados em:

- `renderDashboard` — linhas ~766-767 (`paidRev`, `pendRev`).
- `renderFinancial` — linhas ~1598-1604 (`paidRev`, `parcela1Rev`, `pendRev`) e as listas de
  pagos / parcelados / pendentes do mês, mais o histórico de meses.

**NÃO aplicar** (é erro grave se aplicar):

- Agenda, calendário mensal/semanal, detalhe do dia, próximas sessões do Dashboard — as
  sessões antigas TÊM de continuar aparecendo. O corte é do dinheiro, não da agenda.
- Contagem de sessões do pacote (`n/total`) e status de pacote.
- Clientes, anamnese, anexos, notas, boletos.

O histórico do Financeiro não deve listar meses anteriores ao marco.

## Configurações — reversibilidade é requisito

Campo novo em `renderSettings()`, ao lado da duração da sessão já existente:

- Rótulo: "Financeiro computa a partir de" · `<input type="month" id="st-finance-start">`.
- Vazio = sem corte (volta a computar tudo). Salvar junto no `saveSettings()`, no mesmo
  objeto `app_settings`, validando o formato antes de gravar.
- Texto de apoio, pequeno, abaixo do campo: "Os lançamentos anteriores continuam guardados —
  apenas deixam de ser somados."

## Prova de aceite — `docs/provas/prova-marco-financeiro.mjs`

Harness de `docs/provas/prova-periodo-render.mjs` (DOM de mentira + `_cache` falso).

| # | Caso | Esperado |
|---|---|---|
| 1 | sem marco gravado | `financeStartMonth()` é `''` |
| 2 | marco `'2026-09'` | `withinFinance('2026-08')` é `false` |
| 3 | marco `'2026-09'` | `withinFinance('2026-09')` e `('2026-10')` são `true` |
| 4 | sem marco | `withinFinance('2020-01')` é `true` |
| 5 | marco malformado (`'agosto'`) | tratado como sem marco |
| 6 | marco `'2026-09'` | pacote pago em 08/2026 fica FORA de `financePackages` |
| 7 | marco `'2026-09'` | pacote pago em 09/2026 fica DENTRO |
| 8 | marco `'2026-09'` | sessão de 08/2026 fica fora de `financeSessions` |
| 9 | sessão sem data | permanece (não some) |
| 10 | **a agenda não pode ser afetada**: com marco ativo, `buildMonthDay` de um dia de agosto ainda mostra a sessão | chip presente |

## Fronteiras

- NÃO apagar, alterar ou sobrescrever nenhum dado do Supabase. Esta mudança é só de leitura.
- NÃO mexer em boletos, agenda, período/duração nem na barra lateral.
- NÃO fragmentar o `index.html`. NÃO commitar.

## Pronto quando

`node --check` OK, `prova-marco-financeiro.mjs` verde, e as 9 baterias existentes seguem
78/78 PASS.
