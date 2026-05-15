const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Hàm lấy ảnh từ Wikipedia
async function getWikipediaImages(query, limit = 5) {
  const headers = {
    'User-Agent': 'HanoiGO-Thesis-Project/1.0 (https://github.com/nguyenhungict/HanoiGO; hung.ict.usth@gmail.com)'
  };

  try {
    // 1. Tìm trang Wikipedia phù hợp nhất
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;
    const searchRes = await fetch(searchUrl, { headers });
    const searchData = await searchRes.json();
    
    if (!searchData.query || !searchData.query.search || searchData.query.search.length === 0) return [];
    
    const pageTitle = searchData.query.search[0].title;
    
    // 2. Lấy danh sách file ảnh trong trang đó
    const imagesUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=images&format=json&origin=*`;
    const imagesRes = await fetch(imagesUrl, { headers });
    const imagesData = await imagesRes.json();
    
    const pages = imagesData.query.pages;
    const pageId = Object.keys(pages)[0];
    const imageFiles = pages[pageId].images || [];
    
    // Lọc bỏ các icon nhỏ, logo, v.v.
    const validFiles = imageFiles.filter(img => 
      !img.title.toLowerCase().includes('icon') && 
      !img.title.toLowerCase().includes('logo') &&
      !img.title.toLowerCase().includes('stub') &&
      !img.title.toLowerCase().includes('map') &&
      !img.title.toLowerCase().includes('wikimedia-logo') &&
      (img.title.toLowerCase().endsWith('.jpg') || img.title.toLowerCase().endsWith('.png') || img.title.toLowerCase().endsWith('.jpeg'))
    ).slice(0, limit);
    
    // 3. Lấy URL trực tiếp của các file đó
    const finalUrls = [];
    for (const file of validFiles) {
      const infoUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(file.title)}&prop=imageinfo&iiprop=url&format=json&origin=*`;
      const infoRes = await fetch(infoUrl, { headers });
      const infoData = await infoRes.json();
      const infoPages = infoData.query.pages;
      const infoPageId = Object.keys(infoPages)[0];
      if (infoPages[infoPageId].imageinfo) {
        finalUrls.push(infoPages[infoPageId].imageinfo[0].url);
      }
    }
    
    return finalUrls;
  } catch (e) {
    console.error(`Error fetching images for ${query}:`, e.message);
    return [];
  }
}

async function main() {
  const places = await prisma.place.findMany();
  console.log(`Starting crawler for ${places.length} places with User-Agent...`);

  for (const place of places) {
    // Check if place already has gallery images
    const existingGalleryCount = await prisma.placeGallery.count({
      where: { placeId: place.id }
    });

    if (existingGalleryCount >= 3) {
      console.log(`Skipping ${place.name}, already has ${existingGalleryCount} images.`);
      continue;
    }

    console.log(`Processing: ${place.name}...`);
    
    const imageUrls = await getWikipediaImages(`${place.name} Hanoi`, 5);
    
    if (imageUrls.length > 0) {
      for (const url of imageUrls) {
        await prisma.placeGallery.create({
          data: {
            placeId: place.id,
            url: url
          }
        });
      }
      console.log(`  Added ${imageUrls.length} images for ${place.name}`);
      
      // Update main imageUrl
      await prisma.place.update({
        where: { id: place.id },
        data: { imageUrl: imageUrls[0] }
      });
    } else {
      console.log(`  No images found for ${place.name}`);
    }
    
    await new Promise(r => setTimeout(r, 1000)); // 1 second delay
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
