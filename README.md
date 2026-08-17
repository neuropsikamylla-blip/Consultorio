# NeuroPsi Consultório

Sistema de gestão para consultório de neuropsicologia.

## Stack

- Frontend: HTML/CSS/JS vanilla (single file `index.html`)
- Backend: [Supabase](https://supabase.com) (PostgreSQL + Auth + Storage)

## Funcionalidades

- Cadastro e gestão de pacientes
- Pacotes e sessões (psicoterapia, reabilitação, avaliação)
- Agenda com calendário mensal
- Controle financeiro (receita, pendências, histórico por mês)
- Boletos a pagar com alertas de vencimento
- Notas importantes com auto-save
- Anexos de documentos por paciente
- Anamnese neuropsicológica (27 seções, 3 faixas etárias, export PDF)
- Backup/restauração de dados

## Desenvolvimento

Abra `index.html` diretamente no navegador ou sirva com qualquer servidor HTTP estático.

Não há build, bundler ou dependências de instalação.

## Documentação

- [ARCHITECTURE.md](./ARCHITECTURE.md) — arquitetura, modelo de dados e decisões técnicas
- [CLAUDE.md](./CLAUDE.md) — guia para desenvolvimento assistido por IA
