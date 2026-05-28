import { PrismaClient } from '@prisma/client';
import https from 'https';

const prisma = new PrismaClient();

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Fetch JSON from a URL with retry on rate limit
async function fetchJson(url: string, retries = 3): Promise<any> {
  for (let i = 0; i < retries; i++) {
    const data = await new Promise<string>((resolve, reject) => {
      https.get(url, { headers: { 'User-Agent': 'HanoiGO/1.0 (thesis project; mailto:thesis@usth.edu.vn)' } }, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve(body));
      }).on('error', reject);
    });
    try {
      return JSON.parse(data);
    } catch {
      // Rate limited — wait and retry
      console.log(` [rate limited, waiting ${(i + 1) * 3}s...]`);
      await sleep((i + 1) * 3000);
    }
  }
  throw new Error('Failed after retries');
}

// Search Wikipedia for a place name, return best match title
async function searchWikipedia(name: string): Promise<string | null> {
  const queries = [
    `${name} Hanoi`,
    `${name} Vietnam`,
    name,
  ];
  // Keywords from place name for relevance check
  const nameWords = name.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ').filter((w) => w.length > 3);

  for (const q of queries) {
    const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&format=json&srlimit=5`;
    const data = await fetchJson(url);
    const results = data?.query?.search ?? [];

    const match = results.find((r: any) => {
      const t = r.title.toLowerCase();
      const snippet = (r.snippet ?? '').toLowerCase();
      if (t.includes('disambiguation') || t.includes('(film)') || t.includes('(song)')) return false;
      // Must share at least one keyword with title or snippet must mention hanoi/vietnam
      const titleMatch = nameWords.some((w) => t.includes(w));
      const locationMatch = snippet.includes('hanoi') || snippet.includes('vietnam') || t.includes('hanoi') || t.includes('vietnam');
      return titleMatch || locationMatch;
    });

    if (match) return match.title;
    await sleep(800);
  }
  return null;
}

// Get page summary (description) and main image from Wikipedia
async function getWikipediaData(title: string): Promise<{ description: string | null; imageUrl: string | null; galleryUrls: string[] }> {
  const encoded = encodeURIComponent(title);

  // Get summary
  const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`;
  const summary = await fetchJson(summaryUrl).catch(() => null);
  const description = summary?.extract ?? null;
  const imageUrl = summary?.thumbnail?.source ?? summary?.originalimage?.source ?? null;

  // Get gallery images from Wikimedia
  const imagesUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encoded}&prop=images&format=json&imlimit=10`;
  const imagesData = await fetchJson(imagesUrl).catch(() => null);
  const pages = imagesData?.query?.pages ?? {};
  const pageData = Object.values(pages)[0] as any;
  const imageFiles: string[] = (pageData?.images ?? [])
    .map((img: any) => img.title as string)
    .filter((t: string) => /\.(jpg|jpeg|png)$/i.test(t));

  // Resolve image URLs (max 5)
  const galleryUrls: string[] = [];
  for (const file of imageFiles.slice(0, 5)) {
    const fileEncoded = encodeURIComponent(file);
    const infoUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${fileEncoded}&prop=imageinfo&iiprop=url&format=json`;
    const info = await fetchJson(infoUrl).catch(() => null);
    const infoPages = info?.query?.pages ?? {};
    const filePage = Object.values(infoPages)[0] as any;
    const url = filePage?.imageinfo?.[0]?.url;
    if (url) galleryUrls.push(url);
  }

  return { description, imageUrl, galleryUrls };
}

async function crawlPlaces(dryRun = false) {
  const limit = process.argv.includes('--test') ? 5 : undefined;
  const places = await prisma.place.findMany({
    select: { id: true, name: true, imageUrl: true, descriptionEn: true },
    orderBy: { name: 'asc' },
    ...(limit ? { take: limit } : {}),
  });

  console.log(`Found ${places.length} places. Starting crawl...\n`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const place of places) {
    // Skip if already has both image and description
    if (place.imageUrl && place.descriptionEn) {
      console.log(`[SKIP] ${place.name} — already has data`);
      skipped++;
      continue;
    }

    process.stdout.write(`[...] ${place.name} — searching Wikipedia...`);

    try {
      const wikiTitle = await searchWikipedia(place.name);
      if (!wikiTitle) {
        console.log(` NOT FOUND`);
        failed++;
        continue;
      }

      const { description, imageUrl, galleryUrls } = await getWikipediaData(wikiTitle);

      console.log(` found "${wikiTitle}"`);
      console.log(`      image: ${imageUrl ? 'yes' : 'no'} | description: ${description ? `${description.length} chars` : 'no'} | gallery: ${galleryUrls.length} images`);

      if (dryRun) {
        updated++;
        continue;
      }

      // Update place
      await prisma.place.update({
        where: { id: place.id },
        data: {
          ...(imageUrl && !place.imageUrl ? { imageUrl } : {}),
          ...(description && !place.descriptionEn ? { descriptionEn: description } : {}),
        },
      });

      // Add gallery images (skip duplicates)
      if (galleryUrls.length > 0) {
        const existing = await prisma.placeGallery.findMany({ where: { placeId: place.id }, select: { url: true } });
        const existingUrls = new Set(existing.map((g) => g.url));
        const newUrls = galleryUrls.filter((u) => !existingUrls.has(u));
        if (newUrls.length > 0) {
          await prisma.placeGallery.createMany({
            data: newUrls.map((url) => ({ placeId: place.id, url })),
          });
        }
      }

      updated++;
    } catch (err) {
      console.log(` ERROR: ${(err as Error).message}`);
      failed++;
    }

    // Polite delay to avoid rate limiting
    await sleep(1500);
  }

  console.log(`\n=== Done ===`);
  console.log(`Updated: ${updated} | Skipped: ${skipped} | Failed: ${failed}`);
}

const dryRun = process.argv.includes('--dry-run');
if (dryRun) console.log('DRY RUN mode — no DB writes\n');

crawlPlaces(dryRun)
  .catch(console.error)
  .finally(() => prisma.$disconnect());
