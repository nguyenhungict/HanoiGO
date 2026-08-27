import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

const REMAINING_MAP: Record<string, string> = {
  'Đường Tàu': 'Street & Market',
  'Ho Tay Water Park': 'Nature & Lake',
  'USTH': 'Historic Site',
  'Times City': 'Street & Market',
  'Lotte Mall West Lake': 'Street & Market',
  'Lotte Observation Deck': 'Arts & Performance',
  'Landmark 72 Sky View': 'Arts & Performance',
  'Royal City Vincom Mega Mall': 'Street & Market',
};

async function main() {
  for (const [name, category] of Object.entries(REMAINING_MAP)) {
    await prisma.place.updateMany({
      where: { name },
      data: { category },
    });
    console.log(`✅ Updated "${name}" -> ${category}`);
  }
  await prisma.$disconnect();
}

main();
