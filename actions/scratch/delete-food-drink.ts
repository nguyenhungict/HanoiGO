import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from actions/.env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.DATABASE_URL;
// Use Direct URL for migrations/direct executions against Supabase if configured, otherwise fallback to DATABASE_URL with port 5432
const supabaseDirectUrl = process.env.DIRECT_URL || supabaseUrl?.replace(':6543', ':5432');
const localUrl = "postgresql://hungnguyen:hung2004@localhost:5433/HanoiGO_db";

const FOOD_DRINK_KEYWORDS = [
  'food', 'dining', 'cafe', 'coffee', 'bar', 'dessert', 'restaurant', 'bakery', 'drink', 'beverage', 'eating', 'bún chả', 'chả cá', 'bánh mì', 'phở', 'kem tràng tiền', 'cà phê'
];

function isFoodDrink(name: string, category: string, tags: string[]): boolean {
  const nameL = name.toLowerCase();
  const catL = category.toLowerCase();
  const tagsL = tags.map(t => t.toLowerCase());

  return FOOD_DRINK_KEYWORDS.some(kw => 
    nameL.includes(kw) || 
    catL.includes(kw) || 
    tagsL.some(t => t.includes(kw))
  );
}

async function cleanDb(url: string, dbName: string) {
  console.log(`🧹 Cleaning DB: ${dbName}...`);
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url,
      },
    },
  });

  try {
    const places = await prisma.place.findMany({
      select: { id: true, name: true, category: true, tags: true }
    });

    const toDelete = places.filter(p => isFoodDrink(p.name, p.category, p.tags));

    if (toDelete.length === 0) {
      console.log(`✅ No food/drink places found in ${dbName}.`);
      return;
    }

    console.log(`Deleting ${toDelete.length} places from ${dbName}:`);
    toDelete.forEach(p => console.log(`  - ${p.name}`));

    const idsToDelete = toDelete.map(p => p.id);

    // Delete related gallery images first
    const deletedGalleries = await prisma.placeGallery.deleteMany({
      where: {
        placeId: {
          in: idsToDelete,
        },
      },
    });
    console.log(`  🗑️ Deleted ${deletedGalleries.count} gallery image references.`);

    // Delete related trip stops if any
    const deletedStops = await prisma.tripStop.deleteMany({
      where: {
        placeId: {
          in: idsToDelete,
        },
      },
    });
    console.log(`  🗑️ Deleted ${deletedStops.count} trip stop references.`);

    // Delete the places themselves
    const deletedPlaces = await prisma.place.deleteMany({
      where: {
        id: {
          in: idsToDelete,
        },
      },
    });
    console.log(`  🎉 Successfully deleted ${deletedPlaces.count} places from ${dbName}.`);

  } catch (err: any) {
    console.error(`❌ Error cleaning ${dbName}:`, err.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  await cleanDb(localUrl, 'Local DB');
  if (supabaseDirectUrl) {
    await cleanDb(supabaseDirectUrl, 'Supabase DB');
  } else {
    console.log('⚠️ Supabase connection string not found.');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
