/**
 * Push Notifications — lib/push-notifications.ts — Phase 6.2
 *
 * Sends Web Push notifications to staff members' PWA subscriptions using VAPID.
 *
 * Required environment variables:
 *   VAPID_PUBLIC_KEY   — Base64-encoded VAPID public key
 *   VAPID_PRIVATE_KEY  — Base64-encoded VAPID private key
 *   VAPID_SUBJECT      — mailto: or https: URI identifying the push sender
 *
 * Generate VAPID keys with:
 *   npx web-push generate-vapid-keys
 *
 * Usage:
 *   import { sendPushNotification } from '../../lib/push-notifications';
 *   await sendPushNotification(subscription, { title: 'New booking', body: '...' });
 */
import webpush from 'web-push';

import { logger } from '../utils/logger';

// ─── VAPID setup ──────────────────────────────────────────────────────────────

const {
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
  VAPID_SUBJECT = 'mailto:admin@example.com',
} = process.env as Record<string, string | undefined>;

let vapidConfigured = false;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT as string, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  vapidConfigured = true;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PushSubscriptionRecord {
  endpoint: string;
  p256dh:   string;
  auth:     string;
}

export interface PushPayload {
  title:   string;
  body:    string;
  icon?:   string;
  badge?:  string;
  tag?:    string;
  data?:   Record<string, unknown>;
}

// ─── sendPushNotification ─────────────────────────────────────────────────────

/**
 * Sends a single push notification to a subscription endpoint.
 *
 * Returns true on success, false if the subscription is expired/invalid
 * (so the caller can clean it up from the database).
 */
export async function sendPushNotification(
  subscription: PushSubscriptionRecord,
  payload:      PushPayload,
): Promise<boolean> {
  if (!vapidConfigured) {
    logger.warn('VAPID keys not configured — skipping push notification');
    return false;
  }

  const pushSubscription: webpush.PushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth:   subscription.auth,
    },
  };

  try {
    await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
    return true;
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number }).statusCode;

    // 404 / 410 means the subscription is no longer valid
    if (statusCode === 404 || statusCode === 410) {
      logger.info('Push subscription expired — should be removed', {
        endpoint: subscription.endpoint,
      });
      return false;
    }

    logger.error('Failed to send push notification', { err });
    throw err;
  }
}

/**
 * Sends a push notification to multiple subscribers.
 * Invalid subscriptions are returned so the caller can delete them.
 */
export async function sendPushToMany(
  subscriptions: (PushSubscriptionRecord & { id: string })[],
  payload:       PushPayload,
): Promise<string[]> {
  const expiredIds: string[] = [];

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      const valid = await sendPushNotification(sub, payload);
      if (!valid) expiredIds.push(sub.id);
    }),
  );

  return expiredIds;
}

/**
 * Returns the VAPID public key as a Base64 URL-encoded string.
 * Sent to the browser so it can create a push subscription.
 */
export function getVapidPublicKey(): string | null {
  return VAPID_PUBLIC_KEY ?? null;
}
