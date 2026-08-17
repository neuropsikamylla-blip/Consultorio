# CLAUDE.md — NeuroPsi Consultório

## Visao Geral do Projeto

NeuroPsi é um sistema de gestão para consultório de neuropsicologia, implementado como uma Single Page Application (SPA) 100% em um único arquivo `index.html`. O backend é o Supabase (PostgreSQL + Auth + Storage).

## Estrutura do Projeto

```
Consultorio/
├── index.html        # Toda a aplicação (HTML + CSS + JS)
├── manifest.json     # PWA manifest
├── icon.png          # Ícone do app
├── icon-512.png      # Ícone PWA 512px
└── README.md         # Readme minimo
```

## Arquitetura

- **Frontend:** HTML/CSS/JS vanilla, sem framework, sem bundler, sem dependências de build.
- **Backend:** Supabase (REST API direta via `fetch`).
- **Auth:** Supabase Auth (email/senha). Token JWT armazenado em `localStorage`.
- **Deploy:** Arquivo estático; pode ser servido por qualquer servidor HTTP ou GitHub Pages.

## Banco de Dados (Supabase)

Tabelas principais:

| Tabela | Descrição |
|--------|-----------|
| `clients` | Pacientes cadastrados |
| `packages` | Pacotes/contratos de sessões |
| `sessions` | Sessões individuais |
| `bills` | Boletos a pagar (despesas do consultório) |
| `notes` | Notas importantes (registro único `id=note_admin`) |
| `documents` | Metadados de anexos (arquivos no Storage) |
| `anamneses` | Anamneses neuropsicológicas por paciente |

Storage bucket: `documents` (público).

## Módulos / Páginas

| Página | Função de render | Descrição |
|--------|-----------------|-----------|
| Dashboard | `renderDashboard()` | Resumo financeiro do mês + próximas sessões + alertas de boletos |
| Clientes | `renderClients()` | CRUD de pacientes com busca |
| Sessões/Pacotes | `renderSessions()` | Listagem e gestão de pacotes e sessões |
| Agenda | `renderAgenda()` / `renderCalendar()` | Calendário mensal de sessões |
| Financeiro | `renderFinancial()` | Receita do mês + histórico + pendências |
| Boletos | `renderBills()` | Controle de contas a pagar |
| Notas | `renderNotes()` | Bloco de notas com auto-save |
| Anexos | `renderAnexos()` | Upload e visualização de documentos |
| Anamnese | `renderAnamnese()` | Formulário de anamnese neuropsicológica |
| Configurações | `renderSettings()` | Alterar credenciais + backup/restauração |

## Convenções de Código

- Todo o código JS está inline no `index.html`, após o HTML do app.
- Funções de render seguem o padrão `render<NomeDaPagina>()`.
- Funções de modal seguem o padrão `show<NomeDaAcao>Form(id)`.
- Funções de DB seguem o padrão `db<Acao><Entidade>(id, data)`.
- IDs globais gerados por `genId()` (timestamp + contador + random em base36).
- Dados do Supabase são cacheados em `_cache` (objeto com `clients`, `packages`, `sessions`). Recarregados via `loadFromSupabase()`.

## Constantes Críticas

```js
const SUPA_URL = 'https://zrjrzorspfnohjzzykog.supabase.co';
const SUPA_KEY = '...';  // anon key pública
const AUTH_KEY = 'consultorio_auth';   // localStorage key para JWT
const CREDS_KEY = 'consultorio_creds'; // localStorage key para credenciais locais
```

## Fluxo de Autenticação

1. Login via Supabase Auth (`/auth/v1/token?grant_type=password`).
2. Token salvo em `localStorage[AUTH_KEY]`.
3. Auto-login: ao carregar, valida o token salvo; se expirado, tenta refresh via `refreshAuthToken()`.
4. Todas as requisições ao Supabase passam pelo `supaFetch()`, que injeta o Bearer token.

## Anamnese Neuropsicológica

- Dados estruturados em `_ANA_SECS` (27 seções com campos tipados).
- Três faixas etárias: `c` (Criança), `a` (Adolescente), `d` (Adulto).
- Cada seção tem um conjunto de campos com filtro por faixa (`fx`).
- Campos tipo `s` têm seletor (Sim/Não/Às vezes) + campo de detalhes.
- Campos sem tipo são `textarea` livre.
- Salvo na tabela `anamneses` como JSONB (`dados`).
- Exportável como PDF via jsPDF (carregado via CDN).

## Financeiro

O módulo financeiro suporta três tipos de pagamento de pacote (`paymentType`):
- `pacote`: Pagamento único antecipado.
- `parcela1`: Parcelado em 2x (rastreado via `paymentDate` e `paymentDate2`).
- `sessao`: Pagamento sessão a sessão (rastreado via `session_pay_status` em cada sessão).

Sessões avulsas (sem pacote) têm `session_price` próprio.

## Temas

- Dark mode padrão; light mode via classe `body.light-mode`.
- Preferência salva em `localStorage['neuropsi_theme']`.

## Cuidados ao Modificar

1. **Não fragmentar o arquivo** — toda a lógica está em `index.html`. Não criar arquivos `.js` externos sem motivo explícito.
2. **Testar `loadFromSupabase()`** após qualquer modificação em operações de escrita — a função recarrega `_cache` e re-renderiza se necessário.
3. **Evitar `supaFetch` com `Authorization: Bearer SUPA_KEY`** em operações autenticadas — usar sempre `getAuthToken()`. O padrão de usar `SUPA_KEY` como bearer (em vez do JWT do usuário) existe apenas nas operações de `documents` (Storage) e deve ser mantido consistente.
4. **Backup de dados é manual** — exportação via `exportBackup()` gera JSON local.
