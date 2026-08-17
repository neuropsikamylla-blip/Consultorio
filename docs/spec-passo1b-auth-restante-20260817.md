# SPEC — Passo 1b: fechar o mesmo defeito de token nas escritas restantes

Projeto: NeuroPsi Consultório. Arquivo único `index.html` (HTML + CSS + JS inline, estilo
ES5/var, funções globais). Sem build, sem framework, sem dependências.

O Passo 1 (já aplicado, commit `3997fcb`) criou `ensureFreshToken()`, tornou
`refreshAuthToken()` uma promise compartilhada, deu a `supaFetch()` um 5º parâmetro
`opts.prefer` e migrou `savePackage()` e `setClientAlta()` para `supaFetch`. Leia essas
funções antes de começar — este passo segue exatamente o mesmo padrão nos pontos que
sobraram.

## O que fazer (escopo fechado)

### A. Salvaguarda no insert em lote de sessões

Hoje `savePackage()` insere as N sessões num único POST com array. Não temos evidência de
como o PostgREST/RLS deste projeto responde a insert em lote, e essa é a função que a
usuária mais usa. Criar uma função auxiliar, colocada logo antes de `savePackage`, entre os
marcadores de comentário `// ── SESS-BATCH-INICIO ──` e `// ── SESS-BATCH-FIM ──`:

```js
async function insertSessionRows(rows){ ... }
```

Comportamento exigido:
- `rows` é um array de objetos já prontos para a tabela `sessions`.
- Array vazio: devolve `{ok:true,count:0}` sem chamar rede.
- Tenta primeiro UM insert em lote:
  `await supaFetch('POST','sessions',rows,null,{prefer:'return=minimal'})`.
  Se o resultado NÃO for `null`, devolve `{ok:true,count:rows.length}`.
- Se o lote falhar (`null`), cai no plano B: insere UMA A UMA, na ordem, contando os
  sucessos (resultado diferente de `null`). Devolve
  `{ok:count===rows.length,count:count}`.
- Nunca lança exceção.

Usar essa função em `savePackage()` no lugar do insert em lote atual, com este tratamento:
- `res.ok===true` → segue o caminho de sucesso de hoje (`loadFromSupabase`,
  `navigate('sessions')`, toast `'✅ Pacote criado com '+totalSessions+' sessões!'`).
- `res.count===0` (nenhuma sessão entrou) → desfaz o pacote:
  `var del=await supaFetch('DELETE','packages',null,'?id=eq.'+pkgId);`
  - `del` diferente de `null`: toast
    `'❌ Erro ao criar as sessões. Nada foi salvo — tente novamente.'`
  - `del===null` (nem o rollback funcionou; o pacote FICOU no banco): toast
    `'❌ Erro ao criar as sessões. O pacote ficou sem sessões — abra e edite ou exclua.'`
  Nos dois casos: `await loadFromSupabase(); return;`
  (a mensagem tem de dizer a verdade sobre o que ficou no banco)
- `0 < res.count < totalSessions` → NÃO desfaz nada (há dados salvos):
  `await loadFromSupabase(); navigate('sessions');` e toast
  `'⚠️ '+res.count+'/'+totalSessions+' sessões criadas.'` com o flag de erro `true`.

### B. `saveSession()` — o ramo `if(isNewPkg)` tem o mesmo defeito do Passo 1

Nesse ramo, o pacote e as sessões são gravados com `fetch` cru
(`'Authorization':'Bearer '+authTok`, com `authTok=getAuthToken()` capturado uma vez), fora
do `supaFetch` — ou seja, sem refresh e sem retry: é o MESMO erro que a usuária relatou,
só que na tela de Nova Sessão.

Converter:
- POST do pacote: `await supaFetch('POST','packages',{...},null,{prefer:'return=minimal'})`,
  com os MESMOS campos de hoje. `null` → `showToast('❌ Erro ao criar pacote. Tente novamente.',true); return;`
- As sessões: montar o array com os mesmos objetos de hoje (preservando exatamente
  `id:newPkgId+'_s'+(i+1)`, as datas com `pkgInt`, `status:i===0?status:'agendada'`,
  `notes:i===0?notes:''`, `interval_days:pkgInt`, `created_at` escalonado) e chamar
  `insertSessionRows(...)`, com o MESMO tratamento de resultado descrito no item A
  (sucesso / rollback com mensagem honesta / parcial), trocando apenas o texto do toast de
  sucesso para `'✅ Pacote "'+pkgName2+'" criado com '+pkgSess+' sessões!'`.
- Apagar a variável `authTok` desse ramo, que fica sem uso.

### C. Notas — `saveNotes(content)` e o carregamento

- `saveNotes`: trocar os dois `fetch` crus por `supaFetch`:
  - com `_noteId`: `await supaFetch('PATCH','notes',{content:content,updated_at:...},'?id=eq.'+_noteId,{prefer:'return=minimal'})`
  - sem `_noteId`: `_noteId='note_admin';` e
    `await supaFetch('POST','notes',{id:'note_admin',user_id:'admin',content:content,updated_at:...},null,{prefer:'resolution=merge-duplicates,return=minimal'})`
  - O status na tela passa a ser: resultado `null` → `'⚠️ Não salvou no servidor'`;
    caso contrário → `'✅ Salvo!'`. O `localStorage.setItem('dashboard_notes',content)`
    continua acontecendo nos dois casos, como hoje.
- O carregamento (`fetch(SUPA_URL+'/rest/v1/notes?id=eq.note_admin',...)` dentro do
  `renderNotes`): trocar por `supaFetch('GET','notes',null,'?id=eq.note_admin')`, mantendo o
  mesmo `.then` sobre as linhas retornadas e o mesmo `.catch` silencioso. Atenção:
  `supaFetch` já devolve o array pronto (não tem `.json()`).

### D. NÃO tocar nos anexos

As chamadas em `/rest/v1/documents` usam `Authorization: Bearer SUPA_KEY` de propósito
(padrão documentado no `CLAUDE.md`, item 3 de "Cuidados ao Modificar"; a anon key não
expira). Deixe exatamente como estão.

### E. Marcador de versão

`const APP_VERSION='2026-08-17-01';` → `const APP_VERSION='2026-08-17-02';`

### F. Prova (arquivo NOVO)

Criar `docs/provas/prova-passo1b.mjs`, Node puro, sem dependências e sem rede, no mesmo
molde do `docs/provas/prova-auth-passo1.mjs` que já existe (leia-o e reaproveite a técnica
de extrair o trecho por marcadores e avaliar com `new Function`).

Ele extrai o bloco entre `// ── SESS-BATCH-INICIO ──` e `// ── SESS-BATCH-FIM ──` e testa
`insertSessionRows` com um `supaFetch` stub injetado. Casos (formato de saída
`PASS n — descrição` / `FAIL n — descrição`, terminando em `RESULTADO: X/Y PASS` e
`process.exit(1)` se houver FAIL):

1. 8 linhas, lote aceito: UMA chamada só ao stub e `{ok:true,count:8}`.
2. Lote recusado (`null`) e as 8 individuais aceitas: 1 + 8 = 9 chamadas e `{ok:true,count:8}`.
3. Lote recusado e SÓ 3 das 8 individuais aceitas: `{ok:false,count:3}`.
4. Lote recusado e todas as individuais recusadas: `{ok:false,count:0}`.
5. Array vazio: `{ok:true,count:0}` e nenhuma chamada ao stub.

## O que NÃO tocar

- Nada além das funções citadas: `savePackage` (só o trecho do insert das sessões),
  `saveSession` (só o ramo `isNewPkg`), `saveNotes` e o carregamento de notas.
- Não mexer em CSS, em textos de interface fora dos toasts citados, em anexos, em backup,
  no `manifest.json`, no README ou em qualquer `.md`.
- Não renomear nada existente, não reindentar, não reorganizar. Diff pequeno e legível.
- Não criar arquivos `.js` externos. Não commitar.

## Critério de pronto

1. `node docs/provas/prova-auth-passo1.mjs` continua imprimindo `RESULTADO: 6/6 PASS`
   (nada do Passo 1 pode ter regredido).
2. `node docs/provas/prova-passo1b.mjs` imprime `RESULTADO: 5/5 PASS` e sai com código 0.
3. `node docs/provas/prova-auth-passo1.mjs --extract | node --check` passa.
4. `grep -n "fetch(SUPA_URL+'/rest/v1/" index.html` retorna APENAS as linhas de
   `/rest/v1/documents` (os anexos, que ficam como estão) — nenhuma de `packages`,
   `sessions` ou `notes`.
