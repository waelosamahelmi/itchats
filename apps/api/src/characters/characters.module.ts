import { Module } from '@nestjs/common';
import { CharactersController } from './characters.controller';
import { CharactersService } from './characters.service';
import { CharacterCreationService } from './character-creation.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [CharactersController],
  providers: [CharactersService, CharacterCreationService],
  exports: [CharactersService, CharacterCreationService],
})
export class CharactersModule {}
