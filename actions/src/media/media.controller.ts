import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Body,
} from '@nestjs/common';
import { deleteFileFromStorage } from '../common/storage.utils';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import * as path from 'path';

@Controller('media')
export class MediaController {
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (req, file, callback) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
          return callback(
            new BadRequestException('Only image files are allowed!'),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    let supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    const supabaseBucket = process.env.SUPABASE_BUCKET || 'hanoigo-uploads';

    if (!supabaseUrl && process.env.DATABASE_URL) {
      const match = process.env.DATABASE_URL.match(/postgres\.([a-z0-9]+)/i);
      if (match && match[1]) {
        supabaseUrl = `https://${match[1]}.supabase.co`;
        console.log(`Auto-inferred SUPABASE_URL: ${supabaseUrl}`);
      }
    }

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = extname(file.originalname);
    const filename = `${uniqueSuffix}${ext}`;

    if (supabaseUrl && supabaseKey) {
      // 1. Upload to Supabase Storage via REST API
      const uploadUrl = `${supabaseUrl}/storage/v1/object/${supabaseBucket}/${filename}`;
      try {
        const response = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': file.mimetype,
          },
          body: file.buffer as any,
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Supabase Storage upload failed: ${errText}`);
        }

        // Return the Supabase public URL
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/${supabaseBucket}/${filename}`;
        return { url: publicUrl };
      } catch (err) {
        console.error('Supabase upload failed, falling back to local storage:', err);
      }
    }

    // 2. Fallback: Save locally
    const uploadDir = './public/uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const localPath = path.join(uploadDir, filename);
    fs.writeFileSync(localPath, file.buffer);

    const url = `/uploads/${filename}`;
    return { url };
  }

  @Post('delete')
  async deleteFile(@Body('url') url: string) {
    if (!url) {
      throw new BadRequestException('URL is required');
    }
    const success = await deleteFileFromStorage(url);
    return { success };
  }
}
