import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ViolationType, ReportStatus, Role, UserStatus, NotificationType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { CreatePlaceDto } from './dto/create-place.dto';
import { UpdatePlaceDto } from './dto/update-place.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  // ── Dashboard Stats ────────────────────────────────────────────────
  async getDashboardStats() {
    const [totalUsers, bannedUsers, totalPlaces, totalTrips, pendingReports] =
      await Promise.all([
        this.prisma.user.count({ where: { role: Role.USER } }),
        this.prisma.user.count({ where: { status: UserStatus.BANNED } }),
        this.prisma.place.count(),
        this.prisma.trip.count(),
        this.prisma.report.count({ where: { status: ReportStatus.PENDING } }),
      ]);

    return { totalUsers, bannedUsers, totalPlaces, totalTrips, pendingReports };
  }

  // ── User Growth (Last 30 days) ──────────────────────────────────────
  async getUserGrowth() {
    const growth = await this.prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date, 
        COUNT(*)::int as count 
      FROM users 
      WHERE created_at >= NOW() - INTERVAL '30 days' AND role = 'USER'
      GROUP BY DATE(created_at) 
      ORDER BY DATE(created_at) ASC;
    `;

    // Initialize map with all dates in the last 30 days to ensure zero counts are included
    const growthMap = new Map<string, number>();
    for (let i = 0; i <= 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      growthMap.set(date.toISOString().split('T')[0], 0);
    }

    if (Array.isArray(growth)) {
      growth.forEach((row: any) => {
        const dateKey = row.date instanceof Date ? row.date.toISOString().split('T')[0] : String(row.date);
        growthMap.set(dateKey, row.count);
      });
    }

    return Array.from(growthMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // ── Violation Breakdown ────────────────────────────────────────────
  async getViolationBreakdown() {
    const reports = await this.prisma.report.groupBy({
      by: ['reason'],
      _count: { reason: true },
    });

    return reports.map((r) => ({
      type: r.reason,
      count: r._count.reason,
    }));
  }

  // ── Report Status Summary ──────────────────────────────────────────
  async getReportStatusSummary() {
    const [pending, resolved, dismissed, total] = await Promise.all([
      this.prisma.report.count({ where: { status: ReportStatus.PENDING } }),
      this.prisma.report.count({ where: { status: ReportStatus.RESOLVED } }),
      this.prisma.report.count({ where: { status: ReportStatus.DISMISSED } }),
      this.prisma.report.count(),
    ]);

    return { pending, resolved, dismissed, total };
  }

  // ── Popular Places ─────────────────────────────────────────────────
  async getPopularPlaces(limit: number = 5) {
    const popular = await this.prisma.tripStop.groupBy({
      by: ['placeId'],
      _count: { placeId: true },
      orderBy: { _count: { placeId: 'desc' } },
      take: limit,
    });

    if (popular.length === 0) return [];

    const placeDetails = await this.prisma.place.findMany({
      where: { id: { in: popular.map((p) => p.placeId) } },
      select: {
        id: true,
        name: true,
        category: true,
        district: true,
        imageUrl: true,
      },
    });

    return popular.map((p) => {
      const details = placeDetails.find((d) => d.id === p.placeId);
      return {
        id: p.placeId,
        name: details?.name || 'Unknown',
        category: details?.category || 'General',
        district: details?.district || '',
        imageUrl: details?.imageUrl || null,
        visits: p._count.placeId,
      };
    });
  }

  // ── User Listing (Paginated + Search) ──────────────────────────────
  async getUsers(
    page = 1,
    limit = 10,
    search?: string,
    statusFilter?: UserStatus,
  ) {
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (statusFilter) {
      where.status = statusFilter;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          email: true,
          fullName: true,
          avatarUrl: true,
          role: true,
          status: true,
          createdAt: true,
          _count: { select: { trips: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      total,
      page,
      lastPage: Math.ceil(total / limit) || 1,
    };
  }

  // ── Ban User ───────────────────────────────────────────────────────
  async banUser(
    adminId: string,
    userId: string,
    reason: ViolationType,
    description?: string,
  ) {
    if (!adminId)
      throw new BadRequestException('Admin identity not found in request');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (user.role === Role.ADMIN)
      throw new BadRequestException('Cannot ban an administrative account');

    if (user.status === UserStatus.BANNED)
      throw new BadRequestException('User is already in suspended state');

    try {
      console.log(
        `[AdminService] Attempting to ban UserID: ${userId} by AdminID: ${adminId}`,
      );

      await this.prisma.$transaction(async (tx) => {
        // 1. Update status
        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: {
            status: UserStatus.BANNED,
            tokenVersion: { increment: 1 },
          },
        });

        console.log(
          `[AdminService] Update step DONE. User: ${updatedUser.username}, Status in DB: ${updatedUser.status}`,
        );

        // 2. Create ban report record
        await tx.report.create({
          data: {
            reporterId: adminId,
            targetId: userId,
            reason,
            description:
              description || `Account suspended by admin for ${reason}`,
            status: ReportStatus.RESOLVED,
            resolvedAt: new Date(),
          },
        });

        // 3. System Audit Log with verified ID
        await tx.adminLog.create({
          data: {
            adminId,
            action: 'BAN_USER',
            targetId: userId,
            details: JSON.stringify({
              reason,
              description,
              targetId: userId,
              timestamp: new Date().toISOString(),
            }),
          },
        });
      });

      console.log(`[AdminService] TRANSACTION COMMITTED for UserID: ${userId}`);

      try {
        await this.notificationsService.create(
          userId,
          NotificationType.ADMIN_WARNING,
          'Account Suspended',
          `Your account has been suspended due to violation: ${reason}`,
        );
      } catch (err) {
        console.error('[AdminService] Failed to notify banned user:', err);
      }

      return { success: true, message: 'User access revoked successfully' };
    } catch (error) {
      console.error('[AdminService] TRANSACTION FAILED:', error);
      throw new BadRequestException(`Suspension failed: ${error.message}`);
    }
  }

  // ── Unban User ─────────────────────────────────────────────────────
  async unbanUser(adminId: string, userId: string) {
    if (!adminId) throw new BadRequestException('Admin identity required');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (user.status !== UserStatus.BANNED)
      throw new BadRequestException('User account is currently active');

    try {
      await this.prisma.$transaction(async (tx) => {
        // 1. Restore status
        await tx.user.update({
          where: { id: userId },
          data: { status: UserStatus.ACTIVE },
        });

        // 2. System Audit Log
        await tx.adminLog.create({
          data: {
            adminId,
            action: 'UNBAN_USER',
            targetId: userId,
            details: JSON.stringify({
              action: 'RESTORE_ACCESS',
              timestamp: new Date().toISOString(),
            }),
          },
        });
      });

      return { success: true, message: 'User access restored successfully' };
    } catch (error) {
      console.error('[AdminService] Unban Operation Failed:', error);
      throw new BadRequestException(`Restoration failed: ${error.message}`);
    }
  }

  // ── Get User Details ───────────────────────────────────────────────
  async getUserDetails(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        bio: true,
        nationality: true,
        languages: true,
        role: true,
        status: true,
        createdAt: true,
        _count: {
          select: {
            trips: true,
            reportsCreated: true, // Reports made by this user
            reportsAgainst: true, // Reports against this user
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // ── Place Management ───────────────────────────────────────────────
  async getPlaces(page = 1, limit = 10, search?: string, category?: string) {
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
        include: { _count: { select: { tripStops: true } } },
      }),
      this.prisma.place.count({ where }),
    ]);

    return { places, total, page, lastPage: Math.ceil(total / limit) || 1 };
  }

  private parseTime(timeStr?: string): Date | null {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  async createPlace(dto: CreatePlaceDto) {
    const wkt = `SRID=4326;POINT(${dto.lng} ${dto.lat})`;

    // We use executeRaw for the geometry field because Prisma doesn't support it directly
    // But first we create the record without the geometry to get an ID if needed,
    // or just use executeRaw for the whole thing like the seed script.

    try {
      const id = crypto.randomUUID();
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO places (
          id, name, category, district, address, lat, lng, location, image_url, tags, always_open, 
          open_time_start, open_time_end, created_at
        ) VALUES (
          $1::uuid, $2, $3, $4, $5, $6, $7, ST_GeomFromEWKT($8), $9, $10, $11, $12, $13, now()
        )`,
        id,
        dto.name,
        dto.category,
        dto.district,
        dto.address || null,
        dto.lat,
        dto.lng,
        wkt,
        dto.imageUrl || null,
        dto.tags || [],
        dto.alwaysOpen || false,
        this.parseTime(dto.openTimeStart),
        this.parseTime(dto.openTimeEnd),
      );

      return this.prisma.place.findUnique({ where: { id } });
    } catch (error) {
      if (error.code === 'P2002')
        throw new BadRequestException('Place with this name already exists');
      throw error;
    }
  }

  async updatePlace(id: string, dto: UpdatePlaceDto) {
    const place = await this.prisma.place.findUnique({ where: { id } });
    if (!place) throw new NotFoundException('Place not found');

    const updateData: any = { ...dto };
    delete updateData.lat;
    delete updateData.lng;

    if (dto.openTimeStart)
      updateData.openTimeStart = this.parseTime(dto.openTimeStart);
    if (dto.openTimeEnd)
      updateData.openTimeEnd = this.parseTime(dto.openTimeEnd);

    await this.prisma.place.update({
      where: { id },
      data: updateData,
    });

    if (dto.lat !== undefined || dto.lng !== undefined) {
      const newLat = dto.lat ?? place.lat;
      const newLng = dto.lng ?? place.lng;
      const wkt = `SRID=4326;POINT(${newLng} ${newLat})`;

      await this.prisma.$executeRawUnsafe(
        `UPDATE places SET lat = $1, lng = $2, location = ST_GeomFromEWKT($3) WHERE id = $4::uuid`,
        newLat,
        newLng,
        wkt,
        id,
      );
    }

    return this.prisma.place.findUnique({ where: { id } });
  }

  async deletePlace(id: string) {
    try {
      await this.prisma.place.delete({ where: { id } });
      return { success: true };
    } catch (error) {
      throw new NotFoundException('Place not found or cannot be deleted');
    }
  }

  // ── User Creation ──────────────────────────────────────────────────
  async createUser(dto: CreateUserDto) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
    });
    if (existing)
      throw new BadRequestException('Username or email already exists');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        role: dto.role || Role.USER,
        status: UserStatus.ACTIVE,
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });
  }
  async deleteUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (user.role === Role.ADMIN)
      throw new BadRequestException('Cannot delete an administrative account');

    try {
      await this.prisma.$transaction(async (tx) => {
        // Delete reports against this user or by this user
        await tx.report.deleteMany({
          where: {
            OR: [{ targetId: userId }, { reporterId: userId }],
          },
        });

        // Delete admin logs targeting this user (targetId is a string, not uuid relation)
        await tx.adminLog.deleteMany({
          where: { targetId: userId },
        });

        // Finally delete the user
        await tx.user.delete({ where: { id: userId } });
      });

      return { success: true, message: 'User permanently deleted' };
    } catch (error) {
      console.error('[AdminService] Delete Operation Failed:', error);
      throw new BadRequestException(`Deletion failed: ${error.message}`);
    }
  }

  // ── Report Management ───────────────────────────────────────────────
  async getReports(
    page = 1,
    limit = 10,
    status?: ReportStatus,
    search?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { reporter: { username: { contains: search, mode: 'insensitive' } } },
        { targetUser: { username: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [reports, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: {
            select: { id: true, username: true, email: true, fullName: true, avatarUrl: true },
          },
          targetUser: {
            select: { id: true, username: true, email: true, fullName: true, avatarUrl: true },
          },
        },
      }),
      this.prisma.report.count({ where }),
    ]);

    const activityIds = reports
      .filter((r) => r.entityType === 'ACTIVITY' && r.entityId)
      .map((r) => r.entityId as string);

    const activities = activityIds.length > 0
      ? await this.prisma.activity.findMany({
          where: { id: { in: activityIds } },
          select: { id: true, title: true, status: true, hostId: true },
        })
      : [];

    const mappedReports = reports.map((report) => {
      let activity = null;
      if (report.entityType === 'ACTIVITY') {
        activity = activities.find((a) => a.id === report.entityId) || null;
      }
      return {
        ...report,
        activity,
      };
    });

    return {
      reports: mappedReports,
      total,
      page,
      lastPage: Math.ceil(total / limit) || 1,
    };
  }

  async getReportDetail(reportId: string) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: {
        reporter: {
          select: { id: true, username: true, email: true, fullName: true, avatarUrl: true },
        },
        targetUser: {
          select: { id: true, username: true, email: true, fullName: true, avatarUrl: true },
        },
      },
    });

    if (!report) throw new NotFoundException('Report not found');

    let activity = null;
    if (report.entityType === 'ACTIVITY' && report.entityId) {
      activity = await this.prisma.activity.findUnique({
        where: { id: report.entityId },
        include: {
          host: {
            select: { id: true, username: true, avatarUrl: true },
          },
        },
      });
    }

    return {
      ...report,
      activity,
    };
  }

  async resolveReport(
    adminId: string,
    reportId: string,
    adminNotes?: string,
    hideActivity?: boolean,
  ) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) throw new NotFoundException('Report not found');

    try {
      await this.prisma.$transaction(async (tx) => {
        // 1. Update report status
        await tx.report.update({
          where: { id: reportId },
          data: {
            status: ReportStatus.RESOLVED,
            resolvedAt: new Date(),
            adminNotes: adminNotes || null,
          },
        });

        // 2. Hide activity if requested
        if (hideActivity && report.entityType === 'ACTIVITY' && report.entityId) {
          await tx.activity.update({
            where: { id: report.entityId },
            data: { status: 'CANCELLED' },
          });
        }

        // 3. Log admin action
        await tx.adminLog.create({
          data: {
            adminId,
            action: 'RESOLVE_REPORT',
            targetId: reportId,
            details: JSON.stringify({
              reportId,
              entityType: report.entityType,
              entityId: report.entityId,
              hideActivity,
              timestamp: new Date().toISOString(),
            }),
          },
        });
      });

      return { success: true };
    } catch (error) {
      throw new BadRequestException(`Failed to resolve report: ${error.message}`);
    }
  }

  async dismissReport(adminId: string, reportId: string, adminNotes?: string) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) throw new NotFoundException('Report not found');

    try {
      await this.prisma.$transaction(async (tx) => {
        // 1. Update report status
        await tx.report.update({
          where: { id: reportId },
          data: {
            status: ReportStatus.DISMISSED,
            resolvedAt: new Date(),
            adminNotes: adminNotes || null,
          },
        });

        // 2. Log admin action
        await tx.adminLog.create({
          data: {
            adminId,
            action: 'DISMISS_REPORT',
            targetId: reportId,
            details: JSON.stringify({
              reportId,
              timestamp: new Date().toISOString(),
            }),
          },
        });
      });

      return { success: true };
    } catch (error) {
      throw new BadRequestException(`Failed to dismiss report: ${error.message}`);
    }
  }
}
