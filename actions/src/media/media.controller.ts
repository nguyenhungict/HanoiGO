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
  private async _uploadToSupabaseOrLocal(
    file: Express.Multer.File,
  ): Promise<string> {
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
            Authorization: `Bearer ${supabaseKey}`,
            'Content-Type': file.mimetype,
          },
          body: file.buffer as unknown as BodyInit,
        });

        if (response.ok) {
          // Return the Supabase public URL
          return `${supabaseUrl}/storage/v1/object/public/${supabaseBucket}/${filename}`;
        } else {
          const errText = await response.text();
          console.error(`Supabase Storage upload failed: ${errText}`);
        }
      } catch (err) {
        console.error(
          'Supabase upload failed, falling back to local storage:',
          err,
        );
      }
    }

    // 2. Fallback: Save locally
    const uploadDir = './public/uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const localPath = path.join(uploadDir, filename);
    fs.writeFileSync(localPath, file.buffer);

    return `/uploads/${filename}`;
  }

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
    const url = await this._uploadToSupabaseOrLocal(file);
    return { url };
  }

  @Post('upload-chat')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
    }),
  )
  async uploadChatAttachment(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const ext = extname(file.originalname).toLowerCase();
    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(ext);
    const isDoc = /\.(pdf|doc|docx|zip|txt)$/i.test(ext);

    if (!isImage && !isDoc) {
      throw new BadRequestException('Unsupported file type');
    }

    const maxSize = isImage ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException(
        `File is too large. Maximum size for ${isImage ? 'images is 5MB' : 'documents is 10MB'}`,
      );
    }

    const url = await this._uploadToSupabaseOrLocal(file);
    return {
      url,
      fileName: file.originalname,
      fileSize: file.size,
      mediaType: isImage ? 'IMAGE' : 'FILE',
    };
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
