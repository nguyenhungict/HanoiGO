import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Fetching existing places from database...');
  const places = await prisma.place.findMany({
    include: {
      gallery: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  console.log(`📋 Found ${places.length} places. Formatting data...`);

  const formatted = places.map((place) => {
    // Check if place already has non-placeholder image
    const hasImage = place.imageUrl && !place.imageUrl.includes('unsplash.com');
    const galleryFilenames = place.gallery
      .map(g => g.url)
      .filter(url => !url.includes('unsplash.com'))
      .map(url => path.basename(url));

    return {
      id: place.id,
      name: place.name,
      category: place.category,
      district: place.district,
      address: place.address || '',
      descriptionEn: place.descriptionEn || '',
      visitDurationMin: place.visitDurationMin || 60,
      coverImageFilename: hasImage ? path.basename(place.imageUrl!) : '',
      galleryFilenames: galleryFilenames,
    };
  });

  const targetDir = path.resolve(__dirname, '../../places_import_data');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const imagesDir = path.join(targetDir, 'images');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  const jsonPath = path.join(targetDir, 'places_data.json');
  fs.writeFileSync(jsonPath, JSON.stringify(formatted, null, 2), 'utf-8');

  console.log(`✨ Successfully exported places to: ${jsonPath}`);
  console.log(`📁 Please put images inside: ${imagesDir}`);
}

main()
  .catch((e) => {
    console.error('Error exporting places:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
