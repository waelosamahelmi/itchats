import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { MemoryService } from './memory.service';
import { ContextBuilderService } from './context-builder.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AiController],
  providers: [AiService, MemoryService, ContextBuilderService],
  exports: [AiService, MemoryService],
})
export class AiModule {}
