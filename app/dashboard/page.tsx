import Link from "next/link";
import { updateProfileAction } from "@/app/actions/auth.actions";
import {
  cancelBookingAction,
  rescheduleBookingAction,
} from "@/app/actions/facility.actions";
import { markNotificationsReadAction } from "@/app/actions/maintenance.actions";
import { ActionToast } from "@/app/components/action-toast";
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
  searchParams: Promise<{
    profile?: string;
    ticket?: string;
    welcome?: string;
    booking?: string;
    error?: string;
  }>;
}) {
  const params = await searchParams;
  const user = await requireUser();
  const isAdmin =
    user.role === "ADMINISTRATOR" || user.role === "MAINTENANCE_STAFF";

  const bookings = await prisma.booking.findMany({
    where: { requesterId: user.id },
    include: { facility: true },
    orderBy: [{ date: "desc" }, { startTime: "desc" }],
    take: 12,
  });
  const now = new Date();
  const todayString = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  )
    .toISOString()
    .slice(0, 10);
  const bookingErrorMessages: Record<string, string> = {
    "booking-not-found": "Booking not found.",
    "booking-not-cancellable": "That booking can no longer be cancelled.",
    "booking-not-reschedulable": "That booking can no longer be rescheduled.",
    "past-slot": "You cannot move a booking to a past slot.",
    "slot-taken": "That time slot is already booked. Pick another slot.",
    "invalid-time-range": "End time must be after the start time.",
    "invalid-time": "Enter valid start and end times.",
    "invalid-date": "Choose a valid date.",
    "missing-fields": "Date and time are required.",
  };

  const [
    tickets,
    notifications,
    totalTickets,
    openTickets,
    resolvedTickets,
    totalUsers,
    unreadNotificationCount,
  ]: [
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
      prisma.notification.count({ where: { userId: user.id, read: false } }),
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
      <ActionToast
        specs={[
          ...(params.welcome === "1"
            ? [
                {
                  key: "welcome",
                  value: "1",
                  message: "Account created. You are signed in as a student.",
                  type: "success" as const,
                },
              ]
            : []),
          ...(params.ticket === "created"
            ? [
                {
                  key: "ticket",
                  value: "created",
                  message: "Maintenance ticket submitted successfully.",
                  type: "success" as const,
                },
              ]
            : []),
          ...(params.profile === "updated"
            ? [
                {
                  key: "profile",
                  value: "updated",
                  message: "Profile updated successfully.",
                  type: "success" as const,
                },
              ]
            : []),
          ...(params.booking === "created"
            ? [
                {
                  key: "booking",
                  value: "created",
                  message: "Booking request submitted for approval.",
                  type: "success" as const,
                },
              ]
            : []),
          ...(params.booking === "cancelled"
            ? [
                {
                  key: "booking",
                  value: "cancelled",
                  message: "Booking cancelled and slot released.",
                  type: "success" as const,
                },
              ]
            : []),
          ...(params.booking === "rescheduled"
            ? [
                {
                  key: "booking",
                  value: "rescheduled",
                  message: "Booking rescheduled and re-submitted for approval.",
                  type: "success" as const,
                },
              ]
            : []),
          ...(params.error
            ? [
                {
                  key: "error",
                  value: params.error,
                  message:
                    bookingErrorMessages[params.error] ?? "Booking action failed.",
                  type: "error" as const,
                },
              ]
            : []),
        ]}
      />

      <Tabs className="mt-8 gap-8" defaultValue="overview">
        <TabsList className="w-full justify-start border-b p-0" variant="line">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="bookings">
            My bookings
            {bookings.length > 0 ? ` (${bookings.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">
            Notifications
            {unreadNotificationCount > 0 ? ` (${unreadNotificationCount})` : ""}
          </TabsTrigger>
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
                isAdmin ? totalUsers : unreadNotificationCount
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

        <TabsContent value="bookings">
          <section>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-heading text-2xl font-semibold uppercase tracking-wider">
                  Facility bookings
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your booking history and upcoming reservations.
                </p>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href="/facilities">Book a facility</Link>
              </Button>
            </div>
            <div>
              {bookings.length === 0 ? (
                <p className="text-muted-foreground">
                  You have no bookings yet.{" "}
                  <Link href="/facilities" className="underline">
                    Browse facilities
                  </Link>
                  .
                </p>
              ) : (
                bookings.map((booking) => {
                  const dateString = booking.date.toISOString().slice(0, 10);
                  const slotStart = new Date(`${dateString}T${booking.startTime}`);
                  const canModify =
                    (booking.status === "PENDING" || booking.status === "APPROVED") &&
                    slotStart.getTime() >= now.getTime();

                  return (
                    <div key={booking.id}>
                      <article className="py-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="font-semibold">{booking.facility.name}</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {dateString} · {booking.startTime}–{booking.endTime} ·{" "}
                              {booking.attendeeCount} attendees
                            </p>
                            <p className="mt-1 text-sm text-foreground/80">
                              {booking.purpose}
                            </p>
                            {booking.decisionComment ? (
                              <p className="mt-1 text-sm text-muted-foreground">
                                Admin note: {booking.decisionComment}
                              </p>
                            ) : null}
                          </div>
                          <StatusPill status={booking.status} />
                        </div>
                        {canModify ? (
                          <div className="mt-4 grid gap-4 md:grid-cols-[auto_1fr]">
                            <form action={cancelBookingAction}>
                              <input name="bookingId" type="hidden" value={booking.id} />
                              <SubmitButton loadingText="Cancelling..." variant="secondary">
                                Cancel booking
                              </SubmitButton>
                            </form>
                            <form
                              action={rescheduleBookingAction}
                              className="grid items-end gap-3 sm:grid-cols-[repeat(3,1fr)_auto]"
                            >
                              <input name="bookingId" type="hidden" value={booking.id} />
                              <Field label="New date">
                                <Input
                                  name="date"
                                  type="date"
                                  min={todayString}
                                  defaultValue={dateString}
                                  required
                                />
                              </Field>
                              <Field label="Start">
                                <Input
                                  name="startTime"
                                  type="time"
                                  defaultValue={booking.startTime}
                                  required
                                />
                              </Field>
                              <Field label="End">
                                <Input
                                  name="endTime"
                                  type="time"
                                  defaultValue={booking.endTime}
                                  required
                                />
                              </Field>
                              <SubmitButton loadingText="Saving...">Reschedule</SubmitButton>
                            </form>
                          </div>
                        ) : null}
                      </article>
                      <Separator />
                    </div>
                  );
                })
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
