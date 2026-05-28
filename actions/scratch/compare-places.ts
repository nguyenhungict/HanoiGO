import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from actions/.env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.DATABASE_URL;
const localUrl = "postgresql://hungnguyen:hung2004@localhost:5433/HanoiGO_db";

async function compare() {
  console.log('🔍 Comparing Local Database and Supabase Database...');

  const localPrisma = new PrismaClient({
    datasources: {
      db: {
        url: localUrl,
      },
    },
  });

  const supabasePrisma = new PrismaClient({
    datasources: {
      db: {
        url: supabaseUrl,
      },
    },
  });

  try {
    const localPlaces = await localPrisma.place.findMany({
      select: { name: true },
      orderBy: { name: 'asc' },
    });

    const supabasePlaces = await supabasePrisma.place.findMany({
      select: { name: true },
      orderBy: { name: 'asc' },
    });

    console.log(`\n📊 Local DB places count: ${localPlaces.length}`);
    console.log(`📊 Supabase DB places count: ${supabasePlaces.length}`);

    const localNames = new Set(localPlaces.map(p => p.name));
    const supabaseNames = new Set(supabasePlaces.map(p => p.name));

    const missingInSupabase = localPlaces.filter(p => !supabaseNames.has(p.name)).map(p => p.name);
    const missingInLocal = supabasePlaces.filter(p => !localNames.has(p.name)).map(p => p.name);

    if (missingInSupabase.length > 0) {
      console.log(`\n❌ Places in Local DB but MISSING in Supabase (${missingInSupabase.length}):`);
      missingInSupabase.forEach(name => console.log(`  - ${name}`));
    } else {
      console.log('\n✅ All places in Local DB exist in Supabase!');
    }

    if (missingInLocal.length > 0) {
      console.log(`\n⚠️ Places in Supabase but MISSING in Local DB (${missingInLocal.length}):`);
      missingInLocal.forEach(name => console.log(`  - ${name}`));
    }

  } catch (err: any) {
    console.error('Error during comparison:', err.message);
  } finally {
    await localPrisma.$disconnect();
    await supabasePrisma.$disconnect();
  }
}

compare();
