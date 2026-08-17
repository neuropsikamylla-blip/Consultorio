# SPEC — Passo 2: compromisso na agenda sem paciente (Entrega de Laudo, Supervisão…)

Projeto: NeuroPsi Consultório. Arquivo único `index.html` (HTML + CSS + JS inline, estilo
ES5/`var`, funções globais, sem build e sem dependências).

## O pedido da usuária, nas palavras dela

> "Coloca a possibilidade de eu reservar horario (sem criar cliente) colocar Por exemplo:
> Entrega de Laudo / Supervisão"

Ou seja: bloquear um horário na agenda para um compromisso que NÃO é sessão de paciente,
para que aquele horário não seja ocupado por engano.

## Decisões de desenho JÁ TOMADAS (não reabrir)

1. **Persistência sem DDL**: os compromissos vivem na tabela `notes` que já existe, num
   registro único `id='agenda_compromissos'`, com `content` = JSON string. É o mesmo
   precedente já usado no projeto para `id='client_status'` (veja `setClientAlta`). NÃO
   criar tabela nova, NÃO alterar schema — não temos acesso ao painel do Supabase.
2. **Compromisso não é sessão**: sem `clientId`, sem preço, sem pacote. Não entra no
   financeiro, não entra em nenhuma contagem de sessões, não afeta
   `pkgStats`, `clientNeedsAttention` nem `attentionSlots`.
3. **Recorrência materializada**: repetir gera as ocorrências explicitamente na criação
   (como as sessões de um pacote), todas com o mesmo `groupId`, para permitir excluir a
   série inteira depois.

## Formato do dado

```js
{
  id:'<genId()>',
  groupId:'<genId() — o mesmo em todas as ocorrências de uma série>',
  date:'YYYY-MM-DD',
  time:'HH:MM',          // obrigatório
  endTime:'HH:MM'|'',    // opcional
  title:'Entrega de Laudo — Joana',
  kind:'laudo'|'supervisao'|'reuniao'|'pessoal'|'outro',
  notes:'texto livre'|'',
  createdAt:'<ISO>'
}
```

O `content` do registro é `JSON.stringify({items:[ ... ]})`.

## O que fazer

### A. Bloco central, entre marcadores (para poder ser testado)

Inserir um bloco novo delimitado por `// ── COMPROMISSOS-CORE-INICIO ──` e
`// ── COMPROMISSOS-CORE-FIM ──`, colocado logo depois da função `pkgMonth` (antes do
comentário `// ── MODAL ──`), contendo APENAS funções puras (sem DOM, sem rede):

- `function compromissoKindMeta(kind)` — devolve `{lbl,emoji}` para cada tipo:
  - `laudo` → `{lbl:'Entrega de Laudo',emoji:'📄'}`
  - `supervisao` → `{lbl:'Supervisão',emoji:'👥'}`
  - `reuniao` → `{lbl:'Reunião',emoji:'🤝'}`
  - `pessoal` → `{lbl:'Pessoal',emoji:'🔒'}`
  - qualquer outra coisa (inclusive `undefined`) → `{lbl:'Compromisso',emoji:'📌'}`
- `function compromissoOccurrences(base,repeatDays,count)` — recebe um objeto de
  compromisso `base` (já validado), o intervalo em dias (`0` = não repete) e o número de
  ocorrências. Devolve um ARRAY:
  - `repeatDays<=0` ou `count<=1` → array com 1 item (cópia de `base`).
  - senão → `count` itens, o i-ésimo com a data de `base.date` somada de `i*repeatDays`
    dias, calculada como `new Date(base.date+'T12:00:00')` + `setDate(...)` +
    `toISOString().split('T')[0]` (é o padrão do arquivo, evita fuso). Todos com o mesmo
    `groupId` e `id` distinto — como a função é pura e não pode chamar `genId()`, receba os
    ids por `base.id` + sufixo: `base.id` para o primeiro e `base.id+'_r'+i` para os demais.
  - `count` deve ser tratado com teto de 52.
- `function compromissosOnDate(items,ds)` — filtra `items` por `date===ds` e devolve
  ordenado por `time` crescente (comparação de string). Tolera `items` `null`/`undefined`
  (devolve `[]`).
- `function compromissoValida(c)` — devolve string de erro ou `''`:
  - sem `date` → `'Informe a data'`
  - sem `time` → `'Informe o horário'`
  - `endTime` preenchido e `<= time` → `'O horário final tem de ser depois do inicial'`
  - sem `title` e sem `kind` → `'Informe o que é o compromisso'`
  - caso contrário `''`.

### B. Carregar e salvar

- Em `loadFromSupabase()`: acrescentar ao `Promise.all` uma quinta chamada
  `supaFetch('GET','notes',null,'?id=eq.agenda_compromissos')` e, no `_cache`, um campo
  `compromissos` — array vindo de `JSON.parse(linha.content).items`, dentro de `try/catch`
  que devolve `[]` em qualquer falha. Também acrescentar `compromissos:[]` ao objeto padrão
  de `getDB()`.
- `function getCompromissos()` — `return (getDB().compromissos)||[];`
- `async function saveCompromissos(items)` — grava o array inteiro:
  ```js
  var res=await supaFetch('POST','notes',{id:'agenda_compromissos',user_id:'admin',
    content:JSON.stringify({items:items}),updated_at:new Date().toISOString()},null,
    {prefer:'resolution=merge-duplicates,return=minimal'});
  if(res===null){showToast('❌ Não foi possível salvar o compromisso. Tente novamente.',true);return false;}
  _cache=null;await loadFromSupabase();return true;
  ```

### C. Interface

1. **Botão**: em `renderAgenda()`, o `topbar-actions` passa a ter dois botões — o
   `+ Nova Sessão` que já existe e, à esquerda dele, um
   `<button class="btn btn-secondary" onclick="showCompromissoForm()">+ Compromisso</button>`.

2. **Formulário** `function showCompromissoForm(dateStr,id)` — modal no padrão do arquivo
   (`showModal`, `form-group`, `form-row`, `form-actions`), título
   `'Novo Compromisso'` ou `'Editar Compromisso'`. Campos:
   - Tipo (`select` id `cf-kind`): as cinco opções de `compromissoKindMeta`, mostrando
     emoji + rótulo. Padrão: `laudo`.
   - Título (`input` id `cf-title`, placeholder `'Ex: Entrega de Laudo — Joana'`). Se ficar
     vazio ao salvar, usa o rótulo do tipo.
   - Data (`input type="date"` id `cf-date`) — pré-preenchida com `dateStr` ou `today()`.
   - Hora (`input type="time"` id `cf-time`, padrão `'09:00'`) e
     Hora final (`input type="time"` id `cf-end`, opcional, rótulo `'Termina (opcional)'`).
   - Repetir (`select` id `cf-repeat`): `0` Não repete (padrão), `7` Semanal,
     `14` Quinzenal, `30` Mensal.
   - Quantas vezes (`input type="number"` id `cf-count`, min 2, max 52, valor 4) — só faz
     sentido com repetição; deixe sempre visível, é mais simples e não atrapalha.
   - Observações (`textarea` id `cf-notes`, 3 linhas).
   - `<div id="cf-error" class="alert alert-red" style="display:none"></div>` e as ações
     Cancelar / Salvar, com a mesma trava de duplo clique usada em `showPackageForm`
     (`window._saveCompromisso=async function(){...}` com flag `_saving`).
   - No modo edição (`id` preenchido), carregar os valores do compromisso, esconder os
     campos de repetição (editar mexe só naquela ocorrência) e mostrar também um botão
     `🗑️ Excluir` que chama `confirmDeleteCompromisso(id)`.

3. **Salvar** `async function saveCompromisso(id)`:
   - Lê os campos, monta o objeto, roda `compromissoValida`; havendo erro, escreve no
     `#cf-error` (`display:flex`) e NÃO fecha o modal.
   - Novo: `groupId=genId()`, `id=genId()`, `createdAt=new Date().toISOString()`, gera as
     ocorrências com `compromissoOccurrences` e concatena ao array atual.
   - Edição: substitui, no array, o item de mesmo `id` (preservando `groupId` e `createdAt`).
   - `closeModal()`, `await saveCompromissos(novoArray)`; se voltou `true`,
     `showToast('✅ Compromisso salvo!')` e re-renderiza a tela corrente
     (`if(currentPage==='agenda')renderCalendar();else if(currentPage==='dashboard')renderDashboard();`).

4. **Excluir** `function confirmDeleteCompromisso(id)`:
   - Abre `showModal('Excluir Compromisso', ...)` mostrando o título e a data.
   - Se houver mais de um item com o mesmo `groupId`, oferecer DOIS botões: `Só este` e
     `Toda a série (N)`. Se não, só `Excluir`.
   - A remoção filtra o array e chama `saveCompromissos`, com toast
     `'🗑️ Compromisso excluído.'` e re-render da tela corrente.

5. **Calendário — mês** (`buildMonthDay`): depois dos chips de sessão e do `+N mais`,
   acrescentar um chip por compromisso do dia, usando `compromissosOnDate`:
   ```
   <span class="cal-chip compromisso" title="<tipo> — <título>"
     onclick="event.stopPropagation();showCompromissoForm(null,'<id>')">
     <strong>HH:MM</strong> <emoji> <título>
   </span>
   ```
   Escapar `title` e texto com `escHtml`. O horário sai de `time.slice(0,5)`.

6. **Calendário — semana** (`buildWeekGrid`): na célula da hora correspondente
   (`time.slice(0,2)===hStr`), acrescentar
   `<span class="week-event compromisso" onclick="event.stopPropagation();showCompromissoForm(null,'<id>')"><emoji> <título></span>`.

7. **Dia** (`window.dayClick`): antes do bloco de sessões (depois do `markHtml` de horário
   reservado), listar os compromissos do dia no mesmo padrão visual `ds-item`, com a barra
   `--yellow`, mostrando hora (e hora final se houver), emoji + título, o tipo em texto
   menor e as observações se houver; com um botão `✏️` que chama
   `closeModal();showCompromissoForm(null,'<id>')`. E, no rodapé do modal, ao lado do
   `+ Agendar neste dia` que já existe, um
   `<button class="btn btn-secondary btn-sm" onclick="closeModal();showCompromissoForm('<dateStr>')">+ Compromisso</button>`.

8. **Dashboard — "Próximas 7 dias"**: a lista hoje só considera sessões. Passar a mesclar
   os compromissos cujo `date` esteja no mesmo intervalo (`>=now && <=in7s`), ordenando o
   conjunto por `date` e depois por `time`, e mantendo o `slice(0,6)` no total. A linha do
   compromisso segue o mesmo layout das outras, com a barrinha em `var(--yellow)`, o título
   com emoji e, na linha de baixo, `fmtDateTime(date,time)+' · '+rótulo do tipo`. Se não
   houver nem sessão nem compromisso, o texto vazio continua o mesmo de hoje.

9. **Restauração de backup**: `exportBackup()` já exporta o `getDB()` inteiro e passará a
   incluir `compromissos` sem mudança. Em `loadBackupFile`, depois de restaurar as sessões,
   acrescentar: se `Array.isArray(data.compromissos)`, gravar via
   `await saveCompromissos(data.compromissos)`. Não mudar mais nada dessa função.

### D. CSS

Acrescentar, junto das outras regras de chip (perto de `.cal-chip.encerrado`):

```css
.cal-chip.compromisso{background:rgba(245,200,66,0.18);color:#f5c842;border-left:2px solid var(--yellow);}
.week-event.compromisso{background:rgba(245,200,66,0.22);color:#f5c842;border-left:2px solid var(--yellow);}
```

Amarelo porque azul, roxo e verde já são as categorias de sessão e vermelho é falta/horário
reservado — o compromisso precisa se distinguir de todos eles.

### E. Marcador de versão

`const APP_VERSION='2026-08-17-02';` → `const APP_VERSION='2026-08-17-03';`

### F. Prova (arquivo NOVO)

Criar `docs/provas/prova-compromissos.mjs`, Node puro, sem dependências e sem rede, no
mesmo molde de `docs/provas/prova-auth-passo1.mjs` (leia-o): extrai o bloco entre
`// ── COMPROMISSOS-CORE-INICIO ──` e `// ── COMPROMISSOS-CORE-FIM ──`, avalia com
`new Function` e testa. Saída `PASS n — descrição` / `FAIL n — descrição`, terminando em
`RESULTADO: X/Y PASS`, com `process.exit(1)` se houver FAIL. Casos:

1. `compromissoKindMeta('supervisao')` devolve rótulo `'Supervisão'` e emoji `'👥'`.
2. `compromissoKindMeta(undefined)` devolve o rótulo genérico `'Compromisso'`.
3. Sem repetição: `compromissoOccurrences(base,0,1)` devolve 1 item com a data original.
4. Semanal 4 vezes: devolve 4 itens nas datas certas (ex.: base `2026-08-20` →
   `2026-08-20`, `2026-08-27`, `2026-09-03`, `2026-09-10`), todos com o mesmo `groupId` e
   ids distintos.
5. Mensal 3 vezes a partir de `2026-01-31` (fim de mês, o caso que quebra data ingênua):
   devolve 3 itens, todos com data válida no formato `YYYY-MM-DD` e em ordem crescente.
6. Teto: pedir 999 ocorrências devolve no máximo 52.
7. `compromissosOnDate` filtra pela data certa e ordena por hora.
8. `compromissosOnDate(null,'2026-08-20')` devolve `[]`.
9. `compromissoValida` recusa sem data.
10. `compromissoValida` recusa sem hora.
11. `compromissoValida` recusa `endTime` menor ou igual ao `time`.
12. `compromissoValida` aceita um compromisso completo (devolve `''`).

## O que NÃO tocar

- Nada de sessões, pacotes, clientes, financeiro, boletos, anexos, anamnese ou
  configurações além dos enxertos descritos acima.
- Não alterar o comportamento existente de `buildMonthDay`, `buildWeekGrid` e `dayClick`
  para as SESSÕES — os compromissos são acréscimo, não substituição.
- Não renomear nada, não reindentar, não reorganizar o arquivo. Diff pequeno e legível.
- Não criar arquivos `.js` externos. Não commitar.

## Critério de pronto

1. `node docs/provas/prova-compromissos.mjs` imprime `RESULTADO: 12/12 PASS`, código 0.
2. `node docs/provas/prova-auth-passo1.mjs` continua `6/6 PASS` e
   `node docs/provas/prova-passo1b.mjs` continua `5/5 PASS` (nenhuma regressão).
3. O `<script>` principal do `index.html`, extraído inteiro, passa em `node --check`.
4. `grep -n "fetch(SUPA_URL+'/rest/v1/" index.html` continua retornando apenas as duas
   linhas de `/rest/v1/documents`.
