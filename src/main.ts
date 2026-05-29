import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { LoggingInterceptor } from './shared/interceptors/logging.interceptor';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(cookieParser());
  const frontendUrl: string = process.env.FRONTEND_URL as string;
  const adminUrl: string = process.env.ADMIN_FRONTEND_URL as string;

  if (!frontendUrl || !adminUrl) {
    throw new Error('FRONTEND_URL and ADMIN_FRONTEND_URL must be defined in environment variables.');
  }

  app.enableCors({
    origin: [frontendUrl, adminUrl],
    credentials: true,
  });
  app.useGlobalInterceptors(new LoggingInterceptor());
  
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

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
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  const port = process.env.PORT ?? 3090;
  await app.listen(port);

  logger.log(`=================================================`);
  logger.log(`🚀 Isekai Skill Engine is running on: http://localhost:${port}`);
  logger.log(`📚 Swagger UI: http://localhost:${port}/api/docs`);
  logger.log(`=================================================`);
}
bootstrap();

