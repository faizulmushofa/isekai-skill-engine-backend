import { Global, Module } from '@nestjs/common';
import { BcryptPasswordService } from './bcrypt-password.service';
import { PASSWORD_SERVICE_TOKEN } from './password.service.interface';

@Global()
@Module({
  providers: [
    {
      provide: PASSWORD_SERVICE_TOKEN,
      useClass: BcryptPasswordService,
    },
  ],
  exports: [PASSWORD_SERVICE_TOKEN],
})
export class SecurityModule {}
