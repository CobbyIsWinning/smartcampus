import { dateRangeFilter, parseDateFilter, toCsv } from "@/app/lib/analytics";
import { prisma } from "@/app/lib/prisma";
import { requireRole } from "@/app/lib/session";

export async function GET(request: Request) {
  await requireRole(["ADMINISTRATOR"]);

  const url = new URL(request.url);
  const from = parseDateFilter(url.searchParams.get("from") ?? undefined);
  const to = parseDateFilter(url.searchParams.get("to") ?? undefined);
  const dateRange = dateRangeFilter(from, to);

  const bookings = await prisma.booking.findMany({
    where: dateRange ? { date: dateRange } : undefined,
    include: {
      facility: { select: { name: true, category: true, building: true } },
      requester: { select: { name: true, email: true } },
    },
    orderBy: { date: "desc" },
  });

  const csv = toCsv(
    [
      "Facility",
      "Category",
      "Building",
      "Date",
      "Start",
      "End",
      "Status",
      "Attendees",
      "Requester",
      "Email",
      "Purpose",
    ],
    bookings.map((b) => [
      b.facility.name,
      b.facility.category,
      b.facility.building,
      b.date.toISOString().slice(0, 10),
      b.startTime,
      b.endTime,
      b.status,
      b.attendeeCount,
      b.requester.name,
      b.requester.email,
      b.purpose,
    ]),
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="facility-utilization.csv"',
    },
  });
}
