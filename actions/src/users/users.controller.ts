import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Req,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../common/types/authenticated-request';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @Get('profile')
  async getProfile(@Req() req: AuthenticatedRequest) {
    const user = await this.usersService.findById(req.user.id);
    if (!user) throw new NotFoundException('User not found');

    // Remove passwordHash before returning
    const { passwordHash, ...result } = user;
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user profile' })
  @Patch('profile')
  async updateProfile(@Req() req: AuthenticatedRequest, @Body() updateUserDto: UpdateUserDto) {
    const user = await this.usersService.updateProfile(
      req.user.id,
      updateUserDto,
    );

    const { passwordHash, ...result } = user;
    return result;
  }
}
