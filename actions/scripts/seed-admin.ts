import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const username = 'admin';
  const email = 'admin@hanoigo.com';
  const password = 'hung2004';
  const role = 'ADMIN';

  console.log('--- Seeding Admin Account ---');

  // Kiểm tra tài khoản đã tồn tại chưa
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { username: username },
        { email: email }
      ]
    }
  });

  if (existingUser) {
    console.log('Admin user already exists. Updating role to ADMIN...');
    await prisma.user.update({
      where: { id: existingUser.id },
      data: { role: 'ADMIN' }
    });
    console.log('Role updated successfully.');
  } else {
    // Hash mật khẩu
    const hashedPassword = await bcrypt.hash(password, 12);

    // Tạo user mới
    await prisma.user.create({
      data: {
        username,
        email,
        passwordHash: hashedPassword,
        role,
        fullName: 'System Administrator',
        bio: 'Chief Guardian of HanoiGO Heritage.',
      }
    });
    console.log('Admin account created successfully!');
    console.log(`Username: ${username}`);
    console.log(`Password: ${password}`);
  }
}

main()
  .catch((e) => {
    console.error('Error seeding admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
