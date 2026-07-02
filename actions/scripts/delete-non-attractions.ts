/**
 * Removes commercial / non-attraction places so only sightseeing spots remain.
 *
 * Handles foreign keys: PlaceGallery cascades automatically; Activity.placeId is
 * nullable (set null); TripStop.placeId is RESTRICT, so any stops referencing
 * these places are deleted first.
 *
 * Run:  npx ts-node scripts/delete-non-attractions.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const NAMES_TO_DELETE = [
  'Times City',
  'Lotte Mall West Lake',
  'Landmark 72 Sky View',
  'Lotte Observation Deck',
  'Royal City Vincom Mega Mall',
  'USTH',
  'Ho Tay Water Park',
];

async function main() {
  const places = await prisma.place.findMany({
    where: { name: { in: NAMES_TO_DELETE } },
    select: { id: true, name: true },
  });

  if (places.length === 0) {
    console.log('Nothing to delete — none of the target places exist.');
    return;
  }

  const ids = places.map((p) => p.id);

  // 1. Remove tripStops referencing these places (RESTRICT fk would block delete)
  const stops = await prisma.tripStop.deleteMany({ where: { placeId: { in: ids } } });
  if (stops.count > 0) console.log(`🧹 Removed ${stops.count} trip stop(s) referencing these places.`);

  // 2. Detach from activities (placeId is nullable)
  const acts = await prisma.activity.updateMany({
    where: { placeId: { in: ids } },
    data: { placeId: null },
  });
  if (acts.count > 0) console.log(`🧹 Detached ${acts.count} activity/activities.`);

  // 3. Delete the places (gallery cascades)
  const del = await prisma.place.deleteMany({ where: { id: { in: ids } } });
  console.log(`✅ Deleted ${del.count} non-attraction place(s):`);
  places.forEach((p) => console.log(`   - ${p.name}`));
  console.log(`\n📊 Remaining places: ${await prisma.place.count()}`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
