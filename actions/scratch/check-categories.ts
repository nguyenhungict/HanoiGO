import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Querying distinct categories from places in database...');

  const places = await prisma.place.findMany({
    select: {
      category: true
    }
  });

  const categories = Array.from(new Set(places.map(p => p.category)));
  console.log(`Unique categories in DB (${categories.length} total):`);
  console.log(categories);

  // Group by category to see how many places each category has
  const counts = await prisma.place.groupBy({
    by: ['category'],
    _count: {
      id: true
    }
  });

  console.log('\nPlaces count per category:');
  for (const c of counts) {
    console.log(`- ${c.category}: ${c._count.id} places`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
