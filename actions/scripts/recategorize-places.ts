/**
 * One-off migration: collapse the messy place taxonomy into 6 clean, mutually
 * exclusive categories and align visit_duration_min with each category.
 *
 * It updates BOTH:
 *   1. the live DB (places.category + places.visit_duration_min), matched by name
 *   2. the source file places_import_data/places_data.json (kept in sync)
 *
 * Non-destructive: places not present in the mapping are left untouched and
 * reported at the end so you can decide whether to delete them (e.g. malls).
 *
 * Run:  npx ts-node scripts/recategorize-places.ts
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Suggested visit duration (minutes) per category — drives the trip planner
// when the user does NOT opt into a custom duration.
const VISIT_DURATION: Record<string, number> = {
  'Museum': 90,
  'Temple & Pagoda': 45,
  'Historic Site': 60,
  'Nature & Lake': 45,
  'Arts & Performance': 90,
  'Street & Market': 75,
};

// place name -> new category
const CATEGORY_MAP: Record<string, string> = {
  // ── Museum (90') ──
  'B52 Victory Museum': 'Museum',
  'Fine Arts Museum (Bao Tang My Thuat)': 'Museum',
  'Hanoi Police Museum': 'Museum',
  'Ho Chi Minh Museum': 'Museum',
  'Hoa Lo Prison': 'Museum',
  "Vietnamese Women's Museum": 'Museum',
  'Vietnam Military History Museum': 'Museum',
  'Vietnam Museum of Ethnology': 'Museum',
  'Vietnam Museum of Fine Arts': 'Museum',
  'Vietnam National Museum of History': 'Museum',

  // ── Temple & Pagoda (45') — religious sites of any faith ──
  'Bach Ma Temple': 'Temple & Pagoda',
  'Chua Tran Quoc': 'Temple & Pagoda',
  'Ham Long Church': 'Temple & Pagoda',
  'Kim Lien Pagoda': 'Temple & Pagoda',
  'Ngoc Son Temple': 'Temple & Pagoda',
  'One Pillar Pagoda': 'Temple & Pagoda',
  'Phu Tay Ho': 'Temple & Pagoda',
  'Quan Su Pagoda': 'Temple & Pagoda',
  'Quan Thanh Temple': 'Temple & Pagoda',
  "St. Joseph's Cathedral": 'Temple & Pagoda',

  // ── Historic Site (60') ──
  'Ba Dinh Square': 'Historic Site',
  'Cau The Huc': 'Historic Site',
  'Dong Kinh Nghia Thuc Square': 'Historic Site',
  'Hanoi Flag Tower': 'Historic Site',
  'Hanoi Old Citadel - Northern Gate': 'Historic Site',
  'Ho Chi Minh Mausoleum': 'Historic Site',
  "Ho Chi Minh's Stilt House": 'Historic Site',
  'Huu Tiep Lake (B52 Lake)': 'Historic Site',
  'Imperial Citadel of Thang Long': 'Historic Site',
  'Long Bien Bridge': 'Historic Site',
  'Ma May Ancient House': 'Historic Site',
  'Temple of Literature': 'Historic Site',
  'Thap Rua Tower': 'Historic Site',

  // ── Nature & Lake (45') — parks, lakes, promenades, zoo ──
  'Hanoi Zoo (Thu Le Zoo)': 'Nature & Lake',
  'Hoan Kiem Lake': 'Nature & Lake',
  'Lenin Park': 'Nature & Lake',
  'Ly Thai To Park': 'Nature & Lake',
  'Nghia Do Park': 'Nature & Lake',
  'Ngoc Khanh Lake': 'Nature & Lake',
  'Tay Ho Promenade': 'Nature & Lake',
  'Thien Quang Lake': 'Nature & Lake',
  'Thong Nhat Park': 'Nature & Lake',
  'Truc Bach Lake': 'Nature & Lake',
  'West Lake': 'Nature & Lake',

  // ── Arts & Performance (90') — theaters, galleries, creative spaces ──
  'Ca Tru Thang Long': 'Arts & Performance',
  'Dinh Q. Le Gallery': 'Arts & Performance',
  'GOm Show': 'Arts & Performance',
  'Hanoi Ceramic Mosaic Mural': 'Arts & Performance',
  'Hanoi Creative City': 'Arts & Performance',
  'Hanoi Opera House': 'Arts & Performance',
  'Heritage Space': 'Arts & Performance',
  'Salon Natasha': 'Arts & Performance',
  'Thang Long Water Puppet Theater': 'Arts & Performance',
  'VICAS Art Studio': 'Arts & Performance',
  'Vietnam National Tuong Theatre': 'Arts & Performance',
  'Work Room Four': 'Arts & Performance',

  // ── Street & Market (75') — old-quarter streets, markets, craft villages ──
  'Bat Trang Ceramic Village': 'Street & Market',
  'Dinh Le Book Street': 'Street & Market',
  'Dong Xuan Market': 'Street & Market',
  'Hang Bac Street': 'Street & Market',
  'Hang Dau Street': 'Street & Market',
  'Hang Gai Silk Street': 'Street & Market',
  'Hang Ma Street': 'Street & Market',
  'Hanoi Old Quarter Vietnam': 'Street & Market',
  'Hanoi Train Street': 'Street & Market',
  'Duong Tau (Train Street)': 'Street & Market',
  'Night Market': 'Street & Market',
  'Old Quarter': 'Street & Market',
  'Phan Dinh Phung Street': 'Street & Market',
  'Hoang Hoa Tham Flower Street': 'Street & Market',
  'Ta Hien Street': 'Street & Market',
  'Van Phuc Silk Village': 'Street & Market',
};

function syncJson() {
  const jsonPath = path.resolve(__dirname, '../../places_import_data/places_data.json');
  if (!fs.existsSync(jsonPath)) return;
  const items = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  let jsonUpdated = 0;
  for (const item of items) {
    const category = CATEGORY_MAP[item.name];
    if (category) {
      item.category = category;
      item.visitDurationMin = VISIT_DURATION[category];
      jsonUpdated++;
    }
  }
  fs.writeFileSync(jsonPath, JSON.stringify(items, null, 2) + '\n', 'utf-8');
  console.log(`📝 JSON: synced ${jsonUpdated} records in places_data.json.`);
}

async function main() {
  console.log('🔧 Recategorizing places into 6 clean categories...\n');

  // 0. Keep the source JSON in sync first (no DB needed)
  syncJson();

  // 1. Update DB
  let updated = 0;
  let notFound: string[] = [];
  for (const [name, category] of Object.entries(CATEGORY_MAP)) {
    const duration = VISIT_DURATION[category];
    const res = await prisma.place.updateMany({
      where: { name },
      data: { category, visitDurationMin: duration },
    });
    if (res.count > 0) {
      updated += res.count;
    } else {
      notFound.push(name);
    }
  }
  console.log(`✅ DB: updated ${updated} places.`);
  if (notFound.length) {
    console.log(`\n⚠️  ${notFound.length} mapped names were NOT found in DB (skipped):`);
    notFound.forEach((n) => console.log(`   - ${n}`));
  }

  // 2. Report DB places that are NOT in the mapping (likely non-attractions)
  const leftovers = await prisma.place.findMany({
    where: { name: { notIn: Object.keys(CATEGORY_MAP) } },
    select: { name: true, category: true },
  });
  if (leftovers.length) {
    console.log(`\n🟠 ${leftovers.length} place(s) in DB are NOT in the mapping — review/delete these:`);
    leftovers.forEach((p) => console.log(`   - ${p.name} (currently "${p.category}")`));
  }

  console.log('\n🎉 Done.');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
