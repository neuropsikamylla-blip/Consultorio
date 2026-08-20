# Historico automatico dos pedidos (gravado no envio; o mais novo por ultimo)

## 17/08/2026 10:28
o meu App NeuroPsi está dando erro quando tento renovar pacote. Agora que fechei e abri novamente deu certo! Coloca a possibilidade de eu reservar horario (sem criar cliente) colocar Por exemplo : Entrega de Laudo / Supervisão

## 17/08/2026 11:05
o que ue preciso fazer?

## 17/08/2026 11:13
No server is currently available to service your request.

Sorry about that. Please try refreshing and contact us if the problem persists.

## 17/08/2026 11:13
nao nao.. estou tentnado entrar no github e esta dando isso

## 17/08/2026 11:20
ok

## 18/08/2026 08:04
quero sair mesmo depois voltamos

## 19/08/2026 16:17
continue da onde parou

## 19/08/2026 16:22
token: [TOKEN REMOVIDO PELO CLAUDE — segredo nao entra em arquivo versionado, regra 2]

## 19/08/2026 17:12
nao quero gravar eu vou revogar o token apos vc fianalizar

## 19/08/2026 17:17
o que foi implantado?

## 19/08/2026 17:23
seria interessante colocar o periodo por exemplo:[Image #1] para saber qts min tem cada sessão?

## 19/08/2026 17:41
[Image #2] esta ficando embaixo deveria ficar certinho na agenda ou seja 14h ficar antes das 15h ou das 16h (quando for esses dois casos) que são sessoes mais longas enfim.. entendeu?

## 20/08/2026 09:57
[Image #4] queria que resetasse.. todo pacote que iniciamos até agosto zera sei la faz uma pastinha (recebimentos antigos concluidos) e deixa meio que fechado vou apertar tudo como recebido e vc deixa como escondidinho) para todos novos pacotes que inicarmos em setembro pois eu me desorganizei então esta tudo errado la beleza?

## 20/08/2026 10:35
otimo.. o que esta me incomodando agora é : ⚠️ Pacotes a Encerrar. Tem pacientes que ja iniciaram novos pacotes mas eu esqueci de marcar sessão realizada, como fazemos isso? pois eu nao sei se isso está funcional

## 20/08/2026 10:44
eu acho que quando estiver faltando 1 sessão, mas quando eu clicar para ver ir direto para sessão que está restando (pois se for uma falha minha de marcar realizada eu consigo resolver).. problema que estou clicando e nao vai

## 20/08/2026 13:14
então quando eu clico abrir (na parte de ⚠️ Pacotes a Encerrar
Ver pacotes →) vou em abrir abre a pagina sessoes e pacotes) nessa parte fica mto enrolada pois vc tem de procurar o paciente pra saber onde ficou essa sessão restante( eu preciso clicar e de fato ir para a sessão que esta faltando) na agenda posi la clico realizada ou nao) lembrando que falta = sessao feita ela precisa ser contabilizadada como feita. a parte de falta é so para meu controle que o paciente faltou, mas a sessao foi feita pois paciente que noa avisa com antecedencia a sessao é contabilizada normalmente

## 20/08/2026 13:41
quando eu der alta e encerrar o paciente precisa sair da lista da agenda.

## 20/08/2026 14:04
Quero fazer as alterações abaixo no NeuroPsi.

## IMPORTANTE — BACKUP ANTES DE ALTERAR

Antes de modificar o aplicativo, crie um **backup/ponto de restauração completo da versão atual**, incluindo os dados.

Preciso conseguir voltar exatamente para esta versão caso eu não goste das mudanças.

**Não apague esse backup até eu testar a nova versão e dar meu aval de que quero mantê-la.**

Não faça exclusões ou migrações destrutivas de dados.

---

# 1. VISUAL

**Não quero alterar o visual atual.**

Manter exatamente o padrão que já existe:

* tema claro;
* tema escuro;
* alternância entre os dois;
* cores;
* botões;
* cards;
* modais;
* sidebar;
* tipografia;
* ícones;
* tabelas;
* demais elementos visuais.

As novas funcionalidades devem apenas seguir o estilo já existente.

---

# 2. SIDEBAR

Alterar a organização para:

* Dashboard
* Agenda
* Pacientes
* Documentos
* Financeiro
* Contas a Pagar
* Notas/Pendências
* Configurações

Na parte inferior, manter exatamente como já existe:

* Backup
* Restaurar
* Sair
* Atualizar App
* versão

**Atualizar App deve continuar visível**, porque preciso enxergá-lo para lembrar de atualizar o aplicativo quando faço alterações.

---

# 3. CLIENTES → PACIENTES

Renomear:

**Clientes → Pacientes**

Sem apagar ou recadastrar nenhum dado.

---

# 4. ANAMNESE

Remover **Anamnese apenas da sidebar**.

Não excluir dados nem funcionalidades existentes de anamnese.

Se houver conteúdo salvo, preservar.

---

# 5. ANEXOS → DOCUMENTOS

Renomear:

**Anexos → Documentos**

Manter esse módulo global porque utilizo para guardar e localizar:

* contratos;
* laudos;
* termos;
* arquivos;
* documentos que eventualmente preciso imprimir.

Se for simples utilizando a estrutura atual, permitir busca por:

**nome do documento ou paciente.**

Não alterar documentos já existentes.

---

# 6. BOLETOS → CONTAS A PAGAR

Renomear:

**Boletos → Contas a Pagar**

Manter separado de Financeiro.

### Financeiro

É relacionado aos valores que recebo dos pacientes/clínica.

### Contas a Pagar

É relacionado às minhas despesas, como:

* boletos;
* condomínio;
* internet;
* sistemas;
* assinaturas;
* outras contas.

**Manter os avisos no Dashboard de contas próximas do vencimento/vencidas**, porque essa função é importante para mim.

---

# 7. JUNTAR CLIENTES + SESSÕES/PACOTES

Hoje existem duas áreas que acabam duplicando informações:

* Clientes
* Sessões/Pacotes

Quero que **Sessões/Pacotes deixe de existir como item separado na sidebar**.

Sessões e Pacotes NÃO serão eliminados.

Eles passarão a ficar dentro de **Pacientes**.

Antes de retirar Sessões/Pacotes da sidebar, garanta que todas as funcionalidades atuais continuem acessíveis dentro da ficha do paciente.

---

# 8. NOVA FICHA DO PACIENTE

Ao abrir:

**Pacientes → Nome do paciente**

quero concentrar as informações daquele paciente.

Criar abas semelhantes a:

**Resumo | Sessões | Pacotes | Prontuário | Cadastro**

---

# 9. RESUMO DO PACIENTE

Na aba Resumo, mostrar rapidamente:

* nome;
* status ativo/encerrado;
* tipo de atendimento;
* próxima sessão;
* quantidade de sessões realizadas;
* faltas;
* pacote atual, quando existir;
* quantidade restante;
* status de pagamento;
* última anotação clínica.

Também manter ações rápidas como:

* Registrar sessão
* Novo pacote
* Prontuário
* Editar paciente

---

# 10. SESSÕES

Na aba Sessões, mostrar o histórico daquele paciente.

Manter as informações que já existem, como:

* data;
* hora;
* categoria;
* pacote;
* status;
* pagamento;
* ações.

Preservar os status e regras já existentes.

---

# 11. PACIENTE PODE TER PACOTE OU PAGAR AVULSO

Muito importante:

**não obrigar todos os pacientes a terem pacote.**

Tenho pacientes que:

* fecham pacote de 4 sessões;
* fecham outros números de sessões;
* fazem avaliação com cerca de 10 encontros;
* pagam individualmente por sessão.

O sistema precisa continuar aceitando os dois modelos:

### Pacote

Controle por quantidade de sessões.

### Avulso

Pagamento individual de cada sessão.

---

# 12. PACOTES

Na aba Pacotes:

## Pacote atual

Deixar o pacote atual visível com:

* quantidade total;
* realizadas;
* restantes;
* valor;
* pagamento;
* período;
* status.

Manter botão para:

**Renovar pacote**

## Pacotes anteriores

Em vez de deixar todos os pacotes antigos ocupando muito espaço, criar:

**Histórico de pacotes**

que possa ser expandido quando eu quiser consultar.

Não apagar nenhum pacote antigo.

---

# 13. QUANDO O PACOTE TERMINAR

Manter a lógica atual de alerta quando chegar a:

**0 sessões restantes.**

Quero três opções:

### Renovar pacote

Continua através de novo pacote.

### Continuar avulso

Paciente permanece ativo e começa a pagar individualmente por sessão.

### Dar alta / Encerrar acompanhamento

Paciente é encerrado.

---

# 14. HORÁRIO RECORRENTE

Manter uma regra atual muito importante:

**quando o pacote termina, o horário recorrente NÃO deve ser liberado automaticamente.**

O horário deve continuar reservado até eu escolher:

* renovar;
* continuar avulso;
* dar alta/encerrar.

Somente no encerramento o horário deve ser liberado conforme a lógica atual.

---

# 15. PRONTUÁRIO

Quero melhorar a organização do prontuário.

Em vez de o prontuário ficar principalmente organizado por pacote, quero que as novas anotações clínicas fiquem preferencialmente relacionadas às sessões.

Exemplo:

**26/08/2026 — Psicoterapia**
Anotação clínica...

**19/08/2026 — Psicoterapia**
Anotação clínica...

Organizar cronologicamente.

### MUITO IMPORTANTE

Não perder nenhuma anotação antiga.

Se alguma anotação antiga estiver vinculada apenas ao pacote e não for possível identificar com segurança a sessão correspondente:

**não tente adivinhar.**

Mantenha como:

**Anotação histórica do pacote**

ou estrutura equivalente.

---

# 16. SESSÃO REALIZADA

Ao marcar uma sessão como:

**Realizada**

pode existir a opção:

**Adicionar anotação clínica**

Mas não deve ser obrigatório preencher o prontuário naquele momento.

Preciso poder escrever depois.

---

# 17. PACIENTES ENCERRADOS

Ao dar alta:

não excluir o paciente.

Alterar para status:

**Encerrado**

Ele deve continuar pesquisável e manter:

* sessões;
* pacotes;
* prontuário;
* pagamentos;
* histórico.

---

# 18. FILTROS EM PACIENTES

Adicionar filtros simples:

* Todos
* Psicoterapia
* Avaliação
* Reabilitação
* Supervisão
* Encerrados

Manter também a busca por nome.

---

# 19. DASHBOARD

Quero que o Dashboard fique mais focado no que preciso fazer **hoje**.

## Primeira área

Mostrar:

### Atendimentos hoje

Quantidade.

### Próximo atendimento

Horário + paciente + categoria.

### Pendências

Quantidade aberta.

### Contas

Quantidade vencendo hoje ou vencidas.

---

# 20. AGENDA DE HOJE NO DASHBOARD

Criar uma seção:

**Hoje**

com os atendimentos do dia em ordem de horário.

Exemplo:

14:00 — Supervisão Lua — Supervisão
16:00 — Danilo Nery — Psicoterapia
17:00 — Letícia Siqueira — Psicoterapia
19:00 — Eloa Simon — Psicoterapia

Permitir abrir rapidamente o paciente/sessão.

---

# 21. ÁREA “ATENÇÃO” NO DASHBOARD

Criar uma área reunindo alertas relevantes, como:

* paciente com 1 sessão restante;
* pacote encerrado;
* pagamento pendente;
* conta vencendo;
* conta vencida;
* paciente ativo sem próxima sessão.

Exemplo:

**Atenção**

Eduardo Oliveira — 1 sessão restante
Ana Luisa — pacote encerrado
Ana Mendonça — pagamento pendente
Internet — vence hoje

---

# 22. PACIENTES SEM PRÓXIMA SESSÃO

Adicionar ao Dashboard um alerta para:

**pacientes ativos que não possuem nenhuma próxima sessão agendada.**

Não considerar pacientes encerrados.

---

# 23. PRÓXIMOS 7 DIAS

Manter a seção existente.

A ordem de prioridade do Dashboard deve ser:

1. Hoje
2. Atenção
3. Próximos 7 dias
4. Informações gerais/estatísticas

---

# 24. NOTAS → NOTAS/PENDÊNCIAS

Aproveitar a função atual de notas para criar algo mais funcional.

Quero poder registrar tarefas simples como:

* enviar laudo;
* emitir NF;
* responder responsável;
* imprimir contrato;
* ligar para paciente.

Campos:

* descrição;
* paciente relacionado — opcional;
* data — opcional;
* status: Pendente ou Concluída.

No Dashboard mostrar apenas as pendências abertas.

Ao clicar em **Concluir**, retirar da lista de pendências abertas, mas preservar no histórico.

Evitar mostrar “Notas Importantes” duplicadas em diferentes partes do Dashboard.

---

# 25. NÃO ALTERAR A AGENDA ALÉM DO NECESSÁRIO

Não quero reformular a Agenda agora.

Preservar:

* horários;
* recorrência;
* reagendamentos;
* sessões;
* faltas;
* categorias;
* reservas;
* lógica atual dos pacotes.

Fazer apenas as integrações necessárias com a nova ficha de Pacientes e o Dashboard.

---

# 26. DADOS EXISTENTES

Nenhuma dessas mudanças pode exigir que eu recadastre informações.

Preservar todos os dados atuais:

* pacientes;
* sessões;
* pacotes;
* prontuários;
* pagamentos;
* documentos;
* contas;
* notas;
* agenda.

---

# 27. AO FINAL

Quando terminar, me informe apenas:

1. o que foi alterado;
2. se houve alguma alteração no banco;
3. onde está o backup da versão anterior;
4. como voltar para a versão anterior;
5. quais pontos principais devo testar.

**Não considere a nova versão definitiva até eu testar e dar meu aval.**
