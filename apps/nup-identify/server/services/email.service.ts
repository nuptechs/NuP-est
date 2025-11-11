import { EmailService, SendGridAdapter } from '@nup/email';
import { config } from '../config';

function createEmailService(): EmailService | null {
  if (!config.sendgridApiKey) {
    console.warn('⚠️ SENDGRID_API_KEY not configured. Email functionality will be disabled.');
    return null;
  }

  try {
    const adapter = new SendGridAdapter(config.sendgridApiKey);
    
    return new EmailService({
      adapter,
      defaultFrom: config.emailFrom,
      retryAttempts: 3,
      retryDelay: 1000,
    });
  } catch (error) {
    console.error('Failed to initialize email service:', error);
    return null;
  }
}

export const emailService = createEmailService();

export function requireEmailService(): EmailService {
  if (!emailService) {
    throw new Error('Email service is not configured. Please set SENDGRID_API_KEY environment variable.');
  }
  return emailService;
}
