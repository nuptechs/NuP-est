import { db } from "../db";
import { webhookEvents, systems } from "../../shared/schema";
import { eq } from "drizzle-orm";

interface WebhookPayload {
  event: string;
  systemId: string;
  data: Record<string, any>;
}

export async function queueWebhookEvent(payload: WebhookPayload) {
  try {
    const [event] = await db.insert(webhookEvents).values({
      systemId: payload.systemId,
      event: payload.event,
      payload: JSON.stringify(payload.data),
      status: "pending",
      attempts: 0,
    }).returning();

    console.log(`📨 [WEBHOOK] Evento enfileirado: ${payload.event} para ${payload.systemId}`);
    
    setImmediate(() => processWebhookEvent(event.id));
    
    return event;
  } catch (error) {
    console.error("Erro ao enfileirar webhook:", error);
    throw error;
  }
}

export async function retryWebhookEvent(eventId: string) {
  console.log(`🔄 [WEBHOOK] Tentando reprocessar evento ${eventId}`);
  return processWebhookEvent(eventId);
}

async function processWebhookEvent(eventId: string) {
  try {
    const event = await db.query.webhookEvents.findFirst({
      where: eq(webhookEvents.id, eventId),
    });

    if (!event) {
      console.error(`Evento ${eventId} não encontrado`);
      return;
    }

    const system = await db.query.systems.findFirst({
      where: eq(systems.id, event.systemId),
    });

    if (!system || !system.webhookUrl) {
      console.log(`Sistema ${event.systemId} não possui webhook configurado`);
      await db.update(webhookEvents)
        .set({ 
          status: "failed",
          errorMessage: "Sistema sem webhook configurado",
        })
        .where(eq(webhookEvents.id, eventId));
      return;
    }

    console.log(`🚀 [WEBHOOK] Disparando ${event.event} para ${system.webhookUrl}`);

    const response = await fetch(system.webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-NuPIdentity-Event": event.event,
        "X-NuPIdentity-Delivery": event.id,
      },
      body: JSON.stringify({
        event: event.event,
        systemId: event.systemId,
        timestamp: event.createdAt,
        data: JSON.parse(event.payload || "{}"),
      }),
    });

    if (response.ok) {
      await db.update(webhookEvents)
        .set({ 
          status: "success",
          attempts: (event.attempts || 0) + 1,
          lastAttemptAt: new Date(),
        })
        .where(eq(webhookEvents.id, eventId));
      
      console.log(`✅ [WEBHOOK] Sucesso: ${event.event} para ${system.name}`);
    } else {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
  } catch (error: any) {
    console.error(`❌ [WEBHOOK] Erro ao processar evento ${eventId}:`, error.message);

    const event = await db.query.webhookEvents.findFirst({
      where: eq(webhookEvents.id, eventId),
    });

    if (event) {
      const newAttempts = (event.attempts || 0) + 1;
      const maxAttempts = 3;

      if (newAttempts >= maxAttempts) {
        await db.update(webhookEvents)
          .set({ 
            status: "failed",
            attempts: newAttempts,
            lastAttemptAt: new Date(),
            errorMessage: error.message,
          })
          .where(eq(webhookEvents.id, eventId));
        
        console.log(`❌ [WEBHOOK] Falha permanente após ${maxAttempts} tentativas`);
      } else {
        await db.update(webhookEvents)
          .set({ 
            status: "pending",
            attempts: newAttempts,
            lastAttemptAt: new Date(),
            errorMessage: error.message,
          })
          .where(eq(webhookEvents.id, eventId));

        const retryDelay = Math.pow(2, newAttempts) * 1000;
        console.log(`🔄 [WEBHOOK] Tentando novamente em ${retryDelay}ms...`);
        
        setTimeout(() => {
          processWebhookEvent(eventId);
        }, retryDelay);
      }
    }
  }
}

export async function notifyPermissionsUpdated(
  systemId: string,
  userId: string,
  organizationId: string | null,
  changedFunctions: string[]
) {
  return queueWebhookEvent({
    event: "permissions.updated",
    systemId,
    data: {
      userId,
      organizationId,
      changedFunctions,
      timestamp: new Date().toISOString(),
    },
  });
}

export async function notifyUserCreated(
  systemId: string,
  userId: string,
  email: string,
  organizationId: string | null
) {
  return queueWebhookEvent({
    event: "user.created",
    systemId,
    data: {
      userId,
      email,
      organizationId,
      timestamp: new Date().toISOString(),
    },
  });
}

export async function notifyOrganizationUpdated(
  systemId: string,
  organizationId: string,
  changes: Record<string, any>
) {
  return queueWebhookEvent({
    event: "organization.updated",
    systemId,
    data: {
      organizationId,
      changes,
      timestamp: new Date().toISOString(),
    },
  });
}
