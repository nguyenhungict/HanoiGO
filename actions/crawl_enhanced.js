const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getImages(query, limit = 4, useTripAdvisor = true) {
  try {
    // Nếu dùng TripAdvisor thì thêm site:tripadvisor.com, nếu không thì tìm chung
    const searchQuery = encodeURIComponent(`${query} Hanoi${useTripAdvisor ? ' site:tripadvisor.com' : ''}`);
    
    const tokenRes = await fetch(`https://duckduckgo.com/?q=${searchQuery}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const html = await tokenRes.text();
    const vqdMatch = html.match(/vqd=([\d-]+)/);
    
    if (!vqdMatch) return [];
    const vqd = vqdMatch[1];
    
    const searchUrl = `https://duckduckgo.com/i.js?q=${searchQuery}&o=json&vqd=${vqd}&f=,,,&p=1`;
    const imageRes = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://duckduckgo.com/'
      }
    });
    
    const data = await imageRes.json();
    if (!data.results || data.results.length === 0) {
      // Nếu tìm TripAdvisor thất bại, thử tìm kiếm chung (Fallback)
      if (useTripAdvisor) return getImages(query, limit, false);
      return [];
    }
    
    return data.results
      .filter(img => img.image.endsWith('.jpg') || img.image.endsWith('.png') || img.image.endsWith('.jpeg'))
      .map(img => img.image)
      .slice(0, limit);
  } catch (error) {
    return [];
  }
}

async function main() {
  const places = await prisma.place.findMany();
  console.log(`Resuming enhanced image crawler for ${places.length} places...`);
  
  for (const place of places) {
    // Chỉ cào những chỗ chưa có ảnh hoặc ảnh cũ bị lỗi
    if (!place.imageUrl || place.imageUrl.includes('source.unsplash.com') || place.imageUrl.includes('wikimedia')) {
      console.log(`Crawling: ${place.name}...`);
      const images = await getImages(place.name, 4);
      
      if (images.length > 0) {
        await prisma.place.update({
          where: { id: place.id },
          data: { imageUrl: images[0] }
        });
        
        await prisma.placeGallery.deleteMany({ where: { placeId: place.id } });
        for (const img of images) {
          await prisma.placeGallery.create({
            data: { placeId: place.id, url: img }
          });
        }
        console.log(`  Done: Found ${images.length} images.`);
      } else {
        console.log(`  Skip: No images found.`);
      }
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  console.log(`Enhanced crawling complete!`);
}

main().finally(() => prisma.$disconnect());
