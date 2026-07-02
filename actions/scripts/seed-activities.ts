import { PrismaClient, ActivityStatus, MemberStatus, MessageType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Cleaning up existing activity and message data...');

  await prisma.messageReaction.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.activityMember.deleteMany({});
  await prisma.$executeRaw`DELETE FROM activities;`;

  console.log('🧹 Cleaned all existing activities and messages.');

  const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

  const regularUsers = await prisma.user.findMany({
    where: { username: { not: 'admin' } },
    take: 10,
  });

  if (regularUsers.length < 5) {
    console.error('❌ Need at least 5 regular users. Run npm run seed first.');
    return;
  }

  console.log('✏️  Updating seed user profiles...');
  const mockProfiles = [
    { fullName: 'Nguyễn Hoàng Nam', username: 'nam_hoang99' },
    { fullName: 'Alex Johnson',     username: 'alex_travels' },
    { fullName: 'Trần Thị Mai',     username: 'mai_streetfood' },
    { fullName: 'Emily Watson',     username: 'emily_hanoi' },
    { fullName: 'Lê Minh Tuấn',     username: 'tuan_cycling' },
    { fullName: 'Sarah Connor',     username: 'sarah_c' },
    { fullName: 'Phạm Đức Anh',     username: 'ducanh_coffee' },
    { fullName: 'Jessica Miller',   username: 'jess_explore' },
    { fullName: 'Vũ Thị Hồng',      username: 'hong_vu_heritage' },
    { fullName: 'David Evans',      username: 'david_in_vietnam' },
  ];

  for (let i = 0; i < Math.min(regularUsers.length, mockProfiles.length); i++) {
    regularUsers[i] = await prisma.user.update({
      where: { id: regularUsers[i].id },
      data: { fullName: mockProfiles[i].fullName, username: mockProfiles[i].username, status: 'ACTIVE' },
    });
  }

  const u = regularUsers; // shorthand
  const adminJoined: string[] = adminUser ? [adminUser.id] : [];

  // ── 10 activities ────────────────────────────────────────────────────────────
  // States:
  //   ONGOING   – started 45 min ago  (< 3h after scheduledAt)
  //   SOON      – starts in 1.5h      (0–2h ahead)
  //   ENDED     – started 6h ago
  //   UPCOMING  – 1/2/3 days out
  // Admin joined: activities 1, 4  |  NOT joined: 2, 3, 5, 6, 7, 8, 9, 10
  const H  = 60 * 60 * 1000;
  const D  = 24 * H;
  const now = Date.now();

  const activityData = [
    // ── 1. ONGOING · admin joined ─────────────────────────────────────────────
    {
      title: 'Hanoi Old Quarter Food Walk',
      description: 'Authentic street food crawl: Bún Chả, Phở cuốn, and the legendary Cà Phê Trứng. No food knowledge required — just an empty stomach.',
      address: 'Hoan Kiem Lake, Hanoi',
      lat: 21.0285, lng: 105.8522,
      scheduledAt: new Date(now - 45 * 60 * 1000),
      maxMembers: 8,
      category: 'Food & Drink',
      hostId: u[0].id,
      location: 'POINT(105.8522 21.0285)',
      members: [u[1].id, u[2].id, u[3].id, ...adminJoined],
      pendingMembers: [u[4].id],
      messages: [
        { userId: u[0].id,  content: 'Chào cả nhà! Chúng ta sẽ bắt đầu ở quán Bún Chả Hương Liên — hàng Obama từng ghé đây!', delayMin: 80 },
        { userId: u[1].id,  content: "I'm already here! The smell is incredible.", delayMin: 60 },
        { userId: u[2].id,  content: 'Em biết một quán Cà Phê Trứng cực ngon ở Nguyễn Hữu Huân, để em dẫn mọi người đến cuối tour.', delayMin: 40 },
        { userId: u[3].id,  content: 'Perfect plan Mai! Should we grab bánh mì first?', delayMin: 25 },
        { userId: u[0].id,  content: 'Ăn bánh mì ở chỗ Phố Hàng Bông rồi đi luôn nhé mọi người.', delayMin: 15 },
        ...(adminUser ? [{ userId: adminUser.id, content: 'Mình đang trên đường, 5 phút nữa tới!', delayMin: 8 }] : []),
        { userId: u[2].id,  content: 'Mọi người nhớ đừng ăn sáng no quá nhé 😄', delayMin: 3 },
      ],
    },

    // ── 2. ONGOING · admin NOT joined ────────────────────────────────────────
    {
      title: 'Sunrise Photography at Long Bien Bridge',
      description: 'Capture the iconic iron bridge at golden hour. We meet at the south end at 5:15 AM — sunrise is at 5:28 AM. Bring any camera you have.',
      address: 'Long Bien Bridge, Hoan Kiem, Hanoi',
      lat: 21.0441, lng: 105.8499,
      scheduledAt: new Date(now - 30 * 60 * 1000),
      maxMembers: 8,
      category: 'Sightseeing',
      hostId: u[4].id,
      location: 'POINT(105.8499 21.0441)',
      members: [u[0].id, u[3].id],
      pendingMembers: [],
      messages: [
        { userId: u[4].id, content: 'We should meet at 5:00 AM at the bridge foot. Sunrise starts around 5:25.', delayMin: 90 },
        { userId: u[0].id, content: 'Hơi sớm nhưng mình tin là ảnh sẽ cực đẹp!', delayMin: 60 },
        { userId: u[3].id, content: 'I will set 3 alarms 😂 The light at that hour is unreal.', delayMin: 30 },
        { userId: u[4].id, content: 'Trains cross at 5:10 and 5:45 — perfect for long exposure shots.', delayMin: 10 },
      ],
    },

    // ── 3. STARTING SOON · admin NOT joined ──────────────────────────────────
    {
      title: 'West Lake Sunset Cycling',
      description: 'Riding around West Lake (~17 km) then stopping for bia hơi and coconut water at Trúc Bạch. We depart at 5 PM sharp.',
      address: 'Thanh Nien Street, Ba Dinh, Hanoi',
      lat: 21.0468, lng: 105.8346,
      scheduledAt: new Date(now + 1.5 * H),
      maxMembers: 12,
      category: 'Sports & Active',
      hostId: u[1].id,
      location: 'POINT(105.8346 21.0468)',
      members: [u[0].id, u[2].id, u[4].id],
      pendingMembers: [u[5].id],
      messages: [
        { userId: u[1].id, content: 'I rented bikes at Thanh Nien Road — still 4 available if anyone needs one.', delayMin: 180 },
        { userId: u[4].id, content: 'Anh ơi giá thuê xe bao nhiêu vậy?', delayMin: 150 },
        { userId: u[1].id, content: '50k/hour. Very good condition. Just show up 15 min early to pick up.', delayMin: 120 },
        { userId: u[0].id, content: 'Đỉnh! Mình sẽ đến trước để chọn xe tốt nhất 😄', delayMin: 60 },
        { userId: u[2].id, content: 'Weather looks perfect today. See everyone soon!', delayMin: 20 },
      ],
    },

    // ── 4. STARTING SOON · admin joined ──────────────────────────────────────
    {
      title: 'Temple of Literature Morning Walk',
      description: 'Guided walk through Vietnam\'s first university. Great for history lovers and photography. We\'ll learn about the Imperial Academy and take group photos.',
      address: '58 Quoc Tu Giam, Dong Da, Hanoi',
      lat: 21.0293, lng: 105.8355,
      scheduledAt: new Date(now + 2 * H),
      maxMembers: 10,
      category: 'Arts & Culture',
      hostId: u[2].id,
      location: 'POINT(105.8355 21.0293)',
      members: [u[0].id, u[3].id, ...adminJoined],
      pendingMembers: [u[1].id],
      messages: [
        { userId: u[2].id, content: 'Đền mở cửa 8h, mình đến tầm đó chụp ảnh khi còn ít người.', delayMin: 240 },
        { userId: u[0].id, content: 'Anh mang máy ảnh cơ nhé, chụp cho mọi người mấy kiểu kỷ niệm.', delayMin: 180 },
        { userId: u[3].id, content: 'Perfect! I want to learn about the Imperial Academy history.', delayMin: 120 },
        ...(adminUser ? [{ userId: adminUser.id, content: 'Mình đặt bàn cà phê gần đó rồi, tour xong ghé luôn nhé!', delayMin: 60 }] : []),
        { userId: u[2].id, content: 'Tuyệt! Hẹn gặp mọi người tại cổng chính nhé 🏛️', delayMin: 30 },
      ],
    },

    // ── 5. ENDED · admin joined ───────────────────────────────────────────────
    {
      title: 'Beer Hoi Night at Ta Hien',
      description: 'Experience the "International Crossroads" of Hanoi. Fresh bia hơi (10k/glass), crispy nem rán, and the buzzing energy of the Old Quarter at night.',
      address: 'Ta Hien Street, Hoan Kiem, Hanoi',
      lat: 21.0345, lng: 105.8525,
      scheduledAt: new Date(now - 6 * H),
      maxMembers: 20,
      category: 'Social & Nightlife',
      hostId: u[2].id,
      location: 'POINT(105.8525 21.0345)',
      members: [u[0].id, u[1].id, u[3].id, u[4].id, ...adminJoined],
      pendingMembers: [],
      messages: [
        { userId: u[2].id, content: 'Tạ Hiện tối nay đông vui quá! Em tìm được bàn ở quán ngay ngã tư rồi.', delayMin: 360 },
        { userId: u[0].id, content: 'Đỉnh quá Mai ơi! Đang khát nước, chạy qua liền.', delayMin: 300 },
        { userId: u[4].id, content: "I'm walking from Dong Xuan market — which shop exactly?", delayMin: 240 },
        { userId: u[2].id, content: 'Quán Bia Hơi Phố Cổ, đối diện hàng bánh tráng trộn ạ chị Sarah.', delayMin: 200 },
        { userId: u[1].id, content: "I'm here! Just spotted Nam waving from across the street 😂", delayMin: 160 },
        ...(adminUser ? [{ userId: adminUser.id, content: 'Mọi người đợi mình 10p nữa nhé, đang gửi xe đầu phố.', delayMin: 120 }] : []),
        { userId: u[0].id, content: 'Haha vô đây uống bia thôi mọi người ơi! 🍻', delayMin: 60 },
        { userId: u[3].id, content: 'Best night in Hanoi so far. Same time next week? 🙌', delayMin: 10 },
      ],
    },

    // ── 6. ENDED · admin NOT joined ──────────────────────────────────────────
    {
      title: 'Ceramic Workshop at Bat Trang',
      description: 'Spend an afternoon at the ancient ceramic village. Learn to mold and glaze your own pot or teacup with master artisans. Ticket includes clay and guidance.',
      address: 'Bat Trang Ceramic Village, Gia Lam, Hanoi',
      lat: 20.9725, lng: 105.9038,
      scheduledAt: new Date(now - 4 * H),
      maxMembers: 10,
      category: 'Arts & Culture',
      hostId: u[4].id,
      location: 'POINT(105.9038 20.9725)',
      members: [u[2].id, u[3].id, u[5].id],
      pendingMembers: [],
      messages: [
        { userId: u[4].id, content: 'Bus 47 từ ga Long Biên lúc 8:00, chỉ 7k thôi mọi người.', delayMin: 300 },
        { userId: u[2].id, content: 'Em đã chuẩn bị đồ ăn nhẹ mang theo rồi anh ơi!', delayMin: 240 },
        { userId: u[3].id, content: 'Excited to try making a teacup! Do we get to keep what we make?', delayMin: 180 },
        { userId: u[4].id, content: 'Yes! They fire and pack it for you. Takes 2–3 days then you pick it up.', delayMin: 120 },
        { userId: u[5].id, content: 'Mình đến rồi nè, quán gốm đẹp lắm 😍', delayMin: 20 },
      ],
    },

    // ── 7. UPCOMING 1 day · admin NOT joined ─────────────────────────────────
    {
      title: 'Hoan Kiem Morning Tai Chi & Walk',
      description: 'Join locals for the 6 AM tai chi session at Hoan Kiem Lake, then a slow walk around the lake. Perfect for early birds who want a calm start.',
      address: 'Hoan Kiem Lake, Hoan Kiem, Hanoi',
      lat: 21.0285, lng: 105.8522,
      scheduledAt: new Date(now + 1 * D),
      maxMembers: 15,
      category: 'Sports & Active',
      hostId: u[5].id,
      location: 'POINT(105.8522 21.0285)',
      members: [u[0].id, u[7 % u.length].id],
      pendingMembers: [u[6 % u.length].id],
      messages: [
        { userId: u[5].id, content: 'Hẹn gặp mọi người lúc 5:55 AM tại cổng chính hồ Hoàn Kiếm nhé.', delayMin: 360 },
        { userId: u[0].id, content: 'Sáng sớm không khí trong lành lắm, mình rất mong chờ!', delayMin: 240 },
        { userId: u[7 % u.length].id, content: "I've always wanted to try Tai Chi with the locals. See you there!", delayMin: 120 },
      ],
    },

    // ── 8. UPCOMING 2 days · admin NOT joined ────────────────────────────────
    {
      title: 'Vietnamese Coffee Brewing Class',
      description: 'Learn to brew the perfect phin filter coffee, iced milk coffee (Cà Phê Sữa Đá), and Hà Nội–style egg coffee from a local barista. Hands-on, all levels welcome.',
      address: '95 Hang Bac, Hoan Kiem, Hanoi',
      lat: 21.0348, lng: 105.8532,
      scheduledAt: new Date(now + 2 * D),
      maxMembers: 12,
      category: 'Food & Drink',
      hostId: u[6 % u.length].id,
      location: 'POINT(105.8532 21.0348)',
      members: [u[1].id, u[3].id],
      pendingMembers: [],
      messages: [
        { userId: u[6 % u.length].id, content: 'Lớp bắt đầu lúc 14:00. Barista sẽ dạy mình 3 kiểu pha cà phê truyền thống!', delayMin: 480 },
        { userId: u[1].id, content: 'Can we practice the egg coffee recipe? I tried to make it at home and failed badly 😅', delayMin: 300 },
        { userId: u[6 % u.length].id, content: 'Đương nhiên rồi! Đó là món highlight của buổi học.', delayMin: 120 },
      ],
    },

    // ── 9. UPCOMING 3 days · admin NOT joined ────────────────────────────────
    {
      title: 'Old Quarter Night Market Exploration',
      description: 'Every Friday–Sunday the Old Quarter streets transform into a vibrant pedestrian market. We\'ll browse silk, handicrafts, street food, and end at Bia Hơi Corner.',
      address: 'Hang Dao Street, Hoan Kiem, Hanoi',
      lat: 21.0340, lng: 105.8494,
      scheduledAt: new Date(now + 3 * D),
      maxMembers: 20,
      category: 'Social & Nightlife',
      hostId: u[7 % u.length].id,
      location: 'POINT(105.8494 21.0340)',
      members: [u[0].id, u[2].id, u[5].id],
      pendingMembers: [u[8 % u.length].id, u[9 % u.length].id],
      messages: [
        { userId: u[7 % u.length].id, content: 'Meet at Đồng Xuân Market gate at 7 PM. We\'ll work our way south to Bia Hơi corner.', delayMin: 600 },
        { userId: u[2].id, content: 'Mình biết mấy hàng thổ cẩm giá tốt ở đoạn Hàng Gai, dẫn mọi người qua nhé.', delayMin: 480 },
        { userId: u[0].id, content: 'Đặc biệt đừng quên thử chả cá Lã Vọng ở phố Chả Cá nhé mọi người!', delayMin: 360 },
        { userId: u[5].id, content: 'I heard the lantern stalls are beautiful this week. Can we add that to the route?', delayMin: 180 },
      ],
    },

    // ── 10. UPCOMING 4 days · admin NOT joined ───────────────────────────────
    {
      title: 'Imperial Citadel Heritage Tour',
      description: 'A self-guided deep dive into Thăng Long Citadel — 1,000 years of dynastic history, underground bunkers from the American War, and the Ba Dinh ceremonial complex.',
      address: '19C Hoang Dieu, Ba Dinh, Hanoi',
      lat: 21.0358, lng: 105.8352,
      scheduledAt: new Date(now + 4 * D),
      maxMembers: 10,
      category: 'Sightseeing',
      hostId: u[8 % u.length].id,
      location: 'POINT(105.8352 21.0358)',
      members: [u[3].id, u[9 % u.length].id],
      pendingMembers: [],
      messages: [
        { userId: u[8 % u.length].id, content: 'Entrance fee is 30k/person. We\'ll start at the Flag Tower and work our way north.', delayMin: 720 },
        { userId: u[3].id, content: "I read that the underground HQ from the Vietnam War is included. That's fascinating!", delayMin: 600 },
        { userId: u[9 % u.length].id, content: 'Mình sẽ chuẩn bị audioguide bằng tiếng Anh và tiếng Việt cho mọi người.', delayMin: 480 },
      ],
    },
  ];

  console.log('🌱 Seeding 10 activities...');

  for (const act of activityData) {
    const [result] = await prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO "activities" (id, title, description, address, lat, lng, location, scheduled_at,
        max_members, host_id, status, created_at, category)
      VALUES (gen_random_uuid(), ${act.title}, ${act.description}, ${act.address},
        ${act.lat}, ${act.lng}, ST_GeomFromText(${act.location}, 4326),
        ${act.scheduledAt}, ${act.maxMembers}, ${act.hostId}::uuid,
        'OPEN', now(), ${act.category})
      RETURNING id
    `;
    const activityId = result.id;

    // Host
    await prisma.activityMember.create({
      data: { activityId, userId: act.hostId, status: MemberStatus.APPROVED,
              joinedAt: new Date(now - 24 * H) },
    });

    // Approved members
    for (const memberId of act.members) {
      if (!(await prisma.user.findUnique({ where: { id: memberId } }))) continue;
      const exists = await prisma.activityMember.findUnique({
        where: { activityId_userId: { activityId, userId: memberId } },
      });
      if (exists) continue;
      await prisma.activityMember.create({
        data: { activityId, userId: memberId, status: MemberStatus.APPROVED,
                joinedAt: new Date(now - 12 * H) },
      });
    }

    // Pending members
    for (const pendingId of act.pendingMembers) {
      if (!(await prisma.user.findUnique({ where: { id: pendingId } }))) continue;
      const exists = await prisma.activityMember.findUnique({
        where: { activityId_userId: { activityId, userId: pendingId } },
      });
      if (exists) continue;
      await prisma.activityMember.create({
        data: { activityId, userId: pendingId, status: MemberStatus.PENDING,
                joinedAt: new Date(now - 2 * H) },
      });
    }

    // Chat messages
    for (const msg of act.messages) {
      if (!(await prisma.user.findUnique({ where: { id: msg.userId } }))) continue;
      await prisma.message.create({
        data: {
          activityId,
          userId: msg.userId,
          content: msg.content,
          type: MessageType.TEXT,
          createdAt: new Date(now - msg.delayMin * 60 * 1000),
        },
      });
    }
  }

  console.log('✅ Seeded 10 activities:');
  console.log('   ONGOING  (admin joined)    : Hanoi Old Quarter Food Walk');
  console.log('   ONGOING  (not joined)      : Sunrise Photography at Long Bien Bridge');
  console.log('   SOON     (not joined)      : West Lake Sunset Cycling');
  console.log('   SOON     (admin joined)    : Temple of Literature Morning Walk');
  console.log('   ENDED    (admin joined)    : Beer Hoi Night at Ta Hien');
  console.log('   ENDED    (not joined)      : Ceramic Workshop at Bat Trang');
  console.log('   UPCOMING 1d (not joined)   : Hoan Kiem Morning Tai Chi & Walk');
  console.log('   UPCOMING 2d (not joined)   : Vietnamese Coffee Brewing Class');
  console.log('   UPCOMING 3d (not joined)   : Old Quarter Night Market Exploration');
  console.log('   UPCOMING 4d (not joined)   : Imperial Citadel Heritage Tour');
}

main()
  .catch((e) => { console.error('❌ Error:', e); process.exit(1); })
  .finally(async () => prisma.$disconnect());
