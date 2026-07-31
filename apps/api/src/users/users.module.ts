import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthModule } from '../auth/auth.module';
import { PostsModule } from '../posts/posts.module';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [AuthModule, PostsModule, MediaModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
