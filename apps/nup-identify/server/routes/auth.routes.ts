import express, { type Router, type Request, type Response } from "express";
import { eq, and, gt } from "drizzle-orm";
import { db } from "../db";
import { users, refreshTokens, authEvents, loginSchema, registerSchema, verifyEmailSchema, emailVerificationTokens } from "../../shared/schema";
import { hashPassword, comparePassword, validatePasswordStrength } from "../auth/password";
import { generateAccessToken, generateRefreshToken, verifyToken } from "../auth/jwt";
import { requireAuth } from "../middleware/auth";
import { config } from "../config";
import { nanoid } from "nanoid";
import { emailService } from "../services/email.service";

const router: Router = express.Router();

/**
 * POST /api/auth/register
 * Registro de novo usuário (email + senha)
 */
router.post("/register", async (req: Request, res: Response) => {
  try {
    if (!config.enableRegistration) {
      return res.status(403).json({
        error: "Registro desativado",
        message: "Registro de novos usuários está desativado",
      });
    }

    const body = registerSchema.parse(req.body);
    
    // Validar força da senha
    const passwordValidation = validatePasswordStrength(body.password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: "Senha fraca",
        errors: passwordValidation.errors,
      });
    }
    
    // Verificar se email já existe
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, body.email.toLowerCase()),
    });
    
    if (existingUser) {
      return res.status(409).json({
        error: "Email já cadastrado",
        message: "Já existe uma conta com este email",
      });
    }
    
    // Criar usuário
    const passwordHash = await hashPassword(body.password);
    
    const [newUser] = await db.insert(users).values({
      email: body.email.toLowerCase(),
      name: body.name,
      password: passwordHash,
      emailVerified: false,
    }).returning();
    
    // Registrar evento de autenticação
    await db.insert(authEvents).values({
      userId: newUser.id,
      eventType: "register",
      authMethod: "password",
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      success: true,
    });
    
    // Gerar token de verificação de email
    const verificationToken = nanoid(32);
    const expiresAt = new Date(Date.now() + config.emailVerificationTokenExpiresIn);
    
    await db.insert(emailVerificationTokens).values({
      userId: newUser.id,
      token: verificationToken,
      expiresAt,
    });
    
    // Enviar email de verificação (não bloquear registro se falhar)
    if (emailService) {
      try {
        const verificationLink = `${config.appUrl}/verify-email?token=${verificationToken}`;
        await emailService.sendVerification(newUser.email, {
          username: newUser.name,
          verificationLink,
          appName: "NuP Identity",
        });
      } catch (emailError) {
        console.error("Erro ao enviar email de verificação:", emailError);
      }
    }
    
    // Retornar sucesso SEM autenticar usuário
    // Usuário precisa verificar email antes de fazer login
    const { password: _, ...userWithoutPassword } = newUser;
    
    res.status(201).json({
      user: userWithoutPassword,
      message: "Usuário criado com sucesso! Verifique seu email para ativar sua conta.",
      emailSent: !!emailService,
    });
  } catch (error: any) {
    console.error("Erro no registro:", error);
    
    if (error.name === "ZodError") {
      return res.status(400).json({
        error: "Dados inválidos",
        details: error.errors,
      });
    }
    
    res.status(500).json({
      error: "Erro no servidor",
      message: "Erro ao registrar usuário",
    });
  }
});

/**
 * POST /api/auth/login
 * Login com email + senha
 */
router.post("/login", async (req: Request, res: Response) => {
  try {
    const body = loginSchema.parse(req.body);
    
    // Buscar usuário usando Drizzle ORM
    const emailLower = body.email.toLowerCase();
    
    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, emailLower),
    });
    
    if (!user || !user.password) {
      // Log failed attempt
      await db.insert(authEvents).values({
        id: nanoid(),
        eventType: "login_failed",
        authMethod: "password",
        ipAddress: req.ip || "",
        userAgent: req.headers["user-agent"] || "",
        success: false,
        metadata: JSON.stringify({ email: body.email }),
      });
      
      return res.status(401).json({
        error: "Credenciais inválidas",
        message: "Email ou senha incorretos",
      });
    }
    
    // Verificar senha
    const validPassword = await comparePassword(body.password, user.password);
    
    if (!validPassword) {
      await db.insert(authEvents).values({
        id: nanoid(),
        userId: user.id,
        eventType: "login_failed",
        authMethod: "password",
        ipAddress: req.ip || "",
        userAgent: req.headers["user-agent"] || "",
        success: false,
      });
      
      return res.status(401).json({
        error: "Credenciais inválidas",
        message: "Email ou senha incorretos",
      });
    }
    
    // Verificar se email foi verificado
    if (config.requireEmailVerification && !user.emailVerified) {
      return res.status(403).json({
        error: "Email não verificado",
        message: "Por favor, verifique seu email antes de fazer login",
      });
    }
    
    // Verificar se usuário está ativo (verifica apenas status, campo text confiável)
    if (user.status !== 'active') {
      return res.status(403).json({
        error: "Conta desativada",
        message: "Sua conta foi desativada. Entre em contato com o suporte",
      });
    }
    
    // Registrar login bem-sucedido
    await db.insert(authEvents).values({
      id: nanoid(),
      userId: user.id,
      eventType: "login",
      authMethod: "password",
      ipAddress: req.ip || "",
      userAgent: req.headers["user-agent"] || "",
      success: true,
    });
    
    // Gerar tokens
    const accessToken = generateAccessToken({ id: user.id, email: user.email, name: user.name });
    const refreshToken = generateRefreshToken({ id: user.id, email: user.email, name: user.name });
    
    // Salvar refresh token
    await db.insert(refreshTokens).values({
      id: nanoid(),
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias
    });
    
    // Retornar usuário e tokens (SEM senha)
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    });
  } catch (error: any) {
    console.error("Erro no login:", error);
    
    if (error.name === "ZodError") {
      return res.status(400).json({
        error: "Dados inválidos",
        details: error.errors,
      });
    }
    
    res.status(500).json({
      error: "Erro no servidor",
      message: "Erro ao fazer login",
    });
  }
});

/**
 * POST /api/auth/refresh
 * Renovar access token usando refresh token
 */
router.post("/refresh", async (req: Request, res: Response) => {
  try {
    const { refreshToken: token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        error: "Token não fornecido",
        message: "Refresh token é obrigatório",
      });
    }
    
    // Verificar token (refresh token usa secret diferente)
    const payload = verifyToken(token, true);
    
    // Buscar token no banco
    const storedToken = await db.query.refreshTokens.findFirst({
      where: eq(refreshTokens.token, token),
    });
    
    if (!storedToken) {
      return res.status(401).json({
        error: "Token inválido",
        message: "Refresh token não encontrado",
      });
    }
    
    // Verificar expiração
    if (new Date() > storedToken.expiresAt) {
      // Deletar token expirado
      await db.delete(refreshTokens).where(eq(refreshTokens.token, token));
      
      return res.status(401).json({
        error: "Token expirado",
        message: "Refresh token expirado. Faça login novamente",
      });
    }
    
    // Buscar usuário
    const user = await db.query.users.findFirst({
      where: eq(users.id, payload.userId),
    });
    
    if (!user || user.status !== 'active') {
      return res.status(401).json({
        error: "Usuário inválido",
        message: "Usuário não encontrado ou desativado",
      });
    }
    
    // Gerar novo access token
    const newAccessToken = generateAccessToken(user);
    
    res.json({
      accessToken: newAccessToken,
    });
  } catch (error: any) {
    console.error("Erro ao renovar token:", error);
    res.status(401).json({
      error: "Erro ao renovar token",
      message: error.message || "Token inválido",
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout (invalida refresh token)
 */
router.post("/logout", requireAuth, async (req: Request, res: Response) => {
  try {
    const { refreshToken: token } = req.body;
    
    if (token) {
      // Deletar refresh token
      await db.delete(refreshTokens).where(eq(refreshTokens.token, token));
    }
    
    // Registrar logout
    await db.insert(authEvents).values({
      userId: req.user!.userId,
      eventType: "logout",
      authMethod: "password",
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      success: true,
    });
    
    res.json({ message: "Logout realizado com sucesso" });
  } catch (error) {
    console.error("Erro no logout:", error);
    res.status(500).json({
      error: "Erro no logout",
      message: "Erro ao fazer logout",
    });
  }
});

/**
 * GET /api/auth/me
 * Retorna usuário autenticado atual
 */
router.get("/me", requireAuth, async (req: Request, res: Response) => {
  try {
    // Buscar usuário usando Drizzle ORM
    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, req.user!.userId),
    });
    
    if (!user) {
      return res.status(404).json({
        error: "Usuário não encontrado",
      });
    }
    
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error("Erro ao buscar usuário:", error);
    res.status(500).json({
      error: "Erro ao buscar usuário",
    });
  }
});

/**
 * POST /api/auth/verify-email
 * Verificar email com token
 */
router.post("/verify-email", async (req: Request, res: Response) => {
  try {
    const body = verifyEmailSchema.parse(req.body);
    
    // Buscar token válido
    const tokenRecord = await db.query.emailVerificationTokens.findFirst({
      where: and(
        eq(emailVerificationTokens.token, body.token),
        gt(emailVerificationTokens.expiresAt, new Date())
      ),
    });
    
    if (!tokenRecord) {
      return res.status(400).json({
        error: "Token inválido ou expirado",
        message: "O token de verificação é inválido ou já expirou. Por favor, solicite um novo email de verificação.",
      });
    }
    
    // Marcar email como verificado
    await db.update(users)
      .set({ emailVerified: true })
      .where(eq(users.id, tokenRecord.userId));
    
    // Deletar token usado
    await db.delete(emailVerificationTokens)
      .where(eq(emailVerificationTokens.token, body.token));
    
    // Registrar evento
    await db.insert(authEvents).values({
      userId: tokenRecord.userId,
      eventType: "email_verified",
      authMethod: "email_verification",
      success: true,
    });
    
    res.json({
      message: "Email verificado com sucesso! Você já pode fazer login.",
      verified: true,
    });
  } catch (error: any) {
    console.error("Erro ao verificar email:", error);
    
    if (error.name === "ZodError") {
      return res.status(400).json({
        error: "Dados inválidos",
        details: error.errors,
      });
    }
    
    res.status(500).json({
      error: "Erro no servidor",
      message: "Erro ao verificar email",
    });
  }
});

/**
 * POST /api/auth/resend-verification
 * Reenviar email de verificação
 */
router.post("/resend-verification", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        error: "Email obrigatório",
        message: "Por favor, forneça um email",
      });
    }
    
    // Buscar usuário
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });
    
    if (!user) {
      // Não revelar se email existe ou não (segurança)
      return res.json({
        message: "Se o email existir, um novo link de verificação será enviado.",
      });
    }
    
    // Se já verificado, retornar sucesso
    if (user.emailVerified) {
      return res.json({
        message: "Email já verificado. Você pode fazer login.",
        verified: true,
      });
    }
    
    // Deletar tokens antigos do usuário
    await db.delete(emailVerificationTokens)
      .where(eq(emailVerificationTokens.userId, user.id));
    
    // Gerar novo token
    const verificationToken = nanoid(32);
    const expiresAt = new Date(Date.now() + config.emailVerificationTokenExpiresIn);
    
    await db.insert(emailVerificationTokens).values({
      userId: user.id,
      token: verificationToken,
      expiresAt,
    });
    
    // Enviar email
    if (emailService) {
      try {
        const verificationLink = `${config.appUrl}/verify-email?token=${verificationToken}`;
        await emailService.sendVerification(user.email, {
          username: user.name,
          verificationLink,
          appName: "NuP Identity",
        });
      } catch (emailError) {
        console.error("Erro ao enviar email de verificação:", emailError);
      }
    }
    
    res.json({
      message: "Email de verificação reenviado com sucesso!",
      emailSent: !!emailService,
    });
  } catch (error: any) {
    console.error("Erro ao reenviar verificação:", error);
    
    res.status(500).json({
      error: "Erro no servidor",
      message: "Erro ao reenviar email de verificação",
    });
  }
});

export default router;
