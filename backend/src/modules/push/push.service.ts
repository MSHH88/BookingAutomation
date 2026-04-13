/**
 * Push service — Phase 6.2
 *
 * Business logic for Staff Mobile App push notification subscriptions.
 */
import { prisma }   from '../../lib/prisma';
import { AppError } from '../../errors/AppError';
import { logger }   from '../../utils/logger';
import {
  sendPushToMany,
  getVapidPublicKey,
  type PushPayload,
} from '../../lib/push-notifications';

// ─── subscribe ────────────────────────────────────────────────────────────────

export async function subscribe(
  userId:   string,
  tenantId: string,
  endpoint: string,
  p256dh:   string,
  auth:     string,
) {
  const subscription = await prisma.pushSubscription.upsert({
    where:  { endpoint },
    create: { userId, tenantId, endpoint, p256dh, auth },
    update: { userId, tenantId, p256dh, auth },
    select: {
      id:        true,
      userId:    true,
      tenantId:  true,
      endpoint:  true,
      createdAt: true,
    },
  });

  logger.info('Push subscription registered', { userId, subscriptionId: subscription.id });
  return subscription;
}

// ─── unsubscribe ──────────────────────────────────────────────────────────────

export async function unsubscribe(
  userId:   string,
  tenantId: string,
  endpoint: string,
) {
  const existing = await prisma.pushSubscription.findUnique({
    where:  { endpoint },
    select: { id: true, userId: true, tenantId: true },
  });

  if (!existing) return;

  if (existing.userId !== userId || existing.tenantId !== tenantId) {
    throw new AppError(403, 'FORBIDDEN', "Cannot unsubscribe another user's subscription");
  }

  await prisma.pushSubscription.delete({ where: { endpoint } });
  logger.info('Push subscription removed', { userId });
}

// ─── getVapidKey ──────────────────────────────────────────────────────────────

export function getVapidKey() {
  const key = getVapidPublicKey();
  if (!key) {
    throw new AppError(503, 'CONFIGURATION_ERROR', 'Push notifications are not configured');
  }
  return { vapidPublicKey: key };
}

// ─── notifyUser ───────────────────────────────────────────────────────────────

export async function notifyUser(
  userId:   string,
  tenantId: string,
  payload:  PushPayload,
) {
  const subscriptions = await prisma.pushSubscription.findMany({
    where:  { userId, tenantId },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });

  if (subscriptions.length === 0) return;

  const expiredIds = await sendPushToMany(subscriptions, payload);

  if (expiredIds.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { id: { in: expiredIds } },
    });
    logger.info('Removed expired push subscriptions', { expiredIds });
  }
}

// ─── notifyArtistBookingAssigned ──────────────────────────────────────────────

export async function notifyArtistBookingAssigned(
  artistUserId: string,
  tenantId:     string,
  bookingDate:  string,
) {
  await notifyUser(artistUserId, tenantId, {
    title: 'New Booking',
    body:  `A booking has been assigned to you on ${bookingDate}.`,
    tag:   'new-booking',
    data:  { type: 'BOOKING_ASSIGNED' },
  });
}
