"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/app/lib/prisma";
import { requireRole, requireUser } from "@/app/lib/session";
import {
  computeSlaDueAt,
  isSlaBreached,
  validateTicketFeedbackInput,
  validateTicketInput,
  type TicketPriorityValue,
} from "@/app/lib/validation";
import { parseAttachmentUrls, validateAttachments } from "@/app/lib/upload";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parsePriority(value: string): TicketPriorityValue {
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

// A short, human-readable ticket reference (MNT-XXXXXXXX).
function generateTicketNo() {
  return `MNT-${randomBytes(4).toString("hex").toUpperCase()}`;
}

export async function createTicketAction(formData: FormData) {
  const user = await requireUser();
  const title = getString(formData, "title");
  const description = getString(formData, "description");
  const category = getString(formData, "category");
  const location = getString(formData, "location");
  const building = getString(formData, "building");
  const roomNumber = getString(formData, "roomNumber");
  const priority = parsePriority(getString(formData, "priority"));
  const attachments = parseAttachmentUrls(getString(formData, "imageUrls"));

  const validation = validateTicketInput({
    title,
    description,
    location,
    category,
    building,
    roomNumber,
  });

  if (!validation.ok) {
    redirect(`/maintenance/new?error=${validation.error}`);
  }

  const attachmentResult = validateAttachments(attachments);

  if (!attachmentResult.ok) {
    redirect(`/maintenance/new?error=${attachmentResult.error}`);
  }

  const slaDueAt = computeSlaDueAt(priority, category || null);

  const ticket = await prisma.maintenanceTicket.create({
    data: {
      ticketNo: generateTicketNo(),
      title,
      description,
      category: category || null,
      location,
      building: building || null,
      roomNumber: roomNumber || null,
      imageUrls: attachmentResult.urls,
      priority,
      slaDueAt,
      requesterId: user.id,
    },
  });

  const admins: Array<{ id: string }> = await prisma.user.findMany({
    where: { role: { in: ["ADMINISTRATOR", "MAINTENANCE_SUPERVISOR"] } },
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
        message: `${user.name} submitted ${ticket.ticketNo} "${ticket.title}" for ${ticket.location}. ${openTicketCount} open ticket${openTicketCount === 1 ? "" : "s"} need review.`,
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
  await requireRole([
    "ADMINISTRATOR",
    "MAINTENANCE_STAFF",
    "MAINTENANCE_SUPERVISOR",
  ]);

  const ticketId = getString(formData, "ticketId");
  const status = parseStatus(getString(formData, "status"));
  const priority = parsePriority(getString(formData, "priority"));
  const assigneeValue = getString(formData, "assignedToId");
  const assignedToId =
    assigneeValue && assigneeValue !== "unassigned" ? assigneeValue : null;

  const current = await prisma.maintenanceTicket.findUnique({
    where: { id: ticketId },
  });

  if (!current) {
    redirect("/admin/maintenance?error=ticket-not-found");
  }

  // MNT-6: a CLOSED ticket is locked — it can only change by being reopened
  // (moved to a non-CLOSED status).
  if (current.status === "CLOSED" && status === "CLOSED") {
    redirect("/admin/maintenance?error=ticket-closed");
  }

  const isReopen =
    (current.status === "CLOSED" || current.status === "RESOLVED") &&
    status !== "CLOSED" &&
    status !== "RESOLVED";

  // MNT-5: recompute the SLA window from creation whenever priority changes.
  const slaDueAt =
    priority !== current.priority
      ? computeSlaDueAt(priority, current.category, current.createdAt)
      : current.slaDueAt;
  const slaBreached = isSlaBreached(slaDueAt, status);

  const ticket = await prisma.maintenanceTicket.update({
    where: { id: ticketId },
    data: {
      status,
      priority,
      assignedToId,
      slaDueAt,
      slaBreached,
      ...(isReopen ? { reopenRequested: false, reopenReason: null } : {}),
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
      message: `${ticket.ticketNo} "${ticket.title}" is now ${status
        .replaceAll("_", " ")
        .toLowerCase()}${
        ticket.assignedTo ? ` and assigned to ${ticket.assignedTo.name}` : ""
      }.`,
    },
  });

  // MNT-4: assignment-specific notification when the assignee changes.
  if (assignedToId && assignedToId !== current.assignedToId) {
    await prisma.notification.create({
      data: {
        userId: assignedToId,
        title: "Maintenance ticket assigned to you",
        message: `You have been assigned ${ticket.ticketNo} "${ticket.title}" (${ticket.priority.toLowerCase()} priority) at ${ticket.location}.`,
      },
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/admin/maintenance");
  revalidatePath("/maintenance/tasks");
  redirect("/admin/maintenance?updated=1");
}

export async function submitTicketFeedbackAction(formData: FormData) {
  const user = await requireUser();
  const ticketId = getString(formData, "ticketId");
  const rating = Number(getString(formData, "rating"));
  const comment = getString(formData, "comment");

  const validation = validateTicketFeedbackInput({ rating, comment });

  if (!validation.ok) {
    redirect(`/maintenance/${ticketId}?error=${validation.error}`);
  }

  const ticket = await prisma.maintenanceTicket.findUnique({
    where: { id: ticketId },
    include: { feedback: true },
  });

  if (!ticket || ticket.requesterId !== user.id) {
    redirect("/dashboard?error=ticket-not-found");
  }

  if (ticket.status !== "RESOLVED" && ticket.status !== "CLOSED") {
    redirect(`/maintenance/${ticketId}?error=feedback-not-allowed`);
  }

  if (ticket.feedback) {
    redirect(`/maintenance/${ticketId}?error=feedback-exists`);
  }

  await prisma.ticketFeedback.create({
    data: {
      ticketId: ticket.id,
      rating,
      comment: comment || null,
    },
  });

  revalidatePath(`/maintenance/${ticketId}`);
  revalidatePath("/admin/maintenance");
  redirect(`/maintenance/${ticketId}?feedback=submitted`);
}

export async function requestTicketReopenAction(formData: FormData) {
  const user = await requireUser();
  const ticketId = getString(formData, "ticketId");
  const reason = getString(formData, "reopenReason");

  const ticket = await prisma.maintenanceTicket.findUnique({
    where: { id: ticketId },
  });

  if (!ticket || ticket.requesterId !== user.id) {
    redirect("/dashboard?error=ticket-not-found");
  }

  if (ticket.status !== "RESOLVED" && ticket.status !== "CLOSED") {
    redirect(`/maintenance/${ticketId}?error=reopen-not-allowed`);
  }

  await prisma.maintenanceTicket.update({
    where: { id: ticketId },
    data: { reopenRequested: true, reopenReason: reason || null },
  });

  const staff: Array<{ id: string }> = await prisma.user.findMany({
    where: { role: { in: ["ADMINISTRATOR", "MAINTENANCE_SUPERVISOR"] } },
    select: { id: true },
  });

  if (staff.length > 0) {
    await prisma.notification.createMany({
      data: staff.map((member: { id: string }) => ({
        userId: member.id,
        title: "Reopen requested",
        message: `${user.name} requested to reopen ${ticket.ticketNo} "${ticket.title}".`,
      })),
    });
  }

  revalidatePath(`/maintenance/${ticketId}`);
  revalidatePath("/admin/maintenance");
  redirect(`/maintenance/${ticketId}?reopen=requested`);
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
