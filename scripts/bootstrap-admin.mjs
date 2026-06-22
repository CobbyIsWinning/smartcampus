import "dotenv/config";
import { scryptSync, randomBytes } from "node:crypto";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient, Role } from "@prisma/client";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD?.trim();
const name = process.env.ADMIN_NAME?.trim() || "Campus Administrator";
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

if (!email || !password) {
  console.error("ADMIN_EMAIL and ADMIN_PASSWORD are required.");
  process.exit(1);
}

if (password.length < 8) {
  console.error("ADMIN_PASSWORD must be at least 8 characters long.");
  process.exit(1);
}

const salt = randomBytes(16).toString("hex");
const passwordHash = `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString }),
});

try {
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    await prisma.user.update({
      where: { email },
      data: {
        name,
        passwordHash,
        role: Role.ADMINISTRATOR,
      },
    });
    console.log(`Updated ${email} as ADMINISTRATOR.`);
  } else {
    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: Role.ADMINISTRATOR,
      },
    });
    console.log(`Created ${email} as ADMINISTRATOR.`);
  }
} finally {
  await prisma.$disconnect();
}
