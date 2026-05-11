const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const places = await prisma.place.findMany({
    take: 10,
    select: { name: true, imageUrl: true }
  });
  console.log('Sample Image URLs:', JSON.stringify(places, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
