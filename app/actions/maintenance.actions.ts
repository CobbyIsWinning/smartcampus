"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/app/lib/prisma";
import { requireRole, requireUser } from "@/app/lib/session";
import { validateTicketInput } from "@/app/lib/validation";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parsePriority(value: string) {
  if (value === "LOW" || value === "HIGH" || value === "URGENT") {
    return value;
  }

  return "MEDIUM";
}

const TICKET_STATUSES = [
  "OPEN",
  "ASSIGNED",
  "IN_PROGRESS",
  "WAITING",
  "RESOLVED",
  "CLOSED",
] as const;

type TicketStatusValue = (typeof TICKET_STATUSES)[number];

function parseStatus(value: string): TicketStatusValue {
  return (TICKET_STATUSES as readonly string[]).includes(value)
    ? (value as TicketStatusValue)
    : "OPEN";
}

export async function createTicketAction(formData: FormData) {
  const user = await requireUser();
  const title = getString(formData, "title");
  const description = getString(formData, "description");
  const location = getString(formData, "location");
  const priority = parsePriority(getString(formData, "priority"));
  const validation = validateTicketInput({ title, description, location });

  if (!validation.ok) {
    redirect(`/maintenance/new?error=${validation.error}`);
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

  const admins: Array<{ id: string }> = await prisma.user.findMany({
    where: { role: "ADMINISTRATOR" },
    select: { id: true },
  });

  if (admins.length > 0) {
    const openTicketCount = await prisma.maintenanceTicket.count({
      where: { status: "OPEN" },
    });
    const notificationData: Array<{
      userId: string;
      title: string;
      message: string;
    }> = admins.map(
      (admin: { id: string }) => ({
        userId: admin.id,
        title: "New maintenance ticket",
        message: `${user.name} submitted "${ticket.title}" for ${ticket.location}. ${openTicketCount} open ticket${openTicketCount === 1 ? "" : "s"} need review.`,
      }),
    );

    await prisma.notification.createMany({
      data: notificationData,
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/admin/maintenance");
  redirect("/dashboard?ticket=created");
}

export async function updateTicketStatusAction(formData: FormData) {
  await requireRole(["ADMINISTRATOR", "MAINTENANCE_STAFF"]);

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
