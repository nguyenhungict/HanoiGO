const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testDB() {
  try {
    const landmarks = await prisma.place.findMany({
      select: {
        name: true,
        category: true,
        district: true,
        lat: true,
        lng: true,
        address: true,
        descriptionEn: true,
      },
      take: 5,
    });
    console.log('Query OK, count:', landmarks.length);
    console.log('Sample:', landmarks[0]);
  } catch (err) {
    console.error('Query FAILED:', err);
  } finally {
    await prisma.$disconnect();
  }
}

testDB();
