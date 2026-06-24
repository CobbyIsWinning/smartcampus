import {
  createFacilityAction,
  decideBookingAction,
  updateFacilityAction,
} from "@/app/actions/facility.actions";
import { ActionToast } from "@/app/components/action-toast";
import { SubmitButton } from "@/app/components/submit-button";
import { AppShell, Field, StatCard } from "@/app/components/ui";
import { prisma } from "@/app/lib/prisma";
import { requireRole } from "@/app/lib/session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const CATEGORY_LABELS: Record<string, string> = {
  ROOM: "Room",
  LAB: "Lab",
  HALL: "Hall",
  SPORTS: "Sports",
};

function formatDay(date: Date) {
  return date.toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function AdminFacilitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ facility?: string; booking?: string; error?: string }>;
}) {
  const user = await requireRole(["ADMINISTRATOR"]);
  const params = await searchParams;

  const [facilities, pendingBookings] = await Promise.all([
    prisma.facility.findMany({ orderBy: [{ name: "asc" }] }),
    prisma.booking.findMany({
      where: { status: "PENDING" },
      include: { facility: true, requester: true },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    }),
  ]);

  const activeCount = facilities.filter((facility) => facility.active).length;
  const errorMessages: Record<string, string> = {
    "missing-fields": "Name, building, and location are required.",
    "invalid-name": "Name must be between 2 and 120 characters.",
    "invalid-building": "Building must be between 2 and 120 characters.",
    "invalid-location": "Location must be between 2 and 120 characters.",
    "invalid-capacity": "Capacity must be a positive number.",
  };

  return (
    <AppShell user={user}>
      <ActionToast
        specs={[
          ...(params.facility === "created"
            ? [
                {
                  key: "facility",
                  value: "created",
                  message: "Facility added to the catalog.",
                  type: "success" as const,
                },
              ]
            : []),
          ...(params.facility === "updated"
            ? [
                {
                  key: "facility",
                  value: "updated",
                  message: "Facility updated.",
                  type: "success" as const,
                },
              ]
            : []),
          ...(params.booking === "decided"
            ? [
                {
                  key: "booking",
                  value: "decided",
                  message: "Booking decision recorded and requester notified.",
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

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Admin operations
          </p>
          <h1 className="mt-2 font-heading text-4xl font-semibold uppercase tracking-wider">
            Facility catalog
          </h1>
        </div>
      </div>

      <section className="-mx-5 mt-8 grid gap-4 border-y bg-muted/35 px-5 py-5 md:grid-cols-3">
        <StatCard label="Facilities" value={facilities.length} />
        <StatCard label="Active" value={activeCount} />
        <StatCard label="Pending bookings" value={pendingBookings.length} />
      </section>

      <section className="mt-10 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Add a facility</CardTitle>
            <CardDescription>
              New facilities are active and visible to all users by default.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createFacilityAction} className="grid gap-4">
              <Field label="Name">
                <Input name="name" required />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Category">
                  <Select name="category" defaultValue="ROOM">
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ROOM">Room</SelectItem>
                      <SelectItem value="LAB">Lab</SelectItem>
                      <SelectItem value="HALL">Hall</SelectItem>
                      <SelectItem value="SPORTS">Sports</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Capacity">
                  <Input name="capacity" type="number" min={1} defaultValue={20} required />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Building">
                  <Input name="building" required />
                </Field>
                <Field label="Location">
                  <Input name="location" placeholder="Floor 2, Room 204" required />
                </Field>
              </div>
              <Field label="Equipment (comma separated)">
                <Input name="equipment" placeholder="projector, whiteboard, AC" />
              </Field>
              <Field label="Description">
                <Textarea name="description" rows={3} />
              </Field>
              <SubmitButton loadingText="Adding...">Add facility</SubmitButton>
            </form>
          </CardContent>
        </Card>
      </section>

      <section className="-mx-5 mt-10 border-y bg-background px-5 py-6">
        <div className="mb-5">
          <h2 className="font-heading text-2xl font-semibold uppercase tracking-wider">
            Manage facilities
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Edit details or activate/deactivate. Inactive facilities are hidden
            from non-admins.
          </p>
        </div>
        {facilities.length === 0 ? (
          <p className="text-muted-foreground">No facilities in the catalog yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Facility</TableHead>
                <TableHead className="w-[420px]">Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {facilities.map((facility) => (
                <TableRow key={facility.id}>
                  <TableCell className="align-top whitespace-normal">
                    <p className="font-semibold">{facility.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {CATEGORY_LABELS[facility.category] ?? facility.category} ·{" "}
                      {facility.building} · cap {facility.capacity}
                    </p>
                    <div className="mt-2">
                      <Badge variant={facility.active ? "secondary" : "outline"}>
                        {facility.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <form action={updateFacilityAction} className="grid gap-3">
                      <input name="facilityId" type="hidden" value={facility.id} />
                      <Field label="Name">
                        <Input name="name" defaultValue={facility.name} required />
                      </Field>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Category">
                          <Select name="category" defaultValue={facility.category}>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ROOM">Room</SelectItem>
                              <SelectItem value="LAB">Lab</SelectItem>
                              <SelectItem value="HALL">Hall</SelectItem>
                              <SelectItem value="SPORTS">Sports</SelectItem>
                            </SelectContent>
                          </Select>
                        </Field>
                        <Field label="Capacity">
                          <Input
                            name="capacity"
                            type="number"
                            min={1}
                            defaultValue={facility.capacity}
                            required
                          />
                        </Field>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Building">
                          <Input name="building" defaultValue={facility.building} required />
                        </Field>
                        <Field label="Location">
                          <Input name="location" defaultValue={facility.location} required />
                        </Field>
                      </div>
                      <Field label="Equipment">
                        <Input name="equipment" defaultValue={facility.equipment ?? ""} />
                      </Field>
                      <Field label="Description">
                        <Textarea
                          name="description"
                          rows={2}
                          defaultValue={facility.description ?? ""}
                        />
                      </Field>
                      <Field label="Status">
                        <Select
                          name="active"
                          defaultValue={facility.active ? "true" : "false"}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">Active</SelectItem>
                            <SelectItem value="false">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                      <SubmitButton loadingText="Saving..." variant="secondary">
                        Save changes
                      </SubmitButton>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section className="-mx-5 mt-10 border-y bg-background px-5 py-6">
        <div className="mb-5">
          <h2 className="font-heading text-2xl font-semibold uppercase tracking-wider">
            Booking approvals
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Approve to block the slot, or reject to release it. The requester is
            notified either way.
          </p>
        </div>
        {pendingBookings.length === 0 ? (
          <p className="text-muted-foreground">No bookings awaiting approval.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request</TableHead>
                <TableHead>Requester</TableHead>
                <TableHead className="w-[360px]">Decision</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingBookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell className="align-top whitespace-normal">
                    <p className="font-semibold">{booking.facility.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDay(booking.date)} · {booking.startTime}–{booking.endTime}
                    </p>
                    <p className="mt-1 text-sm">
                      {booking.attendeeCount} attendees · {booking.purpose}
                    </p>
                  </TableCell>
                  <TableCell className="align-top whitespace-normal">
                    <p className="font-medium">{booking.requester.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {booking.requester.email}
                    </p>
                  </TableCell>
                  <TableCell className="align-top">
                    <form action={decideBookingAction} className="grid gap-3">
                      <input name="bookingId" type="hidden" value={booking.id} />
                      <Field label="Comment (optional)">
                        <Textarea name="comment" rows={2} />
                      </Field>
                      <div className="flex gap-2">
                        <Button type="submit" name="decision" value="APPROVED">
                          Approve
                        </Button>
                        <Button
                          type="submit"
                          name="decision"
                          value="REJECTED"
                          variant="outline"
                        >
                          Reject
                        </Button>
                      </div>
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
