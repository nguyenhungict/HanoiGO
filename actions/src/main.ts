import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Thêm màng lọc ValidationPipe toàn cục
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Tự động gạt bỏ (strip) các field không có trong DTO
      forbidNonWhitelisted: true, // Nếu có field rác, báo lỗi 400 Bad Request ngay (Tuỳ chọn)
      transform: true, // Tự động convert data từ Request ra đúng kiểu (Class/Type) của DTO
    }),
  );

  await app.listen(process.env.PORT ?? 8888);
}
bootstrap();
