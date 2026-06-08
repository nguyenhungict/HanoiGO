import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlaceDto } from '../admin/dto/create-place.dto';
import { UpdatePlaceDto } from '../admin/dto/update-place.dto';
import { deleteFileFromStorage } from '../common/storage.utils';

@Injectable()
export class PlacesService {
  constructor(private prisma: PrismaService) {}

  // ── Public: paginated list (no auth) ──────────────────────────────
  async findAll(page?: number, limit?: number) {
    const skip = page && limit ? (page - 1) * limit : undefined;
    const take = limit ?? undefined;

    const [places, total] = await Promise.all([
      this.prisma.place.findMany({
        skip,
        take,
        include: { gallery: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.place.count(),
    ]);

    return {
      places,
      total,
      page: page ?? 1,
      lastPage: limit ? Math.ceil(total / limit) : 1,
    };
  }

  // ── Admin: paginated list with search + category + trip-stop count ─
  async findAllAdmin(page = 1, limit = 10, search?: string, category?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }
    if (category && category !== 'All') {
      where.category = category;
    }

    const [places, total] = await Promise.all([
      this.prisma.place.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          _count: { select: { tripStops: true } },
          gallery: true,
        },
      }),
      this.prisma.place.count({ where }),
    ]);

    return { places, total, page, lastPage: Math.ceil(total / limit) || 1 };
  }

  // ── Create ─────────────────────────────────────────────────────────
  async createPlace(dto: CreatePlaceDto) {
    const wkt = `SRID=4326;POINT(${dto.lng} ${dto.lat})`;
    const id = crypto.randomUUID();

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(
          `INSERT INTO places (
            id, name, category, district, address, lat, lng, location, image_url, tags, always_open,
            open_time_start, open_time_end, created_at, description_en, open_days, visit_duration_min
          ) VALUES (
            $1::uuid, $2, $3, $4, $5, $6, $7, ST_GeomFromEWKT($8), $9, $10, $11, $12, $13, now(), $14, $15, $16
          )`,
          id,
          dto.name,
          dto.category,
          dto.district,
          dto.address ?? null,
          dto.lat,
          dto.lng,
          wkt,
          dto.imageUrl ?? null,
          dto.tags ?? [],
          dto.alwaysOpen ?? false,
          this.parseTime(dto.openTimeStart),
          this.parseTime(dto.openTimeEnd),
          dto.descriptionEn ?? null,
          dto.openDays ?? [0, 1, 2, 3, 4, 5, 6],
          dto.visitDurationMin ?? 60,
        );

        if (dto.galleryUrls && dto.galleryUrls.length > 0) {
          await tx.placeGallery.createMany({
            data: dto.galleryUrls.map((url) => ({ placeId: id, url })),
          });
        }
      });

      return this.prisma.place.findUnique({
        where: { id },
        include: { gallery: true },
      });
    } catch (error) {
      if (error.code === 'P2002')
        throw new BadRequestException('Place with this name already exists');
      throw error;
    }
  }

  // ── Update ─────────────────────────────────────────────────────────
  async updatePlace(id: string, dto: UpdatePlaceDto) {
    const place = await this.prisma.place.findUnique({
      where: { id },
      include: { gallery: true },
    });
    if (!place) throw new NotFoundException('Place not found');

    const updateData: any = { ...dto };
    delete updateData.lat;
    delete updateData.lng;
    delete updateData.galleryUrls;

    // Convert time strings to UTC-anchored Date objects for @db.Time(6) column
    if (dto.openTimeStart !== undefined) {
      updateData.openTimeStart = this.parseTime(dto.openTimeStart);
    }
    if (dto.openTimeEnd !== undefined) {
      updateData.openTimeEnd = this.parseTime(dto.openTimeEnd);
    }

    // When alwaysOpen becomes true, clear schedule data
    if (dto.alwaysOpen === true) {
      updateData.openTimeStart = null;
      updateData.openTimeEnd = null;
      updateData.openDays = [];
    }

    const oldImageUrl = place.imageUrl;
    const isCoverImageChanged =
      dto.imageUrl !== undefined && dto.imageUrl !== oldImageUrl;

    // Compute gallery diff before transaction for storage cleanup after
    let urlsToDelete: string[] = [];

    await this.prisma.$transaction(async (tx) => {
      await tx.place.update({ where: { id }, data: updateData });

      if (dto.lat !== undefined || dto.lng !== undefined) {
        const newLat = dto.lat ?? place.lat;
        const newLng = dto.lng ?? place.lng;
        const wkt = `SRID=4326;POINT(${newLng} ${newLat})`;
        await tx.$executeRawUnsafe(
          `UPDATE places SET lat = $1, lng = $2, location = ST_GeomFromEWKT($3) WHERE id = $4::uuid`,
          newLat,
          newLng,
          wkt,
          id,
        );
      }

      if (dto.galleryUrls !== undefined && Array.isArray(dto.galleryUrls)) {
        const oldUrls = place.gallery.map((g) => g.url);
        urlsToDelete = oldUrls.filter((url) => !dto.galleryUrls!.includes(url));

        await tx.placeGallery.deleteMany({ where: { placeId: id } });
        if (dto.galleryUrls.length > 0) {
          await tx.placeGallery.createMany({
            data: dto.galleryUrls.map((url: string) => ({ placeId: id, url })),
          });
        }
      }
    });

    // Storage cleanup happens AFTER successful transaction
    for (const url of urlsToDelete) {
      await deleteFileFromStorage(url);
    }
    if (isCoverImageChanged && oldImageUrl) {
      await deleteFileFromStorage(oldImageUrl);
    }

    return this.prisma.place.findUnique({
      where: { id },
      include: { gallery: true },
    });
  }

  // ── Delete ─────────────────────────────────────────────────────────
  async deletePlace(id: string) {
    const place = await this.prisma.place.findUnique({
      where: { id },
      include: { gallery: true },
    });
    if (!place) throw new NotFoundException('Place not found');

    try {
      await this.prisma.place.delete({ where: { id } });
    } catch (error) {
      if (error.code === 'P2003') {
        throw new BadRequestException(
          'Place cannot be deleted as it is referenced in existing itineraries.',
        );
      }
      throw error;
    }

    // Storage cleanup after successful DB delete
    if (place.imageUrl) await deleteFileFromStorage(place.imageUrl);
    for (const item of place.gallery) {
      await deleteFileFromStorage(item.url);
    }

    return { success: true };
  }

  // ── Helpers ────────────────────────────────────────────────────────

  // Stores time as UTC-anchored epoch (1970-01-01) so @db.Time(6) column
  // receives a consistent value regardless of server timezone.
  private parseTime(timeStr?: string | null): Date | null {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return null;
    return new Date(Date.UTC(1970, 0, 1, hours, minutes, 0, 0));
  }
}
