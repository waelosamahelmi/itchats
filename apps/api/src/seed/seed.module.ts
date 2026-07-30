import { Module } from '@nestjs/common';
import { SeedController } from './seed.controller';
import { SeedService } from './seed.service';
import { AdminRoleGuard } from '../admin/admin-role.guard';

@Module({
  controllers: [SeedController],
  providers: [SeedService, AdminRoleGuard],
})
export class SeedModule {}
