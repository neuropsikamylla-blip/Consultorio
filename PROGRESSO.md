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

## ENTREGUE — Anamnese removida (20/08/2026)

> "Anamnese pode retirar, eu nào estou utilizando"

Bloco contínuo no fim do `<script>` (linhas 2439–2814): `_ANA_SECS` com 27 seções,
`renderAnamnese`, `_anaFaixa`, `_anaRenderForm`, `_anaSelectClient`, `_anaCollect`, `_anaSave`,
`_anaLoad`, `_anaExportPDF`. Mais o item de menu, a chave em `titles`, a chave em `pages` e a
tag `<script>` do jsPDF do CDN — que só a anamnese usava.

**385 linhas fora. App: 701.742 → 681.928 bytes**, e uma dependência externa a menos para
baixar a cada abertura.

**Os DADOS não foram tocados.** A tabela `anamneses` e seus registros continuam no Supabase.
Nenhum DELETE, nenhuma migração. Se ela quiser a anamnese de volta, o código está no commit
`0c61eb8` e volta com `git show 0c61eb8:index.html`.

Codex `gpt-5.6-terra` high, lab `neuropsi-sem-ana`, aplicado sem conserto.
Provas: **148/148 PASS** em 16 baterias. `APP_VERSION` → 2026-08-20-05.

## ENTREGUE — alta libera os horários futuros (20/08/2026)

> "quando eu der alta e encerrar o paciente precisa sair da lista da agenda"

Medido rodando a agenda: o marcador "?" JÁ saía com a alta (1 → 0); o que ficava eram as
sessões futuras agendadas.

**Decisão dela**, entre três opções: ao dar alta, PERGUNTAR e apagar as futuras. "Apenas
ocultar" foi descartado por motivo concreto — a checagem de conflito continuaria bloqueando o
horário invisível, e ela receberia "já existe atendimento com <paciente em alta>" sem ver nada.

O modal de alta agora diz "<nome> tem N sessões futuras marcadas" e oferece três saídas:
Cancelar · Dar alta e manter · ✅ Dar alta e liberar horários. Sem futuras, segue com os dois
botões de antes — nada de passo inútil.

Sessão futura já marcada como realizada/falta NÃO é removida: conta no pacote e é histórico.

### Defeito preexistente consertado junto

`dbDeleteSession` não verificava o retorno do `supaFetch` — falha de DELETE passava silenciosa.
As irmãs verificavam (`dbDeletePackage` 1, `dbDeleteClient` 2); ela ficou de fora. Agora lança,
e os 2 chamadores ganharam `try/catch` com aviso de erro — senão o conserto trocaria "erro
silencioso" por "erro não tratado".

A liberação em massa conta sucessos e falhas de verdade (`result===null` ⇒ falha), não aborta
no meio e recarrega o banco UMA vez só, em vez de uma vez por sessão.

Codex `gpt-5.6-sol` high, lab `neuropsi-alta`, aplicado sem conserto.
Provas: **138/138 PASS** em 15 baterias. `APP_VERSION` → 2026-08-20-04.

## ENTREGUE — ação rápida no card Pacotes a Encerrar (20/08/2026)

> "fica mto enrolada pois vc tem de procurar o paciente pra saber onde ficou essa sessão
> restante ... lembrando que falta = sessao feita, ela precisa ser contabilizada como feita"

### O caso que faltava (diagnóstico rodando o dashboard, não lendo)

| Cenário | `nextOpenSession` | Clique |
|---|---|---|
| 8 criadas, 7 marcadas, 1 agendada | acha | ia direto ✅ |
| **só 7 criadas, todas marcadas** | `null` | caía na lista ❌ |
| 6 realizadas + 1 falta + 1 agendada | acha | ia direto ✅ |

O caso do meio é o dela: o pacote tem 8 vagas mas só 7 viraram sessão — não há sessão para
abrir, falta AGENDAR. Agora a linha diz `⚠️ falta agendar` e oferece `📅 Agendar`.

### O que mudou

- A linha mostra ONDE está a sessão: `· 📅 15/08 09:00`. Ela não precisa mais procurar.
- Ações na própria linha: `✅ Feita` e `⚠️ Falta`, com `stopPropagation`, sem abrir nada.
- Botão do cabeçalho ia para `navigate('packages')` — página SEM item de menu, que parecia
  "não sair do lugar". Agora `navigate('sessions')`, "Ver sessões →".

### Regra dela sobre falta — já estava correta, agora está PROVADA

"falta = sessão feita; a marcação de falta é só controle dela". Os seis pontos que contam
sessão usada (linhas ~553, 848, 949, 1208, 1293, 1320) já incluíam `'falta'`; o único que
separa é `realizadaCount` (~1294), de propósito, para exibir "realizadas × faltas".
O teste 7 da prova nova fixa isso: após marcar Falta, `pkgStats.used` sobe para 8.

Codex `gpt-5.6-terra` high, lab `neuropsi-acao`, aplicado sem conserto.
Provas: **126/126 PASS** em 14 baterias. `APP_VERSION` → 2026-08-20-03.

### Em aberto, se ela quiser

Marcar em massa as sessões passadas que continuam "agendada" — hoje só dá uma a uma, e foi
esse o esquecimento que originou tudo. O card resolve os pacotes com exatamente 1 faltando.

## ENTREGUE — Pacotes a Encerrar com clique útil (20/08/2026)

> "quando estiver faltando 1 sessão, mas quando eu clicar para ver ir direto para sessão que
> está restando ... problema que estou clicando e nao vai"

**Por que "não vinha":** só o `<button>Ver →</button>` tinha `onclick`. O nome do paciente e o
resto da linha não eram clicáveis — clicar ali, o gesto natural, não fazia nada. E o botão
levava à lista de Pacotes, que nem tem item no menu (`data-page="packages"` não existe), então
nada ficava destacado e parecia que não saía do lugar.

Agora: critério `remaining===1` (decisão dela), LINHA INTEIRA clicável com `cursor:pointer`, e
o destino é a própria sessão que falta (`nextOpenSession` → `showSessionEditForm`), onde ela
marca "realizada" e o pacote sai do alerta. Sem sessão em aberto, vai para `sessions` (página
que existe no menu) com aviso.

Codex `gpt-5.6-terra` high, lab `neuropsi-encerrar`, diff aplicado sem conserto.
Provas: **117/117 PASS** em 13 baterias. `APP_VERSION` → 2026-08-20-02.

### DOIS ALARMES FALSOS MEUS NESTA TAREFA — a lição

1. Afirmei que o alerta "mostrava todo paciente com pacote e não estava funcional". Eu havia
   lido `clientNeedsAttention`/`attentionSlots`, que alimenta os marcadores "?" da AGENDA — o
   card do dashboard é outro trecho, com critério próprio e correto.
2. Afirmei que o botão ficara sem `stopPropagation`. Ele estava lá; meu `grep -oE` cortou o
   início da linha.

**Lição:** nas duas vezes a causa foi a mesma — conclusão tirada de saída truncada (`tail`,
`cut -c1-N`, `grep -oE` sem âncora). Antes de afirmar defeito, ler o trecho INTEIRO da função,
ou provar com teste executável. O diagnóstico do clique só ficou correto quando rodei o
dashboard de verdade em vez de ler o HTML.

## ENTREGUE — gaveta dos recebimentos antigos (20/08/2026)

> "todo pacote que iniciamos até agosto zera ... faz uma pastinha (recebimentos antigos
> concluidos) e deixa meio que fechado, vou apertar tudo como recebido e vc deixa como
> escondidinho ... pois eu me desorganizei então esta tudo errado la"

Nada foi apagado. O histórico antigo saiu da vista principal e foi para uma gaveta `<details>`
fechada, com o consolidado (recebido, pendente, histórico por mês, pendências).

### A armadilha da data — o ponto central desta entrega

`markPaid` grava `paymentDate=today()`. Quitar os antigos já em setembro faria `pkgMonth`
virar `'2026-09'` e os ~R$ 9.180 de dívida velha entrariam como RECEITA DE SETEMBRO — a
bagunça mudaria de lugar em vez de encerrar. A quitação da gaveta grava o ÚLTIMO DIA DO MÊS DE
ORIGEM (`legacyPayload` + `lastDayOfMonth`), nunca a data de hoje. Pacote de junho ⇒
`2026-06-30`. `parcela1` preserva o `paymentDate` original e fecha a 2ª parcela no mês de origem.

### Alarme falso registrado, para não se repetir

Na revisão eu apontei que `dbUpdatePackage` não lançava em falha e que o contador de sucesso
mentiria. **Estava errado**: o `throw` existe desde a correção de auth de 17/08 (`b314f22`) —
eu havia lido só o fim da função. Em vez de resolver por leitura, escrevi
`prova-gaveta-falha.mjs`, que controla a rede de fora e inspeciona o que sai no PATCH.

### Provas: 107/107 PASS em 12 baterias

`prova-gaveta-antigos.mjs` 11/11 e a nova `prova-gaveta-falha.mjs` 8/8, que prova o que
importa de verdade:

- data gravada = `2026-06-30` para pacote de junho; NENHUM lançamento datado no mês corrente;
- rede fora ⇒ o aviso diz "0 quitados, 3 falharam" — **não mente sucesso**;
- falha parcial ⇒ relata quitados E falhas, sem abortar no meio;
- recusar a confirmação ⇒ zero gravações.

Codex `gpt-5.6-sol` high, lab `neuropsi-gaveta`. `APP_VERSION` → 2026-08-20-01.

### Os dois gestos dela (não dá para eu fazer: exigem escrita no Supabase dela)

1. Financeiro → **"Encerrar até agosto de 2026"** (um clique; grava o marco `2026-09`).
2. Abrir **📦 Recebimentos antigos** → **"✅ Marcar todos como recebidos"** → confirmar.

## ENTREGUE — barra lateral retrátil e marco do financeiro (19/08/2026)

> "coloque uma setinha para recuar essa parte do dashboard (para ampliar a agenda) mensal e
> semanal) e resete o financeiro(até o mes de agosto) para voltarmos a computar a partir de
> setembro!"

### Barra lateral retrátil — `6fa2f63`

Botão fixo que recolhe a barra de 230px no desktop (`body.sidebar-collapsed`), preferência em
`localStorage['neuropsi_sidebar']` aplicada antes da primeira pintura. Celular intocado.
Codex `gpt-5.6-terra` high, lab `neuropsi-sidebar`. Conserto pós-colheita: `setItem` estava sem
`try/catch` (o `getItem` tinha) — quebraria em janela privada.

### Marco do financeiro — SEM APAGAR NADA

**Decisão dela**, escolhida entre três opções apresentadas: marco de corte, não apagar. Os
lançamentos antigos continuam no Supabase; o Financeiro e o Dashboard passam a ignorá-los.
Reversível: basta limpar o campo.

`financeStart` (`'YYYY-MM'`) vive em `notes/app_settings`, ao lado de `sessionDurationMin`.
Aplicado em 15 pontos de cálculo entre `renderDashboard` e `renderFinancial`, via
`financePackages(db)` / `financeSessions(db)`.

**O corte é só do dinheiro.** A agenda, o calendário e a contagem de sessões dos pacotes
continuam mostrando tudo — há prova específica para isso (teste 10: com marco em `2026-09`,
`buildMonthDay` de 15/08 ainda mostra a sessão).

Codex `gpt-5.6-sol` high (código acoplado mexendo em receita), lab `neuropsi-marco`. Diff
revisado linha a linha e aplicado sem conserto.

Provas: **88/88 PASS** nas 10 baterias. `APP_VERSION` → 2026-08-19-04.

### PENDENTE — um gesto dela, de 10 segundos

O marco NÃO foi ativado por mim: ele é um dado que vive na conta Supabase dela, e eu não tenho
credencial de escrita no banco dela. Para ativar:
**Configurações → "Financeiro computa a partir de" → setembro/2026 → Salvar.**
Enquanto não fizer isso, o financeiro segue somando tudo, como antes.

## ENTREGUE — ordem cronológica na agenda (19/08/2026)

> "esta ficando embaixo deveria ficar certinho na agenda ou seja 14h ficar antes das 15h ou
> das 16h (quando for esses dois casos) que são sessoes mais longas"

Defeito ANTERIOR à entrega do período (nasceu no passo 2, `b485018`): mês e detalhe do dia
montavam a lista POR TIPO — sessões ordenadas, compromissos anexados no fim, alertas jogados
no topo. No print dela, a Supervisão das 14:00 vinha depois da sessão das 17:00.

Agora os três tipos entram numa lista única ordenada por horário. Empate de horário resolve
por `reservado → compromisso → sessão`, para o alerta vermelho não ficar escondido.

O limite de 8 do mês foi preservado como era: corta SOMENTE sessões; compromisso e alerta
nunca somem, e o `+N mais` conta só as sessões omitidas.

Codex `gpt-5.6-terra` high, lab `neuropsi-ordem`. Diff revisado linha a linha — aplicado sem
conserto, o Codex acertou de primeira desta vez.
Provas: **70/70 PASS** nas 8 baterias. Contrafactual da prova de ordem na versão anterior:
**4/9** — os quatro testes de ordenação falham lá.
`APP_VERSION` 2026-08-19-01 → 2026-08-19-02.

## ENTREGUE — período visível na agenda (19/08/2026)

Pedido dela, nas palavras dela:
> "seria interessante colocar o periodo ... para saber qts min tem cada sessão?"
> "digo mas sem ocupar mais espaço (é que a supervisão era 14h até 15:30) ai fica parecendo
> que 15h esta livre"
> "mas tem sessão de laudo e supervisao que dura 1:30 a 2h como faz?"

**Defeito**: na visão de semana, o compromisso era desenhado só na faixa da hora de início.
Supervisão 14:00–15:30 sumia da célula das 15h, que ficava visualmente livre — risco de
marcar atendimento em cima. O `endTime` já era gravado; a renderização é que o ignorava.

**Resposta à terceira pergunta:** laudo e supervisão de 1h30 ou 2h já eram cadastráveis — o
formulário de compromisso tem o campo "Termina (opcional)" (`cf-end`) desde o passo 2, com
duração livre. Nada a mudar ali; faltava só a agenda mostrar e bloquear.

- [x] Passo 1 — Spec: `docs/spec-periodo-agenda-20260819.md` (commit `6bcc85c`).
- [x] Passo 2 — Compromisso mostra `HH:MM–HH:MM` e tinge as faixas atravessadas.
- [x] Passo 3 — Sessão com duração padrão de 50 min, configurável em Configurações,
      persistida em `notes/app_settings` (mesmo padrão de `client_status`).
- [x] Passo 4 — Provas: `prova-periodo-agenda.mjs` 12/12 (funções puras) e
      `prova-periodo-render.mjs` 9/9 (renderização real, com o caso dela).
      Contrafactual: a prova de renderização dá **5/9 na versão anterior** — o teste 3,
      que é o caso dela, falha lá e passa aqui.
- [x] Passo 5 — `APP_VERSION` 2026-08-17-03 → 2026-08-19-01, commit e publicação.

Bateria final: **61/61 PASS** nas 7 provas.

### Como foi feito

Codex `gpt-5.6-terra` esforço `high`, lab `neuropsi-periodo`, spec com prova de aceite escrita
ANTES. Diff revisado linha a linha por mim, com **dois consertos pós-colheita**:

1. **Mês**: o Codex pôs o período também no chip da sessão. O `.cal-chip` é
   `nowrap`+`ellipsis`, então `09:00–09:50 Idalice 1/8` espremia o nome do paciente — e na
   visão de mês não existe faixa de hora, logo o período não resolve problema nenhum ali.
   Revertido para a hora de início; o compromisso mantém o período, porque a duração dele varia.
2. **Semana**: o filtro varria TODAS as sessões do banco 105 vezes (15 horas × 7 dias).
   Passou a filtrar o dia uma única vez fora do laço.

### Decisões de desenho

7. **Fim exclusivo**: compromisso que termina às 16:00 em ponto NÃO ocupa a faixa das 16h.
8. **Ocupação sem bloco novo**: a faixa de continuação só recebe a classe CSS `ocupado`
   (fundo tingido, com variante para light mode). Nenhum elemento é inserido — é a restrição
   dela, "sem ocupar mais espaço".
9. **Duração de sessão = 50 min por padrão**, configurável. Suposição declarada a ela: se as
   sessões dela não forem de 50 min, o número se troca em Configurações e vale para a agenda toda.
10. **`sessionEnd` satura em 23:59** — sessão tarde da noite não vira o dia.

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

### INCIDENTE DE SEGREDO — token colado no chat (19/08/2026)

Ela colou um Personal Access Token válido no chat para destravar o push. **O gancho que
registra os pedidos gravou esse token no `PEDIDOS-LOG.md`, que é versionado num repositório
público.** Pego antes de qualquer commit.

Contenção feita:

1. Token mascarado no `PEDIDOS-LOG.md` (o texto do pedido dela ficou preservado; só o segredo saiu).
2. Backup temporário que o continha, apagado — diff conferido antes, nada de conteúdo se perdeu.
3. `*.bak` e `*.bak-*` entraram no `.gitignore`: backups datados da regra 11 nunca mais
   poderão ser commitados carregando segredo.
4. `git log --all -S<token>` = vazio. **O token nunca entrou no histórico do Git**, então
   nunca ficou público. Commits `19b2cdd` e este.

**Risco que sobra:** o token é válido, escopo `repo` (escrita em todos os repositórios dela),
e trafegou pelo chat. Revogar em github.com/settings/tokens é gesto dela e é o único item
aberto — mas **não bloqueia nada**: o app está publicado e funcionando.

### Estado da credencial de push (19/08/2026)

Sequência real observada, que contradiz o diagnóstico da manhã:

- Após limpar a URL do remote, dois pushes passaram usando o `osxkeychain`.
- O terceiro push falhou com `Invalid username or token`. `git credential fill` passou a
  devolver **string vazia** — o keychain está sem credencial para `github.com`. A leitura mais
  provável é que a credencial guardada era o token velho: o Git a usou, o GitHub recusou, e o
  Git a apagou do helper (`credential reject` automático).
- Portanto: limpar a URL foi necessário, mas **não era suficiente** — não havia credencial boa
  no keychain, ao contrário do que a nota da manhã afirmou.

Como os pushes saíram: token dela usado de forma **efêmera**, via `GIT_ASKPASS` apontando para
um arquivo fora do repositório, com `-c credential.helper=` para não persistir, e o arquivo
apagado em seguida. O `.git/config` continua com a URL limpa.

Tentei guardar a credencial no keychain (`git credential approve`) para os próximos pushes
saírem sozinhos: **bloqueado pelo classificador de segurança do Claude Code**, que barra
gravação de segredo. Não contornei.

**DECISÃO DELA (19/08/2026): não guardar credencial nenhuma na máquina.** Ela optou por
revogar o token assim que a sessão fechasse. Registrado a pedido dela, não é esquecimento meu.

**Consequência prática, aceita:** o push voltará a pedir credencial na próxima sessão. Quando
houver algo a publicar, o caminho é ela gerar um token novo e passar para uso efêmero (o
método acima), ou rodar `gh auth login` uma vez. Nada quebra por não haver credencial: o
`.git/config` está com a URL limpa, o repositório local está íntegro e o app publicado
continua no ar de qualquer forma.

**Aviso para a próxima sessão:** ao receber token dela pelo chat, mascarar no `PEDIDOS-LOG.md`
ANTES de qualquer outra coisa — o gancho grava a mensagem dela literalmente num arquivo
versionado de repositório público.

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
