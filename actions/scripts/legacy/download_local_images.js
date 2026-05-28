const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const https = require('https');

const prisma = new PrismaClient();
const PUBLIC_DIR = path.join(__dirname, '..', 'client', 'public', 'places');

// Ensure directory exists
if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    if (!url || !url.startsWith('http')) {
      resolve(false);
      return;
    }

    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.tripadvisor.com/'
      }
    };

    https.get(url, options, (res) => {
      if (res.statusCode === 200) {
        const fileStream = fs.createWriteStream(filepath);
        res.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          resolve(true);
        });
        fileStream.on('error', (err) => {
          fs.unlink(filepath, () => reject(err));
        });
      } else if (res.statusCode === 301 || res.statusCode === 302) {
        // Handle redirect
        downloadImage(res.headers.location, filepath).then(resolve).catch(reject);
      } else {
        reject(new Error(`Failed to download image. Status Code: ${res.statusCode}`));
      }
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function main() {
  const places = await prisma.place.findMany();
  console.log(`Starting to download images for ${places.length} places...`);

  let successCount = 0;

  for (const place of places) {
    let coverDownloaded = false;
    let localCoverUrl = null;

    if (place.imageUrl && place.imageUrl.startsWith('http')) {
      // If already a local path, skip download
      if (place.imageUrl.startsWith('/places/')) continue;
      
      const ext = place.imageUrl.split('.').pop().split('?')[0] || 'jpg';
      const filename = `${place.id}-cover.${ext}`;
      const filepath = path.join(PUBLIC_DIR, filename);

      try {
        await downloadImage(place.imageUrl, filepath);
        localCoverUrl = `/places/${filename}`;
        coverDownloaded = true;
        console.log(`Downloaded cover for ${place.name}`);
      } catch (err) {
        console.error(`Error downloading cover for ${place.name}:`, err.message);
      }
    }

    // Update cover image in DB
    if (coverDownloaded) {
      await prisma.place.update({
        where: { id: place.id },
        data: { imageUrl: localCoverUrl }
      });
    }

    // Download gallery
    const galleries = await prisma.placeGallery.findMany({ where: { placeId: place.id } });
    if (galleries.length > 0) {
      for (let i = 0; i < galleries.length; i++) {
        const gal = galleries[i];
        if (gal.url && gal.url.startsWith('http') && !gal.url.startsWith('/places/')) {
          const ext = gal.url.split('.').pop().split('?')[0] || 'jpg';
          const filename = `${place.id}-gallery-${i}.${ext}`;
          const filepath = path.join(PUBLIC_DIR, filename);

          try {
            await downloadImage(gal.url, filepath);
            await prisma.placeGallery.update({
              where: { id: gal.id },
              data: { url: `/places/${filename}` }
            });
            console.log(`  Downloaded gallery image ${i} for ${place.name}`);
          } catch (err) {
            console.error(`  Error downloading gallery image ${i} for ${place.name}:`, err.message);
          }
        }
      }
    }
    
    if (coverDownloaded) successCount++;
    
    // Slight delay
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\nDownload complete! Successfully downloaded images for ${successCount}/${places.length} places.`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
