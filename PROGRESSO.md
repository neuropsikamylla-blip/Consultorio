# PROGRESSO — NeuroPsi Consultório

Arquivo de continuidade entre sessões. O que não está aqui não existe para a próxima sessão.

## Estado do projeto (17/08/2026)

- App é um único `index.html` (~668 KB) publicado por GitHub Pages a partir do `main`.
- Backend Supabase (REST direto). Auth por JWT em `localStorage`.
- Auto-atualização por `APP_VERSION` (bump obrigatório a cada deploy).

## Como rodar as provas

```bash
node docs/provas/prova-auth-passo1.mjs      # 6/6  — token/refresh/retry
node docs/provas/prova-passo1b.mjs          # 5/5  — insert de sessões em lote + fallback
node docs/provas/prova-compromissos.mjs     # 12/12 — funções puras de compromisso
node docs/provas/prova-render-agenda.mjs    # 12/12 — agenda renderizada + o que vai ao banco
node docs/provas/prova-renovar-pacote.mjs   # 5/5  — renovar pacote com token vencido
```

## ENTREGUE — pedido de 17/08/2026 10:28

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
- [x] Passo 1 — Corrigir a autenticação nas escritas (raiz do erro de renovar).
      ✅ commit `3997fcb`, do lab `neuropsi-auth-fix` (Codex gpt-5.6-sol high), diff revisado
      linha a linha. Prova: `prova-auth-passo1.mjs` 6/6 PASS, `node --check` OK.
- [x] Passo 1b — Mesmo defeito nas escritas que sobraram (`saveSession` com novo pacote,
      notas) + salvaguarda de insert em lote + rollback honesto.
      ✅ commit `b314f22`, do lab `neuropsi-auth-1b`. Prova: `prova-passo1b.mjs` 5/5 PASS.
      Anexos ficaram como estavam: usam a anon key de propósito (CLAUDE.md).
- [x] Passo 2 — Compromisso sem paciente na agenda (Entrega de Laudo / Supervisão / etc.).
      ✅ commit `b485018`, do lab `neuropsi-compromissos`, mais dois ajustes pós-colheita
      (gap dos botões da topbar, guarda para compromisso sem horário).
      Provas: `prova-compromissos.mjs` 12/12, `prova-render-agenda.mjs` 12/12 (commit `c6d225b`).
- [x] Passo 3 — Prova de ponta a ponta do bug relatado. ✅ commit `4a3c410`.
      `prova-renovar-pacote.mjs` reproduz "app aberto há mais de 1h, token vencido".
      Contrafactual: versão antiga `15f0f22` = **0/5 PASS**; versão corrigida = **5/5 PASS**.
- [ ] Passo 4 — PUBLICAR. **BLOQUEADO: credencial do GitHub.** Ver abaixo.

### BLOQUEIO ABERTO — o push não sai (aberto em 17/08/2026)

`git push` falha com `Invalid username or token. Password authentication is not supported`.
O remote tem um token `ghp_...` embutido na própria URL (dentro de `.git/config`) e esse
token não é mais aceito pelo GitHub. **Consequência que importa: as correções e a feature
existem só no repositório local — o app que ela usa continua com o bug de renovar pacote.**

Andamento em 17/08/2026, fim da sessão:

- ✅ GitHub CLI instalado (`gh` 2.97.0, via Homebrew) — feito por mim.
- ⬜ `gh auth login` — **falta**. É a única parte que depende dela: login é dela, não meu.
- ⬜ trocar o remote para a URL limpa (sem token) — meu, assim que ela autenticar:
  `git remote set-url origin https://github.com/neuropsikamylla-blip/Consultorio.git`
- ⬜ `git push origin main` — meu.
- ⬜ revogar o token velho em github.com/settings/tokens — dela, sem pressa
  (ele já está inválido), mas é higiene: segredo em texto puro viola a regra 2 da casa.

Contexto do dia: o GitHub estava em *Partially Degraded Service* (API, Issues, PRs, Actions
degradados; Git Operations, Pages e Packages de pé). Por isso a tela do site dava erro para
ela. Isso NÃO bloqueia o push em si — o bloqueio é a credencial.

### Respostas do `gh auth login` (para não ter de descobrir de novo)

| Pergunta | Resposta |
|---|---|
| What account do you want to log into? | GitHub.com |
| What is your preferred protocol? | HTTPS |
| Authenticate Git with your GitHub credentials? | Yes |
| How would you like to authenticate? | Login with a web browser |

Ele mostra um código de 8 caracteres e abre o navegador; ela cola o código e confirma.

### Decisões de desenho registradas

1. **Persistência do compromisso**: tabela `notes`, registro único `id='agenda_compromissos'`,
   `content` = JSON. Motivo: não exige DDL no Supabase (não temos acesso ao painel) e segue
   precedente já em uso no projeto (`id='client_status'`).
2. **Recorrência**: ocorrências geradas explicitamente na criação (como as sessões de pacote),
   ligadas por `groupId`, para permitir excluir a série inteira.
3. **Compromisso NÃO é sessão**: não tem cliente, não tem preço, não entra no financeiro nem
   nas contagens de pacote. Vive num vetor separado do `_cache`.
4. **Insert de sessões**: um POST em lote com fallback para um-a-um (`insertSessionRows`).
   Motivo: não havia evidência de como o PostgREST/RLS deste projeto responde a array insert,
   e essa é a função que ela mais usa — o fallback tira o risco de regressão.
5. **Anexos ficam com a anon key**: `/rest/v1/documents` usa `Bearer SUPA_KEY` de propósito
   (documentado no `CLAUDE.md`); anon key não expira, então não sofre do bug do token.
6. **`.DS_Store` saiu do versionamento** (18/08/2026): criado `.gitignore`; o arquivo continua
   no disco, só deixou de sujar os commits.
