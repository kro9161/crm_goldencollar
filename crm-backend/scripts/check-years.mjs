import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const years = await prisma.academicYear.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, session: true, isCurrent: true, isArchived: true },
    orderBy: { createdAt: "desc" },
  });

  console.log("📅 Années académiques :");
  for (const y of years) {
    console.log(`  - ${y.name} (${y.session}) : isCurrent=${y.isCurrent}, isArchived=${y.isArchived}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
