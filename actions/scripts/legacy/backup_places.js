const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function main() {
  const places = await prisma.place.findMany();
  fs.writeFileSync('places_backup.json', JSON.stringify(places, null, 2));
  console.log(`Backed up ${places.length} places to places_backup.json`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
