import { PrismaClient, Role } from '@prisma/client';
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Default superAdmin credentials
  const defaultSuperAdmin = {
    username: process.env.SUPERADMIN_USERNAME || 'superadmin',
    password: process.env.SUPERADMIN_PASSWORD || 'superadmin123',
    role: 'superAdmin' as Role,
  };

  // Check if superAdmin already exists
  const existingSuperAdmin = await prisma.user.findUnique({
    where: { username: defaultSuperAdmin.username },
  });

  if (existingSuperAdmin) {
    console.log('⚠️  SuperAdmin user already exists. Skipping seed.');
    return;
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(defaultSuperAdmin.password, 10);

  // Create the superAdmin user
  const superAdmin = await prisma.user.create({
    data: {
      username: defaultSuperAdmin.username,
      password: hashedPassword,
      role: defaultSuperAdmin.role,
    },
  });

  console.log('✅ SuperAdmin user created successfully!');
  console.log('📝 Credentials:');
  console.log(`   Username: ${superAdmin.username}`);
  console.log(`   Password: ${defaultSuperAdmin.password}`);
  console.log(`   Role: ${superAdmin.role}`);
  console.log('⚠️  IMPORTANT: Change the default password after first login!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
