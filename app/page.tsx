import Link from "next/link";
import { AppShell } from "@/app/components/ui";
import { getCurrentUser } from "@/app/lib/session";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <AppShell user={user}>
      <section className="grid gap-10 py-10 md:grid-cols-[1.15fr_0.85fr] md:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Campus operations platform
          </p>
          <h1 className="mt-4 max-w-3xl font-heading text-5xl font-semibold uppercase leading-tight tracking-wider">
            Smart Campus Management
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
            A focused first release for role-based dashboards, student profiles,
            maintenance tickets, notifications, and admin monitoring.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild>
              <Link href={user ? "/dashboard" : "/register"}>Open dashboard</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/test-db">Test database</Link>
            </Button>
          </div>
        </div>
        <div className="bg-muted/35 px-0 py-2">
          {[
            "Student creates a maintenance request",
            "Admin reviews and updates status",
            "Student receives notification",
            "Dashboard tracks campus activity",
          ].map((item, index) => (
            <div key={item}>
              <div className="flex items-start gap-4 py-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background text-sm font-semibold">
                  {index + 1}
                </span>
                <p className="pt-1 font-medium">{item}</p>
              </div>
              {index < 3 ? <Separator /> : null}
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
