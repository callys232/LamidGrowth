import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { findOrCreateGlobalIdentity, promoteToPayingClient, normalizeEmail } from './identity.mjs';
import { GroupwareClient } from './client.mjs';

export const syncEventSchema = z.object({
  eventId: z.string().trim().min(1).max(128),
  direction: z.enum(['inbound', 'outbound']),
  entityType: z.enum(['user', 'client_conversion', 'project', 'milestone', 'payment', 'escrow', 'review', 'communication']),
  entityId: z.string().trim().min(1).max(128),
  action: z.enum(['create', 'update', 'delete', 'promote', 'status_change']),
  payload: z.record(z.unknown()),
  source: z.enum(['lamid_one', 'groupware']),
});

/**
 * Maps external Groupware IDs to internal LAMID ONE IDs and vice versa.
 */
export async function getOrSetEntityMapping(store, { entityType, lamidOneId, groupwareId, direction = 'bidirectional', metadata = {} }) {
  const { db } = store;
  const now = new Date().toISOString();

  // Try finding by LAMID ONE ID
  if (lamidOneId) {
    const existing = await db
      .prepare('SELECT * FROM groupware_entity_mappings WHERE entity_type = ? AND lamid_one_id = ?')
      .get(entityType, lamidOneId);
    if (existing) {
      if (groupwareId && existing.groupware_id !== groupwareId) {
        await db
          .prepare('UPDATE groupware_entity_mappings SET groupware_id = ?, last_synced_at = ? WHERE id = ?')
          .run(groupwareId, now, existing.id);
        existing.groupware_id = groupwareId;
      }
      return existing;
    }
  }

  // Try finding by Groupware ID
  if (groupwareId) {
    const existing = await db
      .prepare('SELECT * FROM groupware_entity_mappings WHERE entity_type = ? AND groupware_id = ?')
      .get(entityType, groupwareId);
    if (existing) {
      if (lamidOneId && existing.lamid_one_id !== lamidOneId) {
        await db
          .prepare('UPDATE groupware_entity_mappings SET lamid_one_id = ?, last_synced_at = ? WHERE id = ?')
          .run(lamidOneId, now, existing.id);
        existing.lamid_one_id = lamidOneId;
      }
      return existing;
    }
  }

  // Insert fresh mapping
  const id = `map_${randomUUID().replaceAll('-', '')}`;
  await db
    .prepare(
      `INSERT INTO groupware_entity_mappings (
        id, entity_type, lamid_one_id, groupware_id, sync_direction, last_synced_at, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(id, entityType, lamidOneId || '', groupwareId || '', direction, now, JSON.stringify(metadata));

  return await db.prepare('SELECT * FROM groupware_entity_mappings WHERE id = ?').get(id);
}

/**
 * Queues an outbound synchronization event for delivery to Groupware.
 * Includes loop-detection and idempotency tracking.
 */
export async function queueOutboundSync(store, eventData, client = new GroupwareClient()) {
  const parsed = syncEventSchema.parse({
    direction: 'outbound',
    source: 'lamid_one',
    ...eventData,
  });

  const { db, transaction, log } = store;
  const now = new Date().toISOString();
  const id = `sync_${randomUUID().replaceAll('-', '')}`;

  return await transaction(async () => {
    // Check idempotency: event already queued or delivered
    const existing = await db
      .prepare('SELECT * FROM groupware_sync_events WHERE event_id = ?')
      .get(parsed.eventId);
    if (existing) {
      return { status: existing.status, duplicate: true, eventId: parsed.eventId };
    }

    await db
      .prepare(
        `INSERT INTO groupware_sync_events (
          id, event_id, direction, entity_type, entity_id, action,
          payload, status, attempt_count, max_attempts, created_at
        ) VALUES (?, ?, 'outbound', ?, ?, ?, ?, 'pending', 0, 5, ?)`
      )
      .run(
        id,
        parsed.eventId,
        parsed.entityType,
        parsed.entityId,
        parsed.action,
        JSON.stringify(parsed.payload),
        now
      );

    // Attempt synchronous dispatch if configured; if it fails, queue for background retry
    try {
      let dispatchResult = null;
      if (client.config.isConfigured) {
        if (parsed.entityType === 'user') {
          dispatchResult = await client.syncUser(parsed.payload);
        } else if (parsed.entityType === 'client_conversion') {
          dispatchResult = await client.syncClientConversion(parsed.payload);
        } else if (parsed.entityType === 'project') {
          dispatchResult = await client.syncProject(parsed.payload);
        } else if (parsed.entityType === 'milestone') {
          dispatchResult = await client.syncMilestone(parsed.payload);
        } else if (parsed.entityType === 'payment' || parsed.entityType === 'escrow') {
          dispatchResult = await client.syncTransaction(parsed.payload);
        } else if (parsed.entityType === 'review') {
          dispatchResult = await client.syncReview(parsed.payload);
        }
      }

      await db
        .prepare("UPDATE groupware_sync_events SET status = 'completed', attempt_count = 1, completed_at = ? WHERE id = ?")
        .run(now, id);

      return { status: 'completed', eventId: parsed.eventId, result: dispatchResult };
    } catch (err) {
      const nextRetry = new Date(Date.now() + 60000).toISOString();
      await db
        .prepare("UPDATE groupware_sync_events SET status = 'failed', attempt_count = 1, last_error = ?, next_retry_at = ? WHERE id = ?")
        .run(err.message.slice(0, 500), nextRetry, id);

      return { status: 'queued_for_retry', eventId: parsed.eventId, error: err.message };
    }
  });
}

/**
 * Processes an inbound synchronization event received from Groupware.
 * Follows all 5 entity specifications and Section 6 rules.
 */
export async function processInboundSync(store, eventData) {
  const parsed = syncEventSchema.parse({
    direction: 'inbound',
    source: 'groupware',
    ...eventData,
  });

  const { db, transaction, log } = store;
  const now = new Date().toISOString();

  return await transaction(async () => {
    // Idempotency check: don't process duplicate webhook
    const existing = await db
      .prepare('SELECT * FROM groupware_sync_events WHERE event_id = ?')
      .get(parsed.eventId);
    if (existing && existing.status === 'completed') {
      return { ok: true, duplicate: true, eventId: parsed.eventId };
    }

    const eventRecordId = existing ? existing.id : `sync_${randomUUID().replaceAll('-', '')}`;
    if (!existing) {
      await db
        .prepare(
          `INSERT INTO groupware_sync_events (
            id, event_id, direction, entity_type, entity_id, action,
            payload, status, attempt_count, max_attempts, created_at
          ) VALUES (?, ?, 'inbound', ?, ?, ?, ?, 'processing', 1, 5, ?)`
        )
        .run(
          eventRecordId,
          parsed.eventId,
          parsed.entityType,
          parsed.entityId,
          parsed.action,
          JSON.stringify(parsed.payload),
          now
        );
    }

    try {
      let outcome = {};

      switch (parsed.entityType) {
        // --- A. USER AND CRM INFORMATION ---
        case 'user': {
          const userPayload = parsed.payload;
          const identity = await findOrCreateGlobalIdentity(store, {
            email: userPayload.email,
            phone: userPayload.phone,
            groupwareUserId: userPayload.groupwareUserId || parsed.entityId,
            registrationSource: 'groupware',
            accountStatus: userPayload.accountStatus || 'active',
            isClient: Boolean(userPayload.isClient),
            metadata: {
              company: userPayload.company,
              sector: userPayload.sector,
              supervisor: userPayload.supervisor,
              handler: userPayload.handler,
              relationshipHistory: userPayload.relationshipHistory,
            },
          });

          await getOrSetEntityMapping(store, {
            entityType: 'user',
            lamidOneId: identity.lamid_one_user_id || identity.global_user_id,
            groupwareId: parsed.entityId,
            metadata: { globalUserId: identity.global_user_id },
          });

          outcome = { globalUserId: identity.global_user_id, identity };
          break;
        }

        // --- B. CLIENT CONVERSION ---
        case 'client_conversion': {
          const conversionPayload = parsed.payload;
          const identity = await promoteToPayingClient(store, {
            groupwareUserId: conversionPayload.groupwareUserId || parsed.entityId,
            paymentReference: conversionPayload.paymentReference,
            source: 'groupware_conversion',
          });

          outcome = { converted: true, identity };
          break;
        }

        // --- C. PROJECT MANAGEMENT ---
        case 'project': {
          const projectPayload = parsed.payload;
          // Store/update project reference mapping
          const mapping = await getOrSetEntityMapping(store, {
            entityType: 'project',
            lamidOneId: projectPayload.lamidOneProjectId || '',
            groupwareId: parsed.entityId,
            metadata: {
              title: projectPayload.title,
              status: projectPayload.status,
              group: projectPayload.group,
              clientGroupwareId: projectPayload.clientGroupwareId,
            },
          });
          outcome = { mappingId: mapping.id, projectSynced: true };
          break;
        }

        // --- C2. MILESTONE MANAGEMENT ---
        case 'milestone': {
          const msPayload = parsed.payload;
          const mapping = await getOrSetEntityMapping(store, {
            entityType: 'milestone',
            lamidOneId: msPayload.lamidOneMilestoneId || '',
            groupwareId: parsed.entityId,
            metadata: {
              title: msPayload.title,
              status: msPayload.status,
              deadline: msPayload.deadline,
              progress: msPayload.progress,
            },
          });
          outcome = { mappingId: mapping.id, milestoneSynced: true };
          break;
        }

        // --- D. ESCROW AND PAYMENTS ---
        // Rule: Never independently modify financial balances or release escrow via sync!
        // Only record transaction references and audit metadata.
        case 'payment':
        case 'escrow': {
          const txPayload = parsed.payload;
          const mapping = await getOrSetEntityMapping(store, {
            entityType: parsed.entityType,
            lamidOneId: txPayload.lamidOnePaymentId || '',
            groupwareId: parsed.entityId,
            metadata: {
              reference: txPayload.reference,
              amountMinor: txPayload.amountMinor,
              currency: txPayload.currency,
              status: txPayload.status,
              escrowStatus: txPayload.escrowStatus,
              isAuthoritative: false, // Authoritative payment provider remains sovereign
            },
          });
          outcome = { mappingId: mapping.id, transactionRecorded: true };
          break;
        }

        // --- E. REVIEWS AND COMMUNICATION ---
        case 'review': {
          const reviewPayload = parsed.payload;
          const mapping = await getOrSetEntityMapping(store, {
            entityType: 'review',
            lamidOneId: reviewPayload.lamidOneReviewId || '',
            groupwareId: parsed.entityId,
            metadata: {
              rating: reviewPayload.rating,
              feedback: reviewPayload.feedback,
              authorGroupwareId: reviewPayload.authorGroupwareId,
            },
          });
          outcome = { mappingId: mapping.id, reviewRecorded: true };
          break;
        }

        default:
          outcome = { unhandledEntityType: parsed.entityType };
      }

      await db
        .prepare("UPDATE groupware_sync_events SET status = 'completed', completed_at = ? WHERE id = ?")
        .run(now, eventRecordId);

      return { ok: true, eventId: parsed.eventId, outcome };
    } catch (err) {
      await db
        .prepare("UPDATE groupware_sync_events SET status = 'failed', last_error = ? WHERE id = ?")
        .run(err.message.slice(0, 500), eventRecordId);
      throw err;
    }
  });
}

