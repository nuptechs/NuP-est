import express, { type Router, type Request, type Response } from "express";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "../db";
import { organizations, organizationSystems, systems, insertOrganizationSchema } from "../../shared/schema";
import { requireAuth } from "../middleware/auth";

const router: Router = express.Router();

/**
 * GET /api/organizations
 * Lista todas as organizações (com filtro opcional por parent)
 */
router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const { parentId } = req.query;
    
    let orgs;
    if (parentId === 'null' || parentId === '') {
      orgs = await db.query.organizations.findMany({
        where: isNull(organizations.parentId),
        orderBy: (orgs, { asc }) => [asc(orgs.name)],
      });
    } else if (parentId) {
      orgs = await db.query.organizations.findMany({
        where: eq(organizations.parentId, parentId as string),
        orderBy: (orgs, { asc }) => [asc(orgs.name)],
      });
    } else {
      orgs = await db.query.organizations.findMany({
        orderBy: (orgs, { asc }) => [asc(orgs.name)],
      });
    }
    
    return res.json(orgs);
  } catch (error) {
    console.error("Erro ao listar organizações:", error);
    return res.status(500).json({
      error: "Erro interno",
      message: "Erro ao listar organizações",
    });
  }
});

/**
 * GET /api/organizations/:id
 * Busca uma organização por ID (com sistemas associados)
 */
router.get("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, id),
    });
    
    if (!org) {
      return res.status(404).json({
        error: "Não encontrado",
        message: "Organização não encontrada",
      });
    }
    
    const orgSystems = await db
      .select({
        id: organizationSystems.id,
        systemId: organizationSystems.systemId,
        systemName: systems.name,
        isActive: organizationSystems.isActive,
        settings: organizationSystems.settings,
      })
      .from(organizationSystems)
      .leftJoin(systems, eq(organizationSystems.systemId, systems.id))
      .where(eq(organizationSystems.organizationId, id));
    
    return res.json({
      ...org,
      systems: orgSystems,
    });
  } catch (error) {
    console.error("Erro ao buscar organização:", error);
    return res.status(500).json({
      error: "Erro interno",
      message: "Erro ao buscar organização",
    });
  }
});

/**
 * POST /api/organizations
 * Cria nova organização
 */
router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const body = insertOrganizationSchema.parse(req.body);
    
    const existingOrg = await db.query.organizations.findFirst({
      where: eq(organizations.slug, body.slug),
    });
    
    if (existingOrg) {
      return res.status(409).json({
        error: "Slug já existe",
        message: "Já existe uma organização com este slug",
      });
    }
    
    const [newOrg] = await db.insert(organizations).values({
      name: body.name,
      slug: body.slug,
      parentId: body.parentId || null,
      settings: body.settings || "{}",
      status: body.status || "active",
    }).returning();
    
    return res.status(201).json(newOrg);
  } catch (error: any) {
    console.error("Erro ao criar organização:", error);
    
    if (error.name === "ZodError") {
      return res.status(400).json({
        error: "Validação falhou",
        details: error.errors,
      });
    }
    
    return res.status(500).json({
      error: "Erro interno",
      message: "Erro ao criar organização",
    });
  }
});

/**
 * PATCH /api/organizations/:id
 * Atualiza uma organização
 */
router.patch("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, id),
    });
    
    if (!org) {
      return res.status(404).json({
        error: "Não encontrado",
        message: "Organização não encontrada",
      });
    }
    
    if (req.body.slug && req.body.slug !== org.slug) {
      const existingOrg = await db.query.organizations.findFirst({
        where: eq(organizations.slug, req.body.slug),
      });
      
      if (existingOrg) {
        return res.status(409).json({
          error: "Slug já existe",
          message: "Já existe uma organização com este slug",
        });
      }
    }
    
    const [updatedOrg] = await db.update(organizations)
      .set({
        ...req.body,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, id))
      .returning();
    
    return res.json(updatedOrg);
  } catch (error) {
    console.error("Erro ao atualizar organização:", error);
    return res.status(500).json({
      error: "Erro interno",
      message: "Erro ao atualizar organização",
    });
  }
});

/**
 * DELETE /api/organizations/:id
 * Remove uma organização (cascade para times, usuários, etc)
 */
router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, id),
    });
    
    if (!org) {
      return res.status(404).json({
        error: "Não encontrado",
        message: "Organização não encontrada",
      });
    }
    
    await db.delete(organizations).where(eq(organizations.id, id));
    
    return res.json({
      message: "Organização removida com sucesso",
    });
  } catch (error) {
    console.error("Erro ao remover organização:", error);
    return res.status(500).json({
      error: "Erro interno",
      message: "Erro ao remover organização",
    });
  }
});

/**
 * POST /api/organizations/:id/systems
 * Associa um sistema à organização
 */
router.post("/:id/systems", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { systemId, isActive = true, settings = "{}" } = req.body;
    
    if (!systemId) {
      return res.status(400).json({
        error: "systemId obrigatório",
        message: "Informe o ID do sistema",
      });
    }
    
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, id),
    });
    
    if (!org) {
      return res.status(404).json({
        error: "Organização não encontrada",
      });
    }
    
    const system = await db.query.systems.findFirst({
      where: eq(systems.id, systemId),
    });
    
    if (!system) {
      return res.status(404).json({
        error: "Sistema não encontrado",
      });
    }
    
    const existing = await db.query.organizationSystems.findFirst({
      where: and(
        eq(organizationSystems.organizationId, id),
        eq(organizationSystems.systemId, systemId)
      ),
    });
    
    if (existing) {
      return res.status(409).json({
        error: "Sistema já associado",
        message: "Este sistema já está associado à organização",
      });
    }
    
    const [newAssoc] = await db.insert(organizationSystems).values({
      organizationId: id,
      systemId,
      isActive,
      settings: typeof settings === "string" ? settings : JSON.stringify(settings),
    }).returning();
    
    return res.status(201).json(newAssoc);
  } catch (error) {
    console.error("Erro ao associar sistema:", error);
    return res.status(500).json({
      error: "Erro interno",
      message: "Erro ao associar sistema",
    });
  }
});

/**
 * DELETE /api/organizations/:id/systems/:systemId
 * Remove associação de sistema da organização
 */
router.delete("/:id/systems/:systemId", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id, systemId } = req.params;
    
    await db.delete(organizationSystems).where(
      and(
        eq(organizationSystems.organizationId, id),
        eq(organizationSystems.systemId, systemId)
      )
    );
    
    return res.json({
      message: "Sistema desassociado com sucesso",
    });
  } catch (error) {
    console.error("Erro ao desassociar sistema:", error);
    return res.status(500).json({
      error: "Erro interno",
      message: "Erro ao desassociar sistema",
    });
  }
});

export default router;
