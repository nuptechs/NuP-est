import {
  EmailServiceConfig,
  EmailPayload,
  EmailResult,
  VerificationEmailData,
  PasswordResetEmailData,
  WelcomeEmailData,
  TransactionalEmailData
} from './types';
import {
  generateVerificationEmail,
  generatePasswordResetEmail,
  generateWelcomeEmail
} from './templates';
import { retryWithBackoff, shouldRetryEmailError } from './utils/retry';

export class EmailService {
  private adapter;
  private defaultFrom?: string;
  private defaultReplyTo?: string;
  private retryAttempts: number;
  private retryDelay: number;

  constructor(config: EmailServiceConfig) {
    this.adapter = config.adapter;
    this.defaultFrom = config.defaultFrom;
    this.defaultReplyTo = config.defaultReplyTo;
    this.retryAttempts = config.retryAttempts ?? 3;
    this.retryDelay = config.retryDelay ?? 1000;

    if (!this.adapter.validateConfig()) {
      throw new Error(`Email adapter ${this.adapter.getProviderName()} is not properly configured`);
    }
  }

  async sendVerification(to: string, data: VerificationEmailData): Promise<EmailResult> {
    const template = generateVerificationEmail(data);
    
    return this.sendWithRetry({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
      from: this.defaultFrom,
      replyTo: this.defaultReplyTo
    });
  }

  async sendPasswordReset(to: string, data: PasswordResetEmailData): Promise<EmailResult> {
    const template = generatePasswordResetEmail(data);
    
    return this.sendWithRetry({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
      from: this.defaultFrom,
      replyTo: this.defaultReplyTo
    });
  }

  async sendWelcome(to: string, data: WelcomeEmailData): Promise<EmailResult> {
    const template = generateWelcomeEmail(data);
    
    return this.sendWithRetry({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
      from: this.defaultFrom,
      replyTo: this.defaultReplyTo
    });
  }

  async sendTransactional(payload: EmailPayload): Promise<EmailResult> {
    const fullPayload = {
      ...payload,
      from: payload.from || this.defaultFrom,
      replyTo: payload.replyTo || this.defaultReplyTo
    };

    return this.sendWithRetry(fullPayload);
  }

  private async sendWithRetry(payload: EmailPayload): Promise<EmailResult> {
    let lastResult: EmailResult | null = null;

    try {
      await retryWithBackoff(
        async () => {
          const result = await this.adapter.send(payload);
          lastResult = result;
          
          if (!result.success) {
            if (shouldRetryEmailError(result)) {
              throw new Error(`Retryable error: ${result.message}`);
            } else {
              return result;
            }
          }
          
          return result;
        },
        {
          maxAttempts: this.retryAttempts,
          delayMs: this.retryDelay,
          exponentialBackoff: true
        },
        (error) => {
          return error.message.includes('Retryable error');
        }
      );

      return lastResult!;
    } catch (error) {
      if (lastResult) {
        return lastResult;
      }

      return {
        success: false,
        message: `Failed to send email after ${this.retryAttempts} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`,
        provider: this.adapter.getProviderName(),
        timestamp: new Date()
      };
    }
  }

  getProviderName(): string {
    return this.adapter.getProviderName();
  }

  isConfigured(): boolean {
    return this.adapter.validateConfig();
  }
}
