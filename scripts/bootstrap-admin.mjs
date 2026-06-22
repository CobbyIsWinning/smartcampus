import "dotenv/config";
import { scryptSync, randomBytes } from "node:crypto";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const DEFAULT_ADMIN_EMAIL = "cobbyboateng16@gmail.com";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase() || DEFAULT_ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD?.trim();
const name = process.env.ADMIN_NAME?.trim() || "Campus Administrator";
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

if (password && password.length < 8) {
  console.error("ADMIN_PASSWORD must be at least 8 characters long.");
  process.exit(1);
}

function createPasswordHash(value) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(value, salt, 64).toString("hex")}`;
}

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
        role: "ADMINISTRATOR",
        ...(password ? { passwordHash: createPasswordHash(password) } : {}),
      },
    });
    console.log(`Updated ${email} as ADMINISTRATOR.`);
  } else {
    if (!password) {
      console.error("ADMIN_PASSWORD is required when creating a new administrator.");
      process.exit(1);
    }

    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: createPasswordHash(password),
        role: "ADMINISTRATOR",
      },
    });
    console.log(`Created ${email} as ADMINISTRATOR.`);
  }
} finally {
  await prisma.$disconnect();
}
