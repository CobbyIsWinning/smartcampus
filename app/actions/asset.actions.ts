"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/app/lib/prisma";
import { generateQrToken } from "@/app/lib/qr";
import { requireRole } from "@/app/lib/session";
import {
  validateAllocationInput,
  validateAssetInput,
  validateTransferInput,
} from "@/app/lib/validation";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

const ASSET_STATUSES = [
  "AVAILABLE",
  "ASSIGNED",
  "UNDER_MAINTENANCE",
  "UNDER_REVIEW",
  "LOST",
  "RETIRED",
  "DISPOSED",
] as const;

type AssetStatusValue = (typeof ASSET_STATUSES)[number];

function parseStatus(value: string, fallback: AssetStatusValue): AssetStatusValue {
  return (ASSET_STATUSES as readonly string[]).includes(value)
    ? (value as AssetStatusValue)
    : fallback;
}

function buildLocation(building: string, room: string, storage: string) {
  const parts = [building, room, storage].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

function generateAssetId() {
  return `AST-${randomBytes(4).toString("hex").toUpperCase()}`;
}

export async function createAssetAction(formData: FormData) {
  const admin = await requireRole(["ADMINISTRATOR"]);

  const name = getString(formData, "name");
  const category = getString(formData, "category");
  const serialNumber = getString(formData, "serialNumber");
  const costValue = getString(formData, "cost");
  const condition = getString(formData, "condition");
  const owningDepartment = getString(formData, "owningDepartment");
  const building = getString(formData, "building");
  const room = getString(formData, "room");
  const storage = getString(formData, "storage");
  const purchaseDateValue = getString(formData, "purchaseDate");

  const validation = validateAssetInput({ name, category, serialNumber, cost: costValue });

  if (!validation.ok) {
    redirect(`/assets/new?error=${validation.error}`);
  }

  const existing = await prisma.asset.findUnique({ where: { serialNumber } });

  if (existing) {
    redirect("/assets/new?error=duplicate-serial");
  }

  const purchaseDate = purchaseDateValue ? new Date(purchaseDateValue) : null;
  const asset = await prisma.asset.create({
    data: {
      assetId: generateAssetId(),
      qrToken: generateQrToken(),
      name,
      category,
      serialNumber,
      cost: costValue ? Number(costValue) : null,
      condition: condition || null,
      owningDepartment: owningDepartment || null,
      building: building || null,
      room: room || null,
      storage: storage || null,
      location: buildLocation(building, room, storage),
      purchaseDate: purchaseDate && !Number.isNaN(purchaseDate.getTime()) ? purchaseDate : null,
      status: "AVAILABLE",
    },
  });

  await prisma.assetHistory.create({
    data: {
      assetId: asset.id,
      changeType: "CREATED",
      newValue: "AVAILABLE",
      note: `Registered ${asset.assetId} (serial ${asset.serialNumber}).`,
      actedById: admin.id,
    },
  });

  revalidatePath("/assets");
  revalidatePath("/dashboard");
  redirect(`/assets/${asset.id}?asset=created`);
}

export async function updateAssetLocationAction(formData: FormData) {
  const admin = await requireRole(["ADMINISTRATOR"]);

  const id = getString(formData, "assetId");
  const building = getString(formData, "building");
  const room = getString(formData, "room");
  const storage = getString(formData, "storage");

  const asset = await prisma.asset.findUnique({ where: { id } });

  if (!asset) {
    redirect("/assets?error=not-found");
  }

  const nextLocation = buildLocation(building, room, storage);

  await prisma.asset.update({
    where: { id },
    data: {
      building: building || null,
      room: room || null,
      storage: storage || null,
      location: nextLocation,
    },
  });

  await prisma.assetHistory.create({
    data: {
      assetId: id,
      changeType: "LOCATION_CHANGED",
      field: "location",
      previousValue: asset.location ?? "—",
      newValue: nextLocation ?? "—",
      actedById: admin.id,
    },
  });

  revalidatePath(`/assets/${id}`);
  revalidatePath("/assets");
  redirect(`/assets/${id}?asset=location-updated`);
}

export async function allocateAssetAction(formData: FormData) {
  const admin = await requireRole(["ADMINISTRATOR"]);

  const id = getString(formData, "assetId");
  const assigneeId = getString(formData, "assigneeId");
  const responsiblePerson = getString(formData, "responsiblePerson");

  const validation = validateAllocationInput({ assigneeId, responsiblePerson });

  if (!validation.ok) {
    redirect(`/assets/${id}?error=${validation.error}`);
  }

  const asset = await prisma.asset.findUnique({ where: { id } });

  if (!asset) {
    redirect("/assets?error=not-found");
  }

  if (asset.status !== "AVAILABLE") {
    redirect(`/assets/${id}?error=asset-unavailable`);
  }

  await prisma.asset.update({
    where: { id },
    data: {
      assignedToId: assigneeId,
      responsiblePerson,
      assignedDate: new Date(),
      status: "ASSIGNED",
      transferToId: null,
      transferToDepartment: null,
    },
  });

  await prisma.assetHistory.create({
    data: {
      assetId: id,
      changeType: "ALLOCATED",
      field: "status",
      previousValue: asset.status,
      newValue: "ASSIGNED",
      note: `Allocated to ${responsiblePerson}.`,
      actedById: admin.id,
    },
  });

  revalidatePath(`/assets/${id}`);
  revalidatePath("/assets");
  redirect(`/assets/${id}?asset=allocated`);
}

export async function returnAssetAction(formData: FormData) {
  const actor = await requireRole(["ADMINISTRATOR", "FACULTY"]);

  const id = getString(formData, "assetId");
  const status = parseStatus(getString(formData, "returnStatus"), "AVAILABLE");
  const returnStatus = status === "UNDER_REVIEW" ? "UNDER_REVIEW" : "AVAILABLE";

  const asset = await prisma.asset.findUnique({ where: { id } });

  if (!asset) {
    redirect("/assets?error=not-found");
  }

  await prisma.asset.update({
    where: { id },
    data: {
      status: returnStatus,
      assignedToId: null,
      responsiblePerson: null,
      assignedDate: null,
    },
  });

  await prisma.assetHistory.create({
    data: {
      assetId: id,
      changeType: "RETURNED",
      field: "status",
      previousValue: asset.status,
      newValue: returnStatus,
      actedById: actor.id,
    },
  });

  revalidatePath(`/assets/${id}`);
  revalidatePath("/assets");
  redirect(`/assets/${id}?asset=returned`);
}

export async function requestTransferAction(formData: FormData) {
  const actor = await requireRole(["ADMINISTRATOR", "FACULTY"]);

  const id = getString(formData, "assetId");
  const transferToId = getString(formData, "transferToId");
  const transferToDepartment = getString(formData, "transferToDepartment");

  const validation = validateTransferInput({ transferToId });

  if (!validation.ok) {
    redirect(`/assets/${id}?error=${validation.error}`);
  }

  const asset = await prisma.asset.findUnique({ where: { id } });

  if (!asset) {
    redirect("/assets?error=not-found");
  }

  await prisma.asset.update({
    where: { id },
    data: {
      transferToId,
      transferToDepartment: transferToDepartment || null,
      status: "UNDER_REVIEW",
    },
  });

  await prisma.assetHistory.create({
    data: {
      assetId: id,
      changeType: "TRANSFER_REQUESTED",
      previousValue: asset.status,
      newValue: "UNDER_REVIEW",
      note: "Transfer requested; awaiting administrator approval.",
      actedById: actor.id,
    },
  });

  revalidatePath(`/assets/${id}`);
  revalidatePath("/assets");
  redirect(`/assets/${id}?asset=transfer-requested`);
}

export async function approveTransferAction(formData: FormData) {
  const admin = await requireRole(["ADMINISTRATOR"]);

  const id = getString(formData, "assetId");

  const asset = await prisma.asset.findUnique({
    where: { id },
    include: { transferTo: true },
  });

  if (!asset) {
    redirect("/assets?error=not-found");
  }

  if (!asset.transferToId) {
    redirect(`/assets/${id}?error=no-transfer`);
  }

  await prisma.asset.update({
    where: { id },
    data: {
      assignedToId: asset.transferToId,
      responsiblePerson: asset.transferTo?.name ?? asset.responsiblePerson,
      assignedDate: new Date(),
      status: "ASSIGNED",
      owningDepartment: asset.transferToDepartment ?? asset.owningDepartment,
      transferToId: null,
      transferToDepartment: null,
    },
  });

  await prisma.assetHistory.create({
    data: {
      assetId: id,
      changeType: "TRANSFER_APPROVED",
      field: "status",
      previousValue: asset.status,
      newValue: "ASSIGNED",
      note: `Transfer approved to ${asset.transferTo?.name ?? "new owner"}.`,
      actedById: admin.id,
    },
  });

  revalidatePath(`/assets/${id}`);
  revalidatePath("/assets");
  redirect(`/assets/${id}?asset=transfer-approved`);
}

export async function rejectTransferAction(formData: FormData) {
  const admin = await requireRole(["ADMINISTRATOR"]);

  const id = getString(formData, "assetId");

  const asset = await prisma.asset.findUnique({ where: { id } });

  if (!asset) {
    redirect("/assets?error=not-found");
  }

  const revertedStatus: AssetStatusValue = asset.assignedToId ? "ASSIGNED" : "AVAILABLE";

  await prisma.asset.update({
    where: { id },
    data: {
      transferToId: null,
      transferToDepartment: null,
      status: revertedStatus,
    },
  });

  await prisma.assetHistory.create({
    data: {
      assetId: id,
      changeType: "TRANSFER_REJECTED",
      field: "status",
      previousValue: asset.status,
      newValue: revertedStatus,
      note: "Transfer request rejected.",
      actedById: admin.id,
    },
  });

  revalidatePath(`/assets/${id}`);
  revalidatePath("/assets");
  redirect(`/assets/${id}?asset=transfer-rejected`);
}

export async function updateAssetStatusAction(formData: FormData) {
  const admin = await requireRole(["ADMINISTRATOR"]);

  const id = getString(formData, "assetId");
  const asset = await prisma.asset.findUnique({ where: { id } });

  if (!asset) {
    redirect("/assets?error=not-found");
  }

  const status = parseStatus(getString(formData, "status"), asset.status as AssetStatusValue);

  await prisma.asset.update({
    where: { id },
    data: { status },
  });

  await prisma.assetHistory.create({
    data: {
      assetId: id,
      changeType: "STATUS_CHANGED",
      field: "status",
      previousValue: asset.status,
      newValue: status,
      actedById: admin.id,
    },
  });

  revalidatePath(`/assets/${id}`);
  revalidatePath("/assets");
  redirect(`/assets/${id}?asset=status-updated`);
}
