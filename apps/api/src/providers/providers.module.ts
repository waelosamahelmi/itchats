import { Module } from '@nestjs/common';
import { AlibabaBillingAdapter } from './alibaba/alibaba.billing';

@Module({
  providers: [AlibabaBillingAdapter],
  exports: [AlibabaBillingAdapter],
})
export class ProvidersModule {}
