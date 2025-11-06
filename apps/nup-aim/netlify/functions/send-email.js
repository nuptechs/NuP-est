const sgMail = require('@sendgrid/mail');

exports.handler = async (event, context) => {
  // Configurar CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { to, subject, html, text } = JSON.parse(event.body);

    // Configurar SendGrid
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      throw new Error('SendGrid API key not configured');
    }

    sgMail.setApiKey(apiKey);

    // Usar um email verificado como remetente
    // IMPORTANTE: Este email deve ser verificado no SendGrid
    const verifiedSenderEmail = process.env.VERIFIED_SENDER_EMAIL || 'seu-email@gmail.com';

    const msg = {
      to: to,
      from: {
        email: verifiedSenderEmail,
        name: 'NuP_AIM Sistema'
      },
      subject: subject,
      text: text,
      html: html,
    };

    console.log('📧 Enviando email via SendGrid...');
    console.log(`Para: ${to}`);
    console.log(`De: ${verifiedSenderEmail}`);
    console.log(`Assunto: ${subject}`);

    await sgMail.send(msg);

    console.log('✅ Email enviado com sucesso!');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Email enviado com sucesso',
        provider: 'SendGrid'
      }),
    };

  } catch (error) {
    console.error('❌ Erro ao enviar email:', error);

    let errorMessage = 'Erro no envio do email';
    if (error.response && error.response.body && error.response.body.errors) {
      errorMessage = error.response.body.errors[0].message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: errorMessage
      }),
    };
  }
};