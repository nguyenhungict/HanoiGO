import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load env variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_KEY = process.env.SUPABASE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'hanoigo-uploads';

let supabaseUrl = process.env.SUPABASE_URL;
if (!supabaseUrl && process.env.DATABASE_URL) {
  const match = process.env.DATABASE_URL.match(/postgres\.([a-z0-9]+)/i);
  if (match && match[1]) {
    supabaseUrl = `https://${match[1]}.supabase.co`;
  }
}

if (!supabaseUrl || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL (or DATABASE_URL) or SUPABASE_KEY in actions/.env');
  process.exit(1);
}

console.log(`🌐 Supabase Target URL: ${supabaseUrl}`);
console.log(`🪣 Target Bucket: ${SUPABASE_BUCKET}`);

const uploadsDir = path.resolve(__dirname, '../public/uploads');

function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.gif') return 'image/gif';
  return 'application/octet-stream';
}

async function ensureBucketExists() {
  console.log(`🔍 Checking/Creating bucket "${SUPABASE_BUCKET}"...`);
  try {
    const res = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: SUPABASE_BUCKET,
        name: SUPABASE_BUCKET,
        public: true,
      }),
    });

    if (res.ok) {
      console.log(`✅ Bucket "${SUPABASE_BUCKET}" created successfully.`);
    } else {
      const err = await res.json().catch(() => ({}));
      // Status 409 or already exists is fine
      console.log(`ℹ️ Bucket check status: ${res.status} (${err.message || 'Already exists or ready'})`);
    }
  } catch (err: any) {
    console.warn(`⚠️ Warning while checking bucket: ${err.message}`);
  }
}

async function uploadImages() {
  if (!fs.existsSync(uploadsDir)) {
    console.error(`❌ Uploads directory does not exist: ${uploadsDir}`);
    return;
  }

  const files = fs.readdirSync(uploadsDir).filter((file) => {
    const filePath = path.join(uploadsDir, file);
    return fs.statSync(filePath).isFile();
  });

  console.log(`📁 Found ${files.length} image files in ${uploadsDir}`);
  await ensureBucketExists();

  let successCount = 0;
  let failCount = 0;

  // Process in batches of 5 concurrent uploads
  const concurrency = 5;
  for (let i = 0; i < files.length; i += concurrency) {
    const batch = files.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async (filename) => {
        const filePath = path.join(uploadsDir, filename);
        const fileBuffer = fs.readFileSync(filePath);
        const mimeType = getMimeType(filename);

        const uploadUrl = `${supabaseUrl}/storage/v1/object/${SUPABASE_BUCKET}/${encodeURIComponent(filename)}`;

        try {
          const response = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${SUPABASE_KEY}`,
              'Content-Type': mimeType,
              'x-upsert': 'true', // Overwrite if already exists
            },
            body: fileBuffer,
          });

          if (response.ok) {
            successCount++;
            process.stdout.write(`✅ [${successCount + failCount}/${files.length}] Uploaded: ${filename}\n`);
          } else {
            const errText = await response.text();
            failCount++;
            console.error(`❌ [${successCount + failCount}/${files.length}] Failed ${filename}: ${response.status} - ${errText}`);
          }
        } catch (err: any) {
          failCount++;
          console.error(`❌ [${successCount + failCount}/${files.length}] Error uploading ${filename}: ${err.message}`);
        }
      })
    );
  }

  console.log(`\n========================================`);
  console.log(`🎉 Upload Finished!`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`🌐 Public URL base: ${supabaseUrl}/storage/v1/object/public/${SUPABASE_BUCKET}/`);
  console.log(`========================================\n`);
}

uploadImages();
