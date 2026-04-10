import { PrismaClient, Role, ViolationType, ReportStatus, UserStatus, ActivityStatus, MemberStatus, NotificationType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding admin dashboard data...');

  const passwordHash = await bcrypt.hash('password123', 12);

  // 1. Create 20 Users spread over 30 days
  const users = [];
  for (let i = 0; i < 20; i++) {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30));
    
    users.push({
      email: `user${i}@example.com`,
      username: `user_${i}`,
      passwordHash,
      fullName: `User Number ${i}`,
      role: Role.USER,
      status: i % 5 === 0 ? UserStatus.BANNED : UserStatus.ACTIVE,
      createdAt: date,
    });
  }

  await prisma.user.createMany({
    data: users,
    skipDuplicates: true,
  });

  // 2. Create some Places
  const places = [
    { name: 'Hồ Hoàn Kiếm', category: 'Sightseeing', district: 'Hoàn Kiếm', lat: 21.0285, lng: 105.8522, location: 'SRID=4326;POINT(105.8522 21.0285)' },
    { name: 'Văn Miếu Quốc Tử Giám', category: 'Culture', district: 'Đống Đa', lat: 21.0293, lng: 105.8355, location: 'SRID=4326;POINT(105.8355 21.0293)' },
    { name: 'Lăng Chủ tịch Hồ Chí Minh', category: 'Culture', district: 'Ba Đình', lat: 21.0368, lng: 105.8346, location: 'SRID=4326;POINT(105.8346 21.0368)' },
  ];

  // We need to use raw query for location because of PostGIS
  for (const p of places) {
    await prisma.$executeRaw`
      INSERT INTO places (id, name, category, district, lat, lng, location, created_at)
      VALUES (gen_random_uuid(), ${p.name}, ${p.category}, ${p.district}, ${p.lat}, ${p.lng}, ST_GeomFromText(${p.location}), now())
      ON CONFLICT DO NOTHING;
    `;
  }

  const dbUsers = await prisma.user.findMany({ take: 5 });
  const dbPlaces = await prisma.place.findMany({ take: 3 });

  // 3. Create Reports
  const violationTypes = Object.values(ViolationType);
  for (let i = 0; i < 10; i++) {
    await prisma.report.create({
      data: {
        reporterId: dbUsers[0].id,
        targetId: dbUsers[1].id,
        reason: violationTypes[i % violationTypes.length],
        description: `This is sample report number ${i}`,
        status: i % 3 === 0 ? ReportStatus.PENDING : ReportStatus.RESOLVED,
        createdAt: new Date(),
      },
    });
  }

  // 4. Create Trips and TripStops for popularity
  for (let i = 0; i < 10; i++) {
    const trip = await prisma.trip.create({
      data: {
        userId: dbUsers[i % dbUsers.length].id,
        title: `Trip ${i}`,
        numDays: 1,
      },
    });

    const tripDay = await prisma.tripDay.create({
      data: {
        tripId: trip.id,
        dayNumber: 1,
      },
    });

    await prisma.tripStop.create({
      data: {
        tripDayId: tripDay.id,
        placeId: dbPlaces[i % dbPlaces.length].id,
        stopOrder: 1,
      },
    });
  }

  console.log('✅ Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
