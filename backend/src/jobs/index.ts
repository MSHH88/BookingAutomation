/**
 * Job registry — Phase 1
 *
 * Centralizes BullMQ job registration. Called from server.ts on startup.
 * Each job module exports a setup function that creates the BullMQ
 * repeatable or delayed job as needed.
 */
import { logger } from '../utils/logger';
import { getDefaultFlags } from '../config/businessType';
import { setupBirthdayJob } from './birthday.job';
import { setupRecurringBookingJob } from './recurring-booking.job';
import { setupCampaignJob } from './campaign.job';

export async function registerAllJobs(): Promise<void> {
  const flags = getDefaultFlags();

  if (flags['BIRTHDAY_AUTOMATION_ENABLED']) {
    await setupBirthdayJob();
    logger.info('Birthday automation job registered');
  }

  if (flags['REBOOKING_NUDGES_ENABLED']) {
    logger.info('Rebooking nudges enabled — jobs scheduled per booking completion');
  }

  if (flags['RECURRING_BOOKINGS_ENABLED']) {
    await setupRecurringBookingJob();
    logger.info('Recurring booking job registered');
  }

  if (flags['CAMPAIGNS_ENABLED']) {
    await setupCampaignJob();
    logger.info('Campaign processing job registered');
  }

  logger.info('All background jobs registered');
}
