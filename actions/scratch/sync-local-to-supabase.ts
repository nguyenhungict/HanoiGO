import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from actions/.env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.DATABASE_URL;
const localUrl = "postgresql://hungnguyen:hung2004@localhost:5433/HanoiGO_db";

async function sync() {
  console.log('🔄 Syncing Local Database to Supabase Database...');

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
    // 1. Fetch all places from local database
    const localPlaces = await localPrisma.place.findMany({
      orderBy: { name: 'asc' },
    });

    console.log(`📖 Read ${localPlaces.length} places from Local DB.`);

    // Fetch all gallery images from local database
    const localGallery = await localPrisma.placeGallery.findMany({});
    console.log(`📖 Read ${localGallery.length} gallery images from Local DB.`);

    // 2. Clear existing places & gallery in Supabase
    console.log('🧹 Clearing existing data in Supabase (place_gallery & places)...');
    await supabasePrisma.placeGallery.deleteMany({});
    await supabasePrisma.place.deleteMany({});
    console.log('✅ Supabase tables cleared.');

    // 3. Insert places into Supabase preserving all details
    console.log(`🚀 Inserting ${localPlaces.length} places into Supabase...`);
    let insertedPlaces = 0;

    for (const place of localPlaces) {
      const wkt = `SRID=4326;POINT(${place.lng} ${place.lat})`;

      // Formats Time to HH:MM:SS or null
      const formatTime = (time: Date | null) => {
        if (!time) return null;
        const pad = (n: number) => n.toString().padStart(2, '0');
        // Extract time from Date object
        const hours = pad(time.getHours());
        const minutes = pad(time.getMinutes());
        const seconds = pad(time.getSeconds());
        return `${hours}:${minutes}:${seconds}`;
      };

      await supabasePrisma.$executeRawUnsafe(
        `
        INSERT INTO places (
          id, name, description_en, category, district, address,
          lat, lng, location,
          always_open, open_days, open_time_start, open_time_end,
          has_break, break_start, break_end,
          visit_duration_min, image_url, tags, created_at
        ) VALUES (
          $1::uuid, $2, $3, $4, $5, $6,
          $7, $8, ST_GeomFromEWKT($9),
          $10, $11, $12::time, $13::time,
          $14, $15::time, $16::time,
          $17, $18, $19, $20
        )
        `,
        place.id,                                         // $1
        place.name,                                       // $2
        place.descriptionEn,                              // $3
        place.category,                                   // $4
        place.district,                                   // $5
        place.address,                                    // $6
        place.lat,                                        // $7
        place.lng,                                        // $8
        wkt,                                              // $9
        place.alwaysOpen,                                 // $10
        place.openDays,                                   // $11
        formatTime(place.openTimeStart),                  // $12
        formatTime(place.openTimeEnd),                    // $13
        place.hasBreak,                                   // $14
        formatTime(place.breakStart),                     // $15
        formatTime(place.breakEnd),                       // $16
        place.visitDurationMin,                           // $17
        place.imageUrl,                                   // $18
        place.tags,                                       // $19
        place.createdAt,                                  // $20
      );
      insertedPlaces++;
    }

    console.log(`✅ Successfully synced ${insertedPlaces} places.`);

    // 4. Sync Gallery images if any
    if (localGallery.length > 0) {
      console.log(`🚀 Syncing ${localGallery.length} gallery images into Supabase...`);
      await supabasePrisma.placeGallery.createMany({
        data: localGallery.map(g => ({
          id: g.id,
          placeId: g.placeId,
          url: g.url,
          createdAt: g.createdAt,
        })),
      });
      console.log(`✅ Successfully synced gallery images.`);
    }

    console.log('\n🎉 Synchronization complete! Supabase database is now a perfect match of your Local Database.');

  } catch (err: any) {
    console.error('❌ Error during synchronization:', err.message);
  } finally {
    await localPrisma.$disconnect();
    await supabasePrisma.$disconnect();
  }
}

sync();
