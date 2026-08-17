# ARCHITECTURE.md — NeuroPsi Consultório

## Visao Geral

NeuroPsi é um sistema de gestão para consultório de neuropsicologia. Toda a aplicação reside em um único arquivo `index.html` (HTML + CSS + JS vanilla), servido de forma estática. O backend é provido inteiramente pelo Supabase.

```
┌────────────────────────────────────────┐
│             Navegador                  │
│  ┌──────────────────────────────────┐  │
│  │          index.html              │  │
│  │  ┌──────────┐  ┌──────────────┐ │  │
│  │  │   CSS    │  │  JavaScript  │ │  │
│  │  │ (inline) │  │  (inline)    │ │  │
│  │  └──────────┘  └──────┬───────┘ │  │
│  └─────────────────────── │ ───────┘  │
└──────────────────────────  │ ─────────┘
                             │ fetch / REST
            ┌────────────────▼──────────────┐
            │           Supabase            │
            │  ┌──────────┐ ┌────────────┐  │
            │  │  Auth    │ │ PostgreSQL  │  │
            │  │ (JWT)    │ │  (REST)     │  │
            │  └──────────┘ └────────────┘  │
            │  ┌────────────────────────┐   │
            │  │  Storage (documents)   │   │
            │  └────────────────────────┘   │
            └───────────────────────────────┘
```

## Camadas da Aplicação

### 1. Camada de Apresentação (HTML/CSS)

Responsável pela estrutura visual. Implementada como strings de HTML geradas dinamicamente pelas funções `render*()` e injetadas em `#page-content`.

- Design system via variáveis CSS (`--bg`, `--green`, `--text`, etc.).
- Suporte a dark/light mode via classe `body.light-mode`.
- Layout fixo: sidebar (230px) + área principal (`#page-content`).
- Modal global único via `#modal-container`.
- Toast de notificações temporárias.

### 2. Camada de Roteamento

Função `navigate(page)` atualiza `currentPage`, aplica classe `.active` no item do menu e chama a função `render*()` correspondente.

```
navigate('dashboard')  →  renderDashboard()
navigate('clients')    →  renderClients()
navigate('sessions')   →  renderSessions()
navigate('agenda')     →  renderAgenda()
navigate('financial')  →  renderFinancial()
navigate('bills')      →  renderBills()
navigate('notes')      →  renderNotes()
navigate('anexos')     →  renderAnexos()
navigate('anamnese')   →  renderAnamnese()
navigate('settings')   →  renderSettings()
```

### 3. Camada de Dados (Cache em Memória)

A variável `_cache` mantém os dados principais em memória:

```js
_cache = {
  clients:  [...],   // clientes
  packages: [...],   // pacotes (mapeados de snake_case para camelCase)
  sessions: [...],   // sessões
}
```

- `loadFromSupabase()`: carrega `clients`, `packages` e `sessions` em paralelo e atualiza `_cache`.
- `getDB()`: retorna `_cache` ou objeto vazio se ainda não carregado.
- Dados como `bills`, `documents` e `anamneses` são carregados sob demanda (sem cache global).

### 4. Camada de Persistência (Supabase REST)

Todas as operações passam por `supaFetch(method, table, body, query)`:

```
supaFetch('GET',    'clients', null, '?order=name')
supaFetch('POST',   'clients', {id, name, ...})
supaFetch('PATCH',  'clients', {name}, '?id=eq.<id>')
supaFetch('DELETE', 'clients', null,   '?id=eq.<id>')
```

- Injeta automaticamente `apikey` e `Authorization: Bearer <JWT>`.
- Em caso de 401, tenta refresh automático via `refreshAuthToken()`.

### 5. Camada de Autenticação

- Login: `doLogin()` → `POST /auth/v1/token?grant_type=password`.
- Token JWT salvo em `localStorage['consultorio_auth']`.
- Auto-login: verifica token salvo ao iniciar; tenta refresh se necessário.
- `getAuthToken()`: lê o JWT do `localStorage`.

## Modelo de Dados

### `clients`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | text | ID único (genId) |
| name | text | Nome do paciente |
| phone | text | Telefone |
| email | text | Email |
| cpf | text | CPF |
| birth_date | date | Data de nascimento |
| education | text | Escolaridade |
| address | text | Endereço |
| notes | text | Observações livres |
| created_at | timestamptz | Criação |

### `packages`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | text | ID único |
| client_id | text | FK → clients |
| name | text | Nome do pacote |
| total_sessions | int | Total de sessões contratadas |
| price | numeric | Valor total |
| payment_status | text | `pending` / `paid` / `parcela1` |
| payment_type | text | `pacote` / `parcela1` / `sessao` |
| payment_date | date | Data do primeiro pagamento |
| payment_date2 | date | Data da segunda parcela |
| notes | text | Prontuário / anotações |
| created_at | timestamptz | Criação |

### `sessions`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | text | ID único |
| client_id | text | FK → clients |
| package_id | text | FK → packages (nullable) |
| date | date | Data da sessão |
| time | text | Hora (HH:MM) |
| status | text | `agendada` / `realizada` / `falta` |
| category | text | `psicoterapia` / `reabilitacao` / `avaliacao` |
| notes | text | Observações da sessão |
| interval_days | int | Intervalo entre sessões (recorrentes) |
| session_price | numeric | Preço da sessão avulsa |
| session_pay_status | text | `pending` / `paid` (para tipo `sessao`) |
| created_at | timestamptz | Criação |

### `bills`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | text | ID único |
| description | text | Descrição do boleto |
| amount | numeric | Valor |
| due_date | date | Vencimento |
| paid | boolean | Se foi pago |
| paid_date | date | Data do pagamento |
| file_data | text | Base64 do comprovante (max 2MB) |
| file_name | text | Nome do arquivo |
| file_type | text | MIME type |
| created_at | timestamptz | Criação |

### `notes`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | text | `note_admin` (registro único) |
| user_id | text | `admin` |
| content | text | Conteúdo das notas |
| updated_at | timestamptz | Última atualização |

### `documents`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | text | ID único |
| client_id | text | FK → clients (nullable) |
| filename | text | Nome do arquivo |
| description | text | Descrição |
| url | text | URL pública no Storage |
| size_bytes | int | Tamanho em bytes |
| created_at | timestamptz | Upload |

### `anamneses`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | text | ID único |
| client_id | text | FK → clients |
| client_name | text | Nome (desnormalizado) |
| faixa_etaria | text | `c` / `a` / `d` |
| dados | jsonb | Campos preenchidos (chave = field ID) |
| created_at | timestamptz | Criação |
| updated_at | timestamptz | Última atualização |

## Decisoes Arquiteturais

### SPA em arquivo único
Todo o código em `index.html` elimina a necessidade de build, bundler ou servidor de desenvolvimento. A aplicação funciona como arquivo estático.

### Sem framework JS
Uso de JS vanilla com manipulação direta do DOM via `innerHTML`. Reduz overhead e dependências externas. Adequado para escala de um consultório individual.

### Cache em memória para dados principais
`_cache` evita requisições redundantes ao Supabase para `clients`, `packages` e `sessions`, que são os dados de acesso mais frequente. Dados menos acessados (`bills`, `documents`, `anamneses`) são carregados sob demanda.

### Autenticação via Supabase Auth
JWT padrão do Supabase com refresh automático. As credenciais de nome/senha do usuário no `localStorage[CREDS_KEY]` são usadas apenas para a UI de configurações (exibição de nome) — a autenticação real é feita via Supabase Auth.

### Storage do Supabase para documentos
Arquivos até 10MB são enviados ao bucket `documents` no Supabase Storage. Metadados ficam na tabela `documents`. Boletos usam base64 inline (max 2MB) por simplicidade.

### Anamnese como JSONB
Os dados da anamnese são armazenados como um objeto JSONB (`dados`) para flexibilidade do formulário, que varia por faixa etária e pode evoluir com novas seções sem migração de schema.
