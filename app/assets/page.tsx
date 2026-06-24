import Link from "next/link";
import { ActionToast } from "@/app/components/action-toast";
import { AppShell, StatCard, StatusPill } from "@/app/components/ui";
import { prisma } from "@/app/lib/prisma";
import { requireRole } from "@/app/lib/session";
import { Button } from "@/components/ui/button";
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

function statusLabel(status: string) {
  return status.replaceAll("_", " ").toLowerCase();
}

export default async function AssetsInventoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    location?: string;
    status?: string;
    asset?: string;
  }>;
}) {
  const user = await requireRole(["ADMINISTRATOR"]);
  const params = await searchParams;

  const category = params.category?.trim() ?? "";
  const location = params.location?.trim() ?? "";
  const status =
    params.status && (STATUS_OPTIONS as readonly string[]).includes(params.status)
      ? params.status
      : "";

  const where: Record<string, unknown> = {};
  if (category) {
    where.category = { contains: category, mode: "insensitive" };
  }
  if (location) {
    where.location = { contains: location, mode: "insensitive" };
  }
  if (status) {
    where.status = status;
  }

  const [assets, allAssets]: [
    Array<{
      id: string;
      assetId: string;
      name: string;
      category: string;
      serialNumber: string;
      location: string | null;
      status: string;
      owningDepartment: string | null;
      assignedTo: { name: string } | null;
    }>,
    Array<{ status: string }>,
  ] = await Promise.all([
    prisma.asset.findMany({
      where,
      include: { assignedTo: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.asset.findMany({ select: { status: true } }),
  ]);

  const total = allAssets.length;
  const available = allAssets.filter((a) => a.status === "AVAILABLE").length;
  const assigned = allAssets.filter((a) => a.status === "ASSIGNED").length;
  const underMaintenance = allAssets.filter(
    (a) => a.status === "UNDER_MAINTENANCE",
  ).length;

  return (
    <AppShell user={user}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Asset tracking
          </p>
          <h1 className="mt-2 font-heading text-4xl font-semibold uppercase tracking-wider">
            Asset inventory
          </h1>
        </div>
        <Button asChild>
          <Link href="/assets/new">Register asset</Link>
        </Button>
      </div>

      <ActionToast
        specs={
          params.asset === "created"
            ? [
                {
                  key: "asset",
                  value: "created",
                  message: "Asset registered successfully.",
                  type: "success",
                },
              ]
            : []
        }
      />

      <section className="-mx-5 mt-8 grid gap-4 border-y bg-muted/35 px-5 py-5 md:grid-cols-4">
        <StatCard label="Total assets" value={total} />
        <StatCard label="Available" value={available} />
        <StatCard label="Assigned" value={assigned} />
        <StatCard label="Under maintenance" value={underMaintenance} />
      </section>

      <section className="-mx-5 mt-8 border-y bg-background px-5 py-6">
        <form className="mb-6 grid items-end gap-3 sm:grid-cols-4" method="get">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Category</label>
            <Input name="category" defaultValue={category} placeholder="Computer" />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Location</label>
            <Input name="location" defaultValue={location} placeholder="Block A" />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Status</label>
            <Select defaultValue={status || "ALL"} name="status">
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option} className="capitalize">
                    {statusLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button type="submit">Filter</Button>
            <Button asChild variant="outline" type="button">
              <Link href="/assets">Reset</Link>
            </Button>
          </div>
        </form>

        {assets.length === 0 ? (
          <p className="text-muted-foreground">No assets match the current filters.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned to</TableHead>
                <TableHead className="w-[120px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell className="align-top whitespace-normal">
                    <p className="font-semibold">{asset.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {asset.assetId} · {asset.serialNumber}
                    </p>
                  </TableCell>
                  <TableCell className="align-top">{asset.category}</TableCell>
                  <TableCell className="align-top whitespace-normal">
                    {asset.location ?? "—"}
                  </TableCell>
                  <TableCell className="align-top">
                    <StatusPill status={asset.status} />
                  </TableCell>
                  <TableCell className="align-top whitespace-normal">
                    {asset.assignedTo?.name ?? "—"}
                  </TableCell>
                  <TableCell className="align-top">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/assets/${asset.id}`}>Manage</Link>
                    </Button>
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
