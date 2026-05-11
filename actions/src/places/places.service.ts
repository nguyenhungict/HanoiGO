import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlacesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.place.findMany({
      include: {
        gallery: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }
}
