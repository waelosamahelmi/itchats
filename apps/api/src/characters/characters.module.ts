import { Module, forwardRef } from '@nestjs/common';
import { CharactersController } from './characters.controller';
import { CharactersService } from './characters.service';
import { CharacterCreationService } from './character-creation.service';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuthModule, forwardRef(() => NotificationsModule)],
  controllers: [CharactersController],
  providers: [CharactersService, CharacterCreationService],
  exports: [CharactersService, CharacterCreationService],
})
export class CharactersModule {}
