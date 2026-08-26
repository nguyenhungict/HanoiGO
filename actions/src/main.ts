import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { RedisIoAdapter } from './redis/redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Phục vụ ảnh từ thư mục public
  app.useStaticAssets(join(process.cwd(), 'public'));

  // Socket.io Redis adapter: lets group-chat broadcasts reach sockets
  // connected to OTHER instances once this app is scaled horizontally.
  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

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
