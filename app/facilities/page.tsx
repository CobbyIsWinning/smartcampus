import Link from "next/link";
import type { FacilityCategory, Prisma } from "@prisma/client";
import { ActionToast } from "@/app/components/action-toast";
import { AppShell } from "@/app/components/ui";
import { prisma } from "@/app/lib/prisma";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CATEGORY_LABELS: Record<string, string> = {
  ROOM: "Room",
  LAB: "Lab",
  HALL: "Hall",
  SPORTS: "Sports",
};

function splitEquipment(value: string | null) {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default async function FacilitiesPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    capacity?: string;
    building?: string;
    equipment?: string;
    error?: string;
  }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const isAdmin = user.role === "ADMINISTRATOR";

  const category =
    params.category && params.category in CATEGORY_LABELS ? params.category : "";
  const minCapacity = Number.parseInt(params.capacity ?? "", 10);
  const building = (params.building ?? "").trim();
  const equipment = (params.equipment ?? "").trim();
  const hasFilters = Boolean(category || building || equipment || params.capacity);

  const where: Prisma.FacilityWhereInput = {
    ...(isAdmin ? {} : { active: true }),
    ...(category ? { category: category as FacilityCategory } : {}),
    ...(Number.isInteger(minCapacity) && minCapacity > 0
      ? { capacity: { gte: minCapacity } }
      : {}),
    ...(building ? { building: { contains: building, mode: "insensitive" } } : {}),
    ...(equipment ? { equipment: { contains: equipment, mode: "insensitive" } } : {}),
  };

  const facilities = await prisma.facility.findMany({
    where,
    orderBy: [{ name: "asc" }],
  });

  return (
    <AppShell user={user}>
      <ActionToast
        specs={
          params.error === "facility-unavailable"
            ? [
                {
                  key: "error",
                  value: "facility-unavailable",
                  message: "That facility is no longer available.",
                  type: "error",
                },
              ]
            : []
        }
      />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Facility booking
          </p>
          <h1 className="mt-2 font-heading text-4xl font-semibold uppercase tracking-wider">
            Facilities
          </h1>
        </div>
        {isAdmin ? (
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/facilities">Manage catalog</Link>
          </Button>
        ) : null}
      </div>

      <section className="-mx-5 mt-8 border-y bg-muted/35 px-5 py-6">
        <form
          method="get"
          className="grid items-end gap-4 md:grid-cols-[repeat(4,1fr)_auto]"
        >
          <div className="grid gap-2">
            <Label>Category</Label>
            <Select name="category" defaultValue={category || "ALL"}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All categories</SelectItem>
                <SelectItem value="ROOM">Room</SelectItem>
                <SelectItem value="LAB">Lab</SelectItem>
                <SelectItem value="HALL">Hall</SelectItem>
                <SelectItem value="SPORTS">Sports</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Min capacity</Label>
            <Input
              name="capacity"
              type="number"
              min={1}
              defaultValue={params.capacity ?? ""}
              placeholder="e.g. 20"
            />
          </div>
          <div className="grid gap-2">
            <Label>Building</Label>
            <Input name="building" defaultValue={building} placeholder="Block A" />
          </div>
          <div className="grid gap-2">
            <Label>Equipment</Label>
            <Input name="equipment" defaultValue={equipment} placeholder="projector" />
          </div>
          <div className="flex gap-2">
            <Button type="submit">Apply</Button>
            {hasFilters ? (
              <Button asChild variant="ghost">
                <Link href="/facilities">Clear</Link>
              </Button>
            ) : null}
          </div>
        </form>
      </section>

      <p className="mt-6 text-sm text-muted-foreground">
        {facilities.length} facilit{facilities.length === 1 ? "y" : "ies"} found
      </p>

      {facilities.length === 0 ? (
        <p className="mt-6 text-muted-foreground">
          No facilities match your filters. Try widening your search or clearing
          filters.
        </p>
      ) : (
        <section className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {facilities.map((facility) => (
            <Card key={facility.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle>{facility.name}</CardTitle>
                  <Badge variant="secondary">
                    {CATEGORY_LABELS[facility.category] ?? facility.category}
                  </Badge>
                </div>
                <CardDescription>
                  {facility.building} · {facility.location} · capacity{" "}
                  {facility.capacity}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-between gap-4">
                <div className="space-y-3">
                  {facility.description ? (
                    <p className="text-sm leading-6 text-foreground/80">
                      {facility.description}
                    </p>
                  ) : null}
                  {splitEquipment(facility.equipment).length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {splitEquipment(facility.equipment).map((item) => (
                        <Badge key={item} variant="outline">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                  {isAdmin && !facility.active ? (
                    <Badge variant="outline">Inactive</Badge>
                  ) : null}
                </div>
                <Button asChild className="w-full">
                  <Link href={`/facilities/${facility.id}`}>
                    View availability & book
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>
      )}
    </AppShell>
  );
}
