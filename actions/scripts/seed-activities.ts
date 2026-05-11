import { PrismaClient, ActivityStatus, MemberStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding activities mock data...');

  // 1. Get some users to act as hosts and members
  const users = await prisma.user.findMany({ take: 10 });
  if (users.length < 3) {
    console.error('❌ Need at least 3 users in the database to seed activities. Please run npm run seed first.');
    return;
  }

  // 2. Clear existing activities to avoid duplication during testing
  // Use raw execute to handle the geometry field if needed, but delete should be fine
  await prisma.activityMember.deleteMany({});
  await prisma.$executeRaw`DELETE FROM activities;`;

  const activityData = [
    {
      title: 'Hanoi Old Quarter Food Tour',
      description: 'Join us for an authentic street food experience! We will try Bun Cha, Pho, and the famous Egg Coffee. Suitable for everyone who loves food.',
      address: 'Hoan Kiem Lake, Hanoi',
      lat: 21.0285,
      lng: 105.8522,
      scheduledAt: new Date(Date.now() + 86400000), // Tomorrow
      maxMembers: 8,
      hostId: users[0].id,
      location: 'POINT(105.8522 21.0285)'
    },
    {
      title: 'West Lake Sunset Cycling',
      description: 'Riding around West Lake (17km) and then grabbing some beer/coconut water. We meet at 5 PM to catch the sunset.',
      address: 'Thanh Nien Street, Ba Dinh, Hanoi',
      lat: 21.0468,
      lng: 105.8346,
      scheduledAt: new Date(Date.now() + 172800000), // In 2 days
      maxMembers: 12,
      hostId: users[1].id,
      location: 'POINT(105.8346 21.0468)'
    },
    {
      title: 'Temple of Literature Morning Walk',
      description: 'Early morning visit to the first university of Vietnam. Great for history lovers and photography enthusiasts.',
      address: '58 Quoc Tu Giam, Dong Da, Hanoi',
      lat: 21.0293,
      lng: 105.8355,
      scheduledAt: new Date(Date.now() + 259200000), // In 3 days
      maxMembers: 10,
      hostId: users[2].id,
      location: 'POINT(105.8355 21.0293)'
    },
    {
      title: 'Beer Hoi Night at Ta Hien',
      description: 'Experience the "International Crossroads" of Hanoi. Cheap beer, great snacks, and lots of fun conversations.',
      address: 'Ta Hien Street, Hoan Kiem, Hanoi',
      lat: 21.0345,
      lng: 105.8525,
      scheduledAt: new Date(Date.now() + 345600000), // In 4 days
      maxMembers: 20,
      hostId: users[0].id,
      location: 'POINT(105.8525 21.0345)'
    },
    {
      title: 'Long Bien Bridge Photography',
      description: 'Walking across the historic Long Bien Bridge at sunrise to capture the early morning market and train.',
      address: 'Long Bien Bridge, Hanoi',
      lat: 21.0395,
      lng: 105.8575,
      scheduledAt: new Date(Date.now() + 432000000), // In 5 days
      maxMembers: 6,
      hostId: users[3 % users.length].id,
      location: 'POINT(105.8575 21.0395)'
    }
  ];

  for (const act of activityData) {
    // Insert Activity using raw query for PostGIS location
    const activityResult = await prisma.$queryRaw<any[]>`
      INSERT INTO "activities" (id, title, description, address, lat, lng, location, scheduled_at, max_members, host_id, status, created_at)
      VALUES (gen_random_uuid(), ${act.title}, ${act.description}, ${act.address}, ${act.lat}, ${act.lng}, ST_GeomFromText(${act.location}, 4326), ${act.scheduledAt}, ${act.maxMembers}, ${act.hostId}::uuid, 'OPEN', now())
      RETURNING id;
    `;

    const activityId = activityResult[0].id;

    // Add host as APPROVED member
    await prisma.activityMember.create({
      data: {
        activityId,
        userId: act.hostId,
        status: MemberStatus.APPROVED,
        joinedAt: new Date()
      }
    });

    // Add some random PENDING and APPROVED members
    const otherUsers = users.filter(u => u.id !== act.hostId);
    
    // Add 1 approved member
    if (otherUsers.length > 0) {
      await prisma.activityMember.create({
        data: {
          activityId,
          userId: otherUsers[0].id,
          status: MemberStatus.APPROVED,
          joinedAt: new Date()
        }
      });
    }

    // Add 1 pending member
    if (otherUsers.length > 1) {
      await prisma.activityMember.create({
        data: {
          activityId,
          userId: otherUsers[1].id,
          status: MemberStatus.PENDING,
          joinedAt: new Date()
        }
      });
    }
  }

  console.log('✅ Successfully seeded 5 activities with mock members!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
