import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const prisma = new PrismaClient();
  const places = await prisma.place.findMany({
    take: 5,
    select: { name: true, imageUrl: true },
  });
  console.log('Places from DB:');
  for (const p of places) {
    console.log(`- ${p.name}: ${p.imageUrl}`);
  }

  const gallery = await prisma.placeGallery.findMany({
    take: 5,
    select: { place: { select: { name: true } }, url: true },
  });
  console.log('\nGallery from DB:');
  for (const g of gallery) {
    console.log(`- ${g.place?.name}: ${g.url}`);
  }

  await prisma.$disconnect();
}

main();
