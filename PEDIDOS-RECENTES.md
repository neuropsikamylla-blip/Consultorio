# As 3 ultimas especificacoes dela (automatico; a mais nova por ultimo)
# Na retomada: ler as 3, conectar com PROGRESSO.md e git, declarar e seguir.

## no topo:

* campo de busca;
* botão **+ Novo Paciente**;
* se fizer sentido, filtros simples como:

  * Todos
  * Psicoterapia
  * Avaliação
  * Reabilitação
  * Supervisão
  * Encerrados

## na listagem:

cada paciente em um card/bloco no estilo Sessões/Pacotes.

---

# 9. AÇÕES DENTRO DE PACIENTES

Dentro de cada card do paciente, manter acesso rápido a:

* Prontuário
* Ver perfil
* Editar
* Excluir/Arquivar (com cuidado e confirmação)

Se já existir uma lógica segura, manter.

---

# 10. VER PERFIL

O botão **Ver perfil** deve continuar levando para a ficha mais completa do paciente.

Essa ficha pode continuar existindo com abas como:

* Resumo
* Sessões
* Pacotes
* Prontuário
* Cadastro

Ou estrutura equivalente.

---

# 11. PRONTUÁRIO

O botão **Prontuário** dentro do card do paciente deve continuar acessível, como já está hoje em Sessões/Pacotes.

---

# 12. SESSÕES/PACOTES

A tela atual de **Sessões/Pacotes** está visualmente melhor organizada do que Pacientes.

Então, a tarefa aqui não é redesenhar Sessões/Pacotes.

A tarefa é:

## usar Sessões/Pacotes como referência visual e estrutural para reorganizar Pacientes.

---

# 13. OBJETIVO FINAL

Quero que o resultado seja este:

### Pacientes

vira a tela principal para visualizar pacientes, com uma organização clara, visual e parecida com o layout atual de Sessões/Pacotes.

### Sessões/Pacotes

deixa de ser um módulo separado depois que tudo importante estiver acessível em Pacientes.

---

# 14. RESUMINDO A ALTERAÇÃO

Fazer estas mudanças:

1. Reorganizar a tela **Pacientes**.
2. Trocar o formato atual de tabela simples por cards/blocos no estilo de **Sessões/Pacotes**.
3. Reaproveitar a estrutura visual de Sessões/Pacotes:

   * nome;
   * sessões realizadas;
   * faltas;
   * prontuário;
   * ver perfil;
   * linha organizada com data, hora, categoria, pacote, status, pgto e ações.
4. Manter busca e botão **Novo Paciente**.
5. Manter acesso à ficha completa do paciente.
6. Só depois disso retirar **Sessões/Pacotes** da sidebar, desde que não se perca nenhuma função.

---

# 15. AO FINAL

Quando concluir, me diga apenas:

1. o que foi alterado em Pacientes;
2. se Pacientes já incorporou completamente a função de Sessões/Pacotes ou se ainda falta algo;
3. se Sessões/Pacotes já pode sair da sidebar com segurança;
4. se houve alguma alteração no banco;
5. quais pontos eu devo testar nessa parte.

Não mudar o visual geral do app.
Não transformar isso em redesign.
Apenas reorganizar Pacientes para ele ficar com a clareza e a boa leitura que Sessões/Pacotes já tem hoje.
