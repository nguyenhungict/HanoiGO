import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const activities = await prisma.activity.findMany({
    where: {
      tripId: {
        not: null
      }
    },
    include: {
      trip: {
        include: {
          tripDays: {
            include: {
              tripStops: {
                include: {
                  place: true
                }
              }
            }
          }
        }
      }
    }
  });
  console.log('--- DB WITH INCLUDE ---');
  console.log(JSON.stringify(activities.slice(0, 1), null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
