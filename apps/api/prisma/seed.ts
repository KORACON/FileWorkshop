import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Тарифные планы
  const plans = [
    {
      name: 'Free',
      slug: 'free',
      description: 'Базовый бесплатный тариф',
      priceMonthly: 0,
      priceYearly: 0,
      limits: { maxFileSizeMb: 25, dailyOperations: 15, historyDays: 7, batchEnabled: false },
      features: ['image_convert', 'image_resize', 'image_compress', 'pdf_compress', 'pdf_merge', 'pdf_split', 'doc_convert'],
      sortOrder: 0,
    },
    {
      name: 'Plus',
      slug: 'plus',
      description: 'Для активных пользователей',
      priceMonthly: 299,
      priceYearly: 2990,
      limits: { maxFileSizeMb: 100, dailyOperations: 100, historyDays: 90, batchEnabled: true, batchMaxFiles: 10 },
      features: ['all_basic', 'batch', 'presets', 'priority_queue', 'extended_pdf', 'extended_image'],
      sortOrder: 1,
    },
    {
      name: 'Pro',
      slug: 'pro',
      description: 'Для профессионалов',
      priceMonthly: 699,
      priceYearly: 6990,
      limits: { maxFileSizeMb: 500, dailyOperations: 500, historyDays: 365, batchEnabled: true, batchMaxFiles: 50 },
      features: ['all_plus', 'marketplace_sizes', 'watermark', 'favicon_pack', 'unlimited_presets'],
      sortOrder: 2,
    },
    {
      name: 'Business',
      slug: 'business',
      description: 'Для команд',
      priceMonthly: 2990,
      priceYearly: 29900,
      limits: { maxFileSizeMb: 2048, dailyOperations: -1, historyDays: -1, batchEnabled: true, batchMaxFiles: 100, maxUsers: 10 },
      features: ['all_pro', 'api_access', 'workspaces', 'priority_support'],
      sortOrder: 3,
    },
  ];

  for (const plan of plans) {
    await prisma.billingPlan.upsert({
      where: { slug: plan.slug },
      update: plan,
      create: plan,
    });
  }
  console.log(`  ✓ ${plans.length} тарифных планов`);

  // Тестовый admin (только для dev)
  if (process.env.NODE_ENV !== 'production') {
    const adminPassword = await argon2.hash('Admin123!', { type: argon2.argon2id });
    await prisma.user.upsert({
      where: { email: 'admin@fileworkshop.local' },
      update: {},
      create: {
        email: 'admin@fileworkshop.local',
        passwordHash: adminPassword,
        name: 'Admin',
        role: 'ADMIN',
      },
    });
    console.log('  ✓ Тестовый admin: admin@fileworkshop.local / Admin123!');
  }

  console.log('Seed completed.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
