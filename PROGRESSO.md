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

### BLOQUEIO ABERTO — o push não sai (17/08/2026)

`git push` falha com `Invalid username or token. Password authentication is not supported`.
O remote tem um token `ghp_...` embutido na própria URL (dentro de `.git/config`) e esse
token não é mais aceito pelo GitHub. Enquanto isso não for resolvido, **as correções e a
feature existem só no repositório local — o app publicado continua com o bug.**

Duas coisas a fazer, nesta ordem:
1. **Revogar o token antigo** em https://github.com/settings/tokens — ele está gravado em
   texto puro no `.git/config` (viola a regra 2 da casa) e apareceu no terminal.
2. Autenticar de novo sem gravar segredo na URL. O jeito limpo:
   `git remote set-url origin https://github.com/neuropsikamylla-blip/Consultorio.git`
   e então instalar o GitHub CLI (`brew install gh` e `gh auth login`), que guarda a
   credencial no chaveiro do macOS em vez de num arquivo de texto.
   O `credential.helper` do repositório já é `osxkeychain`.

Depois disso, `git push origin main` publica os 6 commits e a auto-atualização do app leva
a versão nova (`2026-08-17-03`) para ela sem precisar de Cmd+Shift+R.

### Decisões de desenho registradas

1. **Persistência do compromisso**: tabela `notes`, registro único `id='agenda_compromissos'`,
   `content` = JSON. Motivo: não exige DDL no Supabase (não temos acesso ao painel nesta
   sessão) e segue precedente já em uso no projeto (`id='client_status'`).
2. **Recorrência**: ocorrências geradas explicitamente na criação (como as sessões de pacote),
   ligadas por `groupId`, para permitir excluir a série inteira.
3. **Compromisso NÃO é sessão**: não tem cliente, não tem preço, não entra no financeiro nem
   nas contagens de pacote. Vive num vetor separado do `_cache`.
