import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixSessions() {
  const years = await prisma.academicYear.findMany();
  
  console.log('📅 Années actuelles :');
  years.forEach(y => {
    console.log(`  - ${y.name} → session: ${y.session}`);
  });

  console.log('\n🔧 Correction des sessions basées sur le nom...');
  
  for (const year of years) {
    const correctSession = year.name.toLowerCase().includes('octobre') ? 'OCTOBRE' : 'FEVRIER';
    if (year.session !== correctSession) {
      console.log(`  ✏️  ${year.name}: ${year.session} → ${correctSession}`);
      await prisma.academicYear.update({
        where: { id: year.id },
        data: { session: correctSession }
      });
    }
  }

  console.log('\n✅ Terminé !');
  await prisma.$disconnect();
}

fixSessions().catch(console.error);
