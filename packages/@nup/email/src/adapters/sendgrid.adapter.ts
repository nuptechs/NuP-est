import { EmailAdapter, EmailPayload, EmailResult } from '../types';

export interface SendGridConfig {
  apiKey: string;
  defaultFrom?: string;
}

export class SendGridAdapter implements EmailAdapter {
  private apiKey: string;
  private defaultFrom?: string;
  private readonly apiUrl = 'https://api.sendgrid.com/v3/mail/send';

  constructor(config: SendGridConfig) {
    this.apiKey = config.apiKey;
    this.defaultFrom = config.defaultFrom;

    if (!this.validateConfig()) {
      throw new Error('SendGrid API key is required');
    }
  }

  validateConfig(): boolean {
    return !!this.apiKey && this.apiKey.trim().length > 0;
  }

  getProviderName(): string {
    return 'SendGrid';
  }

  async send(payload: EmailPayload): Promise<EmailResult> {
    try {
      const from = payload.from || this.defaultFrom;
      
      if (!from) {
        throw new Error('From email is required. Set it in payload or config.');
      }

      const personalizations = this.buildPersonalizations(payload);
      
      const sendGridPayload = {
        personalizations,
        from: { email: from },
        subject: payload.subject,
        content: [
          {
            type: 'text/plain',
            value: payload.text
          },
          {
            type: 'text/html',
            value: payload.html
          }
        ],
        ...(payload.replyTo && { reply_to: { email: payload.replyTo } })
      };

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sendGridPayload)
      });

      if (response.ok || response.status === 202) {
        const messageId = response.headers.get('x-message-id');
        
        return {
          success: true,
          messageId: messageId || undefined,
          message: 'Email sent successfully',
          provider: this.getProviderName(),
          timestamp: new Date(),
          statusCode: response.status
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = this.extractErrorMessage(errorData);
        
        console.error('[SendGrid] Error response:', {
          status: response.status,
          data: errorData
        });
        
        return {
          success: false,
          message: `SendGrid error: ${errorMessage}`,
          provider: this.getProviderName(),
          timestamp: new Date(),
          statusCode: response.status
        };
      }
    } catch (error) {
      console.error('[SendGrid] Send error:', error);
      
      return {
        success: false,
        message: `Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`,
        provider: this.getProviderName(),
        timestamp: new Date()
      };
    }
  }

  private buildPersonalizations(payload: EmailPayload) {
    const to = Array.isArray(payload.to)
      ? payload.to.map(email => ({ email }))
      : [{ email: payload.to }];

    const personalization: any = { to };

    if (payload.cc && payload.cc.length > 0) {
      personalization.cc = payload.cc.map(email => ({ email }));
    }

    if (payload.bcc && payload.bcc.length > 0) {
      personalization.bcc = payload.bcc.map(email => ({ email }));
    }

    return [personalization];
  }

  private extractErrorMessage(errorData: any): string {
    if (errorData.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
      return errorData.errors[0].message || 'Unknown SendGrid error';
    }
    return errorData.message || 'Unknown SendGrid error';
  }
}
