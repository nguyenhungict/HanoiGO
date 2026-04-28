const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const places = await prisma.place.findMany({
    where: {
      name: {
        in: [
          "Vietnamese Women's Museum",
          "St. Joseph's Cathedral",
          "Hanoi Opera House",
          "Vietnam Military History Museum",
          "Ho Chi Minh Museum",
          "One Pillar Pagoda"
        ]
      }
    },
    select: {
      name: true,
      openTimeEnd: true,
      openDays: true,
      alwaysOpen: true
    }
  });
  console.log(places);
}

main().finally(() => prisma.$disconnect());
