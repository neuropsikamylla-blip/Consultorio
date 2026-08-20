# Fase A — Renomeações e reorganização da sidebar

Data: 20/08/2026 · Arquivo alvo: `index.html` · Itens 2, 3, 4, 5, 6 do pedido de reforma

## Decisão de segurança que rege toda a fase

Renomear é trocar **apenas o texto que ela lê**. As chaves internas de rota
(`clients`, `anexos`, `bills`, `sessions`, `anamnese`) **PERMANECEM COMO ESTÃO**.

Motivo: essas chaves aparecem em `data-page`, no objeto `titles`, no objeto `pages`, em
`navigate(...)` espalhado pelo código e em `currentPage`. Trocá-las não traz nenhum benefício
para ela e multiplica o risco de quebrar navegação — contra a regra dela "não faça migrações
destrutivas". Se um dia isso for desejado, é tarefa própria, com prova própria.

## Sidebar hoje

```
Dashboard · Clientes · Anexos · Sessões/Pacotes · Agenda · Financeiro · Boletos · Notas ·
Anamnese · Configurações
```

## Sidebar depois (ordem EXATA pedida por ela)

| # | Rótulo | Ícone | Rota interna (NÃO muda) |
|---|---|---|---|
| 1 | Dashboard | 📊 | `dashboard` |
| 2 | Agenda | 🗓️ | `agenda` |
| 3 | Pacientes | 👥 | `clients` |
| 4 | Documentos | 📁 | `anexos` |
| 5 | Financeiro | 💰 | `financial` |
| 6 | Contas a Pagar | 📎 | `bills` |
| 7 | Notas/Pendências | 📝 | `notes` |
| 8 | Configurações | ⚙️ | `settings` |

**Sessões/Pacotes CONTINUA na sidebar nesta fase** — sai só na Fase G, depois que a ficha do
paciente estiver pronta. Ela foi explícita: "Antes de retirar Sessões/Pacotes da sidebar,
garanta que todas as funcionalidades atuais continuem acessíveis dentro da ficha do paciente."
Posicioná-lo após Pacientes, mantendo rótulo e ícone atuais.

**Anamnese SAI da sidebar** (item 4). O módulo inteiro fica no código: `_ANA_SECS`,
`renderAnamnese`, `_anaSave`, `_anaLoad`, `_anaExportPDF`, a chave em `titles`, a chave em
`pages` e o `<script>` do jsPDF **permanecem**. Sai apenas o `<button class="nav-item">` do
menu. `navigate('anamnese')` tem de continuar funcionando.

## Rodapé da sidebar — INTOCADO

`⬇️ Backup`, `⬆️ Restaurar`, `Sair`, `🔄 Atualizar App` e a versão continuam exatamente como
estão. Ela foi explícita: "Atualizar App deve continuar visível, porque preciso enxergá-lo para
lembrar de atualizar o aplicativo."

## Rótulos a trocar (item 3, 5, 6)

Onde o texto for exibido a ela, trocar:

| De | Para |
|---|---|
| Clientes | Pacientes |
| Cliente | Paciente |
| Anexos | Documentos |
| Boletos | Contas a Pagar |
| Notas / Notas Importantes | Notas/Pendências |

Isso inclui: item de menu, objeto `titles`, títulos de página, cabeçalhos de tabela, rótulos de
formulário, textos de botão, mensagens de `showToast`, textos de modal e estados vazios.

**Cuidados que valem uma releitura antes de trocar:**

- `clientName(...)`, `clientId`, `client_id`, `_ANA_CLIENT`, `clientStatus`, `getClients` e
  qualquer identificador de código: **NÃO tocar**. Só texto exibido.
- "Contas a Pagar" é o rótulo do módulo; dentro dele, um item continua sendo um boleto/conta —
  não forçar a troca onde o texto ficaria errado em português.
- Não alterar nada dentro do módulo de Anamnese além do necessário.

## Item 1 — o visual não muda

Nenhuma alteração de CSS, cor, espaçamento, fonte, ícone ou estrutura de card/modal/tabela.
Esta fase mexe em TEXTO e na ORDEM dos itens do menu. Nada mais.

## Prova de aceite — `docs/provas/prova-fase-a.mjs`

Harness de `docs/provas/prova-periodo-render.mjs`.

| # | Caso | Esperado |
|---|---|---|
| 1 | sidebar | a ordem dos `data-page` é dashboard, agenda, clients, anexos, financial, bills, notes, settings — com `sessions` presente após `clients` |
| 2 | sidebar | NÃO existe mais `data-page="anamnese"` |
| 3 | código | `renderAnamnese` e `_ANA_SECS` CONTINUAM existindo |
| 4 | `pages` | a chave `anamnese` continua no objeto (a rota funciona) |
| 5 | `navigate('anamnese')` | renderiza sem lançar |
| 6 | rodapé | Backup, Restaurar, Sair e Atualizar App continuam presentes |
| 7 | menu | mostra "Pacientes", e não "Clientes" |
| 8 | menu | mostra "Documentos", e não "Anexos" |
| 9 | menu | mostra "Contas a Pagar", e não "Boletos" |
| 10 | `titles` | `clients` agora rotula "Pacientes"; `anexos` "Documentos"; `bills` "Contas a Pagar" |
| 11 | rotas | `navigate` de dashboard, agenda, clients, anexos, financial, bills, notes, settings, sessions renderiza cada uma sem lançar |
| 12 | dados | nenhuma chave interna mudou: `data-page="clients"`, `"anexos"`, `"bills"` seguem existindo |

## Fronteiras

- NÃO remover Sessões/Pacotes da sidebar (é a Fase G).
- NÃO mexer em cálculo, agenda, financeiro, pacotes, prontuário.
- NÃO alterar CSS. NÃO fragmentar o `index.html`. NÃO commitar.

## Pronto quando

`node --check` OK, `prova-fase-a.mjs` verde, e as 15 baterias existentes seguem 138/138 PASS.
