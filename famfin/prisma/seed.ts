import { db } from '../src/lib/db';

async function main() {
  console.log('🌱 Seeding database...');

  // Create sample family
  const family = await db.family.create({
    data: {
      name: 'Família Silva',
    },
  });

  // Create owner user
  const owner = await db.user.create({
    data: {
      email: 'owner@famfin.com',
      name: 'João Silva',
      role: 'OWNER',
      familyId: family.id,
    },
  });

  // Create invitation for testing
  const invitation = await db.invitation.create({
    data: {
      code: 'FAMFIN2024',
      email: 'member@famfin.com',
      familyId: family.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  });

  // Create default categories
  const categories = await Promise.all([
    // Income categories
    db.category.create({
      data: {
        name: 'Salário',
        type: 'INCOME',
        familyId: family.id,
      },
    }),
    db.category.create({
      data: {
        name: 'Freelance',
        type: 'INCOME',
        familyId: family.id,
      },
    }),
    db.category.create({
      data: {
        name: 'Investimentos',
        type: 'INCOME',
        familyId: family.id,
      },
    }),
    // Expense categories
    db.category.create({
      data: {
        name: 'Alimentação',
        type: 'EXPENSE',
        familyId: family.id,
      },
    }),
    db.category.create({
      data: {
        name: 'Transporte',
        type: 'EXPENSE',
        familyId: family.id,
      },
    }),
    db.category.create({
      data: {
        name: 'Moradia',
        type: 'EXPENSE',
        familyId: family.id,
      },
    }),
    db.category.create({
      data: {
        name: 'Lazer',
        type: 'EXPENSE',
        familyId: family.id,
      },
    }),
    db.category.create({
      data: {
        name: 'Saúde',
        type: 'EXPENSE',
        familyId: family.id,
      },
    }),
  ]);

  // Create sample accounts
  const accounts = await Promise.all([
    db.account.create({
      data: {
        name: 'Conta Principal',
        type: 'CHECKING',
        balance: 5000,
        familyId: family.id,
      },
    }),
    db.account.create({
      data: {
        name: 'Cartão Nubank',
        type: 'CREDIT_CARD',
        balance: 0,
        familyId: family.id,
        card: {
          create: {
            brand: 'Nubank',
            closingDay: 15,
            dueDay: 25,
            creditLimit: 5000,
          },
        },
      },
    }),
  ]);

  console.log('✅ Seed completed!');
  console.log(`👨‍👩‍👧‍👦 Family: ${family.name}`);
  console.log(`👤 Owner: ${owner.email}`);
  console.log(`🎫 Invitation code: ${invitation.code}`);
  console.log(`📊 Categories: ${categories.length}`);
  console.log(`🏦 Accounts: ${accounts.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });