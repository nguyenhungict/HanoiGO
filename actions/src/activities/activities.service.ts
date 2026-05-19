import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { MemberStatus, ActivityStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ActivitiesService {
  private readonly logger = new Logger(ActivitiesService.name);

  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateActivityDto) {
    try {
      const id = uuidv4();
      const placeIdValue = dto.placeId || null;
      const activityResult = await this.prisma.$queryRaw<any[]>`
        INSERT INTO "activities" (id, host_id, place_id, title, description, address, lat, lng, location, scheduled_at, max_members, status, category, image_url, created_at)
        VALUES (${id}::uuid, ${userId}::uuid, ${placeIdValue}::uuid, ${dto.title}, ${dto.description}, ${dto.address}, ${dto.lat}, ${dto.lng}, ST_SetSRID(ST_MakePoint(${dto.lng}, ${dto.lat}), 4326), ${new Date(dto.scheduledAt)}, ${dto.maxMembers || 10}, 'OPEN', ${dto.category || 'Arts & Culture'}, ${dto.imageUrl || null}, now())
        RETURNING id, place_id as "placeId", title, description, address, lat, lng, scheduled_at as "scheduledAt", max_members as "maxMembers", status, category, image_url as "imageUrl", created_at as "createdAt";
      `;

      if (!activityResult || activityResult.length === 0) {
        throw new BadRequestException('Failed to create activity record');
      }

      const activity = activityResult[0];

      // Add host as APPROVED member
      await this.prisma.activityMember.create({
        data: {
          activityId: activity.id,
          userId: userId,
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

  async findAll(
    userId?: string,
    lat?: number,
    lng?: number,
    radius: number = 5000,
  ) {
    try {
      const userUuid = userId ? userId : '00000000-0000-0000-0000-000000000000';

      this.logger.log(
        `Finding activities for user ${userId || 'guest'}. Location: ${lat}, ${lng}`,
      );

      let results: any[];
      if (lat !== undefined && lng !== undefined) {
        results = await this.prisma.$queryRaw<any[]>`
          SELECT 
            a.id, a.host_id as "hostId", a.title, a.description, a.address, a.lat, a.lng, 
            a.scheduled_at as "scheduledAt", a.max_members as "maxMembers", a.status, a.category, a.image_url as "imageUrl", a.created_at as "createdAt",
            u.username as "hostName", u.avatar_url as "hostAvatar", u.nationality as "hostNationality",
            (SELECT COUNT(*)::int FROM "activity_members" am WHERE am.activity_id = a.id AND am.status = 'APPROVED'::"MemberStatus") as "memberCount",
            (SELECT status::text FROM "activity_members" am WHERE am.activity_id = a.id AND am.user_id = ${userUuid}::uuid LIMIT 1) as "myStatus"
          FROM "activities" a
          JOIN "users" u ON a.host_id = u.id
          WHERE a.status = 'OPEN'::"ActivityStatus"
          AND ST_DWithin(a.location, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326), ${radius})
          AND NOT EXISTS (
            SELECT 1 FROM "activity_members" am2
            WHERE am2.activity_id = a.id
              AND am2.user_id = ${userUuid}::uuid
          )
          ORDER BY a.scheduled_at ASC;
        `;
      } else {
        results = await this.prisma.$queryRaw<any[]>`
          SELECT 
            a.id, a.host_id as "hostId", a.title, a.description, a.address, a.lat, a.lng, 
            a.scheduled_at as "scheduledAt", a.max_members as "maxMembers", a.status, a.category, a.image_url as "imageUrl", a.created_at as "createdAt",
            u.username as "hostName", u.avatar_url as "hostAvatar", u.nationality as "hostNationality",
            (SELECT COUNT(*)::int FROM "activity_members" am WHERE am.activity_id = a.id AND am.status = 'APPROVED'::"MemberStatus") as "memberCount",
            (SELECT status::text FROM "activity_members" am WHERE am.activity_id = a.id AND am.user_id = ${userUuid}::uuid LIMIT 1) as "myStatus"
          FROM "activities" a
          JOIN "users" u ON a.host_id = u.id
          WHERE a.status = 'OPEN'::"ActivityStatus"
          AND NOT EXISTS (
            SELECT 1 FROM "activity_members" am2
            WHERE am2.activity_id = a.id
              AND am2.user_id = ${userUuid}::uuid
          )
          ORDER BY a.scheduled_at ASC;
        `;
      }
      return results;
    } catch (error) {
      this.logger.error('Error in findAll:', error);
      return [];
    }
  }

  async findOne(id: string, userId?: string) {
    const userUuid = userId ? userId : '00000000-0000-0000-0000-000000000000';
    const activities = await this.prisma.$queryRaw<any[]>`
      SELECT a.id, a.title, a.description, a.address, a.lat, a.lng, a.scheduled_at as "scheduledAt", a.max_members as "maxMembers", a.status, a.category, a.host_id as "hostId",
             u.username as "hostName", 
             u.avatar_url as "hostAvatar",
             u.nationality as "hostNationality",
             u.languages as "hostLanguages",
             (SELECT status::text FROM "activity_members" am WHERE am.activity_id = a.id AND am.user_id = ${userUuid}::uuid LIMIT 1) as "myStatus"
      FROM "activities" a
      JOIN "users" u ON a.host_id = u.id
      WHERE a.id = ${id}::uuid
    `;

    if (activities.length === 0)
      throw new NotFoundException('Activity not found');
    const activity = activities[0];

    const members = await this.prisma.activityMember.findMany({
      where: { activityId: id },
      include: {
        user: {
          select: { username: true, avatarUrl: true },
        },
      },
    });

    activity.activityMembers = members;
    activity.memberCount = members.filter(
      (m) => m.status === MemberStatus.APPROVED,
    ).length;

    return activity;
  }

  async requestToJoin(userId: string, activityId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const requestCount = await this.prisma.activityMember.count({
      where: {
        userId,
        joinedAt: { gte: today },
      },
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
      SELECT status FROM activities WHERE id = ${activityId}::uuid
    `;

    if (activities.length === 0)
      throw new NotFoundException('Activity not found');
    if (activities[0].status !== 'OPEN') {
      throw new BadRequestException(
        'This activity is no longer open for joining.',
      );
    }

    return this.prisma.activityMember.create({
      data: {
        activityId,
        userId,
        status: MemberStatus.PENDING,
      },
    });
  }

  async cancelJoinRequest(userId: string, activityId: string) {
    const existing = await this.prisma.activityMember.findUnique({
      where: { activityId_userId: { activityId, userId } },
    });

    if (!existing) {
      throw new NotFoundException('Join request not found.');
    }

    if (existing.status === MemberStatus.APPROVED) {
      throw new BadRequestException(
        'You are already an approved member. Use leave activity instead (if implemented).',
      );
    }

    return this.prisma.activityMember.delete({
      where: { activityId_userId: { activityId, userId } },
    });
  }

  async approveMember(hostId: string, activityId: string, userId: string) {
    const activities = await this.prisma.$queryRaw<any[]>`
      SELECT host_id as "hostId" FROM activities WHERE id = ${activityId}::uuid
    `;

    if (activities.length === 0)
      throw new NotFoundException('Activity not found');
    if (activities[0].hostId !== hostId)
      throw new ForbiddenException('Only the host can approve members');

    return this.prisma.activityMember.update({
      where: { activityId_userId: { activityId, userId } },
      data: { status: MemberStatus.APPROVED },
    });
  }

  async rejectMember(hostId: string, activityId: string, userId: string) {
    const activities = await this.prisma.$queryRaw<any[]>`
      SELECT host_id as "hostId" FROM activities WHERE id = ${activityId}::uuid
    `;

    if (activities.length === 0)
      throw new NotFoundException('Activity not found');
    if (activities[0].hostId !== hostId)
      throw new ForbiddenException('Only the host can reject members');

    return this.prisma.activityMember.update({
      where: { activityId_userId: { activityId, userId } },
      data: { status: MemberStatus.REJECTED },
    });
  }

  async delete(userId: string, activityId: string) {
    const activityResult = await this.prisma.$queryRaw<any[]>`
      SELECT host_id as "hostId" FROM activities WHERE id = ${activityId}::uuid
    `;

    if (activityResult.length === 0)
      throw new NotFoundException('Activity not found');
    if (activityResult[0].hostId !== userId) {
      throw new ForbiddenException('Only the host can delete this activity');
    }

    return this.prisma.activity.delete({
      where: { id: activityId },
    });
  }

  async getMyActivities(userId: string) {
    try {
      return await this.prisma.$queryRaw<any[]>`
        SELECT 
          a.id, a.host_id as "hostId", a.title, a.description, a.address, a.lat, a.lng, 
          a.scheduled_at as "scheduledAt", a.max_members as "maxMembers", a.status, a.category, a.image_url as "imageUrl", a.created_at as "createdAt",
          u.username as "hostName", u.avatar_url as "hostAvatar", u.nationality as "hostNationality",
          (SELECT COUNT(*)::int FROM "activity_members" am WHERE am.activity_id = a.id AND am.status = 'APPROVED'::"MemberStatus") as "memberCount",
          (SELECT status::text FROM "activity_members" am WHERE am.activity_id = a.id AND am.user_id = ${userId}::uuid LIMIT 1) as "myStatus"
        FROM "activities" a
        JOIN "users" u ON a.host_id = u.id
        WHERE a.host_id = ${userId}::uuid 
           OR EXISTS (
             SELECT 1 FROM "activity_members" m 
             WHERE m.activity_id = a.id 
               AND m.user_id = ${userId}::uuid 
               AND m.status IN ('APPROVED'::"MemberStatus", 'PENDING'::"MemberStatus")
           )
        ORDER BY a.scheduled_at ASC;
      `;
    } catch (error) {
      this.logger.error('Error in getMyActivities:', error);
      return [];
    }
  }

  async getMembers(activityId: string) {
    return this.prisma.activityMember.findMany({
      where: { activityId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            nationality: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }
}
