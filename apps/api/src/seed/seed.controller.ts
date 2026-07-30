import { Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { AdminRoleGuard } from '../admin/admin-role.guard';
import { SeedService } from './seed.service';

@Controller('v1/admin')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Post('seed')
  async seed() {
    const result = await this.seedService.seedCharacters();
    return {
      success: true,
      message: 'Seed completed',
      ...result,
    };
  }
}
