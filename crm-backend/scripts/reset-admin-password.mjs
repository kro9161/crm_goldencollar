import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetAdminPassword() {
  const hashedPassword = bcrypt.hashSync('Admin123!', 10);
  
  // Mettre à jour admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@school.local' },
    update: { password: hashedPassword },
    create: {
      email: 'admin@school.local',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'Système',
      role: 'admin',
    },
  });

  // Mettre à jour administratif
  const administratif = await prisma.user.upsert({
    where: { email: 'administratif@school.local' },
    update: { password: hashedPassword },
    create: {
      email: 'administratif@school.local',
      password: hashedPassword,
      firstName: 'Secrétariat',
      lastName: 'Général',
      role: 'administratif',
    },
  });

  console.log('✅ Mots de passe réinitialisés:');
  console.log('   - admin@school.local / Admin123!');
  console.log('   - administratif@school.local / Admin123!');
  
  await prisma.$disconnect();
}

resetAdminPassword().catch(console.error);
