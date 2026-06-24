import { BarChart, ReportSection } from "@/app/components/analytics-charts";
import { AppShell, Field, StatCard } from "@/app/components/ui";
import {
  dateRangeFilter,
  groupByCount,
  parseDateFilter,
  percentage,
  profileCompletion,
} from "@/app/lib/analytics";
import { ROLE_LABELS, requireRole, type AppRole } from "@/app/lib/session";
import { prisma } from "@/app/lib/prisma";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default async function StudentAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const user = await requireRole(["ADMINISTRATOR"]);

  const from = parseDateFilter(params.from);
  const to = parseDateFilter(params.to);
  const createdRange = dateRangeFilter(from, to);

  const [users, registrations] = await Promise.all([
    prisma.user.findMany({
      select: { role: true, studentId: true, department: true, phone: true },
    }),
    prisma.eventRegistration.findMany({
      where: createdRange ? { createdAt: createdRange } : undefined,
      select: { status: true },
    }),
  ]);

  const students = users.filter((u) => u.role === "STUDENT");
  const avgCompletion =
    students.length === 0
      ? 0
      : Math.round(
          students.reduce((sum, s) => sum + profileCompletion(s), 0) /
            students.length,
        );
  const fullyComplete = students.filter((s) => profileCompletion(s) === 100).length;

  const roleCounts = groupByCount(users, (u) => u.role);
  const roleData = (Object.keys(ROLE_LABELS) as AppRole[])
    .map((role) => ({ label: ROLE_LABELS[role], value: roleCounts[role] ?? 0 }))
    .filter((d) => d.value > 0);

  const completionBuckets = [
    { label: "Complete (100%)", value: students.filter((s) => profileCompletion(s) === 100).length },
    {
      label: "Partial (1-99%)",
      value: students.filter((s) => {
        const c = profileCompletion(s);
        return c > 0 && c < 100;
      }).length,
    },
    { label: "Empty (0%)", value: students.filter((s) => profileCompletion(s) === 0).length },
  ];

  const regCounts = groupByCount(registrations, (r) => r.status);
  const regData = Object.entries(regCounts).map(([status, value]) => ({
    label: status.toLowerCase(),
    value,
  }));

  return (
    <AppShell user={user}>
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Reports
        </p>
        <h1 className="mt-2 font-heading text-4xl font-semibold uppercase tracking-wider">
          Student analytics
        </h1>
      </div>

      <form className="mt-6 flex flex-wrap items-end gap-3">
        <Field label="Registrations from">
          <Input name="from" type="date" defaultValue={params.from ?? ""} />
        </Field>
        <Field label="Registrations to">
          <Input name="to" type="date" defaultValue={params.to ?? ""} />
        </Field>
        <Button type="submit" variant="outline">
          Apply filters
        </Button>
      </form>

      <section className="-mx-5 mt-8 grid gap-4 border-y bg-muted/35 px-5 py-5 md:grid-cols-4">
        <StatCard label="Students" value={students.length} />
        <StatCard label="All users" value={users.length} />
        <StatCard label="Avg profile completion" value={`${avgCompletion}%`} />
        <StatCard
          label="Fully complete"
          value={`${fullyComplete} (${percentage(fullyComplete, students.length)}%)`}
        />
      </section>

      <ReportSection
        title="Role mix"
        description="Active accounts grouped by role."
      >
        <BarChart data={roleData} />
      </ReportSection>

      <ReportSection
        title="Profile completion"
        description="Distribution of student profile completeness (studentId, department, phone)."
      >
        <BarChart data={completionBuckets} emptyText="No students yet." />
      </ReportSection>

      <ReportSection
        title="Event registrations"
        description="Registration activity in the selected window, by status."
      >
        <BarChart data={regData} emptyText="No registrations in this range." />
      </ReportSection>

      <p className="mt-6 text-sm text-muted-foreground">
        Note: course enrollment and attendance-risk metrics are omitted because the
        Epic 1 enrollment/attendance models are not present in the current schema.
      </p>
    </AppShell>
  );
}
