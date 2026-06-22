"use server";

import { Role, TicketPriority, TicketStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/app/lib/prisma";
import { requireRole, requireUser } from "@/app/lib/session";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parsePriority(value: string) {
  if (
    value === TicketPriority.LOW ||
    value === TicketPriority.HIGH ||
    value === TicketPriority.URGENT
  ) {
    return value;
  }

  return TicketPriority.MEDIUM;
}

function parseStatus(value: string) {
  if (
    value === TicketStatus.IN_PROGRESS ||
    value === TicketStatus.RESOLVED ||
    value === TicketStatus.CLOSED
  ) {
    return value;
  }

  return TicketStatus.OPEN;
}

export async function createTicketAction(formData: FormData) {
  const user = await requireUser();
  const title = getString(formData, "title");
  const description = getString(formData, "description");
  const location = getString(formData, "location");
  const priority = parsePriority(getString(formData, "priority"));

  if (!title || !description || !location) {
    redirect("/maintenance/new?error=missing-fields");
  }

  const ticket = await prisma.maintenanceTicket.create({
    data: {
      title,
      description,
      location,
      priority,
      requesterId: user.id,
    },
  });

  const admins = await prisma.user.findMany({
    where: { role: Role.ADMINISTRATOR },
    select: { id: true },
  });

  if (admins.length > 0) {
    await prisma.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        title: "New maintenance ticket",
        message: `${user.name} submitted "${ticket.title}" for ${ticket.location}.`,
      })),
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/admin/maintenance");
  redirect("/dashboard?ticket=created");
}

export async function updateTicketStatusAction(formData: FormData) {
  await requireRole([Role.ADMINISTRATOR, Role.MAINTENANCE_STAFF]);

  const ticketId = getString(formData, "ticketId");
  const status = parseStatus(getString(formData, "status"));
  const assigneeValue = getString(formData, "assignedToId");
  const assignedToId = assigneeValue && assigneeValue !== "unassigned" ? assigneeValue : null;

  const ticket = await prisma.maintenanceTicket.update({
    where: { id: ticketId },
    data: {
      status,
      assignedToId,
    },
    include: {
      requester: true,
      assignedTo: true,
    },
  });

  await prisma.notification.create({
    data: {
      userId: ticket.requesterId,
      title: "Maintenance ticket updated",
      message: `"${ticket.title}" is now ${status.replaceAll("_", " ").toLowerCase()}${
        ticket.assignedTo ? ` and assigned to ${ticket.assignedTo.name}` : ""
      }.`,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/admin/maintenance");
  redirect("/admin/maintenance?updated=1");
}

export async function markNotificationsReadAction() {
  const user = await requireUser();

  await prisma.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  });

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
