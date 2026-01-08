import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt'; // or your preferred hashing library

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Clean existing data (optional - only for dev)
  await prisma.productDiscount.deleteMany();
  await prisma.variationPhoto.deleteMany();
  await prisma.productVariation.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.discountType.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ Cleaned existing data');

  // Create Users
  const hashedPassword = await bcrypt.hash('password123', 10);

  const superAdmin = await prisma.user.create({
    data: {
      username: 'superadmin',
      password: hashedPassword,
      role: 'superAdmin',
    },
  });

  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      password: hashedPassword,
      role: 'admin',
    },
  });

  const user = await prisma.user.create({
    data: {
      username: 'user',
      password: hashedPassword,
      role: 'user',
    },
  });

  console.log('✅ Created users');

  // Create Categories
  const electronics = await prisma.category.create({
    data: {
      name: 'Electronics',
      description: 'Electronic gadgets and devices',
    },
  });

  const furniture = await prisma.category.create({
    data: {
      name: 'Furniture',
      description: 'Home and office furniture',
    },
  });

  const clothing = await prisma.category.create({
    data: {
      name: 'Clothing',
      description: 'Apparel and fashion items',
    },
  });

  console.log('✅ Created categories');

  // Create Discount Types
  const discountTypes = await prisma.discountType.createMany({
    data: [
      { name: 'Normal', description: 'Regular discount for all customers' },
      { name: 'Special', description: 'Special promotional discount' },
      { name: 'Member', description: 'Discount for registered members' },
      { name: 'Wholesale', description: 'Bulk purchase discount' },
    ],
  });

  console.log('✅ Created discount types');

  // Get discount types for reference
  const normalDiscount = await prisma.discountType.findUnique({
    where: { name: 'Normal' },
  });
  const memberDiscount = await prisma.discountType.findUnique({
    where: { name: 'Member' },
  });

  // Create Products
  const smartphone = await prisma.product.create({
    data: {
      imsCode: 'IMS-PHONE-001',
      name: 'Smartphone XYZ Pro',
      categoryId: electronics.id,
      createdById: admin.id,
      description: 'Latest flagship smartphone with advanced features',
      length: 15.5,
      breadth: 7.5,
      height: 0.8,
      weight: 0.185,
      costPrice: 45000,
      mrp: 65000,
      variations: {
        create: [
          {
            color: 'Midnight Black',
            stockQuantity: 50,
            photos: {
              create: [
                {
                  photoUrl: '/uploads/phone-black-front.jpg',
                  isPrimary: true,
                },
                {
                  photoUrl: '/uploads/phone-black-back.jpg',
                  isPrimary: false,
                },
              ],
            },
          },
          {
            color: 'Arctic White',
            stockQuantity: 35,
            photos: {
              create: [
                {
                  photoUrl: '/uploads/phone-white-front.jpg',
                  isPrimary: true,
                },
              ],
            },
          },
          {
            color: 'Ocean Blue',
            stockQuantity: 25,
            photos: {
              create: [
                {
                  photoUrl: '/uploads/phone-blue-front.jpg',
                  isPrimary: true,
                },
              ],
            },
          },
        ],
      },
      discounts: {
        create: [
          {
            discountTypeId: normalDiscount!.id,
            discountPercentage: 10,
            isActive: true,
          },
          {
            discountTypeId: memberDiscount!.id,
            discountPercentage: 15,
            isActive: true,
          },
        ],
      },
    },
  });

  const laptop = await prisma.product.create({
    data: {
      imsCode: 'IMS-LAPTOP-001',
      name: 'Gaming Laptop Pro',
      categoryId: electronics.id,
      createdById: superAdmin.id,
      description: 'High-performance gaming laptop',
      length: 35.5,
      breadth: 24.5,
      height: 2.5,
      weight: 2.3,
      costPrice: 85000,
      mrp: 120000,
      variations: {
        create: [
          {
            color: 'Space Gray',
            stockQuantity: 15,
            photos: {
              create: [
                {
                  photoUrl: '/uploads/laptop-gray-1.jpg',
                  isPrimary: true,
                },
              ],
            },
          },
          {
            color: 'Silver',
            stockQuantity: 10,
            photos: {
              create: [
                {
                  photoUrl: '/uploads/laptop-silver-1.jpg',
                  isPrimary: true,
                },
              ],
            },
          },
        ],
      },
      discounts: {
        create: [
          {
            discountTypeId: normalDiscount!.id,
            discountPercentage: 8,
            isActive: true,
          },
        ],
      },
    },
  });

  const chair = await prisma.product.create({
    data: {
      imsCode: 'IMS-CHAIR-001',
      name: 'Executive Office Chair',
      categoryId: furniture.id,
      createdById: user.id,
      description: 'Ergonomic office chair with lumbar support',
      length: 60,
      breadth: 60,
      height: 120,
      weight: 15.5,
      costPrice: 8000,
      mrp: 15000,
      variations: {
        create: [
          {
            color: 'Black Leather',
            stockQuantity: 20,
            photos: {
              create: [
                {
                  photoUrl: '/uploads/chair-black-1.jpg',
                  isPrimary: true,
                },
              ],
            },
          },
          {
            color: 'Brown Leather',
            stockQuantity: 12,
            photos: {
              create: [
                {
                  photoUrl: '/uploads/chair-brown-1.jpg',
                  isPrimary: true,
                },
              ],
            },
          },
        ],
      },
      discounts: {
        create: [
          {
            discountTypeId: normalDiscount!.id,
            discountPercentage: 12,
            isActive: true,
          },
          {
            discountTypeId: memberDiscount!.id,
            discountPercentage: 18,
            isActive: true,
          },
        ],
      },
    },
  });

  console.log('✅ Created products with variations and discounts');

  // Summary
  const counts = {
    users: await prisma.user.count(),
    categories: await prisma.category.count(),
    products: await prisma.product.count(),
    variations: await prisma.productVariation.count(),
    photos: await prisma.variationPhoto.count(),
    discountTypes: await prisma.discountType.count(),
    discounts: await prisma.productDiscount.count(),
  };

  console.log('\n📊 Seed Summary:');
  console.log('================');
  console.log(`Users: ${counts.users}`);
  console.log(`Categories: ${counts.categories}`);
  console.log(`Products: ${counts.products}`);
  console.log(`Variations: ${counts.variations}`);
  console.log(`Photos: ${counts.photos}`);
  console.log(`Discount Types: ${counts.discountTypes}`);
  console.log(`Active Discounts: ${counts.discounts}`);
  console.log('================');
  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });