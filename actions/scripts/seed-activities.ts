import { PrismaClient, MemberStatus, MessageType } from '@prisma/client';

const prisma = new PrismaClient();

// Hanoi is UTC+7; anchoring the offset explicitly keeps the seeded clock times
// stable no matter what timezone the machine running the script is set to.
const HANOI_OFFSET = '+07:00';

/**
 * A wall-clock time on a day relative to today, in Hanoi time.
 * dayAt(1, 9, 30) → tomorrow 09:30 Hanoi.
 */
function dayAt(daysAhead: number, hour: number, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const p = (n: number) => String(n).padStart(2, '0');
  return new Date(
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` +
      `T${p(hour)}:${p(minute)}:00${HANOI_OFFSET}`,
  );
}

async function main() {
  console.log('🌱 Cleaning up existing activity and message data...');

  await prisma.messageReaction.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.activityMember.deleteMany({});
  await prisma.$executeRaw`DELETE FROM activities;`;

  console.log('🧹 Cleaned all existing activities and messages.');

  const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

  // Only USER-role accounts are treated as seed participants. Selecting by
  // `username != 'admin'` would sweep in the real admin account
  // (admin-hanoigo) and rename it below.
  const regularUsers = await prisma.user.findMany({
    where: { role: 'USER' },
    orderBy: { createdAt: 'asc' },
    take: 10,
  });

  if (regularUsers.length < 4) {
    console.error('❌ Need at least 4 USER-role accounts. Run npm run seed first.');
    return;
  }

  console.log(`✏️  Updating ${regularUsers.length} seed user profiles...`);
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
    const target = mockProfiles[i];

    // Re-running the seed must not fail on the unique username constraint:
    // these accounts usually already carry a mock username, just not in
    // createdAt order. Only claim the name when no other account holds it.
    const holder = await prisma.user.findUnique({
      where: { username: target.username },
    });
    const usernameIsFree = !holder || holder.id === regularUsers[i].id;

    regularUsers[i] = await prisma.user.update({
      where: { id: regularUsers[i].id },
      data: {
        ...(usernameIsFree
          ? { username: target.username, fullName: target.fullName }
          : {}),
        status: 'ACTIVE',
      },
    });
  }

  const u = regularUsers;
  // Wraps the index so the dataset never depends on how many seed users exist.
  const pick = (i: number) => u[i % u.length].id;
  const adminJoined: string[] = adminUser ? [adminUser.id] : [];

  const H = 60 * 60 * 1000;
  const now = Date.now();

  // ── Activity dataset ────────────────────────────────────────────────────────
  // Two things are being exercised here:
  //
  // 1. MARKER STATES — the client derives upcoming/soon/ongoing/ended from
  //    scheduledAt vs now, so the first three activities use times relative to
  //    the moment of seeding. Everything dated D+1..D+3 renders as "upcoming".
  //
  // 2. PROXIMITY — distances below are straight-line from Hoan Kiem Lake
  //    (21.0285, 105.8522), the natural demo centre. The spread is deliberate:
  //    a 2 km radius keeps roughly half, 5 km keeps most, and the three
  //    outlying sites (Bat Trang, Co Loa, Van Phuc) only appear past ~8 km.
  //    Without that spread a radius filter looks like it does nothing.
  const activityData = [
    // ── TODAY · relative times, for the four marker states ──────────────────
    {
      title: 'Old Quarter Street Food Walk',
      description:
        'Authentic street food crawl: Bún Chả, Phở cuốn, and the legendary Cà Phê Trứng. No food knowledge required — just an empty stomach.',
      address: 'Hoan Kiem Lake, Hoan Kiem, Hanoi',
      lat: 21.0285, lng: 105.8522, // 0.0 km
      scheduledAt: new Date(now - 45 * 60 * 1000), // ONGOING
      maxMembers: 8,
      category: 'Food & Drink',
      hostId: pick(0),
      members: [pick(1), pick(2), pick(3), ...adminJoined],
      pendingMembers: [pick(4)],
      messages: [
        { userId: pick(0), content: 'Chào cả nhà! Mình bắt đầu ở quán Bún Chả Hương Liên nhé.', delayMin: 80 },
        { userId: pick(1), content: "I'm already here! The smell is incredible.", delayMin: 60 },
        { userId: pick(2), content: 'Em biết một quán Cà Phê Trứng cực ngon ở Nguyễn Hữu Huân, để em dẫn mọi người tới cuối tour.', delayMin: 40 },
        { userId: pick(3), content: 'Perfect plan! Should we grab bánh mì first?', delayMin: 25 },
        ...(adminUser ? [{ userId: adminUser.id, content: 'Mình đang trên đường, 5 phút nữa tới!', delayMin: 8 }] : []),
      ],
    },
    {
      title: 'Ta Hien Beer Street Meetup',
      description:
        'Fresh bia hơi at 10k a glass on the "International Crossroads". Easy first meetup if you just landed in Hanoi.',
      address: 'Ta Hien Street, Hoan Kiem, Hanoi',
      lat: 21.0345, lng: 105.8525, // 0.7 km
      scheduledAt: new Date(now + 1.5 * H), // STARTING SOON
      maxMembers: 20,
      category: 'Social & Nightlife',
      hostId: pick(2),
      members: [pick(0), pick(1)],
      pendingMembers: [pick(3)],
      messages: [
        { userId: pick(2), content: 'Em giữ được bàn ngay ngã tư Tạ Hiện — Lương Ngọc Quyến rồi nhé.', delayMin: 150 },
        { userId: pick(0), content: 'Đỉnh! Tầm này phố bắt đầu đông rồi đấy.', delayMin: 90 },
        { userId: pick(1), content: 'Walking over from Dong Xuan now, see you in 15.', delayMin: 30 },
      ],
    },
    {
      title: 'Hoa Lo Prison History Tour',
      description:
        'Guided morning visit through the colonial-era prison museum. The audio guide is genuinely one of the best in Hanoi.',
      address: '1 Hoa Lo, Hoan Kiem, Hanoi',
      lat: 21.0246, lng: 105.8467, // 0.7 km
      scheduledAt: new Date(now - 6 * H), // ENDED
      maxMembers: 12,
      category: 'Arts & Culture',
      hostId: pick(3),
      members: [pick(1), pick(4), ...adminJoined],
      pendingMembers: [],
      messages: [
        { userId: pick(3), content: 'Tickets are 50k, audio guide 100k — worth every dong.', delayMin: 420 },
        { userId: pick(1), content: 'Mình đã tới rồi, đang đợi ở cổng chính.', delayMin: 380 },
        ...(adminUser ? [{ userId: adminUser.id, content: 'Cảm ơn mọi người, tour hôm nay rất hay!', delayMin: 300 }] : []),
      ],
    },

    // ── DAY +1 ──────────────────────────────────────────────────────────────
    {
      title: 'Sunrise Tai Chi at Hoan Kiem',
      description:
        'Join the locals for morning tai chi by the lake, then a walk around the water before the heat sets in. All levels welcome.',
      address: 'Hoan Kiem Lake, Hoan Kiem, Hanoi',
      lat: 21.0288, lng: 105.8525, // 0.1 km
      scheduledAt: dayAt(1, 5, 30),
      maxMembers: 15,
      category: 'Sports & Active',
      hostId: pick(1),
      members: [pick(0), pick(2)],
      pendingMembers: [pick(4)],
      messages: [
        { userId: pick(1), content: 'We meet at the Ly Thai To statue at 5:20. The group starts sharp at 5:30.', delayMin: 600 },
        { userId: pick(0), content: 'Dậy sớm được là đáng lắm, hồ lúc bình minh rất đẹp.', delayMin: 480 },
        { userId: pick(2), content: 'Em sẽ mang thêm mấy chai nước cho mọi người.', delayMin: 240 },
      ],
    },
    {
      title: 'Temple of Literature Morning Walk',
      description:
        "Guided walk through Vietnam's first university. Great for history lovers and photography — we'll cover the Imperial Academy and the stelae of doctors.",
      address: '58 Quoc Tu Giam, Dong Da, Hanoi',
      lat: 21.0293, lng: 105.8355, // 1.7 km
      scheduledAt: dayAt(1, 9, 0),
      maxMembers: 10,
      category: 'Arts & Culture',
      hostId: pick(2),
      members: [pick(0), pick(3), ...adminJoined],
      pendingMembers: [pick(1)],
      messages: [
        { userId: pick(2), content: 'Đền mở cửa 8h, mình vào tầm 9h là vừa đẹp, đỡ nắng và đỡ đông.', delayMin: 720 },
        { userId: pick(0), content: 'Anh mang máy ảnh cơ nhé, chụp cho mọi người mấy kiểu kỷ niệm.', delayMin: 600 },
        { userId: pick(3), content: 'I want to learn about the Imperial Academy history. Is there an English guide?', delayMin: 420 },
        ...(adminUser ? [{ userId: adminUser.id, content: 'Có audio guide tiếng Anh ngay quầy vé nhé bạn.', delayMin: 360 }] : []),
      ],
    },
    {
      title: 'Imperial Citadel Heritage Tour',
      description:
        'UNESCO site tour covering the Flag Tower, Doan Mon gate, and the underground D67 command bunker from the war.',
      address: '19C Hoang Dieu, Ba Dinh, Hanoi',
      lat: 21.0358, lng: 105.8352, // 2.0 km
      scheduledAt: dayAt(1, 14, 0),
      maxMembers: 12,
      category: 'Sightseeing',
      hostId: pick(4),
      members: [pick(3)],
      pendingMembers: [],
      messages: [
        { userId: pick(4), content: 'Entrance is 30k. We start at the Flag Tower and work north to D67.', delayMin: 900 },
        { userId: pick(3), content: "The underground war HQ is included? That's fascinating.", delayMin: 780 },
      ],
    },
    {
      title: 'West Lake Sunset Cycling',
      description:
        'Riding the full loop around West Lake (~17 km) at an easy pace, finishing with bia hơi and coconut water at Truc Bach.',
      address: 'Thanh Nien Street, Ba Dinh, Hanoi',
      lat: 21.0468, lng: 105.8346, // 2.8 km
      scheduledAt: dayAt(1, 16, 30),
      maxMembers: 12,
      category: 'Sports & Active',
      hostId: pick(1),
      members: [pick(0), pick(2), pick(4)],
      pendingMembers: [pick(3)],
      messages: [
        { userId: pick(1), content: 'I rented bikes on Thanh Nien Road — still 4 available if anyone needs one.', delayMin: 960 },
        { userId: pick(4), content: 'Anh ơi giá thuê xe bao nhiêu vậy?', delayMin: 840 },
        { userId: pick(1), content: '50k/hour, good condition. Show up 15 min early to pick one.', delayMin: 720 },
        { userId: pick(0), content: 'Mình sẽ đến sớm để chọn xe tốt nhất 😄', delayMin: 300 },
      ],
    },
    {
      title: 'Dong Xuan Night Market Food Crawl',
      description:
        'The night market on a weekend evening: bánh tráng nướng, nem chua rán, and the food alley behind the market hall.',
      address: 'Dong Xuan Market, Hoan Kiem, Hanoi',
      lat: 21.0382, lng: 105.8497, // 1.1 km
      scheduledAt: dayAt(1, 19, 30),
      maxMembers: 10,
      category: 'Food & Drink',
      hostId: pick(2),
      members: [pick(1), pick(3)],
      pendingMembers: [pick(0)],
      messages: [
        { userId: pick(2), content: 'Chợ đêm cuối tuần đông lắm, mọi người giữ đồ cẩn thận nhé.', delayMin: 1080 },
        { userId: pick(1), content: 'Is the food alley behind the market still open that late?', delayMin: 900 },
        { userId: pick(2), content: 'Tới tầm 11h đêm ạ, thoải mái thời gian.', delayMin: 840 },
      ],
    },

    // ── DAY +2 ──────────────────────────────────────────────────────────────
    {
      title: 'Bat Trang Ceramic Workshop',
      description:
        'An afternoon at the ancient ceramic village. Mould and glaze your own cup with the artisans; they fire it and you collect it a few days later.',
      address: 'Bat Trang Ceramic Village, Gia Lam, Hanoi',
      lat: 20.9725, lng: 105.9038, // 8.5 km — outlying
      scheduledAt: dayAt(2, 8, 0),
      maxMembers: 10,
      category: 'Arts & Culture',
      hostId: pick(4),
      members: [pick(2), pick(3)],
      pendingMembers: [],
      messages: [
        { userId: pick(4), content: 'Bus 47 từ ga Long Biên lúc 8:00, chỉ 7k thôi mọi người.', delayMin: 1200 },
        { userId: pick(2), content: 'Em chuẩn bị đồ ăn nhẹ mang theo rồi ạ.', delayMin: 1080 },
        { userId: pick(3), content: 'Do we get to keep what we make?', delayMin: 960 },
        { userId: pick(4), content: 'Yes — they fire and pack it, you pick it up 2–3 days later.', delayMin: 900 },
      ],
    },
    {
      title: 'Long Bien Bridge Photo Walk',
      description:
        'Walking the century-old iron bridge and down into the banana fields on the sandbank. Bring any camera you have.',
      address: 'Long Bien Bridge, Hoan Kiem, Hanoi',
      lat: 21.0441, lng: 105.8499, // 1.8 km
      scheduledAt: dayAt(2, 10, 0),
      maxMembers: 8,
      category: 'Sightseeing',
      hostId: pick(0),
      members: [pick(1), pick(4)],
      pendingMembers: [pick(2)],
      messages: [
        { userId: pick(0), content: 'Tàu chạy qua cầu lúc 10:10 và 10:45 — canh chụp là đẹp nhất.', delayMin: 1300 },
        { userId: pick(1), content: 'The light at that hour is unreal. Meeting at the south end?', delayMin: 1150 },
        { userId: pick(0), content: 'Đúng rồi, chân cầu phía Trần Nhật Duật nhé.', delayMin: 1100 },
      ],
    },
    {
      title: 'Water Puppet Show & Egg Coffee',
      description:
        'Afternoon show at Thang Long Water Puppet Theatre, then egg coffee at Giang Cafe two streets away. Tickets booked as a group.',
      address: '57B Dinh Tien Hoang, Hoan Kiem, Hanoi',
      lat: 21.0288, lng: 105.8535, // 0.2 km
      scheduledAt: dayAt(2, 15, 0),
      maxMembers: 12,
      category: 'Arts & Culture',
      hostId: pick(3),
      members: [pick(0), pick(2), ...adminJoined],
      pendingMembers: [],
      messages: [
        { userId: pick(3), content: 'Booked 8 seats for the 15:00 show. Tickets are 100k each.', delayMin: 1400 },
        { userId: pick(2), content: 'Cà phê trứng Giang ngay gần đó, xong show mình ghé nhé.', delayMin: 1250 },
        ...(adminUser ? [{ userId: adminUser.id, content: 'Cho mình một vé với nhé!', delayMin: 1100 }] : []),
      ],
    },
    {
      title: 'Truc Bach Lake Bia Hoi Evening',
      description:
        'Quieter alternative to the Old Quarter. Lakeside bia hơi, nem chua rán, and a slow evening watching the boats.',
      address: 'Truc Bach Lake, Ba Dinh, Hanoi',
      lat: 21.0450, lng: 105.8400, // 2.2 km
      scheduledAt: dayAt(2, 18, 0),
      maxMembers: 15,
      category: 'Social & Nightlife',
      hostId: pick(1),
      members: [pick(2), pick(4)],
      pendingMembers: [pick(3)],
      messages: [
        { userId: pick(1), content: 'Much calmer than Ta Hien and the view over the lake is better.', delayMin: 1500 },
        { userId: pick(4), content: 'Chuẩn, chỗ này ngồi thoải mái hơn hẳn.', delayMin: 1350 },
      ],
    },

    // ── DAY +3 ──────────────────────────────────────────────────────────────
    {
      title: 'Co Loa Ancient Citadel Day Trip',
      description:
        'Half-day trip to the 3rd-century BC spiral citadel north of the city. Quiet, rural, and almost no tourists.',
      address: 'Co Loa Citadel, Dong Anh, Hanoi',
      lat: 21.1180, lng: 105.8790, // 10.5 km — outlying
      scheduledAt: dayAt(3, 7, 30),
      maxMembers: 8,
      category: 'Sightseeing',
      hostId: pick(2),
      members: [pick(0), pick(3)],
      pendingMembers: [],
      messages: [
        { userId: pick(2), content: 'Đi xe máy tầm 45 phút, hoặc bus 46 từ Long Biên ạ.', delayMin: 1600 },
        { userId: pick(3), content: 'Is there anywhere to eat nearby, or should we pack lunch?', delayMin: 1500 },
        { userId: pick(2), content: 'Có mấy quán bún ngay cổng đền, ăn ổn lắm.', delayMin: 1450 },
      ],
    },
    {
      title: 'Van Phuc Silk Village Tour',
      description:
        'Thousand-year-old weaving village in Ha Dong. Watch the looms, then browse the silk street — good place to buy gifts.',
      address: 'Van Phuc Silk Village, Ha Dong, Hanoi',
      lat: 20.9800, lng: 105.7750, // 9.9 km — outlying
      scheduledAt: dayAt(3, 9, 30),
      maxMembers: 10,
      category: 'Shopping',
      hostId: pick(0),
      members: [pick(1)],
      pendingMembers: [pick(4)],
      messages: [
        { userId: pick(0), content: 'Mình sẽ chỉ mọi người cách phân biệt lụa thật và lụa pha.', delayMin: 1700 },
        { userId: pick(1), content: 'That is exactly what I needed — I nearly got scammed last time.', delayMin: 1600 },
      ],
    },
    {
      title: 'Vietnamese Coffee Brewing Class',
      description:
        'Learn phin filter technique, egg coffee, and coconut coffee with a local barista. You take home a phin filter.',
      address: '39 Nguyen Huu Huan, Hoan Kiem, Hanoi',
      lat: 21.0348, lng: 105.8532, // 0.7 km
      scheduledAt: dayAt(3, 13, 0),
      maxMembers: 8,
      category: 'Food & Drink',
      hostId: pick(3),
      members: [pick(0), pick(2), ...adminJoined],
      pendingMembers: [pick(1)],
      messages: [
        { userId: pick(3), content: 'Class is 250k including the phin filter you take home.', delayMin: 1800 },
        { userId: pick(2), content: 'Em đăng ký một suất nhé anh!', delayMin: 1700 },
        { userId: pick(0), content: 'Cà phê dừa ở đây ngon nhất khu này đấy.', delayMin: 1600 },
      ],
    },
    {
      title: 'Times City Skyline Sunset',
      description:
        'Rooftop sunset on the south side of the city, then the aquarium below if the group is up for it.',
      address: 'Times City, Hai Ba Trung, Hanoi',
      lat: 20.9940, lng: 105.8680, // 4.2 km
      scheduledAt: dayAt(3, 17, 0),
      maxMembers: 10,
      category: 'Social & Nightlife',
      hostId: pick(4),
      members: [pick(1), pick(3)],
      pendingMembers: [],
      messages: [
        { userId: pick(4), content: 'Sunset is around 18:30 — come by 17:00 to get a good spot.', delayMin: 1900 },
        { userId: pick(1), content: 'Mình sẽ tới sớm giữ chỗ cho cả nhóm.', delayMin: 1800 },
      ],
    },
  ];

  console.log(`🌱 Seeding ${activityData.length} activities...`);

  for (const act of activityData) {
    const [result] = await prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO "activities" (id, title, description, address, lat, lng, location, scheduled_at,
        max_members, host_id, status, created_at, category)
      VALUES (gen_random_uuid(), ${act.title}, ${act.description}, ${act.address},
        ${act.lat}, ${act.lng},
        ST_SetSRID(ST_MakePoint(${act.lng}, ${act.lat}), 4326),
        ${act.scheduledAt}, ${act.maxMembers}, ${act.hostId}::uuid,
        'OPEN', now(), ${act.category})
      RETURNING id
    `;
    const activityId = result.id;

    // Host is always an approved member.
    await prisma.activityMember.create({
      data: {
        activityId,
        userId: act.hostId,
        status: MemberStatus.APPROVED,
        joinedAt: new Date(now - 24 * H),
      },
    });

    for (const memberId of act.members) {
      if (memberId === act.hostId) continue;
      const exists = await prisma.activityMember.findUnique({
        where: { activityId_userId: { activityId, userId: memberId } },
      });
      if (exists) continue;
      await prisma.activityMember.create({
        data: {
          activityId,
          userId: memberId,
          status: MemberStatus.APPROVED,
          joinedAt: new Date(now - 12 * H),
        },
      });
    }

    for (const pendingId of act.pendingMembers) {
      if (pendingId === act.hostId) continue;
      const exists = await prisma.activityMember.findUnique({
        where: { activityId_userId: { activityId, userId: pendingId } },
      });
      if (exists) continue;
      await prisma.activityMember.create({
        data: {
          activityId,
          userId: pendingId,
          status: MemberStatus.PENDING,
          joinedAt: new Date(now - 2 * H),
        },
      });
    }

    for (const msg of act.messages) {
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

  // ── Summary ────────────────────────────────────────────────────────────────
  const fmt = (d: Date) =>
    d.toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).slice(0, 16);

  console.log(`\n✅ Seeded ${activityData.length} activities:\n`);
  for (const act of activityData) {
    console.log(
      `   ${fmt(act.scheduledAt)}  ${act.title.padEnd(38)} ${act.messages.length} msgs`,
    );
  }
  console.log('\n   Marker states come from the first three (ongoing / soon / ended).');
  console.log('   Outlying sites for radius testing: Bat Trang, Co Loa, Van Phuc.');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
