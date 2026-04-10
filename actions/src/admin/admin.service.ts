import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ViolationType, ReportStatus, Role, UserStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

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
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const users = await this.prisma.user.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        role: Role.USER,
      },
      select: { createdAt: true },
    });

    // Group by date in JS since Prisma doesn't support grouping by date part easily across all DBs
    const growthMap = new Map<string, number>();

    // Initialize map with all dates in the last 30 days to ensure zero counts are included
    for (let i = 0; i <= 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      growthMap.set(date.toISOString().split('T')[0], 0);
    }

    users.forEach((u) => {
      const dateKey = u.createdAt.toISOString().split('T')[0];
      if (growthMap.has(dateKey)) {
        growthMap.set(dateKey, (growthMap.get(dateKey) || 0) + 1);
      }
    });

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
      select: { id: true, name: true, category: true, district: true, imageUrl: true },
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
  async getUsers(page = 1, limit = 10, search?: string, statusFilter?: UserStatus) {
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
    if (!adminId) throw new BadRequestException('Admin identity not found in request');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    
    if (user.role === Role.ADMIN)
      throw new BadRequestException('Cannot ban an administrative account');
    
    if (user.status === UserStatus.BANNED)
      throw new BadRequestException('User is already in suspended state');

    try {
      console.log(`[AdminService] Attempting to ban UserID: ${userId} by AdminID: ${adminId}`);
      
      await this.prisma.$transaction(async (tx) => {
        // 1. Update status
        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: {
            status: UserStatus.BANNED,
            tokenVersion: { increment: 1 },
          },
        });

        console.log(`[AdminService] Update step DONE. User: ${updatedUser.username}, Status in DB: ${updatedUser.status}`);

        // 2. Create ban report record
        await tx.report.create({
          data: {
            reporterId: adminId,
            targetId: userId,
            reason,
            description: description || `Account suspended by admin for ${reason}`,
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
              timestamp: new Date().toISOString()
            }),
          },
        });
      });

      console.log(`[AdminService] TRANSACTION COMMITTED for UserID: ${userId}`);
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
              timestamp: new Date().toISOString() 
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
}


