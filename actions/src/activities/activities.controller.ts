import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { AuthGuard } from '@nestjs/passport';
import { OptionalJwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('activities')
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new activity' })
  async create(@Request() req: any, @Body() dto: CreateActivityDto) {
    return this.activitiesService.create(req.user.id, dto);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get all open activities' })
  async findAll(
    @Request() req: any,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radius') radius?: string,
  ) {
    return this.activitiesService.findAll(
      req.user?.id,
      lat ? parseFloat(lat) : undefined,
      lng ? parseFloat(lng) : undefined,
      radius ? parseInt(radius) : undefined,
    );
  }

  @Get('my')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my activities (hosted or joined)' })
  async getMyActivities(@Request() req: any) {
    return this.activitiesService.getMyActivities(req.user.id);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get activity details' })
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.activitiesService.findOne(id, req.user?.id);
  }

  @Post(':id/join')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request to join an activity' })
  async requestToJoin(@Request() req: any, @Param('id') id: string) {
    return this.activitiesService.requestToJoin(req.user.id, id);
  }

  @Delete(':id/join')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a join request' })
  async cancelJoinRequest(@Request() req: any, @Param('id') id: string) {
    return this.activitiesService.cancelJoinRequest(req.user.id, id);
  }

  @Patch(':id/approve/:userId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a join request (Host only)' })
  async approveMember(
    @Request() req: any,
    @Param('id') activityId: string,
    @Param('userId') userId: string,
  ) {
    return this.activitiesService.approveMember(
      req.user.id,
      activityId,
      userId,
    );
  }

  @Patch(':id/reject/:userId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject a join request (Host only)' })
  async rejectMember(
    @Request() req: any,
    @Param('id') activityId: string,
    @Param('userId') userId: string,
  ) {
    return this.activitiesService.rejectMember(req.user.id, activityId, userId);
  }

  @Get(':id/members')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get activity members' })
  async getMembers(@Param('id') id: string) {
    return this.activitiesService.getMembers(id);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an activity (Host only)' })
  async delete(@Request() req: any, @Param('id') id: string) {
    return this.activitiesService.delete(req.user.id, id);
  }
}
