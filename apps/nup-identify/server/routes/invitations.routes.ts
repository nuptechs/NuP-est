import express, { type Router, type Request, type Response } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { pendingInvitations, users, organizations, teams, profiles, userTeams, userProfiles, insertPendingInvitationSchema } from "../../shared/schema";
import { requireAuth } from "../middleware/auth";
import { nanoid } from "nanoid";

const router: Router = express.Router();

/**
 * GET /api/invitations
 * Lista convites pendentes (filtro opcional por status, email, org)
 */
router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const { status, email, organizationId } = req.query;
    
    const invites = await db.query.pendingInvitations.findMany({
      where: and(
        status ? eq(pendingInvitations.status, status as string) : undefined,
        email ? eq(pendingInvitations.email, email as string) : undefined,
        organizationId ? eq(pendingInvitations.organizationId, organizationId as string) : undefined
      ),
      orderBy: (invitations, { desc }) => [desc(invitations.createdAt)],
    });
    
    return res.json(invites);
  } catch (error) {
    console.error("Erro ao listar convites:", error);
    return res.status(500).json({
      error: "Erro interno",
      message: "Erro ao listar convites",
    });
  }
});

/**
 * GET /api/invitations/:token
 * Busca convite por token (para validação/aceitação)
 */
router.get("/:token", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    
    const invite = await db.select({
      id: pendingInvitations.id,
      email: pendingInvitations.email,
      organizationId: pendingInvitations.organizationId,
      organizationName: organizations.name,
      teamId: pendingInvitations.teamId,
      teamName: teams.name,
      profileId: pendingInvitations.profileId,
      profileName: profiles.name,
      expiresAt: pendingInvitations.expiresAt,
      status: pendingInvitations.status,
    })
    .from(pendingInvitations)
    .leftJoin(organizations, eq(pendingInvitations.organizationId, organizations.id))
    .leftJoin(teams, eq(pendingInvitations.teamId, teams.id))
    .leftJoin(profiles, eq(pendingInvitations.profileId, profiles.id))
    .where(eq(pendingInvitations.token, token))
    .limit(1);
    
    if (!invite || invite.length === 0) {
      return res.status(404).json({
        error: "Convite não encontrado",
      });
    }
    
    const inviteData = invite[0];
    
    if (inviteData.status !== "pending") {
      return res.status(400).json({
        error: "Convite inválido",
        message: `Convite já foi ${inviteData.status === "accepted" ? "aceito" : "cancelado"}`,
      });
    }
    
    if (new Date() > new Date(inviteData.expiresAt!)) {
      await db.update(pendingInvitations)
        .set({ status: "expired" })
        .where(eq(pendingInvitations.token, token));
      
      return res.status(400).json({
        error: "Convite expirado",
        message: "Este convite já expirou",
      });
    }
    
    return res.json(inviteData);
  } catch (error) {
    console.error("Erro ao buscar convite:", error);
    return res.status(500).json({
      error: "Erro interno",
      message: "Erro ao buscar convite",
    });
  }
});

/**
 * POST /api/invitations
 * Cria novo convite
 */
router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const body = insertPendingInvitationSchema.parse(req.body);
    
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, body.email.toLowerCase()),
    });
    
    if (existingUser) {
      return res.status(409).json({
        error: "Usuário já existe",
        message: "Já existe um usuário com este email",
      });
    }
    
    const existingInvite = await db.query.pendingInvitations.findFirst({
      where: and(
        eq(pendingInvitations.email, body.email.toLowerCase()),
        eq(pendingInvitations.status, "pending")
      ),
    });
    
    if (existingInvite) {
      return res.status(409).json({
        error: "Convite pendente",
        message: "Já existe um convite pendente para este email",
      });
    }
    
    const token = nanoid(32);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    const [newInvite] = await db.insert(pendingInvitations).values({
      email: body.email.toLowerCase(),
      organizationId: body.organizationId,
      teamId: body.teamId,
      profileId: body.profileId,
      invitedBy: user.id,
      token,
      expiresAt,
      status: "pending",
    }).returning();
    
    return res.status(201).json({
      ...newInvite,
      inviteUrl: `${req.protocol}://${req.get("host")}/accept-invite/${token}`,
    });
  } catch (error: any) {
    console.error("Erro ao criar convite:", error);
    
    if (error.name === "ZodError") {
      return res.status(400).json({
        error: "Validação falhou",
        details: error.errors,
      });
    }
    
    return res.status(500).json({
      error: "Erro interno",
      message: "Erro ao criar convite",
    });
  }
});

/**
 * POST /api/invitations/:token/accept
 * Aceita um convite (cria usuário, associa org/team/perfil)
 */
router.post("/:token/accept", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { name, password } = req.body;
    
    if (!name || !password) {
      return res.status(400).json({
        error: "Dados obrigatórios",
        message: "Nome e senha são obrigatórios",
      });
    }
    
    const invite = await db.query.pendingInvitations.findFirst({
      where: eq(pendingInvitations.token, token),
    });
    
    if (!invite) {
      return res.status(404).json({
        error: "Convite não encontrado",
      });
    }
    
    if (invite.status !== "pending") {
      return res.status(400).json({
        error: "Convite inválido",
        message: `Convite já foi ${invite.status === "accepted" ? "aceito" : "cancelado"}`,
      });
    }
    
    if (new Date() > new Date(invite.expiresAt)) {
      await db.update(pendingInvitations)
        .set({ status: "expired" })
        .where(eq(pendingInvitations.id, invite.id));
      
      return res.status(400).json({
        error: "Convite expirado",
      });
    }
    
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, invite.email),
    });
    
    if (existingUser) {
      return res.status(409).json({
        error: "Usuário já existe",
      });
    }
    
    const { hashPassword } = await import("../auth/password");
    const passwordHash = await hashPassword(password);
    
    const [newUser] = await db.insert(users).values({
      email: invite.email,
      name,
      password: passwordHash,
      organizationId: invite.organizationId,
      status: "active",
      emailVerified: true,
    }).returning();
    
    if (invite.profileId) {
      await db.insert(userProfiles).values({
        userId: newUser.id,
        profileId: invite.profileId,
      });
    }
    
    if (invite.teamId) {
      await db.insert(userTeams).values({
        userId: newUser.id,
        teamId: invite.teamId,
        role: "member",
      });
    }
    
    await db.update(pendingInvitations)
      .set({ status: "accepted" })
      .where(eq(pendingInvitations.id, invite.id));
    
    const { generateAccessToken, generateRefreshToken } = await import("../auth/jwt");
    const accessToken = generateAccessToken(newUser);
    const refreshToken = generateRefreshToken(newUser);
    
    const { refreshTokens } = await import("../../shared/schema");
    await db.insert(refreshTokens).values({
      userId: newUser.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    
    return res.status(201).json({
      message: "Convite aceito com sucesso",
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error("Erro ao aceitar convite:", error);
    return res.status(500).json({
      error: "Erro interno",
      message: "Erro ao aceitar convite",
    });
  }
});

/**
 * POST /api/invitations/:id/cancel
 * Cancela um convite pendente
 */
router.post("/:id/cancel", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const invite = await db.query.pendingInvitations.findFirst({
      where: eq(pendingInvitations.id, id),
    });
    
    if (!invite) {
      return res.status(404).json({
        error: "Convite não encontrado",
      });
    }
    
    if (invite.status !== "pending") {
      return res.status(400).json({
        error: "Convite não pode ser cancelado",
        message: `Convite já está ${invite.status}`,
      });
    }
    
    await db.update(pendingInvitations)
      .set({ status: "cancelled" })
      .where(eq(pendingInvitations.id, id));
    
    return res.json({
      message: "Convite cancelado com sucesso",
    });
  } catch (error) {
    console.error("Erro ao cancelar convite:", error);
    return res.status(500).json({
      error: "Erro interno",
      message: "Erro ao cancelar convite",
    });
  }
});

/**
 * POST /api/invitations/:id/resend
 * Reenvia um convite (gera novo token, atualiza expiração)
 */
router.post("/:id/resend", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const invite = await db.query.pendingInvitations.findFirst({
      where: eq(pendingInvitations.id, id),
    });
    
    if (!invite) {
      return res.status(404).json({
        error: "Convite não encontrado",
      });
    }
    
    if (invite.status === "accepted") {
      return res.status(400).json({
        error: "Convite já aceito",
        message: "Não é possível reenviar convite já aceito",
      });
    }
    
    const newToken = nanoid(32);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    const [updated] = await db.update(pendingInvitations)
      .set({
        token: newToken,
        expiresAt,
        status: "pending",
      })
      .where(eq(pendingInvitations.id, id))
      .returning();
    
    return res.json({
      ...updated,
      inviteUrl: `${req.protocol}://${req.get("host")}/accept-invite/${newToken}`,
    });
  } catch (error) {
    console.error("Erro ao reenviar convite:", error);
    return res.status(500).json({
      error: "Erro interno",
      message: "Erro ao reenviar convite",
    });
  }
});

export default router;
