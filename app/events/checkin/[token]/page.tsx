import { CalendarCheck } from "lucide-react";
import { checkInAction } from "@/app/actions/event.actions";
import { ActionToast } from "@/app/components/action-toast";
import { SubmitButton } from "@/app/components/submit-button";
import { AppShell } from "@/app/components/ui";
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

export default async function EventCheckInPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ checkedin?: string; error?: string }>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  const user = await requireUser();

  const event = await prisma.event.findUnique({
    where: { checkInToken: token },
    select: { id: true, title: true, venue: true, startsAt: true },
  });

  const registration = event
    ? await prisma.eventRegistration.findUnique({
        where: { eventId_studentId: { eventId: event.id, studentId: user.id } },
        select: { status: true, checkedInAt: true },
      })
    : null;

  const errorMessages: Record<string, string> = {
    "not-registered": "You are not registered for this event, so you cannot check in.",
    "already-checked-in": "You have already checked in for this event.",
  };

  const alreadyCheckedIn = registration?.checkedInAt != null;
  const canCheckIn = registration?.status === "REGISTERED" && !alreadyCheckedIn;

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-lg">
        <ActionToast
          specs={[
            ...(sp.checkedin === "1"
              ? [
                  {
                    key: "checkedin",
                    value: "1",
                    message: "You're checked in. Enjoy the event!",
                    type: "success" as const,
                  },
                ]
              : []),
            ...(sp.error
              ? [
                  {
                    key: "error",
                    value: sp.error,
                    message: errorMessages[sp.error] ?? "Check-in failed.",
                    type: "error" as const,
                  },
                ]
              : []),
          ]}
        />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarCheck className="size-5" />
              Event check-in
            </CardTitle>
            <CardDescription>
              {event
                ? `${event.title} · ${event.venue}`
                : "This check-in link is not valid."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!event ? (
              <p className="text-sm text-muted-foreground">
                We couldn&apos;t find an event for this check-in code.
              </p>
            ) : !registration || registration.status === "CANCELLED" ? (
              <p className="text-sm text-muted-foreground">
                You are not registered for this event. Register first, then check in.
              </p>
            ) : registration.status === "WAITLISTED" ? (
              <p className="text-sm text-muted-foreground">
                You are on the waitlist. Check-in is available once you are registered.
              </p>
            ) : alreadyCheckedIn ? (
              <Badge>Checked in</Badge>
            ) : (
              <form action={checkInAction}>
                <input name="checkInToken" type="hidden" value={token} />
                <SubmitButton loadingText="Checking in...">Check in now</SubmitButton>
              </form>
            )}
            {canCheckIn ? (
              <p className="text-sm text-muted-foreground">
                Confirm your attendance for {event?.startsAt.toLocaleString()}.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
