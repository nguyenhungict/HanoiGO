import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlacesService {
  constructor(private prisma: PrismaService) {}

  async findAll(page?: number, limit?: number) {
    const skip = page && limit ? (page - 1) * limit : undefined;
    const take = limit ? limit : undefined;
    
    const [places, total] = await Promise.all([
      this.prisma.place.findMany({
        skip,
        take,
        include: {
          gallery: true,
        },
        orderBy: {
          name: 'asc',
        },
      }),
      this.prisma.place.count(),
    ]);

    return {
      places,
      total,
      page: page || 1,
      lastPage: limit ? Math.ceil(total / limit) : 1,
    };
  }
}
