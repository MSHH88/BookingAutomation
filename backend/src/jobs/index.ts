/**
 * Job registry — Phase 1 + Phase 2
 *
 * Centralizes BullMQ job registration. Called from server.ts on startup.
 * Each job module exports a setup function that creates the BullMQ
 * repeatable or delayed job as needed.
 */
import { logger } from '../utils/logger';
import { isFeatureEnabled } from '../middleware/requireFeature';
import { setupBirthdayJob } from './birthday.job';
import { startRebookWorker } from './rebook-nudge.job';
import { setupRecurringBookingJob } from './recurring-booking.job';
import { setupCampaignJob } from './campaign.job';
import { startNoShowWorker } from './no-show.job';
import { startWaitlistMatchWorker } from './waitlist-match.job';
import { startAISuggestionWorker }  from './ai-suggestion.job';

export async function registerAllJobs(): Promise<void> {
  if (await isFeatureEnabled('BIRTHDAY_AUTOMATION_ENABLED')) {
    await setupBirthdayJob();
    logger.info('Birthday automation job registered');
  }

  if (await isFeatureEnabled('REBOOKING_NUDGES_ENABLED')) {
    startRebookWorker();
    logger.info('Rebooking nudges worker started');
  }

  if (await isFeatureEnabled('RECURRING_BOOKINGS_ENABLED')) {
    await setupRecurringBookingJob();
    logger.info('Recurring booking job registered');
  }

  if (await isFeatureEnabled('CAMPAIGNS_ENABLED')) {
    await setupCampaignJob();
    logger.info('Campaign processing job registered');
  }

  if (await isFeatureEnabled('NO_SHOW_AUTOMATION_ENABLED')) {
    startNoShowWorker();
    logger.info('No-show automation worker started');
  }

  if (await isFeatureEnabled('WAITING_LIST_ENABLED')) {
    startWaitlistMatchWorker();
    logger.info('Waitlist match worker started');
  }

  if (await isFeatureEnabled('AI_SUGGESTIONS_ENABLED')) {
    startAISuggestionWorker();
    logger.info('AI suggestion worker started');
  }

  logger.info('All background jobs registered');
}
