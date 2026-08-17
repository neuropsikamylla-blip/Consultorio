# PROGRESSO — NeuroPsi Consultório

Arquivo de continuidade entre sessões. O que não está aqui não existe para a próxima sessão.

## Estado do projeto (17/08/2026)

- App é um único `index.html` (~668 KB) publicado por GitHub Pages a partir do `main`.
- Backend Supabase (REST direto). Auth por JWT em `localStorage`.
- Auto-atualização por `APP_VERSION` (bump obrigatório a cada deploy).

## EM ANDAMENTO — pedido de 17/08/2026 10:28

Pedido dela, nas palavras dela:
> "o meu App NeuroPsi está dando erro quando tento renovar pacote. Agora que fechei e abri novamente deu certo! Coloca a possibilidade de eu reservar horario (sem criar cliente) colocar Por exemplo : Entrega de Laudo / Supervisão"

### Diagnóstico do erro de renovar pacote (feito, 17/08/2026)

Raiz provável identificada por leitura de código (`index.html`):

- `savePackage()` (linha ~894) faz `fetch` CRU em `/rest/v1/packages` e `/rest/v1/sessions`
  com `Authorization: Bearer getAuthToken()`, **fora do `supaFetch()`**. Só o `supaFetch()`
  tem o retry com `refreshAuthToken()` em 401/403.
- O access_token do Supabase expira (padrão 1 h). Com o app aberto além disso, a criação de
  pacote (= caminho da RENOVAÇÃO) cai em 401 e mostra "❌ Erro ao criar pacote". Ao fechar e
  reabrir, o token é renovado/refeito e volta a funcionar — exatamente o sintoma relatado.
- Agravantes no mesmo trecho: o token é capturado UMA vez (`authTok`) e reusado no laço das
  N sessões; falha no meio deixa pacote sem sessões (estado órfão), com aviso genérico.
- `setClientAlta()` (linha ~551) tem o mesmo padrão de `fetch` cru sem retry.
- O AUTO LOGIN (linha ~1937) descarta o token quando `/auth/v1/user` falha, **sem tentar
  `refreshAuthToken()` antes** — derruba a sessão à toa.

### Plano em passos

- [x] Passo 0 — Ler o código e localizar a raiz. PRONTO quando a causa estiver escrita aqui. ✅
- [ ] Passo 1 — Corrigir a autenticação nas escritas (raiz do erro de renovar).
      PRONTO quando: nenhuma escrita em `/rest/v1/` fora de `supaFetch`; refresh proativo
      antes de escrever; criação de sessões em lote (sem pacote órfão); auto-login tenta
      refresh antes de descartar; `node --check` do JS extraído passa; commit + push.
- [ ] Passo 2 — Compromisso sem paciente na agenda (Entrega de Laudo / Supervisão / etc.).
      PRONTO quando: dá para criar, editar e excluir compromisso pela agenda; aparece no mês,
      na semana e no dia; recorrência opcional; não entra em nada financeiro nem em contagem
      de sessões; prova em node das funções puras passa; commit + push.

### Decisões de desenho registradas

1. **Persistência do compromisso**: tabela `notes`, registro único `id='agenda_compromissos'`,
   `content` = JSON. Motivo: não exige DDL no Supabase (não temos acesso ao painel nesta
   sessão) e segue precedente já em uso no projeto (`id='client_status'`).
2. **Recorrência**: ocorrências geradas explicitamente na criação (como as sessões de pacote),
   ligadas por `groupId`, para permitir excluir a série inteira.
3. **Compromisso NÃO é sessão**: não tem cliente, não tem preço, não entra no financeiro nem
   nas contagens de pacote. Vive num vetor separado do `_cache`.
