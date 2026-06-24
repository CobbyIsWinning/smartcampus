import Link from "next/link";
import { CalendarClock } from "lucide-react";
import {
  cancelRegistrationAction,
  registerForEventAction,
  submitEventFeedbackAction,
} from "@/app/actions/event.actions";
import { ActionToast } from "@/app/components/action-toast";
import { SubmitButton } from "@/app/components/submit-button";
import { AppShell, Field } from "@/app/components/ui";
import { prisma } from "@/app/lib/prisma";
import { isEligible } from "@/app/lib/validation";
import { requireUser } from "@/app/lib/session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function formatRange(startsAt: Date, endsAt: Date) {
  const start = startsAt.toLocaleString("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const end = endsAt.toLocaleString("en", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${start} – ${end}`;
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    registered?: string;
    cancelled?: string;
    feedback?: string;
    error?: string;
  }>;
}) {
  const params = await searchParams;
  const user = await requireUser();
  const category = params.category;

  const [events, categoryRows, myRegistrations, myFeedback] = await Promise.all([
    prisma.event.findMany({
      where: {
        status: "PUBLISHED",
        ...(category ? { category } : {}),
      },
      orderBy: { startsAt: "asc" },
      include: {
        registrations: { select: { studentId: true, status: true } },
      },
    }),
    prisma.event.findMany({
      where: { status: "PUBLISHED" },
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    }),
    prisma.eventRegistration.findMany({
      where: { studentId: user.id },
      select: { eventId: true, status: true, checkedInAt: true },
    }),
    prisma.eventFeedback.findMany({
      where: { studentId: user.id },
      select: { eventId: true },
    }),
  ]);

  const myRegByEvent = new Map(myRegistrations.map((r) => [r.eventId, r]));
  const feedbackEventIds = new Set(myFeedback.map((f) => f.eventId));
  const categories = categoryRows.map((row) => row.category);
  const now = new Date().getTime();

  const errorMessages: Record<string, string> = {
    "not-available": "That event is no longer available.",
    "not-eligible": "You are not eligible to register for this event.",
    "already-registered": "You are already registered for this event.",
    "not-registered": "You are not registered for this event.",
    "not-ended": "Feedback opens after the event ends.",
    "feedback-exists": "You have already submitted feedback for this event.",
    "invalid-rating": "Choose a rating between 1 and 5.",
    "invalid-comment": "Comment must be 2000 characters or fewer.",
  };

  return (
    <AppShell user={user}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Campus life
          </p>
          <h1 className="mt-2 font-heading text-4xl font-semibold uppercase tracking-wider">
            Events
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">{events.length} published events</p>
      </div>

      <ActionToast
        specs={[
          ...(params.registered === "1"
            ? [
                {
                  key: "registered",
                  value: "1",
                  message: "You are registered for the event.",
                  type: "success" as const,
                },
              ]
            : []),
          ...(params.registered === "waitlist"
            ? [
                {
                  key: "registered",
                  value: "waitlist",
                  message: "Event is full — you have joined the waitlist.",
                  type: "info" as const,
                },
              ]
            : []),
          ...(params.cancelled === "1"
            ? [
                {
                  key: "cancelled",
                  value: "1",
                  message: "Your registration was cancelled.",
                  type: "success" as const,
                },
              ]
            : []),
          ...(params.feedback === "1"
            ? [
                {
                  key: "feedback",
                  value: "1",
                  message: "Thanks! Your feedback was recorded.",
                  type: "success" as const,
                },
              ]
            : []),
          ...(params.error
            ? [
                {
                  key: "error",
                  value: params.error,
                  message: errorMessages[params.error] ?? "Something went wrong.",
                  type: "error" as const,
                },
              ]
            : []),
        ]}
      />

      <section className="mt-8 flex flex-wrap gap-2">
        <Button asChild size="sm" variant={category ? "ghost" : "secondary"}>
          <Link href="/events">All</Link>
        </Button>
        {categories.map((cat) => (
          <Button
            key={cat}
            asChild
            size="sm"
            variant={category === cat ? "secondary" : "ghost"}
          >
            <Link href={`/events?category=${encodeURIComponent(cat)}`}>{cat}</Link>
          </Button>
        ))}
      </section>

      <section className="mt-8 grid gap-5">
        {events.length === 0 ? (
          <p className="text-muted-foreground">No published events to show.</p>
        ) : (
          events.map((event) => {
            const registeredCount = event.registrations.filter(
              (r) => r.status === "REGISTERED",
            ).length;
            const waitlistCount = event.registrations.filter(
              (r) => r.status === "WAITLISTED",
            ).length;
            const seatsLeft = Math.max(event.capacity - registeredCount, 0);
            const mine = myRegByEvent.get(event.id);
            const myStatus =
              mine && mine.status !== "CANCELLED" ? mine.status : null;
            const ended = event.endsAt.getTime() < now;
            const eligible = isEligible(event.eligibility, user.department);
            const hasFeedback = feedbackEventIds.has(event.id);

            return (
              <Card key={event.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle>{event.title}</CardTitle>
                      <CardDescription className="mt-1 flex items-center gap-2">
                        <CalendarClock className="size-4" />
                        {formatRange(event.startsAt, event.endsAt)} · {event.venue}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">{event.category}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm leading-6 text-foreground/80">
                    {event.description}
                  </p>
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                    <span>
                      {seatsLeft} of {event.capacity} seats left
                    </span>
                    {waitlistCount > 0 ? <span>{waitlistCount} waitlisted</span> : null}
                    <span>
                      Eligibility: {event.eligibility ?? "All students"}
                    </span>
                    {ended ? <span>Event ended</span> : null}
                  </div>

                  <Separator />

                  {myStatus === "REGISTERED" ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge>Registered{mine?.checkedInAt ? " · checked in" : ""}</Badge>
                      {!ended ? (
                        <form action={cancelRegistrationAction}>
                          <input name="eventId" type="hidden" value={event.id} />
                          <SubmitButton loadingText="Cancelling..." variant="secondary">
                            Cancel registration
                          </SubmitButton>
                        </form>
                      ) : null}
                    </div>
                  ) : myStatus === "WAITLISTED" ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge variant="outline">On waitlist</Badge>
                      <form action={cancelRegistrationAction}>
                        <input name="eventId" type="hidden" value={event.id} />
                        <SubmitButton loadingText="Leaving..." variant="secondary">
                          Leave waitlist
                        </SubmitButton>
                      </form>
                    </div>
                  ) : ended ? (
                    <p className="text-sm text-muted-foreground">
                      Registration is closed for this event.
                    </p>
                  ) : !eligible ? (
                    <p className="text-sm text-muted-foreground">
                      You are not eligible to register for this event.
                    </p>
                  ) : (
                    <form action={registerForEventAction}>
                      <input name="eventId" type="hidden" value={event.id} />
                      <SubmitButton loadingText="Registering...">
                        {seatsLeft > 0 ? "Register" : "Join waitlist"}
                      </SubmitButton>
                    </form>
                  )}

                  {ended && myStatus === "REGISTERED" ? (
                    hasFeedback ? (
                      <p className="text-sm text-muted-foreground">
                        Thanks — your feedback was recorded.
                      </p>
                    ) : (
                      <form
                        action={submitEventFeedbackAction}
                        className="grid max-w-md gap-3 border-t pt-4"
                      >
                        <input name="eventId" type="hidden" value={event.id} />
                        <Field label="Rate this event">
                          <Select defaultValue="5" name="rating">
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="5">5 — Excellent</SelectItem>
                              <SelectItem value="4">4 — Good</SelectItem>
                              <SelectItem value="3">3 — Average</SelectItem>
                              <SelectItem value="2">2 — Poor</SelectItem>
                              <SelectItem value="1">1 — Very poor</SelectItem>
                            </SelectContent>
                          </Select>
                        </Field>
                        <Field label="Comment (optional)">
                          <Textarea name="comment" rows={3} />
                        </Field>
                        <SubmitButton loadingText="Submitting..." variant="secondary">
                          Submit feedback
                        </SubmitButton>
                      </form>
                    )
                  ) : null}
                </CardContent>
              </Card>
            );
          })
        )}
      </section>
    </AppShell>
  );
}
