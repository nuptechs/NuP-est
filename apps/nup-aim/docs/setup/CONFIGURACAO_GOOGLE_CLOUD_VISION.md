# 🔍 Configuração do Google Cloud Vision API

Este guia explica como configurar o Google Cloud Vision API para o sistema NuP_AIM.

## 🚀 Visão Geral

O Google Cloud Vision API é usado para extrair automaticamente campos de formulários a partir de imagens. Esta funcionalidade permite:

- Reconhecimento de texto em imagens (OCR)
- Identificação automática de campos de formulário
- Classificação de tipos de campo (texto, número, data, etc.)
- Análise de pontos de função baseada nos campos detectados

## 📋 Passo a Passo para Configuração

### 1. Criar Conta e Projeto no Google Cloud

1. Acesse [console.cloud.google.com](https://console.cloud.google.com/)
2. Crie uma conta se ainda não tiver uma
3. Crie um novo projeto:
   - Clique no seletor de projetos no topo da página
   - Clique em "Novo Projeto"
   - Nome: `nup-aim-vision` (ou outro nome de sua escolha)
   - Clique em "Criar"

### 2. Ativar a API do Cloud Vision

1. No menu lateral, vá para "APIs e Serviços" > "Biblioteca"
2. Pesquise por "Cloud Vision API"
3. Clique no resultado "Cloud Vision API"
4. Clique em "Ativar"

### 3. Criar Credenciais de Serviço

1. No menu lateral, vá para "IAM e Admin" > "Contas de serviço"
2. Clique em "Criar Conta de Serviço"
3. Preencha os detalhes:
   - Nome: `nup-aim-vision-service`
   - ID: `nup-aim-vision-service`
   - Descrição: `Conta de serviço para NuP_AIM Vision API`
4. Clique em "Criar e Continuar"
5. Adicione o papel "Cloud Vision API User" (Usuário da API Cloud Vision)
6. Clique em "Continuar" e depois em "Concluído"

### 4. Criar Chave JSON

1. Na lista de contas de serviço, encontre a conta que acabou de criar
2. Clique nos três pontos na coluna "Ações" e selecione "Gerenciar chaves"
3. Clique em "Adicionar Chave" > "Criar nova chave"
4. Selecione "JSON" e clique em "Criar"
5. O arquivo JSON será baixado automaticamente para o seu computador
6. **IMPORTANTE**: Guarde este arquivo com segurança! Ele contém credenciais sensíveis.

### 5. Configurar Variáveis de Ambiente no Netlify

1. Acesse o dashboard do Netlify
2. Vá para o seu site > "Site settings" > "Environment variables"
3. Adicione uma nova variável:
   - Chave: `GOOGLE_APPLICATION_CREDENTIALS_JSON`
   - Valor: *Todo o conteúdo do arquivo JSON* (copie e cole o conteúdo completo)

Exemplo de formato:
```json
{
  "type": "service_account",
  "project_id": "seu-projeto-id",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIE... (chave longa) ...Q==\n-----END PRIVATE KEY-----\n",
  "client_email": "nup-aim-vision-service@seu-projeto-id.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/nup-aim-vision-service%40seu-projeto-id.iam.gserviceaccount.com"
}
```

### 6. Redeploy no Netlify

1. Vá para "Deploys" no dashboard do Netlify
2. Clique em "Trigger deploy" > "Deploy site"
3. Aguarde o deploy terminar

## 🧪 Testando a Configuração

1. Acesse seu site no Netlify
2. Faça login no NuP_AIM
3. Clique no botão "Extrair Campos de Imagem" no cabeçalho
4. Faça upload de uma imagem de formulário ou tela de sistema
5. Verifique se os campos são extraídos corretamente

### Logs de Erro

Se a extração falhar, verifique os logs da função Netlify:

1. No dashboard do Netlify, vá para "Functions"
2. Encontre a função `vision-ocr`
3. Clique para ver os logs
4. Procure por mensagens de erro relacionadas à autenticação

## 🔍 Solução de Problemas

### Erro: "Google Cloud credentials not configured"

**Causa**: A variável de ambiente `GOOGLE_APPLICATION_CREDENTIALS_JSON` não está configurada corretamente.

**Solução**:
1. Verifique se o conteúdo completo do arquivo JSON foi copiado
2. Certifique-se de que não há espaços ou quebras de linha extras
3. Redeploy o site após corrigir

### Erro: "Permission denied"

**Causa**: A conta de serviço não tem permissões suficientes.

**Solução**:
1. Verifique se a conta de serviço tem o papel "Cloud Vision API User"
2. Verifique se a API está ativada no projeto
3. Verifique se o projeto tem faturamento ativado (necessário para usar a API)

### Erro: "Quota exceeded"

**Causa**: Você excedeu o limite gratuito da API.

**Solução**:
1. Verifique seu uso atual no Console do Google Cloud
2. Considere ativar o faturamento para aumentar a cota
3. Otimize o uso reduzindo o tamanho das imagens antes do envio

## 💰 Custos e Limites

- A API Cloud Vision oferece **1.000 unidades gratuitas por mês**
- Cada recurso de detecção (OCR, detecção de documentos) consome unidades
- Após exceder o limite gratuito, há custos por uso adicional
- Consulte a [página de preços](https://cloud.google.com/vision/pricing) para detalhes atualizados

## 🔒 Segurança

- **NUNCA** compartilhe ou cometa o arquivo de credenciais JSON em repositórios públicos
- Use sempre variáveis de ambiente para armazenar credenciais
- Considere configurar restrições de API para limitar o uso a domínios específicos
- Revogue e recrie as chaves periodicamente para maior segurança

## 📚 Recursos Adicionais

- [Documentação do Google Cloud Vision](https://cloud.google.com/vision/docs)
- [Guia de início rápido](https://cloud.google.com/vision/docs/setup)
- [Exemplos de código](https://cloud.google.com/vision/docs/samples)
- [Melhores práticas de segurança](https://cloud.google.com/security/best-practices)