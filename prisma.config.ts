import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migrations run through the Prisma CLI over a direct TCP connection, so
    // prefer an unpooled endpoint (`DIRECT_URL`) when one is provided — Neon's
    // pooled `-pooler` host (PgBouncer) is unreliable for migrations. Falls back
    // to `DATABASE_URL` for local/dev use.
    url:
      process.env.DIRECT_URL ??
      process.env.DATABASE_URL ??
      "postgresql://user:password@localhost:5432/smartcampus",
  },
});
