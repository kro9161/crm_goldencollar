import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();

async function main() {
  console.log("📥 Import des groupes et sous-groupes...");

  const raw = fs.readFileSync("./import/groups.json", "utf8");
  const groups = JSON.parse(raw);

  for (const group of groups) {
    console.log(`➡️ Groupe : ${group.label}`);

    // Créer le groupe
    const createdGroup = await prisma.group.create({
      data: {
        name: group.name,   // "A"
        label: group.label, // "Groupe A"
      },
    });

    // Créer les sous-groupes
    for (const sg of group.subGroups) {
      await prisma.subGroup.create({
        data: {
          code: sg.code,         // "AC"
          label: sg.label,       // "Marketing Digital..."
          groupId: createdGroup.id
        },
      });

      console.log(`   ✔ Sous-groupe : ${sg.code} – ${sg.label}`);
    }
  }

  console.log("✅ Import terminé !");
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
