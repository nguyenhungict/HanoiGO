import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface PlaceImportItem {
  id: string;
  name: string;
  category: string;
  district: string;
  address: string;
  descriptionEn: string;
  visitDurationMin: number;
  coverImageFilename: string;
  galleryFilenames: string[];
}

async function main() {
  const dataPath = path.resolve(__dirname, '../../places_import_data/places_data.json');
  const sourceImagesDir = path.resolve(__dirname, '../../places_import_data/images');
  const destUploadsDir = path.resolve(__dirname, '../public/uploads');

  if (!fs.existsSync(dataPath)) {
    console.error(`❌ Data file not found at: ${dataPath}`);
    process.exit(1);
  }

  // Ensure uploads directory exists
  if (!fs.existsSync(destUploadsDir)) {
    fs.mkdirSync(destUploadsDir, { recursive: true });
  }

  console.log('📖 Reading import data...');
  const items: PlaceImportItem[] = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  console.log(`📋 Loaded ${items.length} place records for updating.`);

  let updatedCount = 0;

  for (const item of items) {
    console.log(`\n🔄 Processing place: "${item.name}" (${item.id})`);

    let finalImageUrl: string | null = null;
    if (item.coverImageFilename) {
      const srcPath = path.join(sourceImagesDir, item.coverImageFilename);
      if (fs.existsSync(srcPath)) {
        const destFilename = `${Date.now()}_cover_${item.coverImageFilename}`;
        const destPath = path.join(destUploadsDir, destFilename);
        
        fs.copyFileSync(srcPath, destPath);
        finalImageUrl = `/uploads/${destFilename}`;
        console.log(`  📸 Copied cover image: ${item.coverImageFilename} -> ${finalImageUrl}`);
      } else {
        console.warn(`  ⚠️ Cover image file not found in images/ folder: "${item.coverImageFilename}"`);
      }
    }

    const galleryUrls: string[] = [];
    if (item.galleryFilenames && item.galleryFilenames.length > 0) {
      for (let i = 0; i < item.galleryFilenames.length; i++) {
        const filename = item.galleryFilenames[i];
        const srcPath = path.join(sourceImagesDir, filename);
        
        if (fs.existsSync(srcPath)) {
          const destFilename = `${Date.now()}_gallery_${i}_${filename}`;
          const destPath = path.join(destUploadsDir, destFilename);
          
          fs.copyFileSync(srcPath, destPath);
          const galleryUrl = `/uploads/${destFilename}`;
          galleryUrls.push(galleryUrl);
          console.log(`  🖼️ Copied gallery image [${i + 1}/${item.galleryFilenames.length}]: ${filename} -> ${galleryUrl}`);
        } else {
          console.warn(`  ⚠️ Gallery image file not found in images/ folder: "${filename}"`);
        }
      }
    }

    try {
      // Begin transaction to safely update place details and recreate gallery
      await prisma.$transaction(async (tx) => {
        // 1. Update place table
        const updateData: any = {
          descriptionEn: item.descriptionEn || null,
          visitDurationMin: item.visitDurationMin || 60,
        };
        if (finalImageUrl) {
          updateData.imageUrl = finalImageUrl;
        }

        await tx.place.update({
          where: { id: item.id },
          data: updateData,
        });

        // 2. If new gallery images are provided, replace old gallery items
        if (galleryUrls.length > 0) {
          // Delete old gallery items
          await tx.placeGallery.deleteMany({
            where: { placeId: item.id },
          });

          // Insert new ones
          await tx.placeGallery.createMany({
            data: galleryUrls.map((url) => ({
              placeId: item.id,
              url,
            })),
          });
        }
      });

      console.log(`  ✅ Successfully updated database records for "${item.name}".`);
      updatedCount++;
    } catch (err: any) {
      console.error(`  ❌ Failed to update place "${item.name}":`, err.message);
    }
  }

  console.log(`\n🎉 Import completed successfully! Updated ${updatedCount} / ${items.length} places.`);
}

main()
  .catch((e) => {
    console.error('Fatal error during import:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
