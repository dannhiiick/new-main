import { scrypt, randomBytes } from "node:crypto";
import { promisify } from "node:util";
import { PrismaClient } from "@prisma/client";

const scryptAsync = promisify(scrypt);
const prisma = new PrismaClient();

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = await scryptAsync(password, salt, 64);
  return `${salt}:${hash.toString("hex")}`;
}

const EMAIL = "armanin15q@gmail.com";
const NEW_PASSWORD = "Admin77019341922";

async function main() {
  const hash = await hashPassword(NEW_PASSWORD);

  // Найти или создать пользователя
  let user = await prisma.user.findUnique({ where: { email: EMAIL } });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: EMAIL,
        displayName: "Admin",
        role: "ADMIN",
        authAccounts: {
          create: { provider: "EMAIL_MAGIC_LINK", providerId: EMAIL }
        },
        emailCredential: {
          create: { email: EMAIL, passwordHash: hash }
        }
      },
    });
  } else {
    // Обновить роль и пароль
    await prisma.user.update({
      where: { email: EMAIL },
      data: { role: "ADMIN" },
    });
    await prisma.emailCredential.upsert({
      where: { email: EMAIL },
      update: { passwordHash: hash },
      create: { email: EMAIL, passwordHash: hash, userId: user.id },
    });
  }

  console.log(`✅ Admin ready: ${EMAIL} | password: ${NEW_PASSWORD}`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
