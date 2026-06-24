import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createBookingAction } from "@/app/actions/facility.actions";
import { ActionToast } from "@/app/components/action-toast";
import { SubmitButton } from "@/app/components/submit-button";
import { AppShell, Field, StatusPill } from "@/app/components/ui";
import { prisma } from "@/app/lib/prisma";
import { requireUser } from "@/app/lib/session";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const CATEGORY_LABELS: Record<string, string> = {
  ROOM: "Room",
  LAB: "Lab",
  HALL: "Hall",
  SPORTS: "Sports",
};

function splitEquipment(value: string | null) {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatDay(date: Date) {
  return date.toLocaleDateString("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function FacilityDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; booking?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const query = await searchParams;
  const isAdmin = user.role === "ADMINISTRATOR";

  const facility = await prisma.facility.findUnique({ where: { id } });

  if (!facility) {
    notFound();
  }

  if (!facility.active && !isAdmin) {
    redirect("/facilities?error=facility-unavailable");
  }

  const today = new Date();
  const todayStart = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  const todayString = todayStart.toISOString().slice(0, 10);

  const upcomingBookings: Array<{
    id: string;
    date: Date;
    startTime: string;
    endTime: string;
    status: string;
    purpose: string;
  }> = await prisma.booking.findMany({
    where: {
      facilityId: id,
      status: { in: ["PENDING", "APPROVED"] },
      date: { gte: todayStart },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    select: {
      id: true,
      date: true,
      startTime: true,
      endTime: true,
      status: true,
      purpose: true,
    },
  });

  const errorMessages: Record<string, string> = {
    "missing-fields": "Date, time, and purpose are required.",
    "invalid-date": "Choose a valid date.",
    "invalid-time": "Enter valid start and end times.",
    "invalid-time-range": "End time must be after the start time.",
    "invalid-purpose": "Purpose must be between 4 and 500 characters.",
    "invalid-attendees": "Attendee count must be at least 1.",
    "past-slot": "You cannot book a slot in the past.",
    "over-capacity": `Attendee count exceeds the facility capacity (${facility.capacity}).`,
    "slot-taken": "That time slot is already booked. Pick another slot.",
  };

  return (
    <AppShell user={user}>
      <ActionToast
        specs={
          query.error
            ? [
                {
                  key: "error",
                  value: query.error,
                  message: errorMessages[query.error] ?? "Booking request failed.",
                  type: "error",
                },
              ]
            : []
        }
      />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Link href="/facilities" className="hover:underline">
              Facilities
            </Link>{" "}
            / {CATEGORY_LABELS[facility.category] ?? facility.category}
          </p>
          <h1 className="mt-2 font-heading text-4xl font-semibold uppercase tracking-wider">
            {facility.name}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {facility.building} · {facility.location} · capacity {facility.capacity}
          </p>
        </div>
        {!facility.active ? <Badge variant="outline">Inactive</Badge> : null}
      </div>

      {facility.description ? (
        <p className="mt-4 max-w-2xl text-sm leading-6 text-foreground/80">
          {facility.description}
        </p>
      ) : null}

      {splitEquipment(facility.equipment).length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {splitEquipment(facility.equipment).map((item) => (
            <Badge key={item} variant="outline">
              {item}
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="font-heading text-2xl font-semibold uppercase tracking-wider">
            Availability
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Upcoming pending and approved bookings. Slots not listed here are open.
          </p>
          <div className="mt-4">
            {upcomingBookings.length === 0 ? (
              <p className="text-muted-foreground">
                No upcoming bookings. This facility is fully available.
              </p>
            ) : (
              upcomingBookings.map((booking) => (
                <article
                  key={booking.id}
                  className="flex items-center justify-between gap-4 border-b py-3"
                >
                  <div>
                    <p className="font-medium">{formatDay(booking.date)}</p>
                    <p className="text-sm text-muted-foreground">
                      {booking.startTime}–{booking.endTime}
                    </p>
                  </div>
                  <StatusPill status={booking.status} />
                </article>
              ))
            )}
          </div>
        </section>

        <section>
          <Card>
            <CardHeader>
              <CardTitle>Request a booking</CardTitle>
              <CardDescription>
                Submit a booking request for admin approval. Past slots are not
                allowed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={createBookingAction} className="grid gap-4">
                <input name="facilityId" type="hidden" value={facility.id} />
                <Field label="Date">
                  <Input name="date" type="date" min={todayString} required />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Start time">
                    <Input name="startTime" type="time" required />
                  </Field>
                  <Field label="End time">
                    <Input name="endTime" type="time" required />
                  </Field>
                </div>
                <Field label="Attendees">
                  <Input
                    name="attendeeCount"
                    type="number"
                    min={1}
                    max={facility.capacity}
                    defaultValue={1}
                    required
                  />
                </Field>
                <Field label="Purpose">
                  <Textarea name="purpose" rows={4} required />
                </Field>
                <SubmitButton loadingText="Submitting...">
                  Request booking
                </SubmitButton>
              </form>
            </CardContent>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
