import Link from "next/link";
import { ActionToast } from "@/app/components/action-toast";
import { updateTicketStatusAction } from "@/app/actions/maintenance.actions";
import { SubmitButton } from "@/app/components/submit-button";
import { AppShell, Field, StatCard, StatusPill } from "@/app/components/ui";
import { prisma } from "@/app/lib/prisma";
import { requireRole } from "@/app/lib/session";
import { isSlaBreached } from "@/app/lib/validation";
import { Badge } from "@/components/ui/badge";
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

type AdminTicket = {
  id: string;
  ticketNo: string;
  title: string;
  description: string;
  category: string | null;
  location: string;
  building: string | null;
  roomNumber: string | null;
  imageUrls: string[];
  priority: string;
  status: string;
  slaDueAt: Date | null;
  slaBreached: boolean;
  reopenRequested: boolean;
  reopenReason: string | null;
  assignedToId: string | null;
  requester: { name: string; email: string };
  assignedTo: { name: string } | null;
  feedback: { rating: number; comment: string | null } | null;
};

const PRIORITY_RANK: Record<string, number> = {
  URGENT: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

function priorityLabel(priority: string) {
  return priority === "URGENT" ? "Critical" : priority.toLowerCase();
}

export default async function AdminMaintenancePage({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string; error?: string }>;
}) {
  const params = await searchParams;
  const user = await requireRole([
    "ADMINISTRATOR",
    "MAINTENANCE_STAFF",
    "MAINTENANCE_SUPERVISOR",
  ]);
  const now = new Date();
  const [rawTickets, staff]: [AdminTicket[], Array<{ id: string; name: string }>] =
    await Promise.all([
      prisma.maintenanceTicket.findMany({
        include: { requester: true, assignedTo: true, feedback: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.user.findMany({
        where: {
          role: {
            in: ["ADMINISTRATOR", "MAINTENANCE_STAFF", "MAINTENANCE_SUPERVISOR"],
          },
        },
        orderBy: { name: "asc" },
      }),
    ]);

  // MNT-5: order critical-first, then by SLA due (soonest first).
  const tickets = [...rawTickets].sort((a, b) => {
    const rank = (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9);
    if (rank !== 0) return rank;
    const aDue = a.slaDueAt ? a.slaDueAt.getTime() : Infinity;
    const bDue = b.slaDueAt ? b.slaDueAt.getTime() : Infinity;
    return aDue - bDue;
  });

  const openTickets = tickets.filter((ticket) => ticket.status === "OPEN").length;
  const inProgressTickets = tickets.filter(
    (ticket) => ticket.status === "IN_PROGRESS",
  ).length;
  const resolvedTickets = tickets.filter((ticket) => ticket.status === "RESOLVED").length;
  const overdueTickets = tickets.filter((ticket) =>
    isSlaBreached(ticket.slaDueAt, ticket.status, now),
  ).length;
  const unassigned = tickets.filter(
    (ticket) =>
      !ticket.assignedToId && ticket.status !== "CLOSED" && ticket.status !== "RESOLVED",
  );
  const reopenRequests = tickets.filter((ticket) => ticket.reopenRequested);

  const errorMessages: Record<string, string> = {
    "ticket-closed": "Closed tickets are locked. Reopen the ticket to edit it.",
    "ticket-not-found": "That ticket could not be found.",
  };

  return (
    <AppShell user={user}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Admin operations
          </p>
          <h1 className="mt-2 font-heading text-4xl font-semibold uppercase tracking-wider">
            Maintenance tickets
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">{tickets.length} tickets found</p>
      </div>

      <ActionToast
        specs={[
          ...(params.updated === "1"
            ? [
                {
                  key: "updated",
                  value: "1",
                  message: "Ticket status and assignment updated.",
                  type: "success" as const,
                },
              ]
            : []),
          ...(params.error
            ? [
                {
                  key: "error",
                  value: params.error,
                  message: errorMessages[params.error] ?? "Ticket update failed.",
                  type: "error" as const,
                },
              ]
            : []),
        ]}
      />

      <section className="-mx-5 mt-8 grid gap-4 border-y bg-muted/35 px-5 py-5 md:grid-cols-5">
        <StatCard label="Total tickets" value={tickets.length} />
        <StatCard label="Open" value={openTickets} />
        <StatCard label="In progress" value={inProgressTickets} />
        <StatCard label="Resolved" value={resolvedTickets} />
        <StatCard label="Overdue (SLA)" value={overdueTickets} />
      </section>

      {/* MNT-4: dedicated unassigned queue */}
      <section className="-mx-5 mt-8 border-y bg-background px-5 py-6">
        <div className="mb-4">
          <h2 className="font-heading text-2xl font-semibold uppercase tracking-wider">
            Unassigned queue
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Active tickets awaiting a technician assignment.
          </p>
        </div>
        {unassigned.length === 0 ? (
          <p className="text-muted-foreground">No unassigned tickets. Queue is clear.</p>
        ) : (
          <ul className="grid gap-2">
            {unassigned.map((ticket) => {
              const overdue = isSlaBreached(ticket.slaDueAt, ticket.status, now);
              return (
                <li
                  key={ticket.id}
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-md border px-4 py-3 ${
                    overdue ? "border-destructive/60 bg-destructive/5" : ""
                  }`}
                >
                  <div>
                    <Link
                      href={`/maintenance/${ticket.id}`}
                      className="font-semibold underline-offset-2 hover:underline"
                    >
                      {ticket.ticketNo} · {ticket.title}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {ticket.location} · {priorityLabel(ticket.priority)} priority
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {overdue ? <Badge variant="destructive">Overdue</Badge> : null}
                    <Badge variant="secondary" className="capitalize">
                      {priorityLabel(ticket.priority)}
                    </Badge>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* MNT-7: reopen requests visible to admin/supervisor */}
      {reopenRequests.length > 0 ? (
        <section className="-mx-5 mt-8 border-y bg-background px-5 py-6">
          <div className="mb-4">
            <h2 className="font-heading text-2xl font-semibold uppercase tracking-wider">
              Reopen requests
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Requesters asked to reopen these resolved/closed tickets.
            </p>
          </div>
          <ul className="grid gap-2">
            {reopenRequests.map((ticket) => (
              <li
                key={ticket.id}
                className="rounded-md border border-amber-500/50 bg-amber-500/5 px-4 py-3"
              >
                <Link
                  href={`/maintenance/${ticket.id}`}
                  className="font-semibold underline-offset-2 hover:underline"
                >
                  {ticket.ticketNo} · {ticket.title}
                </Link>
                {ticket.reopenReason ? (
                  <p className="mt-1 text-sm text-foreground/80">
                    Reason: {ticket.reopenReason}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="-mx-5 mt-8 border-y bg-background px-5 py-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-heading text-2xl font-semibold uppercase tracking-wider">
              Ticket queue
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Critical first; overdue tickets are highlighted.
            </p>
          </div>
        </div>
        {tickets.length === 0 ? (
          <p className="text-muted-foreground">
            No maintenance tickets have been submitted.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Issue</TableHead>
                <TableHead>Requester</TableHead>
                <TableHead>SLA</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assignment</TableHead>
                <TableHead className="w-[340px]">Update</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((ticket) => {
                const overdue = isSlaBreached(ticket.slaDueAt, ticket.status, now);
                const isClosed = ticket.status === "CLOSED";
                return (
                  <TableRow
                    key={ticket.id}
                    className={overdue ? "bg-destructive/5" : undefined}
                  >
                    <TableCell className="align-top">
                      <div className="space-y-2 whitespace-normal">
                        <div>
                          <Link
                            href={`/maintenance/${ticket.id}`}
                            className="font-semibold underline-offset-2 hover:underline"
                          >
                            {ticket.ticketNo} · {ticket.title}
                          </Link>
                          <p className="text-sm text-muted-foreground">
                            {ticket.category ? `${ticket.category} · ` : ""}
                            {ticket.location}
                            {ticket.building || ticket.roomNumber
                              ? ` · ${[ticket.building, ticket.roomNumber]
                                  .filter(Boolean)
                                  .join(" ")}`
                              : ""}{" "}
                            · {priorityLabel(ticket.priority)} priority
                          </p>
                        </div>
                        <p className="text-sm leading-6 text-foreground/80">
                          {ticket.description}
                        </p>
                        {ticket.imageUrls.length > 0 ? (
                          <div className="flex flex-wrap gap-3">
                            {ticket.imageUrls.map((url) => (
                              <a key={url} href={url} target="_blank" rel="noreferrer">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={url}
                                  alt="Ticket attachment"
                                  className="h-16 w-16 rounded-md border object-cover"
                                />
                              </a>
                            ))}
                          </div>
                        ) : null}
                        {ticket.feedback ? (
                          <p className="text-sm text-muted-foreground">
                            Feedback: {ticket.feedback.rating}/5
                            {ticket.feedback.comment ? ` — ${ticket.feedback.comment}` : ""}
                          </p>
                        ) : null}
                        {ticket.reopenRequested ? (
                          <Badge variant="outline">Reopen requested</Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="align-top whitespace-normal">
                      <p className="font-medium">{ticket.requester.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {ticket.requester.email}
                      </p>
                    </TableCell>
                    <TableCell className="align-top whitespace-normal">
                      {ticket.slaDueAt ? (
                        <>
                          <p className="text-sm">
                            {ticket.slaDueAt.toISOString().slice(0, 16).replace("T", " ")}
                          </p>
                          {overdue ? (
                            <Badge variant="destructive" className="mt-1">
                              Overdue
                            </Badge>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="align-top">
                      <StatusPill status={ticket.status} />
                    </TableCell>
                    <TableCell className="align-top whitespace-normal">
                      <p className="text-sm">{ticket.assignedTo?.name ?? "Unassigned"}</p>
                    </TableCell>
                    <TableCell className="align-top">
                      {isClosed ? (
                        <form action={updateTicketStatusAction} className="grid gap-4">
                          <input name="ticketId" type="hidden" value={ticket.id} />
                          <input name="priority" type="hidden" value={ticket.priority} />
                          <input
                            name="assignedToId"
                            type="hidden"
                            value={ticket.assignedToId ?? "unassigned"}
                          />
                          <p className="text-sm text-muted-foreground">
                            Closed and locked. Reopen to make changes.
                          </p>
                          <input name="status" type="hidden" value="IN_PROGRESS" />
                          <SubmitButton loadingText="Reopening..." variant="secondary">
                            Reopen ticket
                          </SubmitButton>
                        </form>
                      ) : (
                        <form action={updateTicketStatusAction} className="grid gap-4">
                          <input name="ticketId" type="hidden" value={ticket.id} />
                          <Field label="Status">
                            <Select defaultValue={ticket.status} name="status">
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="OPEN">Open</SelectItem>
                                <SelectItem value="ASSIGNED">Assigned</SelectItem>
                                <SelectItem value="IN_PROGRESS">In progress</SelectItem>
                                <SelectItem value="WAITING">Waiting</SelectItem>
                                <SelectItem value="RESOLVED">Resolved</SelectItem>
                                <SelectItem value="CLOSED">Closed</SelectItem>
                              </SelectContent>
                            </Select>
                          </Field>
                          <Field label="Priority">
                            <Select defaultValue={ticket.priority} name="priority">
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="LOW">Low</SelectItem>
                                <SelectItem value="MEDIUM">Medium</SelectItem>
                                <SelectItem value="HIGH">High</SelectItem>
                                <SelectItem value="URGENT">Critical</SelectItem>
                              </SelectContent>
                            </Select>
                          </Field>
                          <Field label="Assignee">
                            <Select
                              defaultValue={ticket.assignedToId ?? "unassigned"}
                              name="assignedToId"
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unassigned">Unassigned</SelectItem>
                                {staff.map((member) => (
                                  <SelectItem key={member.id} value={member.id}>
                                    {member.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </Field>
                          <SubmitButton loadingText="Updating...">
                            Update ticket
                          </SubmitButton>
                        </form>
                      )}
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
