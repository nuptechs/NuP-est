# NuP_AIM - Sistema de Análise de Impacto

Sistema completo para criação e gerenciamento de análises de impacto com autenticação, permissões e envio de emails.

## 🚀 Funcionalidades

- ✅ **Autenticação Completa**: Login, registro e verificação de email
- ✅ **Sistema de Permissões**: Controle granular de acesso por perfis
- ✅ **Gerenciamento de Usuários**: CRUD completo com verificação de email
- ✅ **Análises de Impacto**: Criação, edição e exportação para Word
- ✅ **Importação com IA**: Extração automática de dados de documentos
- ✅ **Email Real**: Integração com SendGrid via Netlify Functions
- ✅ **Extração de Campos**: Integração com Google Cloud Vision API

## 📧 Sistema de Email

### Configuração para Produção

1. **Criar conta no SendGrid**:
   - Acesse [SendGrid](https://sendgrid.com/)
   - Crie uma conta gratuita (100 emails/dia)
   - Gere uma API Key

2. **Configurar Variáveis de Ambiente**:
   ```bash
   # No Netlify Dashboard > Environment variables
   SENDGRID_API_KEY=your-sendgrid-api-key
   VERIFIED_SENDER_EMAIL=your-verified-email@gmail.com
   ```

## 🔍 Extração de Campos com Google Cloud Vision

### Configuração para Produção

1. **Criar conta no Google Cloud**:
   - Acesse [Google Cloud Console](https://console.cloud.google.com/)
   - Crie um novo projeto
   - Ative a API do Cloud Vision

2. **Criar Credenciais de Serviço**:
   - Vá para "IAM & Admin" > "Service Accounts"
   - Crie uma nova conta de serviço
   - Atribua o papel "Cloud Vision API User"
   - Crie uma chave JSON para esta conta

3. **Configurar Variáveis de Ambiente**:
   ```bash
   # No Netlify Dashboard > Environment variables
   GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}
   ```

## 🛠️ Instalação e Desenvolvimento

```bash
# Instalar dependências
npm install

# Executar em desenvolvimento
npm run dev

# Build para produção
npm run build
```

## 🌐 Deploy

### Netlify (Recomendado)
```bash
# Build
npm run build

# Deploy manual ou conectar repositório GitHub
```

### Configuração de Produção
1. Configurar variáveis de ambiente no Netlify
2. Fazer deploy das Edge Functions no Supabase
3. Atualizar URLs de API no código
4. Testar envio de emails e extração de campos

## 📝 Licença

Este projeto é privado e proprietário.

## 🆘 Suporte

Para suporte técnico ou dúvidas sobre configuração:
- Verifique os logs do console (F12)
- Consulte a documentação do Supabase, Google Cloud Vision e SendGrid
- Teste primeiro em modo demonstração