# Spec — Ordem cronológica na agenda (mês e detalhe do dia)

Data: 19/08/2026 · Projeto: NeuroPsi Consultório · Arquivo alvo: `index.html`

## O defeito

Em `buildMonthDay` a lista do dia é montada POR TIPO, não por horário:

```js
show.forEach(...)                                   // 1. sessões, ordenadas
if(extra>0)chips+='<div class="cal-more">...'       // 2. "+N mais"
compromissosOnDate(...).forEach(... chips+=... )    // 3. compromissos ANEXADOS NO FIM
reservedOnDate(...).forEach(... chips=...+chips )   // 4. alertas JOGADOS NO TOPO
```

Resultado no print dela (dia 20): Supervisão 14:00–15:30 aparece DEPOIS da sessão das 17:00.
`window.dayClick` tem o mesmo defeito (monta `compromissoHtml`, `sessHtml` e `markHtml`
separados e concatena por tipo).

Nas palavras dela: *"deveria ficar certinho na agenda, ou seja 14h ficar antes das 15h ou das
16h"*.

## Regras a implementar

### A. Lista única ordenada

Nas duas funções, montar UMA lista de itens `{time, kind, html}` — onde `kind` é
`'sessao' | 'compromisso' | 'reservado'` — e ordenar por `time` crescente antes de gerar o
HTML final. O HTML de cada chip/item permanece EXATAMENTE como é hoje (mesmas classes, mesmo
`onclick`, mesmo conteúdo); muda só a ORDEM em que entram.

Empate de horário: manter a ordem `reservado` → `compromisso` → `sessao`, para o alerta
vermelho não ficar escondido atrás de outro item do mesmo horário.

Item sem horário (`time` vazio/nulo): continua vindo ANTES dos itens com horário, que é o
comportamento atual (`''.localeCompare('09:00')` é negativo). NÃO alterar isso.

### B. Limite de 8 no mês, sem sacrificar o que importa

Hoje `var show=sessions.slice(0,8); var extra=sessions.length-8;` — o limite corta só sessões,
e compromissos/alertas sempre aparecem. Esse comportamento deve ser PRESERVADO na lista nova:

- Compromissos e alertas (`reservado`) NUNCA são cortados pelo limite.
- O corte incide apenas sobre `sessao`, mantendo as 8 primeiras EM ORDEM CRONOLÓGICA.
- `+N mais` conta apenas as sessões omitidas, e vai por último, como hoje.

### C. Detalhe do dia (`window.dayClick`)

Mesma unificação e mesma ordenação. Sem limite (mostra tudo). O bloco de "horário reservado —
pacote encerrado" mantém o destaque visual que já tem.

## Prova de aceite — `docs/provas/prova-ordem-agenda.mjs`

Mesmo harness de `docs/provas/prova-periodo-render.mjs` (DOM de mentira, `_cache` falso,
verifica o HTML produzido). Verificar posição por `indexOf` no HTML gerado.

| # | Caso | Esperado |
|---|---|---|
| 1 | mês: sessão 09:00, compromisso 14:00, sessão 17:00 | posições na ordem 09 < 14 < 17 |
| 2 | **caso dela**: compromisso 14:00 vs sessão 15:00 e 16:00 | compromisso vem ANTES das duas |
| 3 | mês: alerta reservado das 11:00 | fica entre a sessão das 10:00 e a das 14:00 |
| 4 | empate às 14:00 entre compromisso e sessão | compromisso antes da sessão |
| 5 | 10 sessões + 1 compromisso às 14:00 | o compromisso APARECE mesmo com o limite |
| 6 | mesmo caso | `+2 mais` conta só as sessões omitidas |
| 7 | sessão sem horário | continua aparecendo, antes das demais |
| 8 | detalhe do dia: mesma ordem cronológica | 09 < 14 < 17 |
| 9 | período do compromisso preservado no mês | `14:00–15:30` continua no chip |

## Fronteiras

- NÃO alterar o HTML dos chips (classes, `onclick`, textos) — só a ordem.
- NÃO mexer na visão de SEMANA, que já é correta por construção (uma célula por hora).
- NÃO alterar o período nem a duração implantados hoje.
- NÃO fragmentar o `index.html`. NÃO commitar.

## Pronto quando

`node --check` OK, `prova-ordem-agenda.mjs` verde, e as 7 provas existentes seguem em
61/61 PASS.
