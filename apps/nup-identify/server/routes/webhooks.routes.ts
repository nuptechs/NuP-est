import express, { type Router, type Request, type Response } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db";
import { webhookEvents } from "../../shared/schema";
import { requireAuth } from "../middleware/auth";
import { retryWebhookEvent } from "../services/webhook.service";

const router: Router = express.Router();

router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const { systemId, status, limit = 50 } = req.query;

    const events = await db.query.webhookEvents.findMany({
      orderBy: desc(webhookEvents.createdAt),
      limit: parseInt(limit as string),
      where: systemId 
        ? status 
          ? and(
              eq(webhookEvents.systemId, systemId as string),
              eq(webhookEvents.status, status as string)
            )
          : eq(webhookEvents.systemId, systemId as string)
        : status
        ? eq(webhookEvents.status, status as string)
        : undefined,
    });

    const summary = {
      total: events.length,
      pending: events.filter(e => e.status === "pending").length,
      success: events.filter(e => e.status === "success").length,
      failed: events.filter(e => e.status === "failed").length,
    };

    res.json({
      events,
      summary,
    });
  } catch (error) {
    console.error("Erro ao listar webhooks:", error);
    res.status(500).json({
      error: "Erro ao listar eventos de webhook",
    });
  }
});

router.get("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const event = await db.query.webhookEvents.findFirst({
      where: eq(webhookEvents.id, id),
    });

    if (!event) {
      return res.status(404).json({
        error: "Evento não encontrado",
      });
    }

    res.json({
      ...event,
      payload: JSON.parse(event.payload || "{}"),
    });
  } catch (error) {
    console.error("Erro ao buscar webhook:", error);
    res.status(500).json({
      error: "Erro ao buscar evento",
    });
  }
});

router.post("/:id/retry", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const event = await db.query.webhookEvents.findFirst({
      where: eq(webhookEvents.id, id),
    });

    if (!event) {
      return res.status(404).json({
        error: "Evento não encontrado",
      });
    }

    if (event.status === "success") {
      return res.status(400).json({
        error: "Evento já foi processado com sucesso",
      });
    }

    await db.update(webhookEvents)
      .set({ 
        status: "pending",
        attempts: 0,
        errorMessage: null,
      })
      .where(eq(webhookEvents.id, id));

    setImmediate(() => retryWebhookEvent(id));

    res.json({
      message: "Webhook reenfileirado e processamento iniciado",
    });
  } catch (error) {
    console.error("Erro ao reprocessar webhook:", error);
    res.status(500).json({
      error: "Erro ao reprocessar webhook",
    });
  }
});

router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [deleted] = await db
      .delete(webhookEvents)
      .where(eq(webhookEvents.id, id))
      .returning();

    if (!deleted) {
      return res.status(404).json({
        error: "Evento não encontrado",
      });
    }

    res.json({
      message: "Evento deletado com sucesso",
    });
  } catch (error) {
    console.error("Erro ao deletar webhook:", error);
    res.status(500).json({
      error: "Erro ao deletar webhook",
    });
  }
});

export default router;
