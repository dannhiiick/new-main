/**
 * One-time script to create an ADMIN user with email credentials.
 * Run via: npx tsx prisma/create-admin.ts
 */
import { PrismaClient } from "@prisma/client";
import { randomBytes, scrypt } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify<string, Buffer | string, number, Buffer>(scrypt);
const prisma = new PrismaClient();

const EMAIL = "Armanin15q@gmail.com";
const PASSWORD = "MoodAdmin2026!";
const DISPLAY_NAME = "Arman";

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = await scryptAsync(password, salt, 64);
  return `${salt}:${hash.toString("hex")}`;
}

async function main() {
  const email = EMAIL.toLowerCase().trim();

  const existing = await prisma.emailCredential.findUnique({ where: { email } });
  if (existing) {
    // Already exists — just ensure role is ADMIN
    await prisma.user.update({
      where: { id: existing.userId },
      data: { role: "ADMIN" },
    });
    console.log(`✓ User ${email} already exists — role set to ADMIN`);
    return;
  }

  const passwordHash = await hashPassword(PASSWORD);

  const user = await prisma.user.create({
    data: {
      email,
      displayName: DISPLAY_NAME,
      role: "ADMIN",
      authAccounts: {
        create: { provider: "EMAIL_MAGIC_LINK", providerId: email },
      },
      emailCredential: {
        create: { email, passwordHash },
      },
    },
    select: { id: true, email: true, role: true },
  });

  console.log(`✓ Admin created:`);
  console.log(`  ID:    ${user.id}`);
  console.log(`  Email: ${user.email}`);
  console.log(`  Role:  ${user.role}`);
  console.log(`  Pass:  ${PASSWORD}`);
  console.log(`\n  → Login at your admin panel with these credentials`);
}

main()
  .catch(err => { console.error("Error:", err); process.exit(1); })
  .finally(() => prisma.$disconnect());
