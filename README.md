# Assistente Jurídico

Aplicação web para receber pedidos de atendimento jurídico pelo WhatsApp, organizar a triagem e permitir que o advogado acompanhe os casos em um painel privado. O sistema apoia o fluxo do escritório; não substitui a análise do advogado nem deve enviar aconselhamento jurídico automatizado ao cliente.

## O que o projeto faz

- Recebe e valida eventos do WhatsApp Cloud API em `POST /api/whatsapp`, incluindo a assinatura da Meta em produção e a deduplicação de mensagens.
- Solicita consentimento, coleta dados básicos do caso e aceita documentos PDF e imagens. O limite padrão de arquivo é 10 MB.
- Mantém conversas, dados de triagem, documentos, notas e casos no banco de dados. A análise de documentos usa OpenAI quando `OPENAI_API_KEY` está configurada e heurísticas locais como fallback.
- Oferece um painel do advogado em `/lawyer` para revisar os atendimentos, consultar documentos, atualizar o status, salvar notas internas e registrar andamentos em uma linha do tempo.
- Inclui ferramentas MCP locais para listar casos, consultar detalhes e registrar andamentos. O endpoint MCP ainda não está disponível para conexões remotas do Claude.

## Requisitos

- Node.js 20.19 ou superior e npm (requisito do Prisma ORM 7).
- Docker Desktop somente se quiser usar o perfil PostgreSQL local.
- Credenciais da Meta para testar o WhatsApp real. Sem elas, é possível iniciar a aplicação e testar o painel, mas o envio/recebimento real de mensagens não estará conectado.

## Instalação e execução local

No PowerShell, na pasta do projeto:

```powershell
Copy-Item .env.example .env
```

Edite `.env` e defina uma senha forte em `LAWYER_PASSWORD`. O arquivo `.env` contém segredos e dados locais; não o envie ao GitHub.

Instale as dependências, gere os clientes Prisma e aplique as migrações SQLite:

```powershell
npm install
npm run db:generate
npm run db:migrate:sqlite
```

Inicie a aplicação:

```powershell
npm run dev
```

Abra [http://127.0.0.1:3000](http://127.0.0.1:3000) e entre no painel em [http://127.0.0.1:3000/lawyer](http://127.0.0.1:3000/lawyer), usando a senha configurada em `LAWYER_PASSWORD`. O servidor de desenvolvimento escuta apenas na própria máquina.

O SQLite é o padrão local; os dados ficam em `prisma/dev.db`, e os arquivos recebidos ficam em `MEDIA_STORAGE_DIR` (por padrão, `data/media`). Esses dados podem conter informações pessoais e jurídicas.

## Configuração do WhatsApp

Preencha no `.env` as variáveis `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` e `WHATSAPP_APP_SECRET`. Configure no painel da Meta o webhook para:

```text
https://SEU_HOST/api/whatsapp
```

O host precisa ser público e usar HTTPS para receber eventos reais da Meta. `WHATSAPP_APP_SECRET` é obrigatório em produção para validar a assinatura das requisições. O token de verificação também deve ser substituído por um valor privado.

Sem credenciais de WhatsApp, ainda é possível confirmar que a rota de verificação responde localmente:

```text
http://127.0.0.1:3000/api/whatsapp?hub.mode=subscribe&hub.verify_token=change-me-verify-token&hub.challenge=teste
```

## IA para análise de documentos

`OPENAI_API_KEY` é opcional. Sem ela, a aplicação continua disponível, mas a leitura/análise automática de documentos usa apenas os recursos heurísticos disponíveis; a leitura de imagens depende da configuração do modelo. A revisão jurídica final continua sendo responsabilidade do advogado.

## Perfil PostgreSQL local

O desenvolvimento padrão usa SQLite. Para iniciar o PostgreSQL de desenvolvimento fornecido pelo Compose:

```powershell
docker compose up -d db
```

No `.env`, selecione `DATABASE_PROVIDER="postgres"` e configure `DATABASE_URL` com a conexão local, por exemplo:

```text
postgresql://assistente:assistente@localhost:5432/assistente?schema=public
```

Depois aplique as migrações e inicie a aplicação:

```powershell
npm run db:migrate:postgres
npm run dev
```

As credenciais do Compose são apenas para desenvolvimento. SQLite e PostgreSQL mantêm históricos de migração separados; os dados de um banco não são copiados automaticamente para o outro.

## MCP e Claude

O endpoint local `http://127.0.0.1:3000/api/mcp` oferece estas ferramentas:

- `list_cases`: lista um resumo dos casos.
- `get_case_details`: consulta a triagem, os andamentos, metadados de documentos e mensagens recentes. Não retorna arquivos nem caminhos locais.
- `add_case_update`: registra um andamento informado pelo advogado; a origem é marcada como `mcp`.

Para inspecionar as ferramentas durante o desenvolvimento, execute em outro terminal:

```powershell
npx @modelcontextprotocol/inspector http://127.0.0.1:3000/api/mcp
```

`add_case_update` grava dados no banco. A rota MCP só responde em `NODE_ENV=development` e o servidor local é limitado a `127.0.0.1`; não exponha um servidor de desenvolvimento na internet. O conector remoto do Claude.ai ainda não foi implementado. Antes de habilitá-lo, será necessário escolher hospedagem, publicar um endpoint HTTPS e integrar OAuth com permissões adequadas para leitura e gravação. Não use senha do Claude, cookies ou tokens compartilhados como substituto de OAuth.

## Verificações de desenvolvimento

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

O build também gera os clientes Prisma SQLite e PostgreSQL. Ainda falta uma suíte automatizada de integração para os fluxos de WhatsApp, MCP, autenticação e migrações.

## Antes de usar em produção

- Escolher domínio e hospedagem com HTTPS.
- Configurar OAuth para o conector remoto e definir permissões para cada ferramenta MCP.
- Configurar PostgreSQL gerenciado e armazenamento persistente privado para documentos; não use disco efêmero em hospedagem serverless.
- Guardar credenciais em um gerenciador de segredos, configurar backups, retenção e controles de acesso aos dados jurídicos.
- Colocar o painel atrás de um proxy confiável que substitua `X-Forwarded-For`; o limitador de login atual é em memória e precisa ser substituído por um serviço compartilhado antes de executar múltiplas instâncias.
- Ligar e validar o WhatsApp Cloud API com as credenciais reais da Meta.
- Revisar os avisos de rastreamento de filesystem emitidos pelo build e criar testes automatizados antes do lançamento.

O Claude Max aceita conectores MCP remotos; isso não significa que a conta Claude esteja conectada ao projeto. A documentação da Anthropic descreve o suporte a Streamable HTTP e OAuth em [conectores MCP remotos](https://support.anthropic.com/en/articles/11503834-building-custom-integrations-via-remote-mcp-servers).
