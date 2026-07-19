/*
 * restore-demo-hours.ts  — reverts the opening hours changed by setup-demo-trips.ts
 * Reads demo-hours-backup.json and writes each place's original values back.
 */
import { PrismaClient } from '@prisma/client';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

interface Row {
  name: string;
  alwaysOpen: boolean;
  openTimeStart: string | null;
  openTimeEnd: string | null;
  openDays: number[];
  visitDurationMin: number | null;
  lat?: number;
  lng?: number;
}

async function main() {
  const rows: Row[] = JSON.parse(
    readFileSync(join(__dirname, 'demo-hours-backup.json'), 'utf8'),
  );
  for (const r of rows) {
    await prisma.place.update({
      where: { name: r.name },
      data: {
        alwaysOpen: r.alwaysOpen,
        openTimeStart: r.openTimeStart ? new Date(r.openTimeStart) : null,
        openTimeEnd: r.openTimeEnd ? new Date(r.openTimeEnd) : null,
        openDays: r.openDays,
        visitDurationMin: r.visitDurationMin,
        ...(typeof r.lat === 'number' ? { lat: r.lat, lng: r.lng } : {}),
      },
    });
  }
  console.log(`Restored original hours for ${rows.length} places.`);

  // Restore original coordinates + PostGIS geometry, if a coords backup exists.
  const coordsPath = join(__dirname, 'demo-coords-backup.json');
  if (existsSync(coordsPath)) {
    const coords: { name: string; lat: number; lng: number }[] = JSON.parse(
      readFileSync(coordsPath, 'utf8'),
    );
    for (const c of coords) {
      await prisma.place.update({ where: { name: c.name }, data: { lat: c.lat, lng: c.lng } });
      await prisma.$executeRawUnsafe(
        `UPDATE places SET location = ST_SetSRID(ST_MakePoint($1,$2),4326) WHERE name = $3`,
        c.lng, c.lat, c.name,
      );
    }
    console.log(`Restored original coords + geometry for ${coords.length} places.`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
