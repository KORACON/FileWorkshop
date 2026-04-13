import { Controller, Get, Patch, Post, Body, UseGuards } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequestUser } from '../../common/interfaces/request-with-user.interface';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@UseGuards(JwtAuthGuard)
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  async getProfile(@CurrentUser() user: RequestUser) {
    return this.profileService.getProfile(user.id);
  }

  @Patch()
  async updateProfile(@CurrentUser() user: RequestUser, @Body() dto: UpdateProfileDto) {
    return this.profileService.updateProfile(user.id, dto);
  }

  @Post('change-password')
  async changePassword(@CurrentUser() user: RequestUser, @Body() dto: ChangePasswordDto) {
    return this.profileService.changePassword(user.id, dto);
  }

  @Get('stats')
  async getStats(@CurrentUser() user: RequestUser) {
    return this.profileService.getStats(user.id);
  }
}
