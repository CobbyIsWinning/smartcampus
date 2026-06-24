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

export default async function AssetEventAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const user = await requireRole(["ADMINISTRATOR"]);

  const from = parseDateFilter(params.from);
  const to = parseDateFilter(params.to);
  const eventRange = dateRangeFilter(from, to);

  const [assets, events, registrations] = await Promise.all([
    prisma.asset.findMany({ select: { status: true, category: true } }),
    prisma.event.findMany({
      where: eventRange ? { startsAt: eventRange } : undefined,
      select: { id: true, status: true },
    }),
    prisma.eventRegistration.findMany({
      where: eventRange ? { event: { startsAt: eventRange } } : undefined,
      select: { status: true, checkedInAt: true },
    }),
  ]);

  const assetStatusData = Object.entries(groupByCount(assets, (a) => a.status)).map(
    ([label, value]) => ({ label: label.replaceAll("_", " ").toLowerCase(), value }),
  );
  const assetCategoryData = Object.entries(groupByCount(assets, (a) => a.category))
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const registered = registrations.filter((r) => r.status === "REGISTERED");
  const attended = registrations.filter((r) => r.checkedInAt != null).length;
  const noShow = registered.filter((r) => r.checkedInAt == null).length;
  const waitlisted = registrations.filter((r) => r.status === "WAITLISTED").length;

  const attendanceData = [
    { label: "Checked in", value: attended },
    { label: "No-show", value: noShow },
    { label: "Waitlisted", value: waitlisted },
  ];

  const exportQuery = new URLSearchParams();
  if (params.from) exportQuery.set("from", params.from);
  if (params.to) exportQuery.set("to", params.to);
  const exportHref = `/admin/analytics/assets-events/export${
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
            Asset &amp; event analytics
          </h1>
        </div>
        <Button asChild variant="outline">
          <Link href={exportHref} prefetch={false}>
            Export CSV
          </Link>
        </Button>
      </div>

      <form className="mt-6 flex flex-wrap items-end gap-3">
        <Field label="Events from">
          <Input name="from" type="date" defaultValue={params.from ?? ""} />
        </Field>
        <Field label="Events to">
          <Input name="to" type="date" defaultValue={params.to ?? ""} />
        </Field>
        <Button type="submit" variant="outline">
          Apply filters
        </Button>
      </form>

      <section className="-mx-5 mt-8 grid gap-4 border-y bg-muted/35 px-5 py-5 md:grid-cols-4">
        <StatCard label="Total assets" value={assets.length} />
        <StatCard label="Events in range" value={events.length} />
        <StatCard label="Registrations" value={registrations.length} />
        <StatCard
          label="Attendance rate"
          value={`${percentage(attended, registered.length)}%`}
        />
      </section>

      <ReportSection
        title="Asset status mix"
        description="Inventory broken down by lifecycle status."
      >
        <BarChart data={assetStatusData} emptyText="No assets registered." />
      </ReportSection>

      <ReportSection title="Assets by category">
        <BarChart data={assetCategoryData} emptyText="No assets registered." />
      </ReportSection>

      <ReportSection
        title="Event participation"
        description="Check-in, no-show, and waitlist counts for events in range."
      >
        <BarChart data={attendanceData} emptyText="No registrations in this range." />
      </ReportSection>
    </AppShell>
  );
}
