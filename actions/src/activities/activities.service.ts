import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { ReportActivityDto } from './dto/report-activity.dto';
import { MemberStatus, ActivityStatus, NotificationType } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ActivitiesService {
  private readonly logger = new Logger(ActivitiesService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  // ── Helper: resolve lat/lng/address/placeName from a Trip's start point ──────
  private async resolveLocationFromTrip(tripId: string): Promise<{
    lat: number;
    lng: number;
    address: string | null;
    placeId: string | null;
    placeName: string | null;
  }> {
    // Try start place first, then first stop of day 1
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        startPlace: { select: { id: true, name: true, lat: true, lng: true, address: true } },
        tripDays: {
          orderBy: { dayNumber: 'asc' },
          take: 1,
          include: {
            tripStops: {
              orderBy: { stopOrder: 'asc' },
              take: 1,
              include: {
                place: { select: { id: true, name: true, lat: true, lng: true, address: true } },
              },
            },
          },
        },
      },
    });

    if (!trip) throw new NotFoundException('Trip not found');

    const anchor =
      trip.startPlace ??
      trip.tripDays[0]?.tripStops[0]?.place ??
      null;

    if (!anchor) {
      throw new BadRequestException(
        'Trip has no start place or stops to derive coordinates from',
      );
    }

    return {
      lat: anchor.lat,
      lng: anchor.lng,
      address: anchor.address ?? null,
      placeId: anchor.id,
      placeName: anchor.name,
    };
  }

  // ── Create Activity ───────────────────────────────────────────────────────────
  async create(userId: string, dto: CreateActivityDto) {
    try {
      const id = uuidv4();

      let lat = dto.lat;
      let lng = dto.lng;
      let address = dto.address ?? null;
      let placeId = dto.placeId ?? null;
      let tripId = dto.tripId ?? null;

      // Auto-fill location from the linked Trip when lat/lng are not provided
      if (tripId && (lat === undefined || lng === undefined)) {
        const loc = await this.resolveLocationFromTrip(tripId);
        lat = loc.lat;
        lng = loc.lng;
        address = address ?? loc.address;
        placeId = placeId ?? loc.placeId;
      }

      if (lat === undefined || lng === undefined) {
        throw new BadRequestException(
          'lat and lng are required when not linking a trip',
        );
      }

      const activityResult = await this.prisma.$queryRaw<any[]>`
        INSERT INTO "activities" (
          id, host_id, place_id, trip_id, title, description, address,
          lat, lng, location, scheduled_at, max_members, status, category,
          image_url, saves_count, created_at
        )
        VALUES (
          ${id}::uuid, ${userId}::uuid, ${placeId}::uuid, ${tripId}::uuid,
          ${dto.title}, ${dto.description ?? null}, ${address},
          ${lat}, ${lng},
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326),
          ${new Date(dto.scheduledAt)},
          ${dto.maxMembers ?? 10},
          'OPEN',
          ${dto.category ?? 'Arts & Culture'},
          ${dto.imageUrl ?? null},
          0,
          now()
        )
        RETURNING
          id, place_id as "placeId", trip_id as "tripId",
          title, description, address, lat, lng,
          scheduled_at as "scheduledAt", max_members as "maxMembers",
          status, category, image_url as "imageUrl",
          saves_count as "savesCount", created_at as "createdAt";
      `;

      if (!activityResult || activityResult.length === 0) {
        throw new BadRequestException('Failed to create activity record');
      }

      const activity = activityResult[0];

      // Host is automatically an APPROVED member
      await this.prisma.activityMember.create({
        data: {
          activityId: activity.id,
          userId,
          status: MemberStatus.APPROVED,
        },
      });

      return activity;
    } catch (error) {
      this.logger.error('Error creating activity:', error);
      throw new BadRequestException(
        error.message || 'Failed to create activity',
      );
    }
  }

  // ── Find All (public feed, excluding already-joined) ─────────────────────────
  async findAll(
    userId?: string,
    lat?: number,
    lng?: number,
    radius: number = 5000,
  ) {
    try {
      const userUuid = userId ?? '00000000-0000-0000-0000-000000000000';

      this.logger.log(
        `Finding activities for user ${userId ?? 'guest'}. Location: ${lat}, ${lng}`,
      );

      const geoFilter =
        lat !== undefined && lng !== undefined
          ? this.prisma.$queryRaw<any[]>`
              SELECT
                a.id, a.host_id as "hostId", a.place_id as "placeId",
                a.trip_id as "tripId",
                a.title, a.description, a.address, a.lat, a.lng,
                a.scheduled_at as "scheduledAt", a.max_members as "maxMembers",
                a.status, a.category, a.image_url as "imageUrl",
                a.saves_count as "savesCount", a.created_at as "createdAt",
                u.username as "hostName", u.avatar_url as "hostAvatar",
                u.nationality as "hostNationality",
                (SELECT COUNT(*)::int FROM "activity_members" am
                 WHERE am.activity_id = a.id
                   AND am.status = 'APPROVED'::"MemberStatus") as "memberCount",
                (SELECT COUNT(*)::int FROM "activity_likes" al
                 WHERE al.activity_id = a.id) as "likesCount",
                (SELECT COUNT(*)::int FROM "messages" m
                 WHERE m.activity_id = a.id) as "commentsCount",
                EXISTS(
                  SELECT 1 FROM "activity_likes" al2
                  WHERE al2.activity_id = a.id AND al2.user_id = ${userUuid}::uuid
                ) as "isLiked",
                (SELECT status::text FROM "activity_members" am2
                 WHERE am2.activity_id = a.id
                   AND am2.user_id = ${userUuid}::uuid LIMIT 1) as "myStatus"
              FROM "activities" a
              JOIN "users" u ON a.host_id = u.id
              WHERE a.status = 'OPEN'::"ActivityStatus"
                AND ST_DWithin(
                  a.location,
                  ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326),
                  ${radius}
                )
                AND NOT EXISTS (
                  SELECT 1 FROM "activity_members" am3
                  WHERE am3.activity_id = a.id
                    AND am3.user_id = ${userUuid}::uuid
                )
              ORDER BY a.scheduled_at ASC;
            `
          : this.prisma.$queryRaw<any[]>`
              SELECT
                a.id, a.host_id as "hostId", a.place_id as "placeId",
                a.trip_id as "tripId",
                a.title, a.description, a.address, a.lat, a.lng,
                a.scheduled_at as "scheduledAt", a.max_members as "maxMembers",
                a.status, a.category, a.image_url as "imageUrl",
                a.saves_count as "savesCount", a.created_at as "createdAt",
                u.username as "hostName", u.avatar_url as "hostAvatar",
                u.nationality as "hostNationality",
                (SELECT COUNT(*)::int FROM "activity_members" am
                 WHERE am.activity_id = a.id
                   AND am.status = 'APPROVED'::"MemberStatus") as "memberCount",
                (SELECT COUNT(*)::int FROM "activity_likes" al
                 WHERE al.activity_id = a.id) as "likesCount",
                (SELECT COUNT(*)::int FROM "messages" m
                 WHERE m.activity_id = a.id) as "commentsCount",
                EXISTS(
                  SELECT 1 FROM "activity_likes" al2
                  WHERE al2.activity_id = a.id AND al2.user_id = ${userUuid}::uuid
                ) as "isLiked",
                (SELECT status::text FROM "activity_members" am2
                 WHERE am2.activity_id = a.id
                   AND am2.user_id = ${userUuid}::uuid LIMIT 1) as "myStatus"
              FROM "activities" a
              JOIN "users" u ON a.host_id = u.id
              WHERE a.status = 'OPEN'::"ActivityStatus"
                AND NOT EXISTS (
                  SELECT 1 FROM "activity_members" am3
                  WHERE am3.activity_id = a.id
                    AND am3.user_id = ${userUuid}::uuid
                )
              ORDER BY a.scheduled_at ASC;
            `;

      return await geoFilter;
    } catch (error) {
      this.logger.error('Error in findAll:', error);
      return [];
    }
  }

  // ── Find One ─────────────────────────────────────────────────────────────────
  async findOne(id: string, userId?: string) {
    const userUuid = userId ?? '00000000-0000-0000-0000-000000000000';

    const activities = await this.prisma.$queryRaw<any[]>`
      SELECT
        a.id, a.title, a.description, a.address, a.lat, a.lng,
        a.scheduled_at as "scheduledAt", a.max_members as "maxMembers",
        a.status, a.category, a.image_url as "imageUrl",
        a.host_id as "hostId", a.place_id as "placeId",
        a.trip_id as "tripId",
        a.saves_count as "savesCount",
        u.username as "hostName",
        u.avatar_url as "hostAvatar",
        u.nationality as "hostNationality",
        u.languages as "hostLanguages",
        (SELECT COUNT(*)::int FROM "activity_likes" al
         WHERE al.activity_id = a.id) as "likesCount",
        (SELECT COUNT(*)::int FROM "messages" m
         WHERE m.activity_id = a.id) as "commentsCount",
        EXISTS(
          SELECT 1 FROM "activity_likes" al2
          WHERE al2.activity_id = a.id AND al2.user_id = ${userUuid}::uuid
        ) as "isLiked",
        (SELECT status::text FROM "activity_members" am
         WHERE am.activity_id = a.id AND am.user_id = ${userUuid}::uuid LIMIT 1) as "myStatus"
      FROM "activities" a
      JOIN "users" u ON a.host_id = u.id
      WHERE a.id = ${id}::uuid
    `;

    if (activities.length === 0) throw new NotFoundException('Activity not found');

    const activity = activities[0];

    const members = await this.prisma.activityMember.findMany({
      where: { activityId: id },
      include: {
        user: { select: { username: true, avatarUrl: true } },
      },
    });

    activity.activityMembers = members;
    activity.memberCount = members.filter(
      (m) => m.status === MemberStatus.APPROVED,
    ).length;

    // Attach full itinerary when activity is linked to a trip
    if (activity.tripId) {
      activity.trip = await this.prisma.trip.findUnique({
        where: { id: activity.tripId },
        include: {
          startPlace: {
            select: { id: true, name: true, lat: true, lng: true, imageUrl: true },
          },
          tripDays: {
            orderBy: { dayNumber: 'asc' },
            include: {
              tripStops: {
                orderBy: { stopOrder: 'asc' },
                include: {
                  place: {
                    select: {
                      id: true,
                      name: true,
                      category: true,
                      imageUrl: true,
                      lat: true,
                      lng: true,
                      district: true,
                      address: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    }

    return activity;
  }

  // ── Request to Join ───────────────────────────────────────────────────────────
  async requestToJoin(userId: string, activityId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const requestCount = await this.prisma.activityMember.count({
      where: { userId, joinedAt: { gte: today } },
    });

    if (requestCount >= 5) {
      throw new ForbiddenException(
        'You have reached the limit of 5 join requests per day.',
      );
    }

    const existing = await this.prisma.activityMember.findUnique({
      where: { activityId_userId: { activityId, userId } },
    });

    if (existing) {
      throw new BadRequestException(
        'You have already sent a request or are a member of this activity.',
      );
    }

    const activities = await this.prisma.$queryRaw<any[]>`
      SELECT host_id as "hostId", title, status FROM activities WHERE id = ${activityId}::uuid
    `;

    if (activities.length === 0) throw new NotFoundException('Activity not found');
    if (activities[0].status !== 'OPEN') {
      throw new BadRequestException('This activity is no longer open for joining.');
    }

    const activity = activities[0];

    const requester = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });

    const member = await this.prisma.activityMember.create({
      data: { activityId, userId, status: MemberStatus.PENDING },
    });

    // Notify the host
    await this.notificationsService.create(
      activity.hostId,
      NotificationType.ACTIVITY_REQUEST,
      'Join Request',
      `${requester?.username || 'Someone'} wants to join "${activity.title}"`,
      'ACTIVITY',
      activityId,
    );

    return member;
  }

  // ── Cancel Join Request ───────────────────────────────────────────────────────
  async cancelJoinRequest(userId: string, activityId: string) {
    const existing = await this.prisma.activityMember.findUnique({
      where: { activityId_userId: { activityId, userId } },
    });

    if (!existing) throw new NotFoundException('Join request not found.');

    if (existing.status === MemberStatus.APPROVED) {
      throw new BadRequestException(
        'You are already an approved member. Use leave activity instead (if implemented).',
      );
    }

    return this.prisma.activityMember.delete({
      where: { activityId_userId: { activityId, userId } },
    });
  }

  // ── Approve / Reject Member ───────────────────────────────────────────────────
  async approveMember(hostId: string, activityId: string, userId: string) {
    const activities = await this.prisma.$queryRaw<any[]>`
      SELECT host_id as "hostId", title FROM activities WHERE id = ${activityId}::uuid
    `;

    if (activities.length === 0) throw new NotFoundException('Activity not found');
    const activity = activities[0];
    if (activity.hostId !== hostId)
      throw new ForbiddenException('Only the host can approve members');

    const updatedMember = await this.prisma.activityMember.update({
      where: { activityId_userId: { activityId, userId } },
      data: { status: MemberStatus.APPROVED },
    });

    // Notify the member
    await this.notificationsService.create(
      userId,
      NotificationType.ACTIVITY_APPROVED,
      'Request Approved',
      `You have been approved to join "${activity.title}"`,
      'ACTIVITY',
      activityId,
    );

    return updatedMember;
  }

  async rejectMember(hostId: string, activityId: string, userId: string) {
    const activities = await this.prisma.$queryRaw<any[]>`
      SELECT host_id as "hostId", title FROM activities WHERE id = ${activityId}::uuid
    `;

    if (activities.length === 0) throw new NotFoundException('Activity not found');
    const activity = activities[0];
    if (activity.hostId !== hostId)
      throw new ForbiddenException('Only the host can reject members');

    const updatedMember = await this.prisma.activityMember.update({
      where: { activityId_userId: { activityId, userId } },
      data: { status: MemberStatus.REJECTED },
    });

    // Notify the member
    await this.notificationsService.create(
      userId,
      NotificationType.ACTIVITY_REJECTED,
      'Request Declined',
      `Your request to join "${activity.title}" was declined`,
      'ACTIVITY',
      activityId,
    );

    return updatedMember;
  }

  // ── Delete Activity ───────────────────────────────────────────────────────────
  async delete(userId: string, activityId: string) {
    const activityResult = await this.prisma.$queryRaw<any[]>`
      SELECT host_id as "hostId" FROM activities WHERE id = ${activityId}::uuid
    `;

    if (activityResult.length === 0) throw new NotFoundException('Activity not found');
    if (activityResult[0].hostId !== userId) {
      throw new ForbiddenException('Only the host can delete this activity');
    }

    return this.prisma.activity.delete({ where: { id: activityId } });
  }

  // ── My Activities (hosted + joined) ──────────────────────────────────────────
  async getMyActivities(userId: string) {
    try {
      return await this.prisma.$queryRaw<any[]>`
        SELECT
          a.id, a.host_id as "hostId", a.place_id as "placeId",
          a.trip_id as "tripId",
          a.title, a.description, a.address, a.lat, a.lng,
          a.scheduled_at as "scheduledAt", a.max_members as "maxMembers",
          a.status, a.category, a.image_url as "imageUrl",
          a.saves_count as "savesCount", a.created_at as "createdAt",
          u.username as "hostName", u.avatar_url as "hostAvatar",
          u.nationality as "hostNationality",
          (SELECT COUNT(*)::int FROM "activity_members" am
           WHERE am.activity_id = a.id
             AND am.status = 'APPROVED'::"MemberStatus") as "memberCount",
          (SELECT COUNT(*)::int FROM "activity_likes" al
           WHERE al.activity_id = a.id) as "likesCount",
          (SELECT COUNT(*)::int FROM "messages" m
           WHERE m.activity_id = a.id) as "commentsCount",
          EXISTS(
            SELECT 1 FROM "activity_likes" al2
            WHERE al2.activity_id = a.id AND al2.user_id = ${userId}::uuid
          ) as "isLiked",
          (SELECT status::text FROM "activity_members" am2
           WHERE am2.activity_id = a.id
             AND am2.user_id = ${userId}::uuid LIMIT 1) as "myStatus"
        FROM "activities" a
        JOIN "users" u ON a.host_id = u.id
        WHERE a.host_id = ${userId}::uuid
           OR EXISTS (
             SELECT 1 FROM "activity_members" m2
             WHERE m2.activity_id = a.id
               AND m2.user_id = ${userId}::uuid
               AND m2.status IN ('APPROVED'::"MemberStatus", 'PENDING'::"MemberStatus")
           )
        ORDER BY a.scheduled_at ASC;
      `;
    } catch (error) {
      this.logger.error('Error in getMyActivities:', error);
      return [];
    }
  }

  // ── Get Members ───────────────────────────────────────────────────────────────
  async getMembers(activityId: string) {
    return this.prisma.activityMember.findMany({
      where: { activityId },
      include: {
        user: {
          select: { id: true, username: true, avatarUrl: true, nationality: true },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }

  // ── Toggle Like ───────────────────────────────────────────────────────────────
  async toggleLike(userId: string, activityId: string) {
    const existing = await this.prisma.activityLike.findUnique({
      where: { activityId_userId: { activityId, userId } },
    });

    if (existing) {
      await this.prisma.activityLike.delete({
        where: { activityId_userId: { activityId, userId } },
      });
      const likesCount = await this.prisma.activityLike.count({
        where: { activityId },
      });
      return { liked: false, likesCount };
    } else {
      await this.prisma.activityLike.create({
        data: { activityId, userId },
      });
      const likesCount = await this.prisma.activityLike.count({
        where: { activityId },
      });
      return { liked: true, likesCount };
    }
  }

  // ── Clone Trip from Activity ──────────────────────────────────────────────────
  async cloneActivityTrip(userId: string, activityId: string) {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      select: { tripId: true },
    });

    if (!activity) throw new NotFoundException('Activity not found');
    if (!activity.tripId) {
      throw new BadRequestException(
        'This activity is not linked to a trip plan',
      );
    }

    const source = await this.prisma.trip.findUnique({
      where: { id: activity.tripId },
      include: {
        tripDays: {
          include: { tripStops: { orderBy: { stopOrder: 'asc' } } },
          orderBy: { dayNumber: 'asc' },
        },
      },
    });

    if (!source) throw new NotFoundException('Source trip not found');

    const cloned = await this.prisma.trip.create({
      data: {
        userId,
        title: `${source.title || 'Hanoi Trip'} (Cloned)`,
        numDays: source.numDays,
        startPlaceId: source.startPlaceId,
        clonedFromId: source.id,
        tripDays: {
          create: source.tripDays.map((day) => ({
            dayNumber: day.dayNumber,
            district: day.district,
            tripStops: {
              create: day.tripStops.map((stop) => ({
                placeId: stop.placeId,
                stopOrder: stop.stopOrder,
                arriveAt: stop.arriveAt,
                departAt: stop.departAt,
                distanceFromPrevM: stop.distanceFromPrevM,
                durationFromPrevS: stop.durationFromPrevS,
                isSkipped: stop.isSkipped,
              })),
            },
          })),
        },
      },
      include: {
        tripDays: { include: { tripStops: true } },
      },
    });

    // Increment saves_count on the activity
    await this.prisma.activity.update({
      where: { id: activityId },
      data: { savesCount: { increment: 1 } },
    });

    return cloned;
  }

  async reportActivity(reporterId: string, activityId: string, dto: ReportActivityDto) {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    if (activity.hostId === reporterId) {
      throw new BadRequestException('You cannot report your own activity');
    }

    const existingReport = await this.prisma.report.findFirst({
      where: {
        reporterId,
        entityId: activityId,
        entityType: 'ACTIVITY',
      },
    });

    if (existingReport) {
      throw new BadRequestException('You have already reported this activity');
    }

    return this.prisma.report.create({
      data: {
        reporterId,
        targetId: activity.hostId,
        reason: dto.reason,
        description: dto.description || null,
        entityType: 'ACTIVITY',
        entityId: activityId,
        evidenceUrls: dto.evidenceUrls || [],
      },
    });
  }
}
