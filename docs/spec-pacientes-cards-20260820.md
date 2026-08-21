# Spec — Tela Pacientes em cards, com a estrutura de Sessões/Pacotes

Data: 20/08/2026 · Arquivo alvo: `index.html` · Alvo: `renderClients()`

## Pedido dela

> "a tela Pacientes ficou em formato de tabela simples e para mim está pior ... Já a tela
> Sessões/Pacotes está com uma organização muito melhor para leitura ... quero que a
> organização de Pacientes siga a lógica e o layout base de Sessões/Pacotes."
> "Não transformar isso em redesign. Apenas reorganizar Pacientes."

## Regra que rege tudo: COPIAR, não inventar

O layout já existe e ela gosta dele. **Reaproveitar a estrutura de `renderSessions()`**, que é:

```html
<div class="card sess-client-card" data-s="nome em minúsculas" style="margin-bottom:16px">
  <!-- header: flex, space-between, border-bottom -->
  <div>  <!-- esquerda -->
    <div style="width:36px;height:36px;border-radius:10px;background:var(--green-bg2);...">INICIAIS</div>
    <div>
      <div style="font-weight:700;font-size:15px">NOME</div>
      <div style="font-size:12px;color:var(--text2)">N sessões: <span style="color:var(--green)">X realizadas</span> · <span style="color:var(--red)">Y faltas</span></div>
    </div>
  </div>
  <div>  <!-- direita: botões -->
    <button class="btn btn-ghost btn-sm" onclick="showProntuario('id')">📋 Prontuário</button>
    <button class="btn btn-ghost btn-sm" onclick="showClientDetail('id')">Ver perfil →</button>
  </div>
  <div class="table-wrap"><table><thead><tr>
    <th>Nº</th><th>Data</th><th>Hora</th><th>Categoria</th><th>Pacote</th><th>Status</th><th>Pgto</th><th>Ações</th>
  </tr></thead><tbody>...</tbody></table></div>
  <!-- colapsável "▶ Ver realizadas/faltas (N)" -->
</div>
```

**NÃO criar classe CSS nova, NÃO alterar CSS existente, NÃO inventar cor, espaçamento ou
tipografia.** Ela foi explícita: "Não alterar o visual do app". Todo estilo sai do que já
existe nesse card.

## O que a tela Pacientes passa a ser

`renderClients()` é reescrita para produzir a MESMA estrutura de card, com dois acréscimos.

### 1. Todo paciente aparece — inclusive sem sessão

Ponto crítico: `renderSessions` parte das SESSÕES. `renderClients` tem de partir dos
PACIENTES. Paciente cadastrado que ainda não tem nenhuma sessão **precisa** aparecer, com o
card e, no lugar da tabela, o vazio já usado no app:
`<div class="empty" style="padding:18px"><p>Nenhuma sessão registrada</p></div>`.

Perder um paciente da lista é falha grave — ela cadastra antes de agendar.

### 2. Botões do card

Além de `📋 Prontuário` e `Ver perfil →` (idênticos aos de `renderSessions`), acrescentar os
dois que existem hoje em Pacientes, com as MESMAS funções e confirmações:

- `✏️` → `showClientForm(id)`
- `🗑️` → `deleteClientConfirm(id)` — a confirmação atual é preservada como está.

Usar `class="btn-icon"`, como já é feito hoje em `renderClients`.

## Topo da tela

Preservar o que existe: campo de busca (`search-input-wrap` + `search-icon`, com
`window._cs(...)`) e o botão `+ Novo Paciente` na `topbar-actions`. Não mexer neles.

### Filtros (item 8)

Fila de botões-chip acima da lista, usando `class="btn btn-ghost btn-sm"` (ativo:
`class="btn btn-primary btn-sm"`), sem CSS novo:

`Todos` · `Psicoterapia` · `Avaliação` · `Reabilitação` · `Encerrados`

**Sobre "Supervisão":** ela pediu, mas supervisão NÃO é categoria de sessão — as categorias
reais são `psicoterapia`, `reabilitacao` e `avaliacao` (ver `catLabelShort`). Supervisão é um
tipo de COMPROMISSO de agenda, que por definição não tem paciente. Portanto o filtro não é
criado: ele estaria sempre vazio e enganaria. **Registrar isso no relatório para ela.**

Regras dos filtros:

- `Todos`: todos os pacientes NÃO encerrados.
- Categoria: pacientes não encerrados que tenham ao menos uma sessão daquela categoria.
- `Encerrados`: pacientes com `isClientAlta(id)` verdadeiro — e SOMENTE eles.
- O filtro combina com a busca por nome (os dois ativos ao mesmo tempo).
- Paciente encerrado não aparece em `Todos` nem nas categorias; ele continua pesquisável pelo
  filtro `Encerrados` (item 17 do pedido anterior: encerrado não some, muda de status).

## Fronteiras

- NÃO tocar em `renderSessions` — ela é a referência e continua como está.
- NÃO remover Sessões/Pacotes da sidebar nesta tarefa (item 5 dela: só depois de tudo acessível).
- NÃO alterar CSS, cores, fontes, ícones ou qualquer regra de estilo.
- NÃO alterar dados, banco, agenda, financeiro, pacotes ou prontuário.
- NÃO mexer em `showClientDetail`, `showProntuario`, `showClientForm`, `deleteClientConfirm`.
- NÃO fragmentar o `index.html`. NÃO commitar.

## Prova de aceite — `docs/provas/prova-pacientes-cards.mjs`

Harness de `docs/provas/prova-periodo-render.mjs`.

| # | Caso | Esperado |
|---|---|---|
| 1 | tela Pacientes | usa `card sess-client-card`, não `<th>Telefone` |
| 2 | 3 pacientes | 3 cards renderizados |
| 3 | **paciente SEM sessão** | aparece mesmo assim, com "Nenhuma sessão registrada" |
| 4 | card | traz iniciais e nome do paciente |
| 5 | card | traz o resumo "X realizadas" e, havendo, "Y faltas" |
| 6 | card com sessões | traz as colunas Nº, Data, Hora, Categoria, Pacote, Status, Pgto, Ações |
| 7 | card | tem os 4 botões: Prontuário, Ver perfil, editar, excluir |
| 8 | topo | busca e `+ Novo Paciente` continuam presentes |
| 9 | filtros | os 5 chips aparecem; NÃO existe chip "Supervisão" |
| 10 | filtro `Psicoterapia` | só pacientes com sessão dessa categoria |
| 11 | filtro `Encerrados` | só os pacientes em alta |
| 12 | `Todos` | NÃO inclui paciente encerrado |
| 13 | busca + filtro juntos | os dois se aplicam ao mesmo tempo |
| 14 | CSS | nenhuma regra de estilo nova no arquivo |

## Pronto quando

`node --check` OK, prova nova verde, e as 16 baterias existentes seguem 150/150 PASS.
