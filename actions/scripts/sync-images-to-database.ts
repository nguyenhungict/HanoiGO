import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'hanoigo-uploads';
let supabaseUrl = process.env.SUPABASE_URL;
if (!supabaseUrl && process.env.DATABASE_URL) {
  const match = process.env.DATABASE_URL.match(/postgres\.([a-z0-9]+)/i);
  if (match && match[1]) {
    supabaseUrl = `https://${match[1]}.supabase.co`;
  }
}

const CDN_BASE = `${supabaseUrl}/storage/v1/object/public/${SUPABASE_BUCKET}`;

function toSlug(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

async function main() {
  const uploadsDir = path.resolve(__dirname, '../public/uploads');
  const uploadedFiles = fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir) : [];

  console.log(`📁 Found ${uploadedFiles.length} uploaded files in storage.`);
  console.log(`🌐 CDN Base: ${CDN_BASE}`);

  const dbPlaces = await prisma.place.findMany({
    orderBy: { name: 'asc' },
  });
  console.log(`📖 Found ${dbPlaces.length} places in Database.\n`);

  let updatedCount = 0;

  for (const place of dbPlaces) {
    const slug = toSlug(place.name);

    // 1. Find matching cover image
    const coverFile = uploadedFiles.find(
      (f) => f.includes(`_cover_${slug}_`) || f.includes(`_cover_${slug}.`) || f.includes(`${slug}_cover`)
    );

    const coverUrl = coverFile ? `${CDN_BASE}/${coverFile}` : null;

    // 2. Find matching gallery images
    const galleryFiles = uploadedFiles.filter(
      (f) =>
        (f.includes(`_gallery_`) && f.includes(`_${slug}_`)) ||
        (f.includes(`_gallery_`) && f.includes(`_${slug}.`)) ||
        (f.includes(`${slug}_`) && !f.includes(`_cover_`))
    );

    const galleryUrls = galleryFiles.map((f) => `${CDN_BASE}/${f}`);

    // 3. Update Place in Database
    await prisma.$transaction(async (tx) => {
      if (coverUrl) {
        await tx.place.update({
          where: { id: place.id },
          data: { imageUrl: coverUrl },
        });
      }

      if (galleryUrls.length > 0) {
        await tx.placeGallery.deleteMany({
          where: { placeId: place.id },
        });

        await tx.placeGallery.createMany({
          data: galleryUrls.map((url) => ({
            placeId: place.id,
            url,
          })),
        });
      }
    });

    if (coverUrl || galleryUrls.length > 0) {
      updatedCount++;
      console.log(`✅ [${updatedCount}] "${place.name}" (slug: ${slug}):`);
      console.log(`   📸 Cover: ${coverUrl ? 'YES' : 'NONE'}`);
      console.log(`   🖼️ Gallery: ${galleryUrls.length} images`);
    } else {
      console.log(`⚠️ No image match found for: "${place.name}" (slug: ${slug})`);
    }
  }

  console.log(`\n========================================`);
  console.log(`🎉 Database image synchronization complete!`);
  console.log(`📊 Successfully linked images for: ${updatedCount}/${dbPlaces.length} places.`);
  console.log(`========================================\n`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('❌ Error syncing images to DB:', err);
  process.exit(1);
});
