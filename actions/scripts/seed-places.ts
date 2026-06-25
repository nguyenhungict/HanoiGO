import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// ── Constants ────────────────────────────────────────────────────────────────
const DAY_MAP: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

const NAME_REWRITES: Record<string, string> = {
  "Hồ Trúc Bạch": "Truc Bach Lake",
  "Thang Long Water Puppet": "Thang Long Water Puppet Theater",
  "Ho Chi Minh’s Stilt House": "Ho Chi Minh's Stilt House",
  "Đền Ngọc Sơn": "Ngoc Son Temple",
  "Dien Huu Pagoda": "One Pillar Pagoda",
  "Huu Tiep Lake and the Downed B-52": "Huu Tiep Lake (B52 Lake)",
  "Temple of Literature & National University": "Temple of Literature",
  "Lake of the Restored Sword (Hoan Kiem Lake)": "Hoan Kiem Lake",
  "Nguyen Van Huyen Museum": "Vietnam Museum of Ethnology"
};

const SCHEDULE_OVERRIDES: Record<string, { alwaysOpen: boolean; openDays: number[]; openTimeStart: string; openTimeEnd: string }> = {
  "Ho Chi Minh Mausoleum": {
    alwaysOpen: false,
    openDays: [0, 2, 3, 4, 6], // Tue, Wed, Thu, Sat, Sun
    openTimeStart: "07:30",
    openTimeEnd: "11:00"
  },
  "Ho Chi Minh's Stilt House": {
    alwaysOpen: false,
    openDays: [0, 2, 3, 4, 6], // Tue, Wed, Thu, Sat, Sun
    openTimeStart: "07:30",
    openTimeEnd: "16:00"
  },
  "Ho Chi Minh Museum": {
    alwaysOpen: false,
    openDays: [0, 2, 3, 4, 6], // Tue, Wed, Thu, Sat, Sun
    openTimeStart: "08:00",
    openTimeEnd: "16:30"
  },
  "One Pillar Pagoda": {
    alwaysOpen: false,
    openDays: [0, 1, 2, 3, 4, 5, 6],
    openTimeStart: "07:00",
    openTimeEnd: "18:00"
  },
  "Temple of Literature": {
    alwaysOpen: false,
    openDays: [0, 1, 2, 3, 4, 5, 6],
    openTimeStart: "08:00",
    openTimeEnd: "17:00"
  },
  "Hoa Lo Prison": {
    alwaysOpen: false,
    openDays: [0, 1, 2, 3, 4, 5, 6],
    openTimeStart: "08:00",
    openTimeEnd: "17:00"
  },
  "Imperial Citadel of Thang Long": {
    alwaysOpen: false,
    openDays: [0, 1, 2, 3, 4, 5, 6],
    openTimeStart: "08:00",
    openTimeEnd: "17:00"
  },
  "Vietnam Museum of Ethnology": {
    alwaysOpen: false,
    openDays: [0, 2, 3, 4, 5, 6], // Tue-Sun
    openTimeStart: "08:30",
    openTimeEnd: "17:30"
  },
  "Vietnam Military History Museum": {
    alwaysOpen: false,
    openDays: [0, 2, 3, 4, 6], // Tue, Wed, Thu, Sat, Sun
    openTimeStart: "08:00",
    openTimeEnd: "16:30"
  },
  "Hanoi Flag Tower": {
    alwaysOpen: false,
    openDays: [0, 2, 3, 4, 5, 6], // Tue-Sun
    openTimeStart: "09:00",
    openTimeEnd: "17:00"
  },
  "Vietnam Museum of Fine Arts": {
    alwaysOpen: false,
    openDays: [0, 1, 2, 3, 4, 5, 6],
    openTimeStart: "08:30",
    openTimeEnd: "17:00"
  },
  "Fine Arts Museum (Bao Tang My Thuat)": {
    alwaysOpen: false,
    openDays: [0, 1, 2, 3, 4, 5, 6],
    openTimeStart: "08:30",
    openTimeEnd: "17:00"
  },
  "Vietnamese Women's Museum": {
    alwaysOpen: false,
    openDays: [0, 1, 2, 3, 4, 5, 6],
    openTimeStart: "08:00",
    openTimeEnd: "17:00"
  },
  "Ngoc Son Temple": {
    alwaysOpen: false,
    openDays: [0, 1, 2, 3, 4, 5, 6],
    openTimeStart: "07:00",
    openTimeEnd: "18:00"
  },
  "Chua Tran Quoc": {
    alwaysOpen: false,
    openDays: [0, 1, 2, 3, 4, 5, 6],
    openTimeStart: "07:30",
    openTimeEnd: "18:00"
  },
  "Phu Tay Ho": {
    alwaysOpen: false,
    openDays: [0, 1, 2, 3, 4, 5, 6],
    openTimeStart: "05:00",
    openTimeEnd: "19:00"
  },
  "Ho Tay Water Park": {
    alwaysOpen: false,
    openDays: [0, 1, 2, 3, 4, 5, 6],
    openTimeStart: "09:00",
    openTimeEnd: "20:00"
  },
  "St. Joseph's Cathedral": {
    alwaysOpen: false,
    openDays: [0, 1, 2, 3, 4, 5, 6],
    openTimeStart: "08:00",
    openTimeEnd: "18:00"
  },
  "Vietnam National Tuong Theatre": {
    alwaysOpen: false,
    openDays: [0, 1, 2, 3, 4, 5, 6],
    openTimeStart: "19:00",
    openTimeEnd: "22:00"
  },
  "Ca Tru Thang Long": {
    alwaysOpen: false,
    openDays: [0, 5, 6],
    openTimeStart: "19:30",
    openTimeEnd: "21:00"
  },
  "Cau The Huc": {
    alwaysOpen: false,
    openDays: [0, 1, 2, 3, 4, 5, 6],
    openTimeStart: "07:00",
    openTimeEnd: "18:00"
  },
  "Ta Hien Street": {
    alwaysOpen: true,
    openDays: [0, 1, 2, 3, 4, 5, 6],
    openTimeStart: "00:00",
    openTimeEnd: "23:59"
  }
};

// Hanoi bounding box (rough)
const HANOI_BOUNDS = {
  latMin: 20.85,
  latMax: 21.15,
  lngMin: 105.7,
  lngMax: 106.0,
};

// ── Interfaces ───────────────────────────────────────────────────────────────
interface CrawledPlace {
  id: string;
  name: string;
  url: string;
  rating: number;
  tags: string | null;
  latitude: number;
  longitude: number;
  crawled_hours: Record<string, string> | string[];
}

interface ParsedHours {
  alwaysOpen: boolean;
  openDays: number[];
  openTimeStart: string | null; // HH:MM
  openTimeEnd: string | null;   // HH:MM
}

// ── Parse time string ────────────────────────────────────────────────────────
// Converts "8:00 AM" -> "08:00", "11:59 PM" -> "23:59"
function parseTime(timeStr: string): string {
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) throw new Error(`Cannot parse time: "${timeStr}"`);

  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const period = match[3].toUpperCase();

  if (period === 'AM' && hours === 12) hours = 0;
  if (period === 'PM' && hours !== 12) hours += 12;

  return `${hours.toString().padStart(2, '0')}:${minutes}`;
}

// ── Parse crawled_hours ──────────────────────────────────────────────────────
function parseCrawledHours(crawledHours: Record<string, string> | string[]): ParsedHours {
  // Case: "Khong tim thay" or array → treat as always_open (outdoor/public)
  if (Array.isArray(crawledHours)) {
    return {
      alwaysOpen: true,
      openDays: [0, 1, 2, 3, 4, 5, 6],
      openTimeStart: '00:00',
      openTimeEnd: '23:59',
    };
  }

  const openDays: number[] = [];
  const openTimes: { start: string; end: string }[] = [];

  for (const [dayName, value] of Object.entries(crawledHours)) {
    const dayNum = DAY_MAP[dayName];
    if (dayNum === undefined) continue;

    if (value === 'Closed') continue;

    openDays.push(dayNum);

    // Parse "8:00 AM - 5:00 PM"
    const parts = value.split(' - ');
    if (parts.length === 2) {
      try {
        const start = parseTime(parts[0]);
        const end = parseTime(parts[1]);
        openTimes.push({ start, end });
      } catch {
        // If parsing fails, skip this time slot
      }
    }
  }

  // No open days → closed permanently (unusual, treat as always_open)
  if (openDays.length === 0) {
    return {
      alwaysOpen: false,
      openDays: [],
      openTimeStart: null,
      openTimeEnd: null,
    };
  }

  // Check if 24/7 (all days, 00:00-23:59)
  const is247 =
    openDays.length === 7 &&
    openTimes.length > 0 &&
    openTimes.every((t) => t.start === '00:00' && t.end === '23:59');

  if (is247) {
    return {
      alwaysOpen: true,
      openDays: [0, 1, 2, 3, 4, 5, 6],
      openTimeStart: '00:00',
      openTimeEnd: '23:59',
    };
  }

  // Use the most common open/close time (mode)
  const timeFreq = new Map<string, number>();
  for (const t of openTimes) {
    const key = `${t.start}|${t.end}`;
    timeFreq.set(key, (timeFreq.get(key) || 0) + 1);
  }

  let bestKey = openTimes[0] ? `${openTimes[0].start}|${openTimes[0].end}` : '08:00|17:00';
  let bestCount = 0;
  for (const [key, count] of timeFreq) {
    if (count > bestCount) {
      bestCount = count;
      bestKey = key;
    }
  }

  const [openTimeStart, openTimeEnd] = bestKey.split('|');

  return {
    alwaysOpen: false,
    openDays: openDays.sort((a, b) => a - b),
    openTimeStart,
    openTimeEnd,
  };
}

// ── Infer category from tags ─────────────────────────────────────────────────
function inferCategory(tags: string | null): string {
  if (!tags) return 'Sightseeing';
  const t = tags.toLowerCase();
  if (t.includes('museum')) return 'Museum';
  if (t.includes('temple') || t.includes('pagoda') || t.includes('religious')) return 'Temple';
  if (t.includes('church') || t.includes('cathedral') || t.includes('mosque')) return 'Temple';
  if (t.includes('historic')) return 'Historic Site';
  if (t.includes('park') || t.includes('garden')) return 'Park';
  if (t.includes('lake') || t.includes('water') && !t.includes('puppet')) return 'Lake';
  if (t.includes('market')) return 'Market';
  if (t.includes('theater') || t.includes('theatre') || t.includes('performance') || t.includes('opera')) return 'Theater';
  if (t.includes('bridge')) return 'Sightseeing';
  if (t.includes('neighborhood') || t.includes('walking') || t.includes('street')) return 'Neighborhood';
  if (t.includes('observation') || t.includes('tower')) return 'Sightseeing';
  if (t.includes('art') || t.includes('gallery')) return 'Art Gallery';
  return 'Sightseeing';
}

// ── Infer district from coordinates ──────────────────────────────────────────
function inferDistrict(lat: number, lng: number): string {
  // Rough boundaries for major Hanoi districts
  if (lat >= 21.045 && lng >= 105.81 && lng <= 105.86) return 'Tay Ho';
  if (lat >= 21.03 && lat < 21.045 && lng >= 105.82 && lng <= 105.845) return 'Ba Dinh';
  if (lat >= 21.02 && lat < 21.04 && lng >= 105.845 && lng <= 105.86) return 'Hoan Kiem';
  if (lat >= 21.01 && lat < 21.03 && lng >= 105.82 && lng <= 105.845) return 'Dong Da';
  if (lat >= 21.01 && lat < 21.03 && lng >= 105.845 && lng <= 105.87) return 'Hai Ba Trung';
  if (lat >= 21.02 && lat < 21.05 && lng >= 105.78 && lng <= 105.82) return 'Cau Giay';
  return 'Hoan Kiem'; // default
}

// ── Infer visit duration ─────────────────────────────────────────────────────
function inferVisitDuration(category: string): number {
  switch (category) {
    case 'Museum': return 90;
    case 'Temple': return 45;
    case 'Historic Site': return 60;
    case 'Park': return 60;
    case 'Lake': return 45;
    case 'Market': return 60;
    case 'Theater': return 90;
    case 'Neighborhood': return 90;
    case 'Art Gallery': return 60;
    default: return 60;
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🌱 Seeding places from crawled data (with canonical name merges and overrides)...');

  // Read crawled JSON
  const jsonPath = path.resolve(__dirname, '../../../dataset/popular_hanoi_landmarks_hours.json');
  const rawData = fs.readFileSync(jsonPath, 'utf-8');

  // Handle NaN in JSON (TripAdvisor data sometimes has NaN)
  const cleanedData = rawData.replace(/:\s*NaN/g, ': null');
  const places: CrawledPlace[] = JSON.parse(cleanedData);

  console.log(`📖 Read ${places.length} places from JSON`);

  let inserted = 0;
  let skipped = 0;

  for (const place of places) {
    // Skip places with invalid coordinates
    if (
      place.latitude == null ||
      place.longitude == null ||
      isNaN(place.latitude) ||
      isNaN(place.longitude)
    ) {
      console.log(`  ⏭️  Skipping "${place.name}" — no coordinates`);
      skipped++;
      continue;
    }

    // Skip places outside Hanoi bounding box
    if (
      place.latitude < HANOI_BOUNDS.latMin ||
      place.latitude > HANOI_BOUNDS.latMax ||
      place.longitude < HANOI_BOUNDS.lngMin ||
      place.longitude > HANOI_BOUNDS.lngMax
    ) {
      console.log(`  ⏭️  Skipping "${place.name}" — outside Hanoi (${place.latitude}, ${place.longitude})`);
      skipped++;
      continue;
    }

    // Normalize name quotes and rewrite duplicate entries to their canonical names
    let normalizedName = place.name.replace(/’/g, "'").trim();
    if (NAME_REWRITES[normalizedName]) {
      normalizedName = NAME_REWRITES[normalizedName];
    }

    // Parse opening hours
    let hours = parseCrawledHours(place.crawled_hours);

    // Apply schedule overrides for verified locations
    if (SCHEDULE_OVERRIDES[normalizedName]) {
      const ov = SCHEDULE_OVERRIDES[normalizedName];
      hours = {
        alwaysOpen: ov.alwaysOpen,
        openDays: ov.openDays,
        openTimeStart: ov.openTimeStart,
        openTimeEnd: ov.openTimeEnd,
      };
    }

    const category = inferCategory(typeof place.tags === 'string' ? place.tags : null);

    // Skip food & drink places
    const tagsArray = typeof place.tags === 'string' ? place.tags.split(' • ') : [];
    const nameL = normalizedName.toLowerCase();
    const catL = category.toLowerCase();
    const tagsL = tagsArray.map((t: string) => t.toLowerCase());
    const FOOD_DRINK_KEYWORDS = [
      'food', 'dining', 'cafe', 'coffee', 'bar', 'dessert', 'restaurant', 'bakery', 'drink', 'beverage', 'eating', 'bún chả', 'chả cá', 'bánh mì', 'phở', 'kem tràng tiền', 'cà phê'
    ];
    const isFoodDrink = FOOD_DRINK_KEYWORDS.some(kw => 
      nameL.includes(kw) || 
      catL.includes(kw) || 
      tagsL.some(t => t.includes(kw))
    );
    if (isFoodDrink) {
      console.log(`  ⏭️  Skipping "${normalizedName}" — food/drink related`);
      skipped++;
      continue;
    }

    const district = inferDistrict(place.latitude, place.longitude);
    const visitDuration = inferVisitDuration(category);
    // Build the WKT for PostGIS
    const wkt = `SRID=4326;POINT(${place.longitude} ${place.latitude})`;

    try {
      await prisma.$executeRawUnsafe(
        `
        INSERT INTO places (
          id, name, category, district,
          lat, lng, location,
          always_open, open_days, open_time_start, open_time_end,
          visit_duration_min, tags, created_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3,
          $4, $5, ST_GeomFromEWKT($6),
          $7, $8, $9::time, $10::time,
          $11, $12, now()
        )
        ON CONFLICT (name) DO UPDATE SET
          always_open = EXCLUDED.always_open,
          open_days = EXCLUDED.open_days,
          open_time_start = EXCLUDED.open_time_start,
          open_time_end = EXCLUDED.open_time_end,
          visit_duration_min = EXCLUDED.visit_duration_min
        `,
        normalizedName,                                 // $1
        category,                                       // $2
        district,                                       // $3
        place.latitude,                                 // $4
        place.longitude,                                // $5
        wkt,                                            // $6
        hours.alwaysOpen,                               // $7
        hours.openDays,                                 // $8
        hours.openTimeStart,                            // $9
        hours.openTimeEnd,                              // $10
        visitDuration,                                  // $11
        typeof place.tags === 'string' ? place.tags.split(' • ') : [],  // $12
      );

      const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
      const openDaysStr = hours.openDays.map((d) => dayNames[d]).join(', ');
      console.log(
        `  ✅ ${normalizedName} | ${category} | ${district} | ` +
        `${hours.alwaysOpen ? '24/7' : `${hours.openTimeStart}-${hours.openTimeEnd} [${openDaysStr}]`}`
      );
      inserted++;
    } catch (err: any) {
      console.error(`  ❌ Failed to insert "${normalizedName}":`, err.message);
    }
  }

  console.log(`\n📊 Summary: ${inserted} inserted/updated, ${skipped} skipped out of ${places.length} total`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
