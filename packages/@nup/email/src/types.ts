export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  from?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  message: string;
  provider?: string;
  timestamp?: Date;
  statusCode?: number;
}

export interface EmailAdapter {
  send(payload: EmailPayload): Promise<EmailResult>;
  validateConfig(): boolean;
  getProviderName(): string;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface VerificationEmailData {
  username: string;
  verificationLink: string;
  appName?: string;
  expiresIn?: string;
}

export interface PasswordResetEmailData {
  username: string;
  resetLink: string;
  appName?: string;
  expiresIn?: string;
}

export interface WelcomeEmailData {
  username: string;
  appName?: string;
  loginLink?: string;
}

export interface TransactionalEmailData {
  [key: string]: any;
}

export interface EmailServiceConfig {
  adapter: EmailAdapter;
  defaultFrom?: string;
  defaultReplyTo?: string;
  retryAttempts?: number;
  retryDelay?: number;
}
