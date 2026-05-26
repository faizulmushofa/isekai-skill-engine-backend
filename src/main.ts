import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  
  app.use(cookieParser());
  
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  
  logger.log(`=================================================`);
  logger.log(`🚀 Isekai Skill Engine is running on: http://localhost:${port}`);
  logger.log(`=================================================`);
}
bootstrap();
