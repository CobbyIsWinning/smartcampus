import { notFound, redirect } from "next/navigation";
import { AppShell, StatCard, StatusPill } from "@/app/components/ui";
import { prisma } from "@/app/lib/prisma";
import { requireRole } from "@/app/lib/session";
import { Separator } from "@/components/ui/separator";

export default async function EventReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireRole(["FACULTY", "ADMINISTRATOR", "EVENT_ORGANIZER"]);

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      organizer: { select: { name: true } },
      registrations: {
        include: { student: { select: { name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
      feedback: {
        include: { student: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!event) {
    notFound();
  }

  // Faculty may only view reports for events they organize.
  if (user.role === "FACULTY" && event.organizerId !== user.id) {
    redirect("/events/manage?error=forbidden");
  }

  const registered = event.registrations.filter((r) => r.status === "REGISTERED");
  const waitlisted = event.registrations.filter((r) => r.status === "WAITLISTED");
  const cancelled = event.registrations.filter((r) => r.status === "CANCELLED");
  const attended = registered.filter((r) => r.checkedInAt !== null);
  const noShow = registered.length - attended.length;

  const averageRating =
    event.feedback.length > 0
      ? (
          event.feedback.reduce((sum, f) => sum + f.rating, 0) /
          event.feedback.length
        ).toFixed(1)
      : "—";

  return (
    <AppShell user={user}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Participation report
          </p>
          <h1 className="mt-2 font-heading text-4xl font-semibold uppercase tracking-wider">
            {event.title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {event.startsAt.toLocaleString()} · {event.venue} · organized by{" "}
            {event.organizer.name}
          </p>
        </div>
        <StatusPill status={event.status} />
      </div>

      <section className="-mx-5 mt-8 grid gap-4 border-y bg-muted/35 px-5 py-5 md:grid-cols-5">
        <StatCard label="Registered" value={registered.length} />
        <StatCard label="Attended" value={attended.length} />
        <StatCard label="No-shows" value={noShow} />
        <StatCard label="Waitlisted" value={waitlisted.length} />
        <StatCard label="Avg rating" value={averageRating} />
      </section>

      <section className="mt-10">
        <h2 className="font-heading text-2xl font-semibold uppercase tracking-wider">
          Attendees
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {registered.length} registered · {cancelled.length} cancelled
        </p>
        <div className="mt-4">
          {registered.length === 0 ? (
            <p className="text-muted-foreground">No registrations yet.</p>
          ) : (
            registered.map((r) => (
              <div key={r.id}>
                <article className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">{r.student.name}</p>
                    <p className="text-sm text-muted-foreground">{r.student.email}</p>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {r.checkedInAt
                      ? `Checked in ${r.checkedInAt.toLocaleString()}`
                      : "No-show"}
                  </span>
                </article>
                <Separator />
              </div>
            ))
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-heading text-2xl font-semibold uppercase tracking-wider">
          Feedback
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {event.feedback.length} responses · average {averageRating}
        </p>
        <div className="mt-4">
          {event.feedback.length === 0 ? (
            <p className="text-muted-foreground">No feedback submitted yet.</p>
          ) : (
            event.feedback.map((f) => (
              <div key={f.id}>
                <article className="py-3">
                  <p className="font-medium">
                    {f.student.name} · {f.rating}/5
                  </p>
                  {f.comment ? (
                    <p className="mt-1 text-sm text-foreground/80">{f.comment}</p>
                  ) : null}
                </article>
                <Separator />
              </div>
            ))
          )}
        </div>
      </section>
    </AppShell>
  );
}
