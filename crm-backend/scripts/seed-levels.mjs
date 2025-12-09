import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding levels...');
  
  const levels = [
    { code: 'BAC+1', label: 'Baccalauréat + 1' },
    { code: 'BAC+2', label: 'Baccalauréat + 2' },
    { code: 'BAC+3', label: 'Baccalauréat + 3' },
    { code: 'BAC+4', label: 'Baccalauréat + 4' },
    { code: 'BAC+5', label: 'Baccalauréat + 5' },
  ];

  for (const level of levels) {
    const existing = await prisma.level.findUnique({
      where: { code: level.code },
    });

    if (!existing) {
      const created = await prisma.level.create({
        data: level,
      });
      console.log(`✅ Created level: ${created.code}`);
    } else {
      console.log(`⏭️  Level already exists: ${level.code}`);
    }
  }

  console.log('🎉 Levels seeded successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
