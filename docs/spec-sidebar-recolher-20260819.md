# Spec — Recolher a barra lateral (ampliar a agenda)

Data: 19/08/2026 · Arquivo alvo: `index.html`

## Pedido dela

> "coloque uma setinha para recuar essa parte do dashboard (para ampliar a agenda) mensal e semanal)"

A barra lateral de 230px fica fixa e come largura da agenda. Ela quer recolher para a agenda
(mês e semana) ocupar a tela toda.

## O que já existe (NÃO quebrar)

```css
.sidebar{width:230px;position:fixed;top:0;left:0;bottom:0;transition:transform 0.25s;}
.main{margin-left:230px;padding:28px 32px;}
@media(max-width:768px){ .sidebar{transform:translateX(-100%);} .sidebar.open{transform:translateX(0);} .main{margin-left:0;padding:16px;} }
```

No celular já há `openSidebar()` / `closeSidebar()`, `#sidebar-overlay` e o botão `.hamburger`.
**Esse comportamento de celular deve continuar idêntico** — a mudança é só para tela grande.

## Regras a implementar

1. **Classe no body**: `body.sidebar-collapsed` faz `.sidebar{transform:translateX(-100%)}` e
   `.main{margin-left:0}`. Adicionar `transition:margin-left 0.25s` em `.main`.
   Aplicar SOMENTE acima de 768px — dentro do `@media(min-width:769px)`, para não interferir
   no celular, onde a barra já vive recolhida.
2. **Botão único que alterna**, sempre visível, `position:fixed`, topo à esquerda:
   - expandida: fica rente à borda da barra (`left:238px`), rótulo `‹`;
   - recolhida: vai para `left:8px`, rótulo `›`.
   - `transition:left 0.25s` para acompanhar a barra. `z-index` acima da `.main` e abaixo do modal.
   - `title` acessível: "Recolher menu" / "Expandir menu".
   - Escondido no celular (`@media(max-width:768px){display:none}`), onde o `.hamburger` já resolve.
3. **Preferência persistida** em `localStorage['neuropsi_sidebar']` com valor `'collapsed'` ou
   `'expanded'`, no mesmo espírito de `neuropsi_theme`. Aplicada no carregamento da página,
   antes da primeira pintura, para não haver salto visual.
4. **Funções**, dentro de um bloco delimitado por marcadores (a prova depende deles):

```js
// ── SIDEBAR-CORE-INICIO ──
// ── SIDEBAR-CORE-FIM ──
```

| Função | Contrato |
|---|---|
| `isSidebarCollapsed()` | lê o localStorage; `true` só se o valor for exatamente `'collapsed'` |
| `setSidebarCollapsed(v)` | grava `'collapsed'`/`'expanded'`, aplica/remove a classe no `body`, atualiza o rótulo do botão |
| `toggleSidebar()` | inverte o estado atual chamando `setSidebarCollapsed` |

`setSidebarCollapsed` não pode explodir se o botão ainda não existir no DOM (guardar com `if`).

## Prova de aceite — `docs/provas/prova-sidebar.mjs`

Harness igual ao de `docs/provas/prova-periodo-render.mjs`, mas com o `classList` do `body` e o
`localStorage` REGISTRANDO o que recebem, para poder verificar.

| # | Caso | Esperado |
|---|---|---|
| 1 | sem preferência gravada | `isSidebarCollapsed()` é `false` (começa expandida) |
| 2 | `setSidebarCollapsed(true)` | grava `'collapsed'` no localStorage |
| 3 | idem | adiciona a classe `sidebar-collapsed` ao body |
| 4 | `setSidebarCollapsed(false)` | grava `'expanded'` e remove a classe |
| 5 | `toggleSidebar()` a partir de expandida | fica recolhida |
| 6 | `toggleSidebar()` duas vezes | volta ao estado inicial |
| 7 | valor estranho no localStorage (`'xyz'`) | tratado como expandida, sem lançar |
| 8 | `setSidebarCollapsed` sem o botão no DOM | não lança erro |

## Fronteiras

- NÃO alterar `openSidebar`/`closeSidebar`/overlay/hamburguer do celular.
- NÃO mexer na agenda, no financeiro nem em qualquer cálculo.
- NÃO fragmentar o `index.html`. NÃO commitar.

## Pronto quando

`node --check` OK, `prova-sidebar.mjs` verde, e as 8 baterias existentes seguem 70/70 PASS.
