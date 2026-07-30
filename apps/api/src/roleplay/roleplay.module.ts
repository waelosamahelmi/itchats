import { Module } from '@nestjs/common';
import { RoleplayController } from './roleplay.controller';
import { RoleplayService } from './roleplay.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [RoleplayController],
  providers: [RoleplayService],
  exports: [RoleplayService],
})
export class RoleplayModule {}
