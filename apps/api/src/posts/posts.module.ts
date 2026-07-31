import { Module } from '@nestjs/common';
import { PostsController } from './posts.controller';
import { SocialShareController } from './social-share.controller';
import { PostsService } from './posts.service';
import { LinkPreviewController } from './link-preview.controller';
import { LinkPreviewService } from './link-preview.service';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AiModule } from '../ai/ai.module';
import { HashtagsModule } from '../hashtags/hashtags.module';

@Module({
  imports: [AuthModule, NotificationsModule, AiModule, HashtagsModule],
  controllers: [PostsController, SocialShareController, LinkPreviewController],
  providers: [PostsService, LinkPreviewService],
  exports: [PostsService, LinkPreviewService],
})
export class PostsModule {}
