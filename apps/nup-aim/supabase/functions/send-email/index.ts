import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, subject, html, text }: EmailRequest = await req.json()

    // Get SendGrid API key from environment
    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')
    if (!SENDGRID_API_KEY) {
      throw new Error('SendGrid API key not configured')
    }

    // SendGrid API endpoint
    const sendGridUrl = 'https://api.sendgrid.com/v3/mail/send'

    // Email payload for SendGrid
    const emailPayload = {
      personalizations: [
        {
          to: [{ email: to }],
          subject: subject
        }
      ],
      from: {
        email: 'noreply@nup-aim.netlify.app',
        name: 'NuP_AIM Sistema'
      },
      content: [
        {
          type: 'text/html',
          value: html
        },
        ...(text ? [{
          type: 'text/plain',
          value: text
        }] : [])
      ]
    }

    console.log('📧 Enviando email via SendGrid...')
    console.log(`Para: ${to}`)
    console.log(`Assunto: ${subject}`)

    // Send email via SendGrid
    const response = await fetch(sendGridUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    })

    if (response.ok) {
      console.log('✅ Email enviado com sucesso via SendGrid')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Email enviado com sucesso',
          provider: 'SendGrid'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    } else {
      const errorText = await response.text()
      console.error('❌ Erro do SendGrid:', errorText)
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Falha no envio do email',
          error: errorText
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

  } catch (error) {
    console.error('💥 Erro crítico:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Erro interno do servidor',
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})