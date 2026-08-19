# Spec — Período visível na agenda (compromissos e sessões)

Data: 19/08/2026 · Projeto: NeuroPsi Consultório · Arquivo alvo: `index.html` (único)

## O defeito que motiva

Na visão de SEMANA (`index.html`, ~linha 1476):

```js
compromissosOnDate(db.compromissos,ds).forEach(function(c){if((c.time||'').slice(0,2)===hStr){
```

O compromisso é desenhado APENAS na faixa da hora em que começa. Uma supervisão das 14:00 às
15:30 aparece na célula das 14h e some das 15h — que fica visualmente livre. Ela relatou
exatamente isso: *"a supervisão era 14h até 15:30, aí fica parecendo que 15h está livre"*.
É risco de marcar atendimento em cima de compromisso existente, não questão estética.

As sessões de paciente têm o problema pela raiz oposta: a tabela `sessions` grava só `time`.
Não existe duração nem hora final.

## Restrição central, nas palavras dela

> "mas sem ocupar mais espaço"

As horas de continuação NÃO podem ganhar um bloco/evento novo. O sinal de ocupação é o fundo
da célula tingido. Nada de esticar a linha nem empilhar elementos.

## Regras a implementar

### A. Bloco de funções puras (para ser testável)

Criar, junto do core existente, um bloco delimitado EXATAMENTE por estes marcadores — a prova
depende deles:

```js
// ── PERIODO-CORE-INICIO ──
// ── PERIODO-CORE-FIM ──
```

Funções, todas puras (sem DOM, sem rede):

| Função | Contrato |
|---|---|
| `hhmmToMin(t)` | `'14:30'` → `870`. Entrada vazia/inválida → `null`. |
| `minToHhmm(m)` | `870` → `'14:30'`. Satura em `'23:59'`; nunca vira o dia. |
| `slotSpan(time,endTime)` | Lista de faixas de hora cobertas, como `['14','15']`. Fim EXCLUSIVO. |
| `sessionEnd(time,durMin)` | `('09:00',50)` → `'09:50'`. |
| `periodLabel(time,endTime)` | `('14:00','15:30')` → `'14:00–15:30'` (travessão U+2013). Sem fim → `'14:00'`. |

`slotSpan` com fim exclusivo: 14:00–16:00 cobre `['14','15']`, NÃO inclui `'16'`. Um
compromisso que termina às 16:00 em ponto deixa as 16h livres.

### B. Duração das sessões de paciente

Compromissos (laudo, supervisão, reunião, pessoal) JÁ têm campo "Termina (opcional)"
(`cf-end`) e duração livre — não mexer nisso. A duração só falta para sessão de paciente.

- Nova preferência `sessionDurationMin`, **padrão 50**.
- Persistir no padrão já usado no projeto: tabela `notes`, registro único
  `id='app_settings'`, `content` = JSON. NÃO criar coluna nova (não temos acesso ao painel
  do Supabase — decisão 1 do PROGRESSO.md).
- Ler via `getSessionDuration()`, que devolve 50 se ausente/inválida.
- Campo novo em `renderSettings()` (~linha 2041): "Duração padrão da sessão (minutos)",
  `type=number`, min 5, max 240.

### C. Renderização

1. **Semana** — na faixa da hora inicial, o evento mostra `periodLabel`. Nas demais faixas de
   `slotSpan`, a `div.week-cell` recebe a classe `ocupado` e NENHUM elemento novo é inserido.
2. **Mês** (`cal-chip`, ~linhas 1447 e 1450) — trocar a hora solta pelo `periodLabel`.
3. **Detalhe do dia** (~linha 1491) — a sessão passa a mostrar o período, como o compromisso
   já faz na linha 1489.
4. **CSS** — classe `.week-cell.ocupado` com fundo tingido discreto, funcionando em dark e
   light mode (o app tem `body.light-mode`). Sem alterar a altura da célula.

Sessões usam `sessionEnd(s.time, getSessionDuration())` como hora final.

## Prova de aceite — escrever ANTES, em `docs/provas/prova-periodo-agenda.mjs`

Mesmo padrão das provas existentes (ver `docs/provas/prova-compromissos.mjs`): extrair o bloco
entre os marcadores com `new Function`, sem navegador. Formato de saída idêntico
(`PASS n — descrição` e `RESULTADO: n/12 PASS`).

| # | Caso | Esperado |
|---|---|---|
| 1 | `slotSpan('14:00','15:30')` | `['14','15']` |
| 2 | `slotSpan('14:00','16:00')` | `['14','15']` (fim exclusivo) |
| 3 | `slotSpan('09:00','09:50')` | `['09']` |
| 4 | `slotSpan('14:00','')` | `['14']` |
| 5 | `slotSpan('','')` | `[]` |
| 6 | `sessionEnd('09:00',50)` | `'09:50'` |
| 7 | `sessionEnd('23:30',50)` | `'23:59'` (satura, não vira o dia) |
| 8 | `periodLabel('14:00','15:30')` | `'14:00–15:30'` |
| 9 | `periodLabel('14:00','')` | `'14:00'` |
| 10 | **Caso dela**: supervisão 14:00–15:30 | faixas `14` e `15` ocupadas |
| 11 | sessão 09:00, duração padrão | período `'09:00–09:50'` |
| 12 | duração trocada para 60 | período `'09:00–10:00'` |

## Fronteiras — o que NÃO fazer

- NÃO fragmentar o `index.html` em arquivos externos (CLAUDE.md, cuidado 1).
- NÃO criar coluna nova no Supabase.
- NÃO inserir elemento novo nas faixas de continuação (a restrição "sem ocupar mais espaço").
- NÃO mexer no cálculo financeiro, em pacotes nem no fluxo de autenticação.
- NÃO alterar o campo "Termina (opcional)" dos compromissos, que já funciona.
- NÃO commitar: o commit é sempre do Claude, após revisão linha a linha.

## Pronto quando

`node --check` OK, `node docs/provas/prova-periodo-agenda.mjs` = 12/12 PASS, e as 5 provas
já existentes continuam verdes (40/40).
