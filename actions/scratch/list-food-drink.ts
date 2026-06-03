import { PrismaClient } from '@prisma/client';
const localUrl = "postgresql://hungnguyen:hung2004@localhost:5433/HanoiGO_db";
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: localUrl,
    },
  },
});

async function run() {
  const places = await prisma.place.findMany({
    select: { id: true, name: true, category: true, tags: true }
  });
  console.log(`Total places: ${places.length}`);
  const categories = new Set(places.map(p => p.category));
  console.log("Categories in DB:", Array.from(categories));
  
  // Find food & drink candidates
  const foodDrink = places.filter(p => {
    const name = p.name.toLowerCase();
    const cat = p.category.toLowerCase();
    const tags = p.tags.map(t => t.toLowerCase());
    return cat.includes('food') || cat.includes('drink') || cat.includes('cafe') || cat.includes('restaurant') || cat.includes('coffee') || cat.includes('bar') ||
           name.includes('cafe') || name.includes('coffee') || name.includes('quán ăn') || name.includes('nhà hàng') || name.includes('trà') || name.includes('bún') || name.includes('phở') ||
           tags.some(t => t.includes('food') || t.includes('drink') || t.includes('cafe') || t.includes('restaurant') || t.includes('coffee') || t.includes('bar') || t.includes('dining') || t.includes('ẩm thực') || t.includes('ăn uống'));
  });
  
  console.log("\nFood & Drink Candidates:");
  foodDrink.forEach(p => {
    console.log(`- ${p.name} (Cat: ${p.category}, Tags: ${p.tags.join(', ')})`);
  });
  await prisma.$disconnect();
}
run();
