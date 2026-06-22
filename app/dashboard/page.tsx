import Link from "next/link";
import { updateProfileAction } from "@/app/actions/auth.actions";
import { markNotificationsReadAction } from "@/app/actions/maintenance.actions";
import { Notice } from "@/app/components/notice";
import { SubmitButton } from "@/app/components/submit-button";
import { AppShell, Field, StatCard, StatusPill } from "@/app/components/ui";
import { prisma } from "@/app/lib/prisma";
import { requireUser } from "@/app/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ profile?: string; ticket?: string; welcome?: string }>;
}) {
  const params = await searchParams;
  const user = await requireUser();
  const isAdmin =
    user.role === "ADMINISTRATOR" || user.role === "MAINTENANCE_STAFF";

  const [tickets, notifications, totalTickets, openTickets, resolvedTickets, totalUsers]: [
    Array<{
      id: string;
      title: string;
      location: string;
      status: string;
      requester: { name: string };
      assignedTo: { name: string } | null;
    }>,
    Array<{
      id: string;
      title: string;
      message: string;
      read: boolean;
    }>,
    number,
    number,
    number,
    number,
  ] = await Promise.all([
      prisma.maintenanceTicket.findMany({
        where: isAdmin ? {} : { requesterId: user.id },
        include: { requester: true, assignedTo: true },
        orderBy: { updatedAt: "desc" },
        take: 8,
      }),
      prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      prisma.maintenanceTicket.count(),
      prisma.maintenanceTicket.count({ where: { status: "OPEN" } }),
      prisma.maintenanceTicket.count({ where: { status: "RESOLVED" } }),
      prisma.user.count(),
    ]);

  return (
    <AppShell user={user}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {user.role.replaceAll("_", " ").toLowerCase()} dashboard
          </p>
          <h1 className="mt-2 font-heading text-4xl font-semibold uppercase tracking-wider">
            Welcome, {user.name}
          </h1>
        </div>
        <Button asChild>
          <Link href="/maintenance/new">Create maintenance ticket</Link>
        </Button>
      </div>

      {params.welcome === "1" ? (
        <Notice variant="success">Account created. You are signed in as a student.</Notice>
      ) : null}
      {params.ticket === "created" ? (
        <Notice variant="success">Maintenance ticket submitted successfully.</Notice>
      ) : null}
      {params.profile === "updated" ? (
        <Notice variant="success">Profile updated successfully.</Notice>
      ) : null}

      <Tabs className="mt-8 gap-8" defaultValue="overview">
        <TabsList className="w-full justify-start border-b p-0" variant="line">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <section className="grid gap-4 md:grid-cols-4">
            <StatCard label="Total tickets" value={isAdmin ? totalTickets : tickets.length} />
            <StatCard
              label="Open tickets"
              value={
                isAdmin
                  ? openTickets
                  : tickets.filter(
                      (ticket: (typeof tickets)[number]) => ticket.status === "OPEN",
                    ).length
              }
            />
            <StatCard
              label="Resolved tickets"
              value={
                isAdmin
                  ? resolvedTickets
                  : tickets.filter(
                      (ticket: (typeof tickets)[number]) =>
                        ticket.status === "RESOLVED",
                    ).length
              }
            />
            <StatCard
              label="Campus users"
              value={
                isAdmin ? totalUsers : notifications.filter((note) => !note.read).length
              }
            />
          </section>

          <section className="mt-10">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-heading text-2xl font-semibold uppercase tracking-wider">
                  Maintenance status
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Latest ticket activity and assignments.
                </p>
              </div>
              {isAdmin ? (
                <Button asChild size="sm" variant="outline">
                  <Link href="/admin/maintenance">Manage all</Link>
                </Button>
              ) : null}
            </div>
            <div>
              {tickets.length === 0 ? (
                <p className="text-muted-foreground">No maintenance tickets yet.</p>
              ) : (
                tickets.map((ticket) => (
                  <div key={ticket.id}>
                    <article className="py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold">{ticket.title}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {ticket.location} · requested by {ticket.requester.name}
                          </p>
                        </div>
                        <StatusPill status={ticket.status} />
                      </div>
                    </article>
                    <Separator />
                  </div>
                ))
              )}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="profile">
          <section className="max-w-xl">
            <div className="mb-5">
              <h2 className="font-heading text-2xl font-semibold uppercase tracking-wider">
                Student profile
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Keep profile details current for campus support.
              </p>
            </div>
            <form action={updateProfileAction} className="grid gap-4">
              <Field label="Full name">
                <Input name="name" defaultValue={user.name} required />
              </Field>
              <Field label="Student ID">
                <Input name="studentId" defaultValue={user.studentId ?? ""} />
              </Field>
              <Field label="Department">
                <Input name="department" defaultValue={user.department ?? ""} />
              </Field>
              <Field label="Phone">
                <Input name="phone" defaultValue={user.phone ?? ""} />
              </Field>
              <SubmitButton loadingText="Saving..." variant="secondary">
                Update profile
              </SubmitButton>
            </form>
          </section>
        </TabsContent>

        <TabsContent value="notifications">
          <section>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-heading text-2xl font-semibold uppercase tracking-wider">
                  Notification center
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Updates from campus operations and ticket changes.
                </p>
              </div>
              <form action={markNotificationsReadAction}>
                <SubmitButton loadingText="Updating..." variant="secondary">
                  Mark read
                </SubmitButton>
              </form>
            </div>
            <div>
              {notifications.length === 0 ? (
                <p className="text-muted-foreground">No notifications yet.</p>
              ) : (
                notifications.map((notification) => (
                  <div key={notification.id}>
                    <article
                      className={`py-4 ${notification.read ? "" : "bg-muted/40 px-4"}`}
                    >
                      <h3 className="font-semibold">{notification.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {notification.message}
                      </p>
                    </article>
                    <Separator />
                  </div>
                ))
              )}
            </div>
          </section>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
