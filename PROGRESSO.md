# PROGRESSO — NeuroPsi Consultório

Arquivo de continuidade entre sessões. O que não está aqui não existe para a próxima sessão.

## Estado do projeto (19/08/2026)

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
- [x] Passo 4 — PUBLICAR. ✅ 19/08/2026. `git push origin main` levou os 14 commits locais
      (`15f0f22` → `aead9a7`). Bloqueio resolvido — causa real abaixo.

### BLOQUEIO RESOLVIDO — o push saiu (19/08/2026)

**Causa real, diferente da hipótese anterior:** não faltava credencial. O macOS já tinha uma
credencial válida no `osxkeychain` (`credential.helper=osxkeychain`). O que quebrava era o
token `ghp_...` embutido na URL do remote dentro do `.git/config`: uma credencial escrita na
URL tem precedência sobre o keychain, então o Git mandava o token podre e nem consultava o
keychain. `gh auth login` nunca foi necessário.

Feito, nesta ordem:

1. `cp .git/config .git/config.bak-20260819` (backup datado, regra 11).
2. `git remote set-url origin https://github.com/neuropsikamylla-blip/Consultorio.git`
   — URL limpa, sem segredo em texto puro (regra 2).
3. `git push origin main` → `15f0f22..aead9a7`. `git log origin/main..main` = **0 pendentes**.

Antes de publicar, as 5 provas rodaram no repositório real: **40/40 PASS**
(6/6, 5/5, 12/12, 12/12, 5/5).

`APP_VERSION` publicada saltou de `2026-06-08-10` para `2026-08-17-03`, então a
auto-atualização dispara sozinha no app dela — não precisa limpar cache na mão.

**Consequência que importa: o app que ela usa agora tem a correção do erro de renovar pacote
e os compromissos de agenda sem paciente.**

Pendência dela, sem pressa e sem bloquear nada: revogar o token velho em
github.com/settings/tokens. Ele já está inválido e já saiu do `.git/config`, mas o histórico
do repositório ainda o contém — higiene, não emergência.

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
