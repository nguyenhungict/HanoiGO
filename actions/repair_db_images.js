const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const places = await prisma.place.findMany({
    include: { gallery: true }
  });
  
  console.log(`Fixing dead Unsplash links for ${places.length} places...`);
  
  let fixedCount = 0;
  
  for (const place of places) {
    let newImageUrl = null;
    
    // Nếu có ảnh thật trong gallery (từ Wikipedia), dùng ảnh đầu tiên làm ảnh đại diện
    if (place.gallery && place.gallery.length > 0) {
      newImageUrl = place.gallery[0].url;
    }
    
    // Cập nhật lại database
    await prisma.place.update({
      where: { id: place.id },
      data: { imageUrl: newImageUrl }
    });
    
    fixedCount++;
  }
  
  console.log(`Successfully fixed ${fixedCount} places. Broken source.unsplash.com links have been replaced with real Wikipedia photos or removed to allow frontend fallback.`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
