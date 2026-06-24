import Link from "next/link";
import { AppShell, StatCard, StatusPill } from "@/app/components/ui";
import { prisma } from "@/app/lib/prisma";
import { requireRole } from "@/app/lib/session";
import { isSlaBreached } from "@/app/lib/validation";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const PRIORITY_RANK: Record<string, number> = {
  URGENT: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

function priorityLabel(priority: string) {
  return priority === "URGENT" ? "Critical" : priority.toLowerCase();
}

const ACTIVE_STATUSES = ["OPEN", "ASSIGNED", "IN_PROGRESS", "WAITING"];

export default async function TechnicianTasksPage() {
  // MNT-4: technician task list — tickets assigned to the current staff member.
  const user = await requireRole(["MAINTENANCE_STAFF", "MAINTENANCE_SUPERVISOR"]);
  const now = new Date();

  const tickets = await prisma.maintenanceTicket.findMany({
    where: { assignedToId: user.id },
    include: { requester: true },
    orderBy: { updatedAt: "desc" },
  });

  const sorted = [...tickets].sort((a, b) => {
    const rank = (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9);
    if (rank !== 0) return rank;
    const aDue = a.slaDueAt ? a.slaDueAt.getTime() : Infinity;
    const bDue = b.slaDueAt ? b.slaDueAt.getTime() : Infinity;
    return aDue - bDue;
  });

  const active = sorted.filter((ticket) => ACTIVE_STATUSES.includes(ticket.status));
  const overdue = sorted.filter((ticket) =>
    isSlaBreached(ticket.slaDueAt, ticket.status, now),
  ).length;

  return (
    <AppShell user={user}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            My work
          </p>
          <h1 className="mt-2 font-heading text-4xl font-semibold uppercase tracking-wider">
            My assigned tickets
          </h1>
        </div>
        <Link
          href="/admin/maintenance"
          className="text-sm underline-offset-2 hover:underline"
        >
          View full queue
        </Link>
      </div>

      <section className="-mx-5 mt-8 grid gap-4 border-y bg-muted/35 px-5 py-5 md:grid-cols-3">
        <StatCard label="Assigned to me" value={sorted.length} />
        <StatCard label="Active" value={active.length} />
        <StatCard label="Overdue (SLA)" value={overdue} />
      </section>

      <section className="mt-8">
        {sorted.length === 0 ? (
          <p className="text-muted-foreground">No tickets are assigned to you.</p>
        ) : (
          sorted.map((ticket) => {
            const breached = isSlaBreached(ticket.slaDueAt, ticket.status, now);
            return (
              <div key={ticket.id}>
                <article className="py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Link
                        href={`/maintenance/${ticket.id}`}
                        className="font-semibold underline-offset-2 hover:underline"
                      >
                        {ticket.ticketNo} · {ticket.title}
                      </Link>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {ticket.category ? `${ticket.category} · ` : ""}
                        {ticket.location} · {priorityLabel(ticket.priority)} priority ·
                        requested by {ticket.requester.name}
                      </p>
                      {ticket.slaDueAt ? (
                        <p className="mt-1 text-sm text-muted-foreground">
                          Due {ticket.slaDueAt.toISOString().slice(0, 16).replace("T", " ")}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      {breached ? <Badge variant="destructive">Overdue</Badge> : null}
                      <StatusPill status={ticket.status} />
                    </div>
                  </div>
                </article>
                <Separator />
              </div>
            );
          })
        )}
      </section>
    </AppShell>
  );
}
