import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const activities = await prisma.activity.findMany({
    include: {
      host: true,
      activityMembers: true,
    }
  });
  console.log(JSON.stringify(activities, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
