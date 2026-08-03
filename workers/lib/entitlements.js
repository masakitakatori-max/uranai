const ACTIVE_STATUSES = ["active", "past_due", "grace_period"];

function nowMs() {
  return Date.now();
}

export async function findActiveEntitlementForDevice(db, deviceId) {
  const placeholders = ACTIVE_STATUSES.map(() => "?").join(",");
  const row = await db
    .prepare(
      `SELECT e.id as entitlement_id, e.account_id, e.source, e.product_id, e.status, e.current_period_end
       FROM entitlement_devices d
       JOIN entitlements e ON e.account_id = d.account_id
       WHERE d.device_id = ?
         AND e.status IN (${placeholders})
         AND (e.current_period_end IS NULL OR e.current_period_end > ?)
       ORDER BY e.updated_at DESC
       LIMIT 1`,
    )
    .bind(deviceId, ...ACTIVE_STATUSES, nowMs())
    .first();
  return row || null;
}

export async function upsertAccountByEmail(db, email) {
  const existing = await db.prepare(`SELECT id FROM entitlement_accounts WHERE email = ?`).bind(email).first();
  if (existing) {
    return existing.id;
  }
  const id = crypto.randomUUID();
  const ts = nowMs();
  await db
    .prepare(`INSERT INTO entitlement_accounts (id, email, created_at, updated_at) VALUES (?, ?, ?, ?)`)
    .bind(id, email, ts, ts)
    .run();
  return id;
}

export async function linkDevice(db, deviceId, accountId, platform) {
  const ts = nowMs();
  await db
    .prepare(
      `INSERT INTO entitlement_devices (device_id, account_id, platform, first_seen_at, last_seen_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(device_id) DO UPDATE SET account_id = excluded.account_id, last_seen_at = excluded.last_seen_at`,
    )
    .bind(deviceId, accountId, platform, ts, ts)
    .run();
}

export async function upsertStripeEntitlement(db, { accountId, subscriptionId, productId, status, currentPeriodEnd, rawPayload }) {
  const ts = nowMs();
  const existing = await db
    .prepare(`SELECT id FROM entitlements WHERE source = 'stripe' AND external_subscription_id = ?`)
    .bind(subscriptionId)
    .first();

  if (existing) {
    await db
      .prepare(
        `UPDATE entitlements SET status = ?, product_id = ?, current_period_end = ?, last_event = ?, raw_payload_json = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind(status, productId, currentPeriodEnd, status, rawPayload, ts, existing.id)
      .run();
    return existing.id;
  }

  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO entitlements (id, account_id, source, product_id, external_subscription_id, status, current_period_end, auto_renew_status, last_event, raw_payload_json, created_at, updated_at)
       VALUES (?, ?, 'stripe', ?, ?, ?, ?, NULL, ?, ?, ?, ?)`,
    )
    .bind(id, accountId, productId, subscriptionId, status, currentPeriodEnd, status, rawPayload, ts, ts)
    .run();
  return id;
}

export async function updateStripeEntitlementStatus(db, subscriptionId, status, currentPeriodEnd, rawPayload) {
  const ts = nowMs();
  await db
    .prepare(
      `UPDATE entitlements SET status = ?, current_period_end = ?, last_event = ?, raw_payload_json = ?, updated_at = ?
       WHERE source = 'stripe' AND external_subscription_id = ?`,
    )
    .bind(status, currentPeriodEnd, status, rawPayload, ts, subscriptionId)
    .run();
}

export async function hasWebhookEventBeenProcessed(db, eventId) {
  const row = await db.prepare(`SELECT id FROM billing_webhook_events WHERE id = ?`).bind(eventId).first();
  return Boolean(row);
}

export async function recordWebhookEvent(db, { id, source, eventType, payload }) {
  await db
    .prepare(`INSERT INTO billing_webhook_events (id, source, event_type, received_at, payload_json) VALUES (?, ?, ?, ?, ?)`)
    .bind(id, source, eventType, nowMs(), payload)
    .run();
}
