import Link from "next/link";
import { AppShell } from "@/app/components/ui";
import { requireRole } from "@/app/lib/session";
import { Card, CardContent } from "@/components/ui/card";

type ReportLink = {
  href: string;
  title: string;
  description: string;
  adminOnly: boolean;
};

const REPORTS: ReportLink[] = [
  {
    href: "/admin/analytics/students",
    title: "Student analytics",
    description: "Role mix, profile completion, and event registration activity.",
    adminOnly: true,
  },
  {
    href: "/admin/analytics/facilities",
    title: "Facility utilization",
    description: "Bookings by facility, category, status, and peak hours. CSV export.",
    adminOnly: true,
  },
  {
    href: "/admin/analytics/maintenance",
    title: "Maintenance KPIs",
    description: "Ticket volume, resolution time, and technician workload.",
    adminOnly: false,
  },
  {
    href: "/admin/analytics/assets-events",
    title: "Asset & event analytics",
    description: "Asset status mix and event attendance / no-show. CSV export.",
    adminOnly: true,
  },
];

export default async function AnalyticsHubPage() {
  const user = await requireRole(["ADMINISTRATOR", "MAINTENANCE_SUPERVISOR"]);
  const isAdmin = user.role === "ADMINISTRATOR";
  const visible = REPORTS.filter((report) => isAdmin || !report.adminOnly);

  return (
    <AppShell user={user}>
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Reports
        </p>
        <h1 className="mt-2 font-heading text-4xl font-semibold uppercase tracking-wider">
          Analytics
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Aggregated reporting across campus operations.
        </p>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        {visible.map((report) => (
          <Link key={report.href} href={report.href} className="group">
            <Card className="h-full transition-colors group-hover:border-primary">
              <CardContent className="space-y-2 p-6">
                <h2 className="font-heading text-xl font-semibold uppercase tracking-wider">
                  {report.title}
                </h2>
                <p className="text-sm text-muted-foreground">{report.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>
    </AppShell>
  );
}
