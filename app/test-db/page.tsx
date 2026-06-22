import { AppShell } from "@/app/components/ui";
import { prisma } from "@/app/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

async function countUsers() {
  try {
    const usersFound = await prisma.user.count();
    return { usersFound };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export default async function TestDbPage() {
  if (!process.env.DATABASE_URL) {
    return (
      <AppShell>
        <Card>
          <CardHeader>
            <CardTitle>Database test</CardTitle>
            <CardDescription>Neon connection status</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">
              DATABASE_URL is not configured. Add your Neon connection string to `.env`.
            </p>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  const result = await countUsers();

  if ("usersFound" in result) {
    return (
      <AppShell>
        <Card>
          <CardHeader>
            <CardTitle>Database test</CardTitle>
            <CardDescription>Neon connection status</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-lg">Users found: {result.usersFound}</p>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Card>
        <CardHeader>
          <CardTitle>Database test</CardTitle>
          <CardDescription>Neon connection status</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">
            Could not connect to the database: {result.error}
          </p>
        </CardContent>
      </Card>
    </AppShell>
  );
}
