import Link from "next/link";
import { notFound } from "next/navigation";
import {
  requestTicketReopenAction,
  submitTicketFeedbackAction,
} from "@/app/actions/maintenance.actions";
import { ActionToast } from "@/app/components/action-toast";
import { SubmitButton } from "@/app/components/submit-button";
import { AppShell, Field, StatusPill } from "@/app/components/ui";
import { prisma } from "@/app/lib/prisma";
import { isSlaBreached } from "@/app/lib/validation";
import { requireUser } from "@/app/lib/session";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

function priorityLabel(priority: string) {
  return priority === "URGENT" ? "Critical" : priority.toLowerCase();
}

export default async function MaintenanceTicketDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; feedback?: string; reopen?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const user = await requireUser();

  const ticket = await prisma.maintenanceTicket.findUnique({
    where: { id },
    include: { requester: true, assignedTo: true, feedback: true },
  });

  if (!ticket) {
    notFound();
  }

  const isRequester = ticket.requesterId === user.id;
  const isStaff =
    user.role === "ADMINISTRATOR" ||
    user.role === "MAINTENANCE_STAFF" ||
    user.role === "MAINTENANCE_SUPERVISOR";

  if (!isRequester && !isStaff) {
    notFound();
  }

  const now = new Date();
  const overdue = isSlaBreached(ticket.slaDueAt, ticket.status, now);
  const canGiveFeedback =
    isRequester &&
    (ticket.status === "RESOLVED" || ticket.status === "CLOSED") &&
    !ticket.feedback;
  const canRequestReopen =
    isRequester &&
    (ticket.status === "RESOLVED" || ticket.status === "CLOSED") &&
    !ticket.reopenRequested;

  const errorMessages: Record<string, string> = {
    "invalid-rating": "Choose a rating from 1 to 5.",
    "invalid-comment": "Comment is too long.",
    "feedback-not-allowed": "Feedback can only be left on resolved tickets.",
    "feedback-exists": "You have already submitted feedback for this ticket.",
    "reopen-not-allowed": "This ticket cannot be reopened.",
  };

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-2xl">
        <Link
          href={isStaff ? "/admin/maintenance" : "/dashboard"}
          className="text-sm text-muted-foreground underline-offset-2 hover:underline"
        >
          ← Back
        </Link>

        <ActionToast
          specs={[
            ...(query.feedback === "submitted"
              ? [
                  {
                    key: "feedback",
                    value: "submitted",
                    message: "Thanks! Your feedback was recorded.",
                    type: "success" as const,
                  },
                ]
              : []),
            ...(query.reopen === "requested"
              ? [
                  {
                    key: "reopen",
                    value: "requested",
                    message: "Reopen request sent to campus operations.",
                    type: "success" as const,
                  },
                ]
              : []),
            ...(query.error
              ? [
                  {
                    key: "error",
                    value: query.error,
                    message: errorMessages[query.error] ?? "Action failed.",
                    type: "error" as const,
                  },
                ]
              : []),
          ]}
        />

        <Card className="mt-4">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>
                  {ticket.ticketNo} · {ticket.title}
                </CardTitle>
                <CardDescription>
                  {ticket.category ? `${ticket.category} · ` : ""}
                  {ticket.location}
                  {ticket.building || ticket.roomNumber
                    ? ` · ${[ticket.building, ticket.roomNumber].filter(Boolean).join(" ")}`
                    : ""}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {overdue ? <Badge variant="destructive">Overdue</Badge> : null}
                <StatusPill status={ticket.status} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            <p className="text-sm leading-6 text-foreground/80">{ticket.description}</p>
            <div className="grid gap-1 text-sm text-muted-foreground">
              <p>Priority: {priorityLabel(ticket.priority)}</p>
              <p>Requested by: {ticket.requester.name}</p>
              <p>Assigned to: {ticket.assignedTo?.name ?? "Unassigned"}</p>
              {ticket.slaDueAt ? (
                <p>
                  SLA due: {ticket.slaDueAt.toISOString().slice(0, 16).replace("T", " ")}
                </p>
              ) : null}
            </div>

            {ticket.imageUrls.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {ticket.imageUrls.map((url) => (
                  <a key={url} href={url} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt="Ticket attachment"
                      className="h-24 w-24 rounded-md border object-cover"
                    />
                  </a>
                ))}
              </div>
            ) : null}

            {ticket.feedback ? (
              <div className="rounded-md border bg-muted/30 p-4">
                <p className="font-medium">Feedback submitted</p>
                <p className="text-sm text-muted-foreground">
                  Rating: {ticket.feedback.rating}/5
                  {ticket.feedback.comment ? ` — ${ticket.feedback.comment}` : ""}
                </p>
              </div>
            ) : null}

            {ticket.reopenRequested ? (
              <Badge variant="outline">Reopen requested</Badge>
            ) : null}
          </CardContent>
        </Card>

        {canGiveFeedback ? (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Leave feedback</CardTitle>
              <CardDescription>Rate how this request was resolved.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={submitTicketFeedbackAction} className="grid gap-4">
                <input name="ticketId" type="hidden" value={ticket.id} />
                <Field label="Rating">
                  <Select defaultValue="5" name="rating">
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 — Excellent</SelectItem>
                      <SelectItem value="4">4 — Good</SelectItem>
                      <SelectItem value="3">3 — Okay</SelectItem>
                      <SelectItem value="2">2 — Poor</SelectItem>
                      <SelectItem value="1">1 — Bad</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Comment (optional)">
                  <Textarea name="comment" rows={4} />
                </Field>
                <SubmitButton loadingText="Submitting...">Submit feedback</SubmitButton>
              </form>
            </CardContent>
          </Card>
        ) : null}

        {canRequestReopen ? (
          <>
            <Separator className="my-6" />
            <Card>
              <CardHeader>
                <CardTitle>Request reopen</CardTitle>
                <CardDescription>
                  Not resolved? Ask campus operations to reopen this ticket.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form action={requestTicketReopenAction} className="grid gap-4">
                  <input name="ticketId" type="hidden" value={ticket.id} />
                  <Field label="Reason (optional)">
                    <Textarea name="reopenReason" rows={3} />
                  </Field>
                  <SubmitButton loadingText="Sending..." variant="secondary">
                    Request reopen
                  </SubmitButton>
                </form>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
