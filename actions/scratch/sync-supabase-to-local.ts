import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';

// Load environment variables from actions/.env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.DATABASE_URL; // Supabase DB connection string from .env
const localUrl = "postgresql://hungnguyen:hung2004@localhost:5433/HanoiGO_db"; // Local DB connection string

const UPLOADS_DIR = path.resolve(__dirname, '../public/uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function downloadFile(url: string, destPath: string): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        resolve(false);
        return;
      }
      const fileStream = fs.createWriteStream(destPath);
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        resolve(true);
      });
      fileStream.on('error', () => {
        fs.unlink(destPath, () => resolve(false));
      });
    }).on('error', () => {
      resolve(false);
    });
  });
}

async function sync() {
  console.log('🔄 Pulling data & images from Supabase to Local Database...');

  const localPrisma = new PrismaClient({
    datasources: { db: { url: localUrl } },
  });

  const supabasePrisma = new PrismaClient({
    datasources: { db: { url: supabaseUrl } },
  });

  try {
    // 1. Fetch all data from Supabase
    const supabasePlaces = await supabasePrisma.place.findMany({
      include: { gallery: true },
    });

    console.log(`📖 Read ${supabasePlaces.length} places from Supabase.`);

    // 2. Clear Local Tables
    console.log('🧹 Clearing local places & galleries...');
    await localPrisma.placeGallery.deleteMany({});
    await localPrisma.place.deleteMany({});
    console.log('✅ Local database tables cleared.');

    // 3. Process & Download images, then insert into local DB
    for (const place of supabasePlaces) {
      let localCoverUrl = place.imageUrl;

      // If cover image is in Supabase storage, download it locally
      if (place.imageUrl && place.imageUrl.startsWith('http') && place.imageUrl.includes('.supabase.co')) {
        const filename = place.imageUrl.split('/').pop()?.split('?')[0] || `${place.id}-cover.png`;
        const destPath = path.join(UPLOADS_DIR, filename);
        console.log(`📥 Downloading cover image for "${place.name}"...`);
        const downloaded = await downloadFile(place.imageUrl, destPath);
        if (downloaded) {
          localCoverUrl = `/uploads/${filename}`;
          console.log(`   Saved locally as: ${localCoverUrl}`);
        }
      }

      // Insert place into local database
      const wkt = `SRID=4326;POINT(${place.lng} ${place.lat})`;
      
      const formatTime = (time: Date | null) => {
        if (!time) return null;
        const pad = (n: number) => n.toString().padStart(2, '0');
        // Extract UTC time as time is stored as Time column
        return `${pad(time.getUTCHours())}:${pad(time.getUTCMinutes())}:00`;
      };

      await localPrisma.$executeRawUnsafe(
        `
        INSERT INTO places (
          id, name, description_en, category, district, address,
          lat, lng, location,
          always_open, open_days, open_time_start, open_time_end,
          visit_duration_min, image_url, tags, created_at
        ) VALUES (
          $1::uuid, $2, $3, $4, $5, $6,
          $7, $8, ST_GeomFromEWKT($9),
          $10, $11, $12::time, $13::time,
          $14, $15, $16, $17
        )
        `,
        place.id,
        place.name,
        place.descriptionEn,
        place.category,
        place.district,
        place.address,
        place.lat,
        place.lng,
        wkt,
        place.alwaysOpen,
        place.openDays,
        formatTime(place.openTimeStart),
        formatTime(place.openTimeEnd),
        place.visitDurationMin,
        localCoverUrl,
        place.tags,
        place.createdAt,
      );

      // Insert gallery images into local database
      if (place.gallery && place.gallery.length > 0) {
        for (const galleryItem of place.gallery) {
          let localGalleryUrl = galleryItem.url;

          if (galleryItem.url && galleryItem.url.startsWith('http') && galleryItem.url.includes('.supabase.co')) {
            const filename = galleryItem.url.split('/').pop()?.split('?')[0] || `${galleryItem.id}-gallery.png`;
            const destPath = path.join(UPLOADS_DIR, filename);
            console.log(`📥 Downloading gallery image for "${place.name}"...`);
            const downloaded = await downloadFile(galleryItem.url, destPath);
            if (downloaded) {
              localGalleryUrl = `/uploads/${filename}`;
              console.log(`   Saved gallery locally: ${localGalleryUrl}`);
            }
          }

          await localPrisma.placeGallery.create({
            data: {
              id: galleryItem.id,
              placeId: place.id,
              url: localGalleryUrl,
              createdAt: galleryItem.createdAt,
            },
          });
        }
      }
    }

    console.log('\n🎉 Sync completed successfully! All data and Supabase Storage images have been pulled down and configured locally.');
  } catch (err: any) {
    console.error('❌ Error during synchronization:', err.message);
  } finally {
    await localPrisma.$disconnect();
    await supabasePrisma.$disconnect();
  }
}

sync();
