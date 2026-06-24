"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/app/lib/prisma";
import { requireRole, requireUser } from "@/app/lib/session";
import {
  isEligible,
  validateEventFeedbackInput,
  validateEventInput,
} from "@/app/lib/validation";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

const EVENT_STATUSES = ["DRAFT", "PUBLISHED", "UNPUBLISHED"] as const;

type EventStatusValue = (typeof EVENT_STATUSES)[number];

function parseEventStatus(value: string): EventStatusValue {
  return (EVENT_STATUSES as readonly string[]).includes(value)
    ? (value as EventStatusValue)
    : "DRAFT";
}

// EVT-2 — create a DRAFT event (faculty / admin only)
export async function createEventAction(formData: FormData) {
  const user = await requireRole(["FACULTY", "ADMINISTRATOR"]);

  const title = getString(formData, "title");
  const description = getString(formData, "description");
  const category = getString(formData, "category");
  const venue = getString(formData, "venue");
  const eligibility = getString(formData, "eligibility");
  const startsAt = getString(formData, "startsAt");
  const endsAt = getString(formData, "endsAt");
  const capacityRaw = getString(formData, "capacity");
  const capacity = Number(capacityRaw);

  const validation = validateEventInput({
    title,
    description,
    category,
    venue,
    capacity,
    startsAt,
    endsAt,
  });

  if (!validation.ok) {
    redirect(`/events/new?error=${validation.error}`);
  }

  await prisma.event.create({
    data: {
      title,
      description,
      category,
      venue,
      capacity,
      eligibility: eligibility || null,
      startsAt: new Date(startsAt),
      endsAt: new Date(endsAt),
      organizerId: user.id,
    },
  });

  revalidatePath("/events/manage");
  revalidatePath("/events");
  redirect("/events/manage?event=created");
}

// EVT-3 — publish / unpublish / return to draft (faculty / admin only)
export async function updateEventStatusAction(formData: FormData) {
  const user = await requireRole(["FACULTY", "ADMINISTRATOR"]);

  const eventId = getString(formData, "eventId");
  const status = parseEventStatus(getString(formData, "status"));

  const event = await prisma.event.findUnique({ where: { id: eventId } });

  if (!event) {
    redirect("/events/manage?error=not-found");
  }

  if (user.role !== "ADMINISTRATOR" && event.organizerId !== user.id) {
    redirect("/events/manage?error=forbidden");
  }

  await prisma.event.update({
    where: { id: eventId },
    data: { status },
  });

  revalidatePath("/events/manage");
  revalidatePath("/events");
  redirect("/events/manage?status=updated");
}

// EVT-4 / EVT-5 — register, or join the waitlist when full
export async function registerForEventAction(formData: FormData) {
  const user = await requireUser();
  const eventId = getString(formData, "eventId");

  const event = await prisma.event.findUnique({ where: { id: eventId } });

  if (!event || event.status !== "PUBLISHED") {
    redirect("/events?error=not-available");
  }

  if (!isEligible(event.eligibility, user.department)) {
    redirect("/events?error=not-eligible");
  }

  const existing = await prisma.eventRegistration.findUnique({
    where: { eventId_studentId: { eventId, studentId: user.id } },
  });

  if (existing && existing.status !== "CANCELLED") {
    redirect("/events?error=already-registered");
  }

  const registeredCount = await prisma.eventRegistration.count({
    where: { eventId, status: "REGISTERED" },
  });
  const status = registeredCount < event.capacity ? "REGISTERED" : "WAITLISTED";

  if (existing) {
    await prisma.eventRegistration.update({
      where: { id: existing.id },
      data: { status, checkedInAt: null },
    });
  } else {
    await prisma.eventRegistration.create({
      data: { eventId, studentId: user.id, status },
    });
  }

  await prisma.notification.create({
    data: {
      userId: user.id,
      title: status === "WAITLISTED" ? "Added to event waitlist" : "Event registration confirmed",
      message:
        status === "WAITLISTED"
          ? `"${event.title}" is full. You are on the waitlist and will be notified if a seat opens.`
          : `You are registered for "${event.title}" on ${event.startsAt.toLocaleString()}.`,
    },
  });

  revalidatePath("/events");
  revalidatePath("/events/manage");
  redirect(`/events?registered=${status === "WAITLISTED" ? "waitlist" : "1"}`);
}

// EVT-5 — cancel a registration and auto-promote the next waitlisted student
export async function cancelRegistrationAction(formData: FormData) {
  const user = await requireUser();
  const eventId = getString(formData, "eventId");

  const registration = await prisma.eventRegistration.findUnique({
    where: { eventId_studentId: { eventId, studentId: user.id } },
    include: { event: true },
  });

  if (!registration || registration.status === "CANCELLED") {
    redirect("/events?error=not-registered");
  }

  const freedSeat = registration.status === "REGISTERED";

  await prisma.eventRegistration.update({
    where: { id: registration.id },
    data: { status: "CANCELLED", checkedInAt: null },
  });

  if (freedSeat) {
    const next = await prisma.eventRegistration.findFirst({
      where: { eventId, status: "WAITLISTED" },
      orderBy: { createdAt: "asc" },
    });

    if (next) {
      await prisma.eventRegistration.update({
        where: { id: next.id },
        data: { status: "REGISTERED" },
      });

      await prisma.notification.create({
        data: {
          userId: next.studentId,
          title: "Promoted from waitlist",
          message: `A seat opened up for "${registration.event.title}" — you are now registered.`,
        },
      });
    }
  }

  revalidatePath("/events");
  revalidatePath("/events/manage");
  redirect("/events?cancelled=1");
}

// EVT-6 — QR / token check-in (registered students only, no duplicates)
export async function checkInAction(formData: FormData) {
  const user = await requireUser();
  const token = getString(formData, "checkInToken");

  const event = await prisma.event.findUnique({ where: { checkInToken: token } });

  if (!event) {
    redirect("/events?error=invalid-token");
  }

  const registration = await prisma.eventRegistration.findUnique({
    where: { eventId_studentId: { eventId: event.id, studentId: user.id } },
  });

  if (!registration || registration.status !== "REGISTERED") {
    redirect(`/events/checkin/${token}?error=not-registered`);
  }

  if (registration.checkedInAt) {
    redirect(`/events/checkin/${token}?error=already-checked-in`);
  }

  await prisma.eventRegistration.update({
    where: { id: registration.id },
    data: { checkedInAt: new Date() },
  });

  revalidatePath(`/events/checkin/${token}`);
  revalidatePath(`/events/${event.id}/report`);
  redirect(`/events/checkin/${token}?checkedin=1`);
}

// EVT-7 — post-event feedback (registered students, after the event ends)
export async function submitEventFeedbackAction(formData: FormData) {
  const user = await requireUser();
  const eventId = getString(formData, "eventId");
  const rating = Number(getString(formData, "rating"));
  const comment = getString(formData, "comment");

  const validation = validateEventFeedbackInput({ rating, comment });

  if (!validation.ok) {
    redirect(`/events?error=${validation.error}`);
  }

  const event = await prisma.event.findUnique({ where: { id: eventId } });

  if (!event) {
    redirect("/events?error=not-available");
  }

  if (event.endsAt.getTime() > Date.now()) {
    redirect("/events?error=not-ended");
  }

  const registration = await prisma.eventRegistration.findUnique({
    where: { eventId_studentId: { eventId, studentId: user.id } },
  });

  if (!registration || registration.status === "CANCELLED") {
    redirect("/events?error=not-registered");
  }

  const existingFeedback = await prisma.eventFeedback.findUnique({
    where: { eventId_studentId: { eventId, studentId: user.id } },
  });

  if (existingFeedback) {
    redirect("/events?error=feedback-exists");
  }

  await prisma.eventFeedback.create({
    data: {
      eventId,
      studentId: user.id,
      rating,
      comment: comment || null,
    },
  });

  await prisma.notification.create({
    data: {
      userId: event.organizerId,
      title: "New event feedback",
      message: `${user.name} rated "${event.title}" ${rating}/5.`,
    },
  });

  revalidatePath("/events");
  revalidatePath(`/events/${eventId}/report`);
  redirect("/events?feedback=1");
}
