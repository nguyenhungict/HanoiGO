const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Hàm cào ảnh bằng cách mô phỏng DuckDuckGo Image Search (không bị chặn API)
// Chúng ta sẽ thêm "site:tripadvisor.com" để lấy ảnh từ TripAdvisor
async function getTripAdvisorImages(query, limit = 4) {
  try {
    const searchQuery = encodeURIComponent(`${query} Hanoi site:tripadvisor.com`);
    // Lấy token vqd (yêu cầu bắt buộc của DDG)
    const tokenRes = await fetch(`https://duckduckgo.com/?q=${searchQuery}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const html = await tokenRes.text();
    const vqdMatch = html.match(/vqd=([\d-]+)/);
    
    if (!vqdMatch) return [];
    
    const vqd = vqdMatch[1];
    
    // Gọi API tìm kiếm ảnh
    const searchUrl = `https://duckduckgo.com/i.js?q=${searchQuery}&o=json&vqd=${vqd}&f=,,,&p=1`;
    const imageRes = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Referer': 'https://duckduckgo.com/'
      }
    });
    
    const data = await imageRes.json();
    if (!data.results || data.results.length === 0) return [];
    
    // Chỉ lấy ảnh jpg/png, ưu tiên ảnh có độ phân giải tốt
    return data.results
      .filter(img => img.image.endsWith('.jpg') || img.image.endsWith('.png') || img.image.endsWith('.jpeg'))
      .map(img => img.image)
      .slice(0, limit);
  } catch (error) {
    console.log(`Failed to fetch DDG for ${query}: ${error.message}`);
    return [];
  }
}

async function main() {
  const places = await prisma.place.findMany();
  console.log(`Starting TripAdvisor Image Crawler for ${places.length} places...`);
  
  let successCount = 0;

  for (const place of places) {
    console.log(`\nCrawling TripAdvisor for: ${place.name}...`);
    
    // Lấy ảnh TripAdvisor
    const images = await getTripAdvisorImages(place.name, 4);
    
    if (images.length > 0) {
      console.log(`Found ${images.length} images for ${place.name}`);
      
      // Lấy ảnh đầu tiên làm ảnh đại diện chính
      const coverImage = images[0];
      await prisma.place.update({
        where: { id: place.id },
        data: { imageUrl: coverImage }
      });
      
      // Cập nhật lại Gallery
      await prisma.placeGallery.deleteMany({ where: { placeId: place.id } });
      for (const img of images) {
        await prisma.placeGallery.create({
          data: { placeId: place.id, url: img }
        });
      }
      
      successCount++;
    } else {
      console.log(`No TripAdvisor images found for ${place.name}. Fallback to null.`);
      // Set null để Frontend dùng fallback tĩnh từ Unsplash
      await prisma.place.update({
        where: { id: place.id },
        data: { imageUrl: null }
      });
      await prisma.placeGallery.deleteMany({ where: { placeId: place.id } });
    }
    
    // Nghỉ 1.5s để tránh bị search engine block IP
    await new Promise(r => setTimeout(r, 1500));
  }
  
  console.log(`\nCrawling complete! Successfully updated ${successCount}/${places.length} places with TripAdvisor images.`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
