import * as fs from 'fs';
import * as path from 'path';

export async function deleteFileFromStorage(url: string | null | undefined): Promise<boolean> {
  if (!url) return false;

  let supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  const supabaseBucket = process.env.SUPABASE_BUCKET || 'hanoigo-uploads';

  if (!supabaseUrl && process.env.DATABASE_URL) {
    const match = process.env.DATABASE_URL.match(/postgres\.([a-z0-9]+)/i);
    if (match && match[1]) {
      supabaseUrl = `https://${match[1]}.supabase.co`;
    }
  }

  // Handle Supabase Storage deletion
  if (url.startsWith('http') && supabaseUrl && url.includes(supabaseUrl)) {
    const prefix = `${supabaseUrl}/storage/v1/object/public/${supabaseBucket}/`;
    if (url.startsWith(prefix)) {
      const filename = url.replace(prefix, '');
      const deleteUrl = `${supabaseUrl}/storage/v1/object/${supabaseBucket}/${filename}`;
      try {
        const response = await fetch(deleteUrl, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
          },
        });
        if (!response.ok) {
          const errText = await response.text();
          console.error(`Supabase Storage delete failed for url ${url}: ${errText}`);
          return false;
        }
        console.log(`Successfully deleted ${filename} from Supabase Storage`);
        return true;
      } catch (err) {
        console.error(`Supabase delete error for url ${url}:`, err);
        return false;
      }
    }
  }

  // Handle Local Fallback Storage deletion
  if (url.includes('/uploads/')) {
    try {
      const filename = url.split('/uploads/')[1];
      const localPath = path.join(process.cwd(), './public/uploads', filename);
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
        console.log(`Successfully deleted ${filename} from local storage`);
        return true;
      }
    } catch (err) {
      console.error(`Local file delete error for url ${url}:`, err);
      return false;
    }
  }

  return false;
}
