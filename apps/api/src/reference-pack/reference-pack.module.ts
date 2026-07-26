import { Module } from '@nestjs/common';
import { ReferencePackGenerator } from './reference-pack.generator';

@Module({
  providers: [ReferencePackGenerator],
  exports: [ReferencePackGenerator],
})
export class ReferencePackModule {}
