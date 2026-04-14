/**
 * Notification dispatcher — Phase 1, Step 1.5
 *
 * Central routing function that checks a user's preferred notification
 * channel and fans out messages to the correct queue(s).
 *
 * Used by all transactional message triggers (bookings, leads, automations)
 * instead of calling whatsappQueue.add() directly.
 *
 * Channel routing:
 *   WHATSAPP → WhatsApp queue only
 *   SMS      → SMS queue only
 *   EMAIL    → Email dispatch only
 *   ALL      → WhatsApp + SMS + Email
 *
 * Feature flag gates:
 *   - WHATSAPP_CONTACT_ENABLED must be ON for WhatsApp
 *   - SMS_ENABLED must be ON for SMS
 *   - EMAIL_REMINDERS_ENABLED must be ON for email
 */
import { logger }           from '../utils/logger';
import { isFeatureEnabled } from '../middleware/requireFeature';
import { whatsappQueue }    from '../modules/whatsapp/whatsapp.queue';
import { smsQueue }         from '../modules/sms/sms.queue';
import { sendEmail }        from '../modules/notifications/notifications.service';

export type ChannelPreference = 'WHATSAPP' | 'SMS' | 'EMAIL' | 'ALL';

export interface NotificationPayload {
  /** Template key (e.g. 'booking-confirmed'). */
  templateKey: string;
  /** Recipient phone (E.164 for WA/SMS). Null → skip phone channels. */
  phone: string | null;
  /** Recipient email. Null → skip email channel. */
  email: string | null;
  /** Customer display name. */
  customerName: string;
  /** Template variables for interpolation. */
  variables: Record<string, string | number | undefined>;
  /** User's preferred channel. */
  channel: ChannelPreference;
  /** Tenant ID for template lookup. */
  tenantId?: string;
  /** Optional delay in milliseconds. */
  delayMs?: number;
}

/**
 * Resolves which channels should receive the notification based on
 * user preference and active feature flags.
 */
export async function resolveChannels(channel: ChannelPreference): Promise<{
  whatsapp: boolean;
  sms: boolean;
  email: boolean;
}> {
  const [whatsappEnabled, smsEnabled, emailEnabled] = await Promise.all([
    isFeatureEnabled('WHATSAPP_CONTACT_ENABLED'),
    isFeatureEnabled('SMS_REMINDERS_ENABLED'),
    isFeatureEnabled('EMAIL_REMINDERS_ENABLED'),
  ]);

  switch (channel) {
    case 'WHATSAPP':
      return { whatsapp: whatsappEnabled, sms: false, email: false };
    case 'SMS':
      return { whatsapp: false, sms: smsEnabled, email: false };
    case 'EMAIL':
      return { whatsapp: false, sms: false, email: emailEnabled };
    case 'ALL':
      return { whatsapp: whatsappEnabled, sms: smsEnabled, email: emailEnabled };
    default:
      return { whatsapp: whatsappEnabled, sms: false, email: false };
  }
}

/**
 * Dispatches a notification to the appropriate channel queue(s).
 *
 * This is a fire-and-forget function: errors are logged but never thrown,
 * so the calling service is never blocked by a notification failure.
 */
export async function dispatchNotification(payload: NotificationPayload): Promise<void> {
  const channels = await resolveChannels(payload.channel);

  logger.info('Dispatching notification', {
    templateKey: payload.templateKey,
    channels,
    phone: payload.phone ? '***' : null,
    email: payload.email ? '***' : null,
  });

  const promises: Promise<void>[] = [];

  if (channels.whatsapp && payload.phone) {
    promises.push(dispatchWhatsApp(payload));
  }

  if (channels.sms && payload.phone) {
    promises.push(dispatchSms(payload));
  }

  if (channels.email && payload.email) {
    promises.push(dispatchEmail(payload));
  }

  await Promise.allSettled(promises);
}

// ─── Channel-specific dispatchers ─────────────────────────────────────────────

async function dispatchWhatsApp(payload: NotificationPayload): Promise<void> {
  try {
    await whatsappQueue.add(payload.templateKey, {
      jobName:      payload.templateKey as never,
      to:           payload.phone!,
      customerName: payload.customerName,
      studioName:   (payload.variables['studioName'] as string) ?? '',
      artistName:   (payload.variables['artistName'] as string) ?? '',
      bookingId:    (payload.variables['bookingId'] as string) ?? '',
      startAt:      (payload.variables['startAt'] as string) ?? '',
      service:      (payload.variables['serviceType'] as string) ?? '',
    }, payload.delayMs ? { delay: payload.delayMs } : undefined);
    logger.info('WhatsApp notification queued', { templateKey: payload.templateKey });
  } catch (err) {
    logger.error('WhatsApp dispatch failed', {
      templateKey: payload.templateKey,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

async function dispatchSms(payload: NotificationPayload): Promise<void> {
  try {
    await smsQueue.add(payload.templateKey, {
      jobName:      payload.templateKey,
      to:           payload.phone!,
      customerName: payload.customerName,
      tenantId:     payload.tenantId,
      variables:    payload.variables,
    }, payload.delayMs ? { delay: payload.delayMs } : undefined);
    logger.info('SMS notification queued', { templateKey: payload.templateKey });
  } catch (err) {
    logger.error('SMS dispatch failed', {
      templateKey: payload.templateKey,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

async function dispatchEmail(payload: NotificationPayload): Promise<void> {
  try {
    await sendEmail(payload.templateKey, payload.email!, payload.variables);
    logger.info('Email notification sent', { templateKey: payload.templateKey });
  } catch (err) {
    logger.error('Email dispatch failed', {
      templateKey: payload.templateKey,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
