import express, { type Router, type Request, type Response } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { teams, userTeams, teamProfiles, users, profiles, insertTeamSchema } from "../../shared/schema";
import { requireAuth } from "../middleware/auth";

const router: Router = express.Router();

/**
 * GET /api/teams
 * Lista todos os times (com filtro opcional por organização)
 */
router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.query;
    
    let teamsList;
    if (organizationId) {
      teamsList = await db.query.teams.findMany({
        where: eq(teams.organizationId, organizationId as string),
        orderBy: (teams, { asc }) => [asc(teams.name)],
      });
    } else {
      teamsList = await db.query.teams.findMany({
        orderBy: (teams, { asc }) => [asc(teams.name)],
      });
    }
    
    return res.json(teamsList);
  } catch (error) {
    console.error("Erro ao listar times:", error);
    return res.status(500).json({
      error: "Erro interno",
      message: "Erro ao listar times",
    });
  }
});

/**
 * GET /api/teams/:id
 * Busca um time por ID (com membros e perfis)
 */
router.get("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, id),
    });
    
    if (!team) {
      return res.status(404).json({
        error: "Não encontrado",
        message: "Time não encontrado",
      });
    }
    
    const members = await db
      .select({
        id: userTeams.id,
        userId: users.id,
        userName: users.name,
        userEmail: users.email,
        userAvatar: users.avatar,
        role: userTeams.role,
        joinedAt: userTeams.createdAt,
      })
      .from(userTeams)
      .leftJoin(users, eq(userTeams.userId, users.id))
      .where(eq(userTeams.teamId, id));
    
    const teamProfilesList = await db
      .select({
        id: teamProfiles.id,
        profileId: profiles.id,
        profileName: profiles.name,
        profileDescription: profiles.description,
        profileColor: profiles.color,
      })
      .from(teamProfiles)
      .leftJoin(profiles, eq(teamProfiles.profileId, profiles.id))
      .where(eq(teamProfiles.teamId, id));
    
    return res.json({
      ...team,
      members,
      profiles: teamProfilesList,
    });
  } catch (error) {
    console.error("Erro ao buscar time:", error);
    return res.status(500).json({
      error: "Erro interno",
      message: "Erro ao buscar time",
    });
  }
});

/**
 * POST /api/teams
 * Cria novo time
 */
router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const body = insertTeamSchema.parse(req.body);
    
    if (!body.organizationId) {
      return res.status(400).json({
        error: "organizationId obrigatório",
        message: "Todo time deve pertencer a uma organização",
      });
    }
    
    const [newTeam] = await db.insert(teams).values({
      organizationId: body.organizationId,
      name: body.name,
      description: body.description || "",
      color: body.color || "#3b82f6",
      isActive: body.isActive ?? true,
    }).returning();
    
    return res.status(201).json(newTeam);
  } catch (error: any) {
    console.error("Erro ao criar time:", error);
    
    if (error.name === "ZodError") {
      return res.status(400).json({
        error: "Validação falhou",
        details: error.errors,
      });
    }
    
    return res.status(500).json({
      error: "Erro interno",
      message: "Erro ao criar time",
    });
  }
});

/**
 * PATCH /api/teams/:id
 * Atualiza um time
 */
router.patch("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, id),
    });
    
    if (!team) {
      return res.status(404).json({
        error: "Não encontrado",
        message: "Time não encontrado",
      });
    }
    
    const [updatedTeam] = await db.update(teams)
      .set({
        ...req.body,
        updatedAt: new Date(),
      })
      .where(eq(teams.id, id))
      .returning();
    
    return res.json(updatedTeam);
  } catch (error) {
    console.error("Erro ao atualizar time:", error);
    return res.status(500).json({
      error: "Erro interno",
      message: "Erro ao atualizar time",
    });
  }
});

/**
 * DELETE /api/teams/:id
 * Remove um time
 */
router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, id),
    });
    
    if (!team) {
      return res.status(404).json({
        error: "Não encontrado",
        message: "Time não encontrado",
      });
    }
    
    await db.delete(teams).where(eq(teams.id, id));
    
    return res.json({
      message: "Time removido com sucesso",
    });
  } catch (error) {
    console.error("Erro ao remover time:", error);
    return res.status(500).json({
      error: "Erro interno",
      message: "Erro ao remover time",
    });
  }
});

/**
 * POST /api/teams/:id/members
 * Adiciona membro ao time
 */
router.post("/:id/members", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, role = "member" } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        error: "userId obrigatório",
      });
    }
    
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, id),
    });
    
    if (!team) {
      return res.status(404).json({
        error: "Time não encontrado",
      });
    }
    
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    
    if (!user) {
      return res.status(404).json({
        error: "Usuário não encontrado",
      });
    }
    
    const existing = await db.query.userTeams.findFirst({
      where: and(
        eq(userTeams.teamId, id),
        eq(userTeams.userId, userId)
      ),
    });
    
    if (existing) {
      return res.status(409).json({
        error: "Usuário já é membro",
        message: "Este usuário já é membro do time",
      });
    }
    
    const [newMember] = await db.insert(userTeams).values({
      teamId: id,
      userId,
      role,
    }).returning();
    
    return res.status(201).json(newMember);
  } catch (error) {
    console.error("Erro ao adicionar membro:", error);
    return res.status(500).json({
      error: "Erro interno",
      message: "Erro ao adicionar membro",
    });
  }
});

/**
 * DELETE /api/teams/:id/members/:userId
 * Remove membro do time
 */
router.delete("/:id/members/:userId", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id, userId } = req.params;
    
    await db.delete(userTeams).where(
      and(
        eq(userTeams.teamId, id),
        eq(userTeams.userId, userId)
      )
    );
    
    return res.json({
      message: "Membro removido com sucesso",
    });
  } catch (error) {
    console.error("Erro ao remover membro:", error);
    return res.status(500).json({
      error: "Erro interno",
      message: "Erro ao remover membro",
    });
  }
});

/**
 * PATCH /api/teams/:id/members/:userId
 * Atualiza role do membro
 */
router.patch("/:id/members/:userId", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id, userId } = req.params;
    const { role } = req.body;
    
    if (!role) {
      return res.status(400).json({
        error: "role obrigatório",
      });
    }
    
    const [updated] = await db.update(userTeams)
      .set({ role })
      .where(
        and(
          eq(userTeams.teamId, id),
          eq(userTeams.userId, userId)
        )
      )
      .returning();
    
    if (!updated) {
      return res.status(404).json({
        error: "Membro não encontrado",
      });
    }
    
    return res.json(updated);
  } catch (error) {
    console.error("Erro ao atualizar membro:", error);
    return res.status(500).json({
      error: "Erro interno",
      message: "Erro ao atualizar membro",
    });
  }
});

/**
 * POST /api/teams/:id/profiles
 * Atribui perfil ao time
 */
router.post("/:id/profiles", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { profileId } = req.body;
    
    if (!profileId) {
      return res.status(400).json({
        error: "profileId obrigatório",
      });
    }
    
    const existing = await db.query.teamProfiles.findFirst({
      where: and(
        eq(teamProfiles.teamId, id),
        eq(teamProfiles.profileId, profileId)
      ),
    });
    
    if (existing) {
      return res.status(409).json({
        error: "Perfil já atribuído",
        message: "Este perfil já está atribuído ao time",
      });
    }
    
    const [newProfile] = await db.insert(teamProfiles).values({
      teamId: id,
      profileId,
    }).returning();
    
    return res.status(201).json(newProfile);
  } catch (error) {
    console.error("Erro ao atribuir perfil:", error);
    return res.status(500).json({
      error: "Erro interno",
      message: "Erro ao atribuir perfil",
    });
  }
});

/**
 * DELETE /api/teams/:id/profiles/:profileId
 * Remove perfil do time
 */
router.delete("/:id/profiles/:profileId", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id, profileId } = req.params;
    
    await db.delete(teamProfiles).where(
      and(
        eq(teamProfiles.teamId, id),
        eq(teamProfiles.profileId, profileId)
      )
    );
    
    return res.json({
      message: "Perfil removido com sucesso",
    });
  } catch (error) {
    console.error("Erro ao remover perfil:", error);
    return res.status(500).json({
      error: "Erro interno",
      message: "Erro ao remover perfil",
    });
  }
});

export default router;
