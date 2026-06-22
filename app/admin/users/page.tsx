import { updateUserRoleAction } from "@/app/actions/auth.actions";
import { ActionToast } from "@/app/components/action-toast";
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

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string; error?: string }>;
}) {
  const params = await searchParams;
  const admin = await requireRole(["ADMINISTRATOR"]);
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: {
        select: {
          tickets: true,
          assignedTickets: true,
        },
      },
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
  const adminCount = users.filter((user) => user.role === "ADMINISTRATOR").length;
  const studentCount = users.filter((user) => user.role === "STUDENT").length;
  const staffCount = users.filter((user) => user.role === "MAINTENANCE_STAFF").length;
  const errorMessages: Record<string, string> = {
    "missing-user": "Choose a valid user before updating a role.",
    "self-admin": "You cannot remove administrator access from your own account.",
  };

  return (
    <AppShell user={admin}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Admin access
          </p>
          <h1 className="mt-2 font-heading text-4xl font-semibold uppercase tracking-wider">
            Users
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">{users.length} users found</p>
      </div>

      <ActionToast
        specs={[
          ...(params.updated === "1"
            ? [
                {
                  key: "updated",
                  value: "1",
                  message: "User role updated.",
                  type: "success" as const,
                },
              ]
            : []),
          ...(params.error
            ? [
                {
                  key: "error",
                  value: params.error,
                  message: errorMessages[params.error] ?? "User role update failed.",
                  type: "error" as const,
                },
              ]
            : []),
        ]}
      />

      <section className="mt-8 grid gap-4 md:grid-cols-4">
        <StatCard label="Total users" value={users.length} />
        <StatCard label="Admins" value={adminCount} />
        <StatCard label="Students" value={studentCount} />
        <StatCard label="Maintenance staff" value={staffCount} />
      </section>

      <section className="mt-8">
        {users.length === 0 ? (
          <p className="text-muted-foreground">No users have registered yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tickets</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-[280px]">Change role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="whitespace-normal align-top">
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </TableCell>
                  <TableCell className="align-top">
                    <StatusPill status={user.role} />
                  </TableCell>
                  <TableCell className="align-top">
                    <p className="text-sm">{user._count.tickets} requested</p>
                    <p className="text-sm text-muted-foreground">
                      {user._count.assignedTickets} assigned
                    </p>
                  </TableCell>
                  <TableCell className="align-top text-sm text-muted-foreground">
                    {user.createdAt.toLocaleDateString("en", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="align-top">
                    {user.id === admin.id ? (
                      <p className="text-sm text-muted-foreground">
                        Current administrator account
                      </p>
                    ) : (
                      <form action={updateUserRoleAction} className="grid gap-4">
                        <input name="userId" type="hidden" value={user.id} />
                        <Field label="Role">
                          <Select defaultValue={user.role} name="role">
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="STUDENT">Student</SelectItem>
                              <SelectItem value="ADMINISTRATOR">Administrator</SelectItem>
                              <SelectItem value="MAINTENANCE_STAFF">
                                Maintenance staff
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </Field>
                        <SubmitButton loadingText="Updating..." variant="secondary">
                          Update role
                        </SubmitButton>
                      </form>
                    )}
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
