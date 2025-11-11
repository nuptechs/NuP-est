export const config = {
  // Server
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || "development",
  appUrl: process.env.APP_URL || `http://localhost:${process.env.PORT || 3001}`,
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || "nupidentity-secret-change-in-production",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "nupidentity-refresh-secret-change-in-production",
  jwtExpiresIn: "1h", // Access token expira em 1 hora
  refreshTokenExpiresIn: "7d", // Refresh token expira em 7 dias
  
  // Email
  sendgridApiKey: process.env.SENDGRID_API_KEY,
  emailFrom: process.env.EMAIL_FROM || "noreply@nuptechs.com",
  emailVerificationTokenExpiresIn: 24 * 60 * 60 * 1000, // 24 horas
  
  // Replit Auth (OAuth)
  replitClientId: process.env.REPLIT_CLIENT_ID,
  replitClientSecret: process.env.REPLIT_CLIENT_SECRET,
  replitCallbackUrl: process.env.REPLIT_CALLBACK_URL || `http://localhost:${process.env.PORT || 5000}/api/auth/callback/replit`,
  
  // WebAuthn (Passkeys)
  rpName: "NuPIdentity", // Relying Party Name
  rpID: process.env.RP_ID || "localhost", // Domain (ex: nuptechs.com)
  origin: process.env.ORIGIN || `http://localhost:${process.env.PORT || 5000}`,
  
  // Security
  sessionSecret: process.env.SESSION_SECRET || "nupidentity-session-secret-change-in-production",
  bcryptRounds: 10,
  
  // Features
  enableRegistration: process.env.ENABLE_REGISTRATION !== "false", // default true
  enableSocialLogin: process.env.ENABLE_SOCIAL_LOGIN !== "false", // default true
  enablePasskeys: process.env.ENABLE_PASSKEYS !== "false", // default true
  requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION !== "false", // default true
  
  // CORS
  corsOrigins: process.env.CORS_ORIGINS?.split(",") || ["http://localhost:5000"],
};
