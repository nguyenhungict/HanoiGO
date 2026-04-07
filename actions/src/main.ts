import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Thêm màng lọc ValidationPipe toàn cục
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 2. Cấu hình Swagger
  const config = new DocumentBuilder()
    .setTitle('HanoiGO API')
    .setDescription('Hanoi Heritage Travel Platform API Documentation')
    .setVersion('1.0')
    .addBearerAuth() // Cho phép test API có bảo mật JWT
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  // 3. Bật CORS
  app.enableCors({
    origin: '*', // Trong production nên giới hạn origin
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 8888);
  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(`Swagger documentation available at: ${await app.getUrl()}/docs`);
}
bootstrap();
