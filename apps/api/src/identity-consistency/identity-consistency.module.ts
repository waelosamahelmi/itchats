import { Module } from '@nestjs/common';
import { IdentityConsistencyService } from './identity-consistency.service';

@Module({
  providers: [IdentityConsistencyService],
  exports: [IdentityConsistencyService],
})
export class IdentityConsistencyModule {}
