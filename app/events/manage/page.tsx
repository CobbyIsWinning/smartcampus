import Link from "next/link";
import { updateEventStatusAction } from "@/app/actions/event.actions";
import { ActionToast } from "@/app/components/action-toast";
import { SubmitButton } from "@/app/components/submit-button";
import { AppShell, Field, StatCard, StatusPill } from "@/app/components/ui";
import { prisma } from "@/app/lib/prisma";
import { requireRole } from "@/app/lib/session";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function ManageEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string; status?: string; error?: string }>;
}) {
  const params = await searchParams;
  const user = await requireRole(["FACULTY", "ADMINISTRATOR", "EVENT_ORGANIZER"]);
  const canCreate = user.role === "FACULTY" || user.role === "ADMINISTRATOR";
  const seesAll = user.role === "ADMINISTRATOR" || user.role === "EVENT_ORGANIZER";

  const events = await prisma.event.findMany({
    where: seesAll ? {} : { organizerId: user.id },
    orderBy: { startsAt: "desc" },
    include: {
      organizer: { select: { name: true } },
      registrations: { select: { status: true, checkedInAt: true } },
    },
  });

  const publishedCount = events.filter((e) => e.status === "PUBLISHED").length;
  const draftCount = events.filter((e) => e.status === "DRAFT").length;

  const errorMessages: Record<string, string> = {
    "not-found": "That event could not be found.",
    forbidden: "You can only manage events you organize.",
  };

  return (
    <AppShell user={user}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Event operations
          </p>
          <h1 className="mt-2 font-heading text-4xl font-semibold uppercase tracking-wider">
            Manage events
          </h1>
        </div>
        {canCreate ? (
          <Button asChild>
            <Link href="/events/new">Create event</Link>
          </Button>
        ) : null}
      </div>

      <ActionToast
        specs={[
          ...(params.event === "created"
            ? [
                {
                  key: "event",
                  value: "created",
                  message: "Event created as a draft.",
                  type: "success" as const,
                },
              ]
            : []),
          ...(params.status === "updated"
            ? [
                {
                  key: "status",
                  value: "updated",
                  message: "Event status updated.",
                  type: "success" as const,
                },
              ]
            : []),
          ...(params.error
            ? [
                {
                  key: "error",
                  value: params.error,
                  message: errorMessages[params.error] ?? "Action failed.",
                  type: "error" as const,
                },
              ]
            : []),
        ]}
      />

      <section className="-mx-5 mt-8 grid gap-4 border-y bg-muted/35 px-5 py-5 md:grid-cols-3">
        <StatCard label="Total events" value={events.length} />
        <StatCard label="Published" value={publishedCount} />
        <StatCard label="Drafts" value={draftCount} />
      </section>

      <section className="-mx-5 mt-8 border-y bg-background px-5 py-6">
        {events.length === 0 ? (
          <p className="text-muted-foreground">
            No events yet.{canCreate ? " Create one to get started." : ""}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Registrations</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead className="w-[260px]">Update</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => {
                const registered = event.registrations.filter(
                  (r) => r.status === "REGISTERED",
                ).length;
                const waitlisted = event.registrations.filter(
                  (r) => r.status === "WAITLISTED",
                ).length;
                const checkedIn = event.registrations.filter(
                  (r) => r.checkedInAt !== null,
                ).length;

                return (
                  <TableRow key={event.id}>
                    <TableCell className="align-top whitespace-normal">
                      <p className="font-semibold">{event.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {event.startsAt.toLocaleString("en", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}{" "}
                        · {event.venue} · {event.category}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        by {event.organizer.name}
                      </p>
                    </TableCell>
                    <TableCell className="align-top">
                      <StatusPill status={event.status} />
                    </TableCell>
                    <TableCell className="align-top text-sm">
                      <p>
                        {registered} / {event.capacity} registered
                      </p>
                      <p className="text-muted-foreground">{waitlisted} waitlisted</p>
                      <p className="text-muted-foreground">{checkedIn} checked in</p>
                      <Link
                        href={`/events/${event.id}/report`}
                        className="text-sm font-medium underline underline-offset-4"
                      >
                        View report
                      </Link>
                    </TableCell>
                    <TableCell className="align-top whitespace-normal text-sm">
                      <Link
                        href={`/events/checkin/${event.checkInToken}`}
                        className="break-all underline underline-offset-4"
                      >
                        /events/checkin/{event.checkInToken}
                      </Link>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Share this link / QR target for attendee check-in.
                      </p>
                    </TableCell>
                    <TableCell className="align-top">
                      <form action={updateEventStatusAction} className="grid gap-3">
                        <input name="eventId" type="hidden" value={event.id} />
                        <Field label="Status">
                          <Select defaultValue={event.status} name="status">
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="DRAFT">Draft</SelectItem>
                              <SelectItem value="PUBLISHED">Published</SelectItem>
                              <SelectItem value="UNPUBLISHED">Unpublished</SelectItem>
                            </SelectContent>
                          </Select>
                        </Field>
                        <SubmitButton loadingText="Saving..." variant="secondary">
                          Update status
                        </SubmitButton>
                      </form>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </section>
    </AppShell>
  );
}
