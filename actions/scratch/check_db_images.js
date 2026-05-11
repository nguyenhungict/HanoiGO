const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const activities = await prisma.$queryRaw`SELECT id, title, image_url FROM activities ORDER BY created_at DESC LIMIT 5`;
  console.log('Recent Activities:', JSON.stringify(activities, null, 2));
  
  const columns = await prisma.$queryRaw`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'activities';
  `;
  const hasImageUrl = columns.some(c => c.column_name === 'image_url');
  console.log('Has image_url column:', hasImageUrl);
}

check().catch(console.error).finally(() => prisma.$disconnect());
