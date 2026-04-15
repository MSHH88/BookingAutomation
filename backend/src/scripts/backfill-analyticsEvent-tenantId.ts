/**
 * backfill-analyticsEvent-tenantId.ts — One-off script to populate
 * AnalyticsEvent.tenantId for historical rows where it was never persisted
 * (AUDIT-025).
 *
 * Strategy:
 *   1. Find all AnalyticsEvent rows where tenantId IS NULL and leadId IS NOT NULL.
 *   2. For each, look up Lead.tenantId.
 *   3. Update the event with the lead's tenantId.
 *
 * Idempotent: only touches rows with tenantId = null.
 *
 * Usage:
 *   cd backend
 *   npx ts-node src/scripts/backfill-analyticsEvent-tenantId.ts
 *
 * Or via tsx:
 *   npx tsx src/scripts/backfill-analyticsEvent-tenantId.ts
 */
import { PrismaClient } from '@prisma/client';

async function main(): Promise<void> {
  const prisma = new PrismaClient();

  try {
    // Find analytics events with null tenantId that have a leadId we can resolve from
    const orphanEvents = await prisma.analyticsEvent.findMany({
      where: {
        tenantId: null,
        leadId:   { not: null },
      },
      select: { id: true, leadId: true },
    });

    console.log(`Found ${orphanEvents.length} AnalyticsEvent rows with null tenantId and a leadId`);

    let updated = 0;
    let skipped = 0;

    for (const event of orphanEvents) {
      if (!event.leadId) { skipped++; continue; }

      const lead = await prisma.lead.findUnique({
        where:  { id: event.leadId },
        select: { tenantId: true },
      });

      if (!lead || !lead.tenantId) { skipped++; continue; }

      await prisma.analyticsEvent.update({
        where: { id: event.id },
        data:  { tenantId: lead.tenantId },
      });

      updated++;
    }

    console.log(`Backfill complete: ${updated} updated, ${skipped} skipped (lead not found or lead has no tenantId)`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
