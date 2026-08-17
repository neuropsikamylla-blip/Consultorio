# SPEC — Passo 1: corrigir autenticação nas escritas (erro ao renovar pacote)

Projeto: NeuroPsi Consultório. Arquivo único: `index.html` (HTML + CSS + JS inline).
Não há build, não há framework, não há dependências. JS em estilo ES5/var, funções globais.

## Problema real relatado pela usuária

"O app dá erro quando tento renovar pacote. Fechei e abri novamente e deu certo."

## Causa já diagnosticada (não precisa reinvestigar; confirme e corrija)

1. `savePackage(id)` — no ramo de CRIAÇÃO de pacote (que é o caminho da renovação, pois
   renovar chama `showPackageForm(clientId)` sem `pkgId`) — faz `fetch` CRU direto em
   `SUPA_URL+'/rest/v1/packages'` e `SUPA_URL+'/rest/v1/sessions'`, com
   `'Authorization':'Bearer '+authTok`, onde `authTok=getAuthToken()` é capturado UMA vez.
   Esse caminho NÃO passa por `supaFetch()`, que é o único lugar com retry de
   `refreshAuthToken()` em 401/403. Quando o access_token do Supabase expira (padrão: 1 hora
   de app aberto), a criação falha com "❌ Erro ao criar pacote." Reabrir o app renova o
   token e o problema some — exatamente o sintoma.
2. O mesmo laço cria as N sessões uma a uma; se falharem, sobra um pacote sem sessões.
3. `setClientAlta(id,isAlta)` tem o mesmo padrão de `fetch` cru sem retry.
4. O bloco `// ── AUTO LOGIN ──` valida o token em `/auth/v1/user` e, se falhar, faz
   `localStorage.removeItem(AUTH_KEY)` SEM tentar `refreshAuthToken()` antes — derruba a
   sessão dela à toa.

## O que fazer (escopo fechado)

### A. Refresh proativo de token

Criar, logo depois de `refreshAuthToken()`, uma função:

```js
async function ensureFreshToken(){ ... }
```

Comportamento:
- Lê `localStorage[AUTH_KEY]`. Sem token salvo: retorna `false` (segue com a anon key, como hoje).
- Decodifica o payload do JWT (parte do meio, base64url) e lê `exp` (segundos epoch).
  Toda a decodificação dentro de `try/catch`; qualquer falha de parse = tratar como "expira já".
- Se faltar MENOS de 120 segundos para expirar (ou já expirou), chama `await refreshAuthToken()`
  e retorna o resultado. Senão retorna `true` sem chamar rede.
- Nunca lança exceção.

Cuidado obrigatório: `refreshAuthToken()` tem um guard `_isRefreshing` que retorna `false`
quando já há um refresh em andamento — isso hoje faz chamadas concorrentes acharem que o
refresh falhou. Corrigir isso: em vez de retornar `false` imediatamente, guardar a Promise do
refresh em curso e fazer as chamadas concorrentes aguardarem a MESMA Promise (padrão de
promise compartilhada). O contrato público (`await refreshAuthToken()` devolve boolean)
não muda.

### B. Todas as escritas passam a usar `supaFetch`

- Em `supaFetch()`, chamar `await ensureFreshToken()` antes do primeiro `fetch`, quando o
  método for `POST`, `PATCH` ou `DELETE`. O retry existente em 401/403 permanece como está
  (é a segunda linha de defesa).
- Permitir que `supaFetch` aceite um cabeçalho `Prefer` alternativo. Assinatura nova:
  `async function supaFetch(method,table,body,query,opts)`, onde `opts` é opcional e pode
  trazer `{prefer:'...'}`. Se `opts.prefer` vier, usa ele no lugar do `Prefer` padrão.
  TODAS as chamadas existentes (que passam 4 argumentos ou menos) devem continuar
  funcionando exatamente igual — não altere nenhuma delas.
- Reescrever o ramo de criação de `savePackage()` para usar `supaFetch`:
  - POST do pacote: `await supaFetch('POST','packages',{...},null,{prefer:'return=minimal'})`.
    `supaFetch` devolve `null` em erro — nesse caso mostrar
    `showToast('❌ Erro ao criar pacote. Tente novamente.',true)` e sair (igual a hoje).
  - As N sessões: montar um ARRAY com todos os objetos de sessão e fazer UM ÚNICO
    `await supaFetch('POST','sessions',arrayDeSessoes,null,{prefer:'return=minimal'})`.
    O PostgREST aceita array e insere tudo numa transação — some a falha parcial.
    - Se der `null` (falhou): apagar o pacote recém-criado para não deixar órfão
      (`await supaFetch('DELETE','packages',null,'?id=eq.'+pkgId)`), mostrar
      `showToast('❌ Erro ao criar as sessões. Nada foi salvo — tente novamente.',true)`,
      `await loadFromSupabase()` e sair.
    - Se der certo: `await loadFromSupabase(); navigate('sessions');`
      `showToast('✅ Pacote criado com '+totalSessions+' sessões!')`.
  - PRESERVAR exatamente: os ids gerados (`pkgId` por `genId()`, sessões
    `pkgId+'_s'+(i+1)`), o cálculo das datas (`new Date(firstDate+'T12:00:00')` mais
    `i*interval` dias, `toISOString().split('T')[0]`), os `created_at` escalonados
    (`new Date(Date.now()+i*10).toISOString()`), e todos os campos enviados hoje.
    Nenhuma mudança de dado, só de transporte.
- Reescrever `setClientAlta()` para usar
  `await supaFetch('POST','notes',{...},null,{prefer:'resolution=merge-duplicates,return=minimal'})`,
  mantendo exatamente o mesmo corpo (`id:'client_status'`, `user_id:'admin'`, `content`,
  `updated_at`) e o `_cache=null; await loadFromSupabase();` do final. Se `supaFetch`
  devolver `null`, mostrar `showToast('❌ Não foi possível salvar. Tente novamente.',true)`
  e NÃO recarregar (para não apagar o estado da tela).

### C. Auto-login não derruba sessão recuperável

No bloco `// ── AUTO LOGIN ──`: se a validação em `/auth/v1/user` NÃO retornar ok, tentar
`await refreshAuthToken()`; se o refresh der certo, revalidar uma vez com o token novo e
seguir para dentro do app (mesmo caminho de sucesso de hoje). Só remover o `AUTH_KEY` e
mostrar a tela de login se o refresh também falhar.

### D. Marcador de versão

Trocar `const APP_VERSION='2026-06-08-10';` por `const APP_VERSION='2026-08-17-01';`
(a auto-atualização do app depende desse bump).

### E. Harness de prova (arquivo NOVO)

Criar `docs/provas/prova-auth-passo1.mjs` — Node puro, sem dependências, sem rede.
Ele deve:
1. Ler `index.html`, extrair o texto do bloco `<script>` principal (o que começa com
   `const SUPA_URL=`), e recortar dali APENAS as funções `getAuthToken`,
   `refreshAuthToken`, `ensureFreshToken` e `supaFetch` (recorte por marcadores de
   comentário que você mesmo vai inserir no `index.html`: uma linha
   `// ── AUTH-CORE-INICIO ──` antes de `function getAuthToken` e
   `// ── AUTH-CORE-FIM ──` depois do fecho de `supaFetch`).
2. Avaliar esse trecho com `new Function` num escopo com stubs de `localStorage`,
   `fetch`, `console` e as constantes `SUPA_URL`/`SUPA_KEY`/`AUTH_KEY`, devolvendo as
   funções para teste.
3. Rodar e IMPRIMIR o resultado destes casos (formato `PASS n — descrição` /
   `FAIL n — descrição`), terminando com `RESULTADO: X/Y PASS` e `process.exit(1)` se
   houver qualquer FAIL:
   - 1. Token válido por muito tempo (exp daqui a 1 h): `ensureFreshToken()` devolve `true`
        e NÃO chama a rede.
   - 2. Token expirando em 30 s: `ensureFreshToken()` chama o endpoint de refresh e grava
        o novo `access_token` no localStorage stub.
   - 3. Sem token salvo: `ensureFreshToken()` devolve `false` e não quebra.
   - 4. Token com payload corrompido: `ensureFreshToken()` não lança e tenta o refresh.
   - 5. `supaFetch('POST',...)` com o primeiro fetch devolvendo 401 e o refresh funcionando:
        a requisição é repetida e o resultado final é o corpo de sucesso (prova do retry).
   - 6. Duas chamadas concorrentes a `refreshAuthToken()` disparam UM único POST de refresh
        e AMBAS recebem `true` (prova da correção do `_isRefreshing`).

## O que NÃO tocar

- Nenhuma outra função, nenhum outro módulo, nenhum CSS, nenhum texto de interface além dos
  toasts citados acima.
- Não renomear nada existente. Não reorganizar o arquivo. Não formatar/reindentar o que não
  faz parte da mudança (o diff precisa ser pequeno e legível).
- Não criar arquivos `.js` externos (o projeto é de arquivo único por decisão).
- Não mexer em `manifest.json`, ícones, README, CLAUDE.md.
- Não commitar nada (regra da casa: quem commita é o revisor).

## Critério de pronto

1. `node --check` do JS extraído do `index.html` passa sem erro. Deixe também um comando
   documentado no topo do harness dizendo como rodar essa verificação.
2. `node docs/provas/prova-auth-passo1.mjs` imprime `RESULTADO: 6/6 PASS` e sai com código 0.
3. `grep -n "fetch(SUPA_URL+'/rest/v1/" index.html` não retorna NENHUMA linha
   (todas as escritas passaram para `supaFetch`).
4. O diff no `index.html` é cirúrgico: só as funções citadas nesta spec.
