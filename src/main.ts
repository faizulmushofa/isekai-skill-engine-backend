import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { LoggingInterceptor } from './shared/interceptors/logging.interceptor';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(cookieParser());
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useStaticAssets(join(process.cwd(), 'src', 'frontend'));


  const config = new DocumentBuilder()
    .setTitle('Isekai Skill Engine API')
    .setDescription(
      'Event-driven learning data pipeline yang mengkonversi aktivitas Git dan learning evidence menjadi structured AI-ready input data.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Masukkan Access Token JWT kamu di sini',
        in: 'header',
      },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // Token tersimpan saat refresh
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  logger.log(`=================================================`);
  logger.log(`🚀 Isekai Skill Engine is running on: http://localhost:${port}`);
  logger.log(`📚 Swagger UI: http://localhost:${port}/api/docs`);
  logger.log(`=================================================`);
}
bootstrap();

