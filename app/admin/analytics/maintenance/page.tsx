import { BarChart, ReportSection } from "@/app/components/analytics-charts";
import { AppShell, StatCard } from "@/app/components/ui";
import {
  averageDurationMs,
  formatDuration,
  groupByCount,
  percentage,
} from "@/app/lib/analytics";
import { prisma } from "@/app/lib/prisma";
import { requireRole } from "@/app/lib/session";

const RESOLVED_STATUSES = new Set(["RESOLVED", "CLOSED"]);

export default async function MaintenanceKpiPage() {
  const user = await requireRole(["ADMINISTRATOR", "MAINTENANCE_SUPERVISOR"]);

  const tickets = await prisma.maintenanceTicket.findMany({
    select: {
      status: true,
      priority: true,
      assignedToId: true,
      createdAt: true,
      updatedAt: true,
      assignedTo: { select: { name: true } },
    },
  });

  const open = tickets.filter((t) => t.status === "OPEN").length;
  const assigned = tickets.filter(
    (t) => t.status === "ASSIGNED" || t.status === "IN_PROGRESS" || t.status === "WAITING",
  ).length;
  const resolved = tickets.filter((t) => RESOLVED_STATUSES.has(t.status)).length;

  // No resolvedAt/SLA fields exist (MNT-5 not implemented), so updatedAt is used
  // as a resolution-time proxy for resolved/closed tickets.
  const avgResolution = averageDurationMs(
    tickets
      .filter((t) => RESOLVED_STATUSES.has(t.status))
      .map((t) => ({ start: t.createdAt, end: t.updatedAt })),
  );

  const statusData = Object.entries(groupByCount(tickets, (t) => t.status)).map(
    ([label, value]) => ({ label: label.replaceAll("_", " ").toLowerCase(), value }),
  );

  const priorityData = Object.entries(groupByCount(tickets, (t) => t.priority)).map(
    ([label, value]) => ({ label: label.toLowerCase(), value }),
  );

  const workload = groupByCount(
    tickets.filter((t) => t.assignedToId),
    (t) => t.assignedTo?.name ?? "Unassigned",
  );
  const workloadData = Object.entries(workload)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  return (
    <AppShell user={user}>
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Reports
        </p>
        <h1 className="mt-2 font-heading text-4xl font-semibold uppercase tracking-wider">
          Maintenance KPIs
        </h1>
      </div>

      <section className="-mx-5 mt-8 grid gap-4 border-y bg-muted/35 px-5 py-5 md:grid-cols-4">
        <StatCard label="Total tickets" value={tickets.length} />
        <StatCard label="Open" value={open} />
        <StatCard label="Assigned / in progress" value={assigned} />
        <StatCard
          label="Resolved"
          value={`${resolved} (${percentage(resolved, tickets.length)}%)`}
        />
      </section>

      <section className="-mx-5 grid gap-4 border-b bg-muted/35 px-5 py-5 md:grid-cols-2">
        <StatCard label="Avg resolution time" value={formatDuration(avgResolution)} />
        <StatCard
          label="Technicians with assignments"
          value={Object.keys(workload).length}
        />
      </section>

      <ReportSection title="Tickets by status">
        <BarChart data={statusData} />
      </ReportSection>

      <ReportSection title="Tickets by priority">
        <BarChart data={priorityData} />
      </ReportSection>

      <ReportSection
        title="Technician workload"
        description="Tickets currently assigned per technician."
      >
        <BarChart data={workloadData} emptyText="No tickets are assigned yet." />
      </ReportSection>

      <p className="mt-6 text-sm text-muted-foreground">
        Note: SLA breach / overdue tracking and resolution feedback ratings are
        unavailable because the SLA fields (MNT-5) and the ticket feedback model
        (MNT-7) are not present in the current schema. Average resolution time uses
        the ticket&apos;s last-updated timestamp as a proxy for the resolution time.
      </p>
    </AppShell>
  );
}
