import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role, UserStatus } from '@prisma/client';
import { BanUserDto } from './dto/ban-user.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ── Dashboard Stats ────────────────────────────────────────────────
  @Get('stats')
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('stats/growth')
  getUserGrowth() {
    return this.adminService.getUserGrowth();
  }

  @Get('stats/violations')
  getViolationBreakdown() {
    return this.adminService.getViolationBreakdown();
  }

  @Get('stats/reports')
  getReportStatusSummary() {
    return this.adminService.getReportStatusSummary();
  }

  @Get('stats/popular-places')
  getPopularPlaces(@Query('limit') limit?: string) {
    return this.adminService.getPopularPlaces(limit ? parseInt(limit) : 5);
  }

  // ── User Management ────────────────────────────────────────────────
  @Get('users')
  getUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: UserStatus,
  ) {
    return this.adminService.getUsers(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
      search,
      status,
    );
  }

  @Patch('users/:id/ban')
  banUser(
    @Param('id') userId: string,
    @Body() body: BanUserDto,
    @Request() req: any,
  ) {
    return this.adminService.banUser(req.user.id, userId, body.reason, body.description);
  }

  @Patch('users/:id/unban')
  unbanUser(@Param('id') userId: string, @Request() req: any) {
    return this.adminService.unbanUser(req.user.id, userId);
  }

  @Get('users/:id')
  getUserDetails(@Param('id') userId: string) {
    return this.adminService.getUserDetails(userId);
  }
}
