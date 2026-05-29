import { Global, Module } from '@nestjs/common';
import { QuotaService } from './quota.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [QuotaService],
  exports: [QuotaService],
})
export class QuotaModule {}
