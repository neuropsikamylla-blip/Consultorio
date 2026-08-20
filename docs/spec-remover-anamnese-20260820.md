# Spec — Remover o módulo de Anamnese

Data: 20/08/2026 · Arquivo alvo: `index.html`

## Pedido dela

> "Anamnese pode retirar, eu nào estou utilizando"

## Levantamento já feito — NÃO reinvestigar

O módulo é um bloco CONTÍNUO no fim do `<script>`: da linha **2439**
(`var _ANA_CLIENT=null,_ANA_FAIXA='c';`) até a **2814** (o `}` que fecha `_anaExportPDF`),
imediatamente antes de `</script>`. São ~376 linhas: `_ANA_SECS` (27 seções), `renderAnamnese`,
`_anaFaixa`, `_anaRenderForm`, `_anaSelectClient`, `_anaCollect`, `_anaSave`, `_anaLoad`,
`_anaExportPDF`.

Fora do bloco existem exatamente TRÊS referências:

| Linha | O que é |
|---|---|
| 231 | `<button class="nav-item" onclick="navigate('anamnese')" data-page="anamnese">🧠 Anamnese</button>` |
| 517 | a chave `anamnese:'Anamnese'` no objeto `titles` |
| 521 | a chave `anamnese:renderAnamnese` no objeto `pages` |

Mais uma, no `<head>`:

| 193 | `<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>` |

`jsPDF` é usado SOMENTE por `_anaExportPDF` (ocorrências nas linhas 2774, 2775, 2779) — sai junto.

A tabela `anamneses` **não** é lida em `loadFromSupabase`; só o módulo a acessava. Removê-lo não
afeta o carregamento do app.

## A implementar

1. Apagar o bloco 2439–2814 por inteiro.
2. Apagar o item de menu (231).
3. Remover a chave `anamnese` de `titles` (517) e de `pages` (521), preservando as demais e a
   sintaxe do objeto.
4. Remover a tag `<script>` do jsPDF (193).
5. Não sobra nenhuma referência: `grep -i 'anamnese\|_ANA_\|jspdf\|jsPDF'` no `index.html` deve
   retornar ZERO linhas ao final.

## Fronteiras — o que NÃO fazer

- **NÃO apagar nada no Supabase.** A tabela `anamneses` e seus registros ficam intactos; esta
  mudança é só do app. Nenhum `DELETE`, nenhuma migração.
- NÃO tocar em agenda, financeiro, gaveta, alta, pacotes, clientes, anexos, notas, boletos,
  período, barra lateral ou card de encerrar.
- NÃO aproveitar para "limpar" outras coisas: só a anamnese sai.
- NÃO fragmentar o `index.html`. NÃO commitar.

## Prova de aceite — `docs/provas/prova-sem-anamnese.mjs`

Harness de `docs/provas/prova-periodo-render.mjs`.

| # | Caso | Esperado |
|---|---|---|
| 1 | `index.html` | nenhuma ocorrência de `anamnese` (maiúsc./minúsc.) |
| 2 | `index.html` | nenhuma ocorrência de `_ANA_` |
| 3 | `index.html` | nenhuma ocorrência de `jspdf`/`jsPDF` |
| 4 | `index.html` | nenhum `<script src=` apontando para CDN externo |
| 5 | o script principal | continua carregando sem lançar |
| 6 | `navigate('dashboard')` | segue renderizando |
| 7 | `navigate('agenda')` | segue renderizando |
| 8 | `navigate('financial')` | segue renderizando |
| 9 | `navigate('anamnese')` | não lança; simplesmente não há página |
| 10 | o arquivo | ficou MENOR que antes da remoção |

## Pronto quando

`node --check` OK, prova nova verde, e as 15 baterias existentes seguem 138/138 PASS.
