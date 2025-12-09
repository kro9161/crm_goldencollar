import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();
const prisma = new PrismaClient();
const TEMP_PASS = "Ecole123!";

(async () => {
  try {
    const users = await prisma.user.findMany();
    let fixed = 0;

    for (const u of users) {
      if (!u.password.startsWith("$2")) {
        const hash = bcrypt.hashSync(TEMP_PASS, 10);
        await prisma.user.update({
          where: { id: u.id },
          data: { password: hash },
        });
        fixed++;
        console.log(`🔧 Réinitialisé : ${u.email}`);
      }
    }

    console.log(`✅ ${fixed} compte(s) réparé(s) avec le mot de passe ${TEMP_PASS}`);
  } catch (err) {
    console.error("Erreur :", err);
  } finally {
    await prisma.$disconnect();
  }
})();
