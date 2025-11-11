import { User } from '../types/auth';
import { generateVerificationEmailHTML, generateVerificationEmailText } from './emailTemplates';

// Detectar ambiente
const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
const NETLIFY_FUNCTION_URL = isProduction 
  ? '/.netlify/functions/send-email'
  : 'http://localhost:8888/.netlify/functions/send-email';

interface EmailResponse {
  success: boolean;
  message: string;
  provider?: string;
}

const sendEmailViaNetlifyFunction = async (to: string, subject: string, html: string, text: string): Promise<EmailResponse> => {
  try {
    console.log('📤 Enviando email via Netlify Function + SendGrid...');
    console.log(`Para: ${to}`);
    console.log(`Assunto: ${subject}`);
    console.log(`URL da função: ${NETLIFY_FUNCTION_URL}`);

    const response = await fetch(NETLIFY_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        subject,
        html,
        text
      }),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      console.log('✅ Email enviado com sucesso via Netlify Function!');
      return {
        success: true,
        message: 'Email enviado com sucesso',
        provider: 'Netlify Function + SendGrid'
      };
    } else {
      console.error('❌ Erro da função Netlify:', result.message);
      return {
        success: false,
        message: result.message || 'Erro no envio do email'
      };
    }
  } catch (error) {
    console.error('💥 Erro de conexão com a função Netlify:', error);
    return {
      success: false,
      message: 'Erro de conexão com o serviço de email'
    };
  }
};

const simulateEmailSending = async (to: string, subject: string, html: string, text: string): Promise<EmailResponse> => {
  console.log('🚀 [MODO DESENVOLVIMENTO] Simulando envio de email...');
  console.log(`📧 Destinatário: ${to}`);
  console.log(`📋 Assunto: ${subject}`);
  
  // Simulate realistic network delay
  const delay = 1500 + Math.random() * 2000; // 1.5-3.5 seconds
  await new Promise(resolve => setTimeout(resolve, delay));
  
  // Simulate 98% success rate (very high for demo)
  const success = Math.random() > 0.02;
  
  if (success) {
    console.log('✅ [DEMO] EMAIL ENVIADO COM SUCESSO!');
    console.log('📨 Detalhes do envio:');
    console.log(`   Para: ${to}`);
    console.log(`   Assunto: ${subject}`);
    console.log(`   Status: Entregue (Simulado)`);
    console.log(`   Timestamp: ${new Date().toLocaleString('pt-BR')}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    return { 
      success: true, 
      message: 'Email enviado com sucesso (modo desenvolvimento)',
      provider: 'Demo Mode'
    };
  } else {
    const errorTypes = [
      'Servidor SMTP temporariamente indisponível',
      'Caixa de entrada do destinatário cheia',
      'Falha na conexão de rede',
      'Email rejeitado pelo servidor de destino'
    ];
    const error = errorTypes[Math.floor(Math.random() * errorTypes.length)];
    
    console.error('❌ [DEMO] FALHA NO ENVIO DO EMAIL');
    console.error(`📧 Para: ${to}`);
    console.error(`⚠️  Erro: ${error}`);
    console.error(`🕒 Timestamp: ${new Date().toLocaleString('pt-BR')}`);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    return { 
      success: false, 
      message: `Falha no envio: ${error} (modo desenvolvimento)`
    };
  }
};

export const sendVerificationEmail = async (user: User, verificationToken: string): Promise<EmailResponse> => {
  try {
    console.log(`🔄 Preparando email de verificação para: ${user.email}`);
    console.log(`🔧 Modo: ${isProduction ? 'PRODUÇÃO (Netlify Function)' : 'DESENVOLVIMENTO (Simulado)'}`);
    console.log(`🌐 Hostname: ${window.location.hostname}`);
    console.log(`📍 URL: ${window.location.href}`);
    
    // Create verification link
    const baseUrl = window.location.origin + window.location.pathname;
    const verificationLink = `${baseUrl}#/verify-email?token=${verificationToken}`;
    
    console.log(`🔗 Link de verificação: ${verificationLink}`);
    
    // Generate email content
    const subject = 'Confirme seu email - NuP_AIM';
    const html = generateVerificationEmailHTML(user.username, verificationLink);
    const text = generateVerificationEmailText(user.username, verificationLink);
    
    let result: EmailResponse;
    
    if (isProduction) {
      // Send real email via Netlify Function + SendGrid
      console.log('📤 Enviando email REAL via Netlify Function + SendGrid...');
      result = await sendEmailViaNetlifyFunction(user.email, subject, html, text);
    } else {
      // Use demo mode
      console.log('🎭 Usando modo desenvolvimento...');
      result = await simulateEmailSending(user.email, subject, html, text);
    }
    
    // Show user-friendly message
    if (result.success) {
      const successMessage = isProduction ? 
        `📧 EMAIL DE VERIFICAÇÃO ENVIADO!

Para: ${user.email}
Status: ✅ Entregue com sucesso via ${result.provider}

Verifique sua caixa de entrada (e pasta de spam) e clique no link de confirmação.

⏰ O link expira em 24 horas.` :
        `📧 EMAIL DE VERIFICAÇÃO ENVIADO! (MODO DESENVOLVIMENTO)

Para: ${user.email}
Status: ✅ Entregue com sucesso (simulado)

🔗 LINK DE VERIFICAÇÃO (Para demonstração):
${verificationLink}

⚠️ IMPORTANTE: Em produção, este link seria enviado apenas por email.
Para testar, você pode copiar o link acima ou verificar o console do navegador (F12).

⏰ O link expira em 24 horas.`;
      
      // Show alert with info
      setTimeout(() => {
        alert(successMessage);
      }, 100);
      
      return {
        success: true,
        message: `Email de verificação enviado para ${user.email}${isProduction ? ' via Netlify Function' : ' (modo desenvolvimento)'}`,
        provider: result.provider
      };
    } else {
      console.error('❌ Falha no envio:', result.message);
      
      // Show error alert
      setTimeout(() => {
        alert(`❌ ERRO NO ENVIO DO EMAIL

Para: ${user.email}
Erro: ${result.message}

${isProduction ? 
  'Verifique se a chave do SendGrid está configurada corretamente nas variáveis de ambiente do Netlify.' : 
  'Erro no modo de desenvolvimento.'
}`);
      }, 100);
      
      return {
        success: false,
        message: result.message || 'Erro desconhecido no envio do email'
      };
    }
  } catch (error) {
    console.error('💥 Erro crítico ao enviar email de verificação:', error);
    return {
      success: false,
      message: 'Erro interno do servidor. Tente novamente mais tarde.'
    };
  }
};

export const sendPasswordResetEmail = async (user: User, resetToken: string): Promise<EmailResponse> => {
  // Similar implementation for password reset emails
  // This would use a different template and endpoint
  return {
    success: false,
    message: 'Funcionalidade de reset de senha ainda não implementada'
  };
};

// Configuration check
export const isEmailServiceConfigured = (): boolean => {
  return isProduction;
};

export const getEmailServiceStatus = (): { configured: boolean; provider: string; mode: string } => {
  return {
    configured: isProduction,
    provider: isProduction ? 'Netlify Function + SendGrid' : 'Demo Mode',
    mode: isProduction ? 'production' : 'development'
  };
};