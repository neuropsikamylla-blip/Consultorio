# As 3 ultimas especificacoes dela (automatico; a mais nova por ultimo)
# Na retomada: ler as 3, conectar com PROGRESSO.md e git, declarar e seguir.

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
