import { dateRangeFilter, parseDateFilter, toCsv } from "@/app/lib/analytics";
import { prisma } from "@/app/lib/prisma";
import { requireRole } from "@/app/lib/session";

export async function GET(request: Request) {
  await requireRole(["ADMINISTRATOR"]);

  const url = new URL(request.url);
  const from = parseDateFilter(url.searchParams.get("from") ?? undefined);
  const to = parseDateFilter(url.searchParams.get("to") ?? undefined);
  const eventRange = dateRangeFilter(from, to);

  const events = await prisma.event.findMany({
    where: eventRange ? { startsAt: eventRange } : undefined,
    select: {
      title: true,
      category: true,
      status: true,
      capacity: true,
      startsAt: true,
      registrations: { select: { status: true, checkedInAt: true } },
    },
    orderBy: { startsAt: "desc" },
  });

  const csv = toCsv(
    [
      "Event",
      "Category",
      "Status",
      "Date",
      "Capacity",
      "Registered",
      "Waitlisted",
      "Checked in",
      "No-show",
    ],
    events.map((event) => {
      const registered = event.registrations.filter((r) => r.status === "REGISTERED");
      const checkedIn = event.registrations.filter((r) => r.checkedInAt != null).length;
      const waitlisted = event.registrations.filter((r) => r.status === "WAITLISTED").length;
      const noShow = registered.filter((r) => r.checkedInAt == null).length;

      return [
        event.title,
        event.category,
        event.status,
        event.startsAt.toISOString().slice(0, 10),
        event.capacity,
        registered.length,
        waitlisted,
        checkedIn,
        noShow,
      ];
    }),
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="asset-event-analytics.csv"',
    },
  });
}
