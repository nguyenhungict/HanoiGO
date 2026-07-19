import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SaveTripDto } from './dto/save-trip.dto';
import { parseTimeString } from './trip-planner.utils';

@Injectable()
export class TripCrudService {
  constructor(private prisma: PrismaService) {}

  async saveTrip(userId: string, dto: SaveTripDto) {
    return this.prisma.trip.create({
      data: {
        userId,
        title: dto.title || 'My Trip to Hanoi',
        numDays: dto.numDays,
        tripDays: {
          create: dto.days.map((day) => ({
            dayNumber: day.dayNumber,
            district: day.district,
            tripStops: {
              create: day.stops.map((stop) => ({
                placeId: stop.placeId,
                stopOrder: stop.stopOrder,
                arriveAt: parseTimeString(stop.arriveAt),
                departAt: parseTimeString(stop.departAt),
                distanceFromPrevM: stop.distanceFromPrevM,
                durationFromPrevS: stop.durationFromPrevS,
                isSkipped: stop.isSkipped || false,
              })),
            },
          })),
        },
      },
      include: {
        tripDays: { include: { tripStops: true } },
      },
    });
  }

  async getUserTrips(userId: string) {
    return this.prisma.trip.findMany({
      where: { userId },
      include: {
        tripDays: {
          include: {
            tripStops: {
              include: {
                place: {
                  select: {
                    id: true,
                    name: true,
                    imageUrl: true,
                    category: true,
                    lat: true,
                    lng: true,
                    district: true,
                    alwaysOpen: true,
                    openTimeStart: true,
                    openTimeEnd: true,
                  },
                },
              },
              orderBy: { stopOrder: 'asc' },
            },
          },
          orderBy: { dayNumber: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteTrip(userId: string, tripId: string) {
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, userId },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found or unauthorized');
    }

    return this.prisma.trip.delete({ where: { id: tripId } });
  }


}
