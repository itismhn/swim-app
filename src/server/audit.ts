import type { Prisma } from "@prisma/client";
import { db } from "./db";

type Json = Prisma.InputJsonValue | undefined;

export async function audit(
  actorId: string | null,
  action: string,
  entity: string,
  entityId?: string | null,
  before?: unknown,
  after?: unknown,
) {
  await db.auditLog.create({
    data: {
      actorId,
      action,
      entity,
      entityId: entityId ?? null,
      before: (before === undefined ? undefined : JSON.parse(JSON.stringify(before))) as Json,
      after: (after === undefined ? undefined : JSON.parse(JSON.stringify(after))) as Json,
    },
  });
}
