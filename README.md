# Assistente Jurídico

Triagem inicial de atendimentos jurídicos via WhatsApp. O sistema coleta consentimento, dados básicos do caso e documentos, sem prestar aconselhamento jurídico automático. Ao final da confirmação, cria um caso para revisão humana.

## Fluxo implementado

1. A Meta entrega uma mensagem em `POST /api/whatsapp`.
2. A assinatura `x-hub-signature-256` é validada em produção e cada mensagem é deduplicada pelo ID do WhatsApp.
3. O cliente aceita o aviso de privacidade, responde à triagem e pode enviar PDF ou imagem.
4. Conversa, mensagens, documentos e análise preliminar ficam armazenados no SQLite.
5. Quando confirma os dados, o sistema cria um `Matter` aberto para o advogado.

Mensagens repetidas pela Meta não avançam a conversa duas vezes. Arquivos ficam em `data/media` e são limitados a 10 MB por padrão.

## Desenvolvimento local

1. Copie `.env.example` para `.env` e preencha `LAWYER_PASSWORD`.
2. Gere/aplique o banco:

   ```bash
   npx prisma migrate dev
   ```

3. Rode a aplicação:

   ```bash
   npm run dev
   ```

4. Para testar a verificação do webhook:

   ```text
   GET http://localhost:3000/api/whatsapp?hub.mode=subscribe&hub.verify_token=change-me-verify-token&hub.challenge=teste
   ```

## Perfil PostgreSQL

O desenvolvimento local continua usando SQLite. Para testar com PostgreSQL, inicie o serviço local do Compose e configure `DATABASE_PROVIDER=postgres` e `DATABASE_URL=postgresql://assistente:assistente@localhost:5432/assistente?schema=public` no `.env`:

```bash
docker compose up -d db
npm run db:migrate:postgres
npm run dev
```

O cliente PostgreSQL é gerado junto com o cliente SQLite durante a instalação e antes do build. O PostgreSQL do Compose está limitado à máquina local e usa credenciais apenas para desenvolvimento; produção exige credenciais próprias e conexão TLS conforme o provedor escolhido. As bases SQLite e PostgreSQL têm históricos de migração separados e não são sincronizadas automaticamente.

Os arquivos ficam fora de `public/` em `MEDIA_STORAGE_DIR` e são baixados pelo painel somente após autenticação. Em produção, monte nesse caminho um disco persistente privado. Instâncias serverless ou com múltiplas réplicas precisam de armazenamento de objetos privado compatível com S3; esse provedor ainda precisa ser definido antes da implantação.

## Configuração do WhatsApp Cloud API

Em produção, defina `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` e `WHATSAPP_APP_SECRET`. Cadastre a URL pública HTTPS abaixo no painel da Meta:

```text
https://seu-dominio.com/api/whatsapp
```

`WHATSAPP_APP_SECRET` é obrigatório em produção: sem ele, o webhook rejeita requisições não assinadas.

## Painel do advogado

Acesse `/lawyer` e entre com a senha definida em `LAWYER_PASSWORD`. O painel lista casos por status e urgência, mostra a triagem, histórico e documentos recebidos, e permite salvar notas internas e atualizar o status. A sessão é armazenada em cookie HTTP-only, assinada e expira em 12 horas.

Configure uma senha forte e exclusiva no ambiente antes de expor o painel. O painel não aceita acesso enquanto `LAWYER_PASSWORD` estiver vazio.

## Integração com Claude Max

O Claude Max permite conectar servidores MCP remotos. A próxima etapa é expor um conector MCP com OAuth para que o advogado consulte casos abertos, mensagens, documentos e pendências dentro do Claude.ai.

Essa configuração precisa de um domínio HTTPS público e de autenticação OAuth; ela não deve usar senha, cookie ou URL secreta do Claude. O Claude.ai e a API da Anthropic são produtos distintos, portanto não é possível inserir atualizações automaticamente em conversas já existentes do advogado.

Enquanto o conector MCP é preparado, os dados que ele consumirá já são persistidos nas tabelas `Matter`, `Conversation`, `Message` e `Document`.
