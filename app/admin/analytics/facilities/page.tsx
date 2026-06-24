import Link from "next/link";
import { BarChart, ReportSection } from "@/app/components/analytics-charts";
import { AppShell, Field, StatCard } from "@/app/components/ui";
import {
  dateRangeFilter,
  groupByCount,
  parseDateFilter,
  percentage,
} from "@/app/lib/analytics";
import { prisma } from "@/app/lib/prisma";
import { requireRole } from "@/app/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default async function FacilityAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const user = await requireRole(["ADMINISTRATOR"]);

  const from = parseDateFilter(params.from);
  const to = parseDateFilter(params.to);
  const dateRange = dateRangeFilter(from, to);

  const bookings = await prisma.booking.findMany({
    where: dateRange ? { date: dateRange } : undefined,
    include: { facility: { select: { name: true, category: true } } },
    orderBy: { date: "desc" },
  });

  const approved = bookings.filter((b) => b.status === "APPROVED").length;
  const pending = bookings.filter((b) => b.status === "PENDING").length;
  const rejectedOrCancelled = bookings.filter(
    (b) => b.status === "REJECTED" || b.status === "CANCELLED",
  ).length;

  const byFacility = groupByCount(bookings, (b) => b.facility.name);
  const facilityData = Object.entries(byFacility)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const byCategory = groupByCount(bookings, (b) => b.facility.category);
  const categoryData = Object.entries(byCategory).map(([label, value]) => ({
    label: label.toLowerCase(),
    value,
  }));

  const byStatus = groupByCount(bookings, (b) => b.status);
  const statusData = Object.entries(byStatus).map(([label, value]) => ({
    label: label.toLowerCase(),
    value,
  }));

  // Peak hours: bucket by the start hour of approved + pending (active) bookings.
  const activeBookings = bookings.filter(
    (b) => b.status === "APPROVED" || b.status === "PENDING",
  );
  const byHour = groupByCount(activeBookings, (b) => `${b.startTime.slice(0, 2)}:00`);
  const hourData = Object.entries(byHour)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const exportQuery = new URLSearchParams();
  if (params.from) exportQuery.set("from", params.from);
  if (params.to) exportQuery.set("to", params.to);
  const exportHref = `/admin/analytics/facilities/export${
    exportQuery.size > 0 ? `?${exportQuery}` : ""
  }`;

  return (
    <AppShell user={user}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Reports
          </p>
          <h1 className="mt-2 font-heading text-4xl font-semibold uppercase tracking-wider">
            Facility utilization
          </h1>
        </div>
        <Button asChild variant="outline">
          <Link href={exportHref} prefetch={false}>
            Export CSV
          </Link>
        </Button>
      </div>

      <form className="mt-6 flex flex-wrap items-end gap-3">
        <Field label="From date">
          <Input name="from" type="date" defaultValue={params.from ?? ""} />
        </Field>
        <Field label="To date">
          <Input name="to" type="date" defaultValue={params.to ?? ""} />
        </Field>
        <Button type="submit" variant="outline">
          Apply filters
        </Button>
      </form>

      <section className="-mx-5 mt-8 grid gap-4 border-y bg-muted/35 px-5 py-5 md:grid-cols-4">
        <StatCard label="Total bookings" value={bookings.length} />
        <StatCard
          label="Approved"
          value={`${approved} (${percentage(approved, bookings.length)}%)`}
        />
        <StatCard label="Pending" value={pending} />
        <StatCard label="Rejected / cancelled" value={rejectedOrCancelled} />
      </section>

      <ReportSection
        title="Bookings by facility"
        description="Top facilities by total booking requests in range."
      >
        <BarChart data={facilityData} />
      </ReportSection>

      <ReportSection title="Bookings by category">
        <BarChart data={categoryData} />
      </ReportSection>

      <ReportSection
        title="Bookings by status"
        description="Approved bookings counted separately from rejected/cancelled requests."
      >
        <BarChart data={statusData} />
      </ReportSection>

      <ReportSection
        title="Peak start hours"
        description="Active (approved + pending) bookings bucketed by start hour."
      >
        <BarChart data={hourData} />
      </ReportSection>
    </AppShell>
  );
}
