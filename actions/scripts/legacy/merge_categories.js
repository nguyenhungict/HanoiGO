const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting category merge...');

  const mapping = {
    // Nature & Outdoors
    'Lake': 'Nature & Outdoors',
    'Park': 'Nature & Outdoors',
    
    // Arts & Culture
    'Museum': 'Arts & Culture',
    'Art Gallery': 'Arts & Culture',
    'Theater': 'Arts & Culture',
    'Culture': 'Arts & Culture',
    
    // Heritage & History
    'Historic Site': 'Heritage & History',
    'Neighborhood': 'Heritage & History',
    
    // Spiritual
    'Temple': 'Spiritual',
    
    // Eat & Shop
    'Food & Cafe': 'Eat & Shop',
    'Market': 'Eat & Shop',
    
    // Sightseeing
    'Sightseeing': 'Sightseeing'
  };

  for (const [oldCat, newCat] of Object.entries(mapping)) {
    const result = await prisma.place.updateMany({
      where: { category: oldCat },
      data: { category: newCat }
    });
    console.log(`Updated ${result.count} places from "${oldCat}" to "${newCat}"`);
  }

  console.log('Category merge complete!');
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
