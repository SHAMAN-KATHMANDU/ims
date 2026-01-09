import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from project root
// seed.ts is in apps/api/prisma/, so we go up 3 levels to reach project root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Get superAdmin credentials from environment variables
  const superAdminUsername = process.env.SUPERADMIN_USERNAME;
  const superAdminPassword = process.env.SUPERADMIN_PASSWORD;

  if (!superAdminUsername || !superAdminPassword) {
    throw new Error(
      '❌ Missing required environment variables: SUPERADMIN_USERNAME and SUPERADMIN_PASSWORD must be set in .env file'
    );
  }

  // Check if superAdmin already exists
  const existingSuperAdmin = await prisma.user.findUnique({
    where: { username: superAdminUsername },
  });

  if (existingSuperAdmin) {
    console.log(`⚠️  User "${superAdminUsername}" already exists. Skipping creation.`);
    console.log('💡 To recreate the superAdmin, delete the user first or use prisma:reset');
    return;
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(superAdminPassword, 10);

  // Create superAdmin user
  const superAdmin = await prisma.user.create({
    data: {
      username: superAdminUsername,
      password: hashedPassword,
      role: 'superAdmin',
    },
  });

  console.log('✅ Created superAdmin user');
  console.log(`   Username: ${superAdmin.username}`);
  console.log(`   Role: ${superAdmin.role}`);
  console.log(`   ID: ${superAdmin.id}`);

  // Create Discount Types (if they don't exist)
  const discountTypeNames = ['Normal', 'Special', 'Member', 'Wholesale'];
  const discountTypeDescriptions: Record<string, string> = {
    'Normal': 'Regular discount for all customers',
    'Special': 'Special promotional discount',
    'Member': 'Discount for registered members',
    'Wholesale': 'Bulk purchase discount',
  };

  for (const name of discountTypeNames) {
    const existing = await prisma.discountType.findUnique({
      where: { name },
    });

    if (!existing) {
      await prisma.discountType.create({
        data: {
          name,
          description: discountTypeDescriptions[name] || null,
        },
      });
      console.log(`✅ Created discount type: ${name}`);
    } else {
      console.log(`⚠️  Discount type "${name}" already exists. Skipping.`);
    }
  }

  console.log('\n🎉 Seeding completed successfully!');
  console.log('📝 You can now log in with the credentials from your .env file');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
