const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Hàm lấy ảnh từ Unsplash (Chất lượng cao, ổn định)
async function getUnsplashImage(query) {
  try {
    const url = `https://images.unsplash.com/photo-1599708153386-62bf3f03361a?w=800&q=80`; // Mặc định Hanoi
    // Để chuyên nghiệp hơn, ta dùng source.unsplash.com hoặc tìm kiếm trực tiếp
    // Vì không có API Key, ta dùng link redirect thông minh của Unsplash
    return `https://source.unsplash.com/featured/?${encodeURIComponent(query + ' Hanoi')}`;
  } catch (e) {
    return null;
  }
}

// Hàm lấy ảnh từ Wikipedia (Thực tế, chi tiết)
async function getWikipediaImages(query, limit = 5) {
  const headers = { 'User-Agent': 'HanoiGO-Project/1.0' };
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;
    const searchRes = await fetch(searchUrl, { headers });
    const searchData = await searchRes.json();
    if (!searchData.query?.search?.length) return [];
    
    const pageTitle = searchData.query.search[0].title;
    const imagesUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=images&format=json&origin=*`;
    const imagesRes = await fetch(imagesUrl, { headers });
    const imagesData = await imagesRes.json();
    
    const pages = imagesData.query.pages;
    const pageId = Object.keys(pages)[0];
    const imageFiles = (pages[pageId].images || []).filter(img => 
      img.title.toLowerCase().endsWith('.jpg') || img.title.toLowerCase().endsWith('.jpeg')
    ).slice(0, limit);
    
    const urls = [];
    for (const file of imageFiles) {
      const infoUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(file.title)}&prop=imageinfo&iiprop=url&format=json&origin=*`;
      const infoRes = await fetch(infoUrl, { headers });
      const infoData = await infoRes.json();
      const infoPageId = Object.keys(infoData.query.pages)[0];
      if (infoData.query.pages[infoPageId].imageinfo) {
        urls.push(infoData.query.pages[infoPageId].imageinfo[0].url);
      }
    }
    return urls;
  } catch (e) { return []; }
}

async function main() {
  const places = await prisma.place.findMany();
  console.log(`Fixing images for ${places.length} places...`);

  for (const place of places) {
    console.log(`Processing: ${place.name}`);
    
    // 1. Lấy ảnh Unsplash làm ảnh đại diện (Đảm bảo không lỗi font/link)
    const unsplashUrl = `https://images.unsplash.com/photo-1555921015-5532091f6026?w=800&q=80`; // Fallback
    const mainImageUrl = `https://source.unsplash.com/800x600/?${encodeURIComponent(place.name.replace(' ', '+'))}`;
    
    // 2. Lấy thêm ảnh Wikipedia cho Gallery
    const wikiImages = await getWikipediaImages(place.name, 3);
    
    // Cập nhật Database
    await prisma.place.update({
      where: { id: place.id },
      data: { imageUrl: mainImageUrl }
    });

    // Xóa gallery cũ và thêm mới
    await prisma.placeGallery.deleteMany({ where: { placeId: place.id } });
    for (const url of wikiImages) {
      await prisma.placeGallery.create({
        data: { placeId: place.id, url: url }
      });
    }
    
    console.log(`  Updated ${place.name} with Unsplash cover and ${wikiImages.length} Wiki images.`);
    await new Promise(r => setTimeout(r, 300));
  }
}

main().finally(() => prisma.$disconnect());
