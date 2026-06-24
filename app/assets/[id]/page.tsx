import Link from "next/link";
import { notFound } from "next/navigation";
import {
  allocateAssetAction,
  approveTransferAction,
  rejectTransferAction,
  requestTransferAction,
  returnAssetAction,
  updateAssetLocationAction,
  updateAssetStatusAction,
} from "@/app/actions/asset.actions";
import { ActionToast } from "@/app/components/action-toast";
import { SubmitButton } from "@/app/components/submit-button";
import { AppShell, Field, StatusPill } from "@/app/components/ui";
import { prisma } from "@/app/lib/prisma";
import { assetScanPath } from "@/app/lib/qr";
import { requireUser } from "@/app/lib/session";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_OPTIONS = [
  "AVAILABLE",
  "ASSIGNED",
  "UNDER_MAINTENANCE",
  "UNDER_REVIEW",
  "LOST",
  "RETIRED",
  "DISPOSED",
] as const;

function statusLabel(value: string) {
  return value.replaceAll("_", " ").toLowerCase();
}

function formatDate(date: Date | null) {
  return date
    ? date.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })
    : "—";
}

export default async function AssetDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ qr?: string; asset?: string; error?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { qr, asset: assetParam, error } = await searchParams;

  const asset = await prisma.asset.findUnique({
    where: { id },
    include: {
      assignedTo: { select: { name: true, email: true } },
      transferTo: { select: { name: true, email: true } },
    },
  });

  if (!asset) {
    notFound();
  }

  // AST-6: a genuine QR scan encodes the token; logging it records an audit entry.
  if (qr && qr === asset.qrToken) {
    await prisma.assetHistory.create({
      data: {
        assetId: asset.id,
        changeType: "SCANNED",
        note: `Scanned by ${user.name}.`,
        actedById: user.id,
      },
    });
  }

  const [history, assignees]: [
    Array<{
      id: string;
      changeType: string;
      field: string | null;
      previousValue: string | null;
      newValue: string | null;
      note: string | null;
      createdAt: Date;
      actedBy: { name: string } | null;
    }>,
    Array<{ id: string; name: string; role: string }>,
  ] = await Promise.all([
    prisma.assetHistory.findMany({
      where: { assetId: id },
      include: { actedBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: { role: { in: ["FACULTY", "ADMINISTRATOR", "EVENT_ORGANIZER"] } },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const isAdmin = user.role === "ADMINISTRATOR";
  const isFaculty = user.role === "FACULTY";
  const canManage = isAdmin || isFaculty;
  const hasPendingTransfer = Boolean(asset.transferToId);
  const scanPath = assetScanPath(asset.id, asset.qrToken);

  const errorMessages: Record<string, string> = {
    "missing-fields": "Please complete all required fields.",
    "invalid-responsible-person": "Responsible person must be between 2 and 120 characters.",
    "missing-transfer-target": "Choose a transfer recipient.",
    "asset-unavailable": "Only available assets can be allocated.",
    "no-transfer": "There is no pending transfer to act on.",
  };

  const successMessages: Record<string, string> = {
    created: "Asset registered successfully.",
    "location-updated": "Location updated and recorded in history.",
    allocated: "Asset allocated successfully.",
    returned: "Asset return recorded.",
    "transfer-requested": "Transfer request submitted for approval.",
    "transfer-approved": "Transfer approved.",
    "transfer-rejected": "Transfer request rejected.",
    "status-updated": "Asset status updated.",
  };

  return (
    <AppShell user={user}>
      <ActionToast
        specs={[
          ...(assetParam && successMessages[assetParam]
            ? [
                {
                  key: "asset",
                  value: assetParam,
                  message: successMessages[assetParam],
                  type: "success" as const,
                },
              ]
            : []),
          ...(error
            ? [
                {
                  key: "error",
                  value: error,
                  message: errorMessages[error] ?? "Action failed.",
                  type: "error" as const,
                },
              ]
            : []),
        ]}
      />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {asset.assetId} · {asset.category}
          </p>
          <h1 className="mt-2 font-heading text-4xl font-semibold uppercase tracking-wider">
            {asset.name}
          </h1>
          <div className="mt-3">
            <StatusPill status={asset.status} />
          </div>
        </div>
        <Link className="text-sm text-muted-foreground underline" href="/assets">
          Back to inventory
        </Link>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Asset details</CardTitle>
            <CardDescription>Current registration and allocation record.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Detail label="Serial number" value={asset.serialNumber} />
            <Detail label="Condition" value={asset.condition ?? "—"} />
            <Detail
              label="Cost"
              value={asset.cost != null ? `$${asset.cost.toLocaleString()}` : "—"}
            />
            <Detail label="Purchase date" value={formatDate(asset.purchaseDate)} />
            <Detail label="Owning department" value={asset.owningDepartment ?? "—"} />
            <Detail label="Location" value={asset.location ?? "—"} />
            <Detail label="Assigned to" value={asset.assignedTo?.name ?? "Unassigned"} />
            <Detail label="Responsible person" value={asset.responsiblePerson ?? "—"} />
            <Detail label="Assigned date" value={formatDate(asset.assignedDate)} />
            {hasPendingTransfer ? (
              <Detail
                label="Pending transfer to"
                value={`${asset.transferTo?.name ?? "—"}${
                  asset.transferToDepartment ? ` (${asset.transferToDepartment})` : ""
                }`}
              />
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>QR code</CardTitle>
            <CardDescription>Scan target for this asset (AST-6).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Scan URL
              </p>
              <Link className="break-all text-sm underline" href={scanPath}>
                {scanPath}
              </Link>
            </div>
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                QR token
              </p>
              <p className="break-all font-mono text-xs">{asset.qrToken}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Encode the scan URL above into a QR image. An SVG/PNG QR can be rendered
              later from this value; scanning it opens this read-only record and logs
              the scan.
            </p>
          </CardContent>
        </Card>
      </div>

      {canManage ? (
        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          {isAdmin ? (
            <>
              <ManageCard
                title="Update status"
                description="Change the lifecycle status; recorded in history."
              >
                <form action={updateAssetStatusAction} className="grid gap-4">
                  <input name="assetId" type="hidden" value={asset.id} />
                  <Field label="Status">
                    <Select defaultValue={asset.status} name="status">
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option} className="capitalize">
                            {statusLabel(option)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <SubmitButton loadingText="Updating..." variant="secondary">
                    Update status
                  </SubmitButton>
                </form>
              </ManageCard>

              <ManageCard
                title="Update location"
                description="Building, room, or storage changes are logged."
              >
                <form action={updateAssetLocationAction} className="grid gap-4">
                  <input name="assetId" type="hidden" value={asset.id} />
                  <Field label="Building">
                    <Input name="building" defaultValue={asset.building ?? ""} />
                  </Field>
                  <Field label="Room">
                    <Input name="room" defaultValue={asset.room ?? ""} />
                  </Field>
                  <Field label="Storage">
                    <Input name="storage" defaultValue={asset.storage ?? ""} />
                  </Field>
                  <SubmitButton loadingText="Saving..." variant="secondary">
                    Save location
                  </SubmitButton>
                </form>
              </ManageCard>

              {asset.status === "AVAILABLE" ? (
                <ManageCard
                  title="Allocate asset"
                  description="Assign to a faculty member or department owner."
                >
                  <form action={allocateAssetAction} className="grid gap-4">
                    <input name="assetId" type="hidden" value={asset.id} />
                    <Field label="Assign to">
                      <Select name="assigneeId">
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a user" />
                        </SelectTrigger>
                        <SelectContent>
                          {assignees.map((person) => (
                            <SelectItem key={person.id} value={person.id}>
                              {person.name} ({statusLabel(person.role)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Responsible person">
                      <Input name="responsiblePerson" required />
                    </Field>
                    <SubmitButton loadingText="Allocating...">Allocate</SubmitButton>
                  </form>
                </ManageCard>
              ) : null}

              {hasPendingTransfer ? (
                <ManageCard
                  title="Transfer approval"
                  description={`Pending transfer to ${asset.transferTo?.name ?? "new owner"}.`}
                >
                  <div className="flex gap-3">
                    <form action={approveTransferAction}>
                      <input name="assetId" type="hidden" value={asset.id} />
                      <SubmitButton loadingText="Approving...">Approve</SubmitButton>
                    </form>
                    <form action={rejectTransferAction}>
                      <input name="assetId" type="hidden" value={asset.id} />
                      <SubmitButton loadingText="Rejecting..." variant="secondary">
                        Reject
                      </SubmitButton>
                    </form>
                  </div>
                </ManageCard>
              ) : null}
            </>
          ) : null}

          {asset.status === "ASSIGNED" ? (
            <ManageCard
              title="Return asset"
              description="Mark as returned to inventory or under review."
            >
              <form action={returnAssetAction} className="grid gap-4">
                <input name="assetId" type="hidden" value={asset.id} />
                <Field label="Return status">
                  <Select defaultValue="AVAILABLE" name="returnStatus">
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AVAILABLE">Available</SelectItem>
                      <SelectItem value="UNDER_REVIEW">Under review</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <SubmitButton loadingText="Submitting..." variant="secondary">
                  Mark returned
                </SubmitButton>
              </form>
            </ManageCard>
          ) : null}

          {!hasPendingTransfer && asset.status !== "RETIRED" && asset.status !== "DISPOSED" ? (
            <ManageCard
              title="Request transfer"
              description="Propose a new owner; an administrator must approve."
            >
              <form action={requestTransferAction} className="grid gap-4">
                <input name="assetId" type="hidden" value={asset.id} />
                <Field label="Transfer to">
                  <Select name="transferToId">
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a user" />
                    </SelectTrigger>
                    <SelectContent>
                      {assignees.map((person) => (
                        <SelectItem key={person.id} value={person.id}>
                          {person.name} ({statusLabel(person.role)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="New department (optional)">
                  <Input name="transferToDepartment" />
                </Field>
                <SubmitButton loadingText="Requesting...">Request transfer</SubmitButton>
              </form>
            </ManageCard>
          ) : null}
        </section>
      ) : (
        <p className="mt-8 text-sm text-muted-foreground">
          You are viewing this asset in read-only mode.
        </p>
      )}

      <section className="-mx-5 mt-10 border-y bg-background px-5 py-6">
        <div className="mb-5">
          <h2 className="font-heading text-2xl font-semibold uppercase tracking-wider">
            History log
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Immutable, timestamped record of every change (AST-7).
          </p>
        </div>
        {history.length === 0 ? (
          <p className="text-muted-foreground">No history recorded yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Change</TableHead>
                <TableHead>Detail</TableHead>
                <TableHead>By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="align-top text-sm text-muted-foreground">
                    {entry.createdAt.toLocaleString("en", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell className="align-top capitalize">
                    {statusLabel(entry.changeType)}
                  </TableCell>
                  <TableCell className="align-top whitespace-normal">
                    {entry.previousValue || entry.newValue ? (
                      <p className="text-sm">
                        {statusLabel(entry.previousValue ?? "—")} →{" "}
                        {statusLabel(entry.newValue ?? "—")}
                      </p>
                    ) : null}
                    {entry.note ? (
                      <p className="text-sm text-muted-foreground">{entry.note}</p>
                    ) : null}
                  </TableCell>
                  <TableCell className="align-top text-sm">
                    {entry.actedBy?.name ?? "System"}
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

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm">{value}</p>
    </div>
  );
}

function ManageCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
