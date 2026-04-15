/**
 * backfill-lead-tenantId.ts — One-off script to populate Lead.tenantId
 * for historical rows where it was never persisted (AUDIT-019).
 *
 * Strategy:
 *   1. Find all leads where tenantId IS NULL and artistId IS NOT NULL.
 *   2. For each, look up Artist.tenantId.
 *   3. Update the lead with the artist's tenantId.
 *
 * Idempotent: only touches rows with tenantId = null.
 *
 * Usage:
 *   cd backend
 *   npx ts-node src/scripts/backfill-lead-tenantId.ts
 *
 * Or via tsx:
 *   npx tsx src/scripts/backfill-lead-tenantId.ts
 */
import { PrismaClient } from '@prisma/client';

async function main(): Promise<void> {
  const prisma = new PrismaClient();

  try {
    // Find leads with null tenantId that have an artistId we can resolve from
    const orphanLeads = await prisma.lead.findMany({
      where: {
        tenantId: null,
        artistId: { not: null },
      },
      select: {
        id:       true,
        artistId: true,
      },
    });

    console.log(`Found ${orphanLeads.length} leads with tenantId=null and artistId!=null`);

    if (orphanLeads.length === 0) {
      console.log('Nothing to backfill. Exiting.');
      return;
    }

    // Collect unique artistIds
    const artistIds = [...new Set(orphanLeads.map((l) => l.artistId!))];

    // Batch-fetch artist tenantIds
    const artists = await prisma.artist.findMany({
      where: { id: { in: artistIds } },
      select: { id: true, tenantId: true },
    });

    const artistTenantMap = new Map(artists.map((a) => [a.id, a.tenantId]));

    let updated = 0;
    let skipped = 0;

    for (const lead of orphanLeads) {
      const tenantId = artistTenantMap.get(lead.artistId!);
      if (!tenantId) {
        skipped++;
        continue;
      }
      await prisma.lead.update({
        where: { id: lead.id },
        data:  { tenantId },
      });
      updated++;
    }

    console.log(`Backfill complete: ${updated} leads updated, ${skipped} skipped (artist has no tenantId).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
