import { ActionToast } from "@/app/components/action-toast";
import { updateTicketStatusAction } from "@/app/actions/maintenance.actions";
import { SubmitButton } from "@/app/components/submit-button";
import { AppShell, Field, StatCard, StatusPill } from "@/app/components/ui";
import { prisma } from "@/app/lib/prisma";
import { requireRole } from "@/app/lib/session";
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

export default async function AdminMaintenancePage({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string }>;
}) {
  const params = await searchParams;
  const user = await requireRole(["ADMINISTRATOR", "MAINTENANCE_STAFF"]);
  const [tickets, staff]: [
    Array<{
      id: string;
      title: string;
      description: string;
      location: string;
      priority: string;
      status: string;
      assignedToId: string | null;
      requester: { name: string; email: string };
      assignedTo: { name: string } | null;
    }>,
    Array<{ id: string; name: string }>,
  ] = await Promise.all([
    prisma.maintenanceTicket.findMany({
      include: { requester: true, assignedTo: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.user.findMany({
      where: { role: { in: ["ADMINISTRATOR", "MAINTENANCE_STAFF"] } },
      orderBy: { name: "asc" },
    }),
  ]);
  const openTickets = tickets.filter((ticket) => ticket.status === "OPEN").length;
  const inProgressTickets = tickets.filter(
    (ticket) => ticket.status === "IN_PROGRESS",
  ).length;
  const resolvedTickets = tickets.filter((ticket) => ticket.status === "RESOLVED").length;

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
        specs={
          params.updated === "1"
            ? [
                {
                  key: "updated",
                  value: "1",
                  message: "Ticket status and assignment updated.",
                  type: "success",
                },
              ]
            : []
        }
      />

      <section className="mt-8 grid gap-4 md:grid-cols-4">
        <StatCard label="Total tickets" value={tickets.length} />
        <StatCard label="Open" value={openTickets} />
        <StatCard label="In progress" value={inProgressTickets} />
        <StatCard label="Resolved" value={resolvedTickets} />
      </section>

      <section className="mt-8">
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
                <TableHead>Status</TableHead>
                <TableHead>Assignment</TableHead>
                <TableHead className="w-[320px]">Update</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((ticket: (typeof tickets)[number]) => (
                <TableRow key={ticket.id}>
                  <TableCell className="align-top">
                    <div className="space-y-2 whitespace-normal">
                      <div>
                        <p className="font-semibold">{ticket.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {ticket.location} · {ticket.priority.toLowerCase()} priority
                        </p>
                      </div>
                      <p className="text-sm leading-6 text-foreground/80">
                        {ticket.description}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="align-top whitespace-normal">
                    <p className="font-medium">{ticket.requester.name}</p>
                    <p className="text-sm text-muted-foreground">{ticket.requester.email}</p>
                  </TableCell>
                  <TableCell className="align-top">
                    <StatusPill status={ticket.status} />
                  </TableCell>
                  <TableCell className="align-top whitespace-normal">
                    <p className="text-sm">
                      {ticket.assignedTo?.name ?? "Unassigned"}
                    </p>
                  </TableCell>
                  <TableCell className="align-top">
                    <form action={updateTicketStatusAction} className="grid gap-4">
                      <input name="ticketId" type="hidden" value={ticket.id} />
                      <Field label="Status">
                        <Select defaultValue={ticket.status} name="status">
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="OPEN">Open</SelectItem>
                            <SelectItem value="IN_PROGRESS">In progress</SelectItem>
                            <SelectItem value="RESOLVED">Resolved</SelectItem>
                            <SelectItem value="CLOSED">Closed</SelectItem>
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
                      <SubmitButton loadingText="Updating...">Update ticket</SubmitButton>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </AppShell>
  );
}
