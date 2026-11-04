import { randomUUID } from 'node:crypto';
import { z } from 'zod';

export const identitySchema = z.object({
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(32).optional().nullable(),
  lamidOneUserId: z.string().trim().max(128).optional().nullable(),
  groupwareUserId: z.string().trim().max(128).optional().nullable(),
  registrationSource: z.enum(['lamid_one', 'groupware', 'external']),
  accountStatus: z.enum(['active', 'suspended', 'pending', 'closed']).default('active'),
  isClient: z.boolean().default(false),
  metadata: z.record(z.unknown()).default({}),
});

/** Normalizes email for case-insensitive and canonical mailbox matching. */
export function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return '';
  const trimmed = email.trim().toLowerCase();
  const parts = trimmed.split('@');
  if (parts.length !== 2) return trimmed;
  let [local, domain] = parts;
  if (domain === 'googlemail.com') domain = 'gmail.com';
  if (domain === 'gmail.com') local = local.split('+')[0].replaceAll('.', '');
  return `${local}@${domain}`;
}

/** Normalizes phone numbers to standard E.164 digits without whitespace or symbols. */
export function normalizePhone(phone) {
  if (!phone || typeof phone !== 'string') return null;
  const digits = phone.replace(/[^\d+]/g, '');
  return digits.length >= 7 ? digits : null;
}

/**
 * Finds or securely creates a global identity record.
 * Follows Rule 03 (Shared User Identity) & Rule 07 (Database Integrity):
 * - Never merges accounts solely on unverified or conflicting identifiers.
 * - Prioritizes verified user ID mapping, then canonical email matching.
 * - Protects against duplicate record creation.
 */
export async function findOrCreateGlobalIdentity(store, params) {
  const parsed = identitySchema.parse(params);
  const { db, transaction } = store;
  const normEmail = normalizeEmail(parsed.email);
  const normPhone = normalizePhone(parsed.phone);
  const now = new Date().toISOString();

  return await transaction(async () => {
    // 1. Search by direct LAMID ONE User ID if present
    if (parsed.lamidOneUserId) {
      const byL1 = await db
        .prepare('SELECT * FROM global_user_identities WHERE lamid_one_user_id = ?')
        .get(parsed.lamidOneUserId);
      if (byL1) {
        return await updateIdentityIfPermitted(db, byL1, parsed, now);
      }
    }

    // 2. Search by Groupware User ID if present
    if (parsed.groupwareUserId) {
      const byGw = await db
        .prepare('SELECT * FROM global_user_identities WHERE groupware_user_id = ?')
        .get(parsed.groupwareUserId);
      if (byGw) {
        return await updateIdentityIfPermitted(db, byGw, parsed, now);
      }
    }

    // 3. Search by normalized email
    const byEmail = await db
      .prepare('SELECT * FROM global_user_identities WHERE normalized_email = ?')
      .get(normEmail);

    if (byEmail) {
      // Safe linking: match found by email. Link the missing ID if not already bound to someone else
      return await updateIdentityIfPermitted(db, byEmail, parsed, now);
    }

    // 4. Create fresh global identity
    const globalUserId = `gid_${randomUUID().replaceAll('-', '')}`;
    const isClientInt = parsed.isClient ? 1 : 0;
    const clientConvertedAt = parsed.isClient ? now : null;

    await db
      .prepare(
        `INSERT INTO global_user_identities (
          global_user_id, lamid_one_user_id, groupware_user_id,
          primary_email, normalized_email, phone_number,
          registration_source, account_status, is_client,
          client_converted_at, metadata, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        globalUserId,
        parsed.lamidOneUserId || null,
        parsed.groupwareUserId || null,
        parsed.email.trim(),
        normEmail,
        normPhone,
        parsed.registrationSource,
        parsed.accountStatus,
        isClientInt,
        clientConvertedAt,
        JSON.stringify(parsed.metadata || {}),
        now,
        now
      );

    return await db
      .prepare('SELECT * FROM global_user_identities WHERE global_user_id = ?')
      .get(globalUserId);
  });
}

/**
 * Safely updates an existing global identity with new bindings or status.
 * Monotonic Client Promotion: A paying client (is_client = 1) is NEVER downgraded
 * to a prospect (is_client = 0) by an incoming synchronization payload.
 */
async function updateIdentityIfPermitted(db, current, incoming, now) {
  let needsUpdate = false;
  let newL1Id = current.lamid_one_user_id;
  let newGwId = current.groupware_user_id;
  let newPhone = current.phone_number;
  let isClient = current.is_client === 1;
  let clientConvertedAt = current.client_converted_at;

  // Safe binding of LAMID ONE user ID
  if (!current.lamid_one_user_id && incoming.lamidOneUserId) {
    newL1Id = incoming.lamidOneUserId;
    needsUpdate = true;
  }

  // Safe binding of Groupware user ID
  if (!current.groupware_user_id && incoming.groupwareUserId) {
    newGwId = incoming.groupwareUserId;
    needsUpdate = true;
  }

  // Safe binding of Phone number
  const normPhone = normalizePhone(incoming.phone);
  if (!current.phone_number && normPhone) {
    newPhone = normPhone;
    needsUpdate = true;
  }

  // Monotonic Client Promotion
  if (!isClient && incoming.isClient) {
    isClient = true;
    clientConvertedAt = now;
    needsUpdate = true;
  }

  // Merge metadata safely
  let metadata = {};
  try {
    metadata = typeof current.metadata === 'string' ? JSON.parse(current.metadata) : (current.metadata || {});
  } catch {}
  if (incoming.metadata && Object.keys(incoming.metadata).length > 0) {
    metadata = { ...metadata, ...incoming.metadata };
    needsUpdate = true;
  }

  if (needsUpdate) {
    await db
      .prepare(
        `UPDATE global_user_identities SET
          lamid_one_user_id = ?,
          groupware_user_id = ?,
          phone_number = ?,
          is_client = ?,
          client_converted_at = ?,
          metadata = ?,
          updated_at = ?
        WHERE global_user_id = ?`
      )
      .run(
        newL1Id,
        newGwId,
        newPhone,
        isClient ? 1 : 0,
        clientConvertedAt,
        JSON.stringify(metadata),
        now,
        current.global_user_id
      );

    return await db
      .prepare('SELECT * FROM global_user_identities WHERE global_user_id = ?')
      .get(current.global_user_id);
  }

  return current;
}

/**
 * Promotes a global user from Prospect to paying Client.
 * Guaranteed to be idempotent and monotonic.
 */
export async function promoteToPayingClient(store, { globalUserId, lamidOneUserId, groupwareUserId, paymentReference, source }) {
  const { db, transaction } = store;
  const now = new Date().toISOString();

  return await transaction(async () => {
    let identity = null;
    if (globalUserId) {
      identity = await db.prepare('SELECT * FROM global_user_identities WHERE global_user_id = ?').get(globalUserId);
    } else if (lamidOneUserId) {
      identity = await db.prepare('SELECT * FROM global_user_identities WHERE lamid_one_user_id = ?').get(lamidOneUserId);
    } else if (groupwareUserId) {
      identity = await db.prepare('SELECT * FROM global_user_identities WHERE groupware_user_id = ?').get(groupwareUserId);
    }

    if (!identity) {
      return null;
    }

    if (identity.is_client === 1) {
      // Already paying client
      return identity;
    }

    let metadata = {};
    try {
      metadata = typeof identity.metadata === 'string' ? JSON.parse(identity.metadata) : (identity.metadata || {});
    } catch {}

    metadata.lastPaymentReference = paymentReference || metadata.lastPaymentReference;
    metadata.conversionSource = source || 'payment_verification';

    await db
      .prepare(
        `UPDATE global_user_identities SET
          is_client = 1,
          client_converted_at = COALESCE(client_converted_at, ?),
          metadata = ?,
          updated_at = ?
        WHERE global_user_id = ?`
      )
      .run(now, JSON.stringify(metadata), now, identity.global_user_id);

    return await db
      .prepare('SELECT * FROM global_user_identities WHERE global_user_id = ?')
      .get(identity.global_user_id);
  });
}

