"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/app/lib/prisma";
import { requireRole, requireUser } from "@/app/lib/session";
import {
  bookingSlotsOverlap,
  isBookingSlotInPast,
  validateBookingInput,
  validateFacilityInput,
} from "@/app/lib/validation";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getInt(formData: FormData, key: string) {
  return Number.parseInt(getString(formData, key), 10);
}

const FACILITY_CATEGORIES = ["ROOM", "LAB", "HALL", "SPORTS"] as const;
type FacilityCategoryValue = (typeof FACILITY_CATEGORIES)[number];

function parseCategory(value: string): FacilityCategoryValue {
  return (FACILITY_CATEGORIES as readonly string[]).includes(value)
    ? (value as FacilityCategoryValue)
    : "ROOM";
}

// Normalize a yyyy-mm-dd string to a stable UTC-midnight instant for storage
// and exact-day equality queries.
function toBookingDate(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

const ACTIVE_BOOKING_STATUSES = ["PENDING", "APPROVED"] as const;

// Returns true when an overlapping PENDING/APPROVED booking already holds the
// slot for the same facility on the same day (optionally excluding one booking).
async function hasSlotConflict(input: {
  facilityId: string;
  date: Date;
  startTime: string;
  endTime: string;
  excludeBookingId?: string;
}) {
  const existing: Array<{ startTime: string; endTime: string }> =
    await prisma.booking.findMany({
      where: {
        facilityId: input.facilityId,
        date: input.date,
        status: { in: [...ACTIVE_BOOKING_STATUSES] },
        ...(input.excludeBookingId ? { id: { not: input.excludeBookingId } } : {}),
      },
      select: { startTime: true, endTime: true },
    });

  return existing.some((slot) =>
    bookingSlotsOverlap(slot, { startTime: input.startTime, endTime: input.endTime }),
  );
}

async function notifyAdmins(title: string, message: string) {
  const admins: Array<{ id: string }> = await prisma.user.findMany({
    where: { role: "ADMINISTRATOR" },
    select: { id: true },
  });

  if (admins.length === 0) {
    return;
  }

  await prisma.notification.createMany({
    data: admins.map((admin) => ({ userId: admin.id, title, message })),
  });
}

// FAC-2 — admin-managed catalog
export async function createFacilityAction(formData: FormData) {
  await requireRole(["ADMINISTRATOR"]);

  const name = getString(formData, "name");
  const category = parseCategory(getString(formData, "category"));
  const capacity = getInt(formData, "capacity");
  const building = getString(formData, "building");
  const location = getString(formData, "location");
  const equipment = getString(formData, "equipment");
  const description = getString(formData, "description");

  const validation = validateFacilityInput({ name, capacity, building, location });

  if (!validation.ok) {
    redirect(`/admin/facilities?error=${validation.error}`);
  }

  await prisma.facility.create({
    data: {
      name,
      category,
      capacity,
      building,
      location,
      equipment: equipment || null,
      description: description || null,
    },
  });

  revalidatePath("/admin/facilities");
  revalidatePath("/facilities");
  redirect("/admin/facilities?facility=created");
}

export async function updateFacilityAction(formData: FormData) {
  await requireRole(["ADMINISTRATOR"]);

  const facilityId = getString(formData, "facilityId");
  const name = getString(formData, "name");
  const category = parseCategory(getString(formData, "category"));
  const capacity = getInt(formData, "capacity");
  const building = getString(formData, "building");
  const location = getString(formData, "location");
  const equipment = getString(formData, "equipment");
  const description = getString(formData, "description");
  const active = getString(formData, "active") === "true";

  const validation = validateFacilityInput({ name, capacity, building, location });

  if (!validation.ok || !facilityId) {
    redirect(`/admin/facilities?error=${validation.ok ? "missing-fields" : validation.error}`);
  }

  await prisma.facility.update({
    where: { id: facilityId },
    data: {
      name,
      category,
      capacity,
      building,
      location,
      equipment: equipment || null,
      description: description || null,
      active,
    },
  });

  revalidatePath("/admin/facilities");
  revalidatePath("/facilities");
  revalidatePath(`/facilities/${facilityId}`);
  redirect("/admin/facilities?facility=updated");
}

// FAC-5 — booking request creation (with double-booking prevention)
export async function createBookingAction(formData: FormData) {
  const user = await requireUser();

  const facilityId = getString(formData, "facilityId");
  const date = getString(formData, "date");
  const startTime = getString(formData, "startTime");
  const endTime = getString(formData, "endTime");
  const purpose = getString(formData, "purpose");
  const attendeeCount = getInt(formData, "attendeeCount");

  const back = `/facilities/${facilityId}`;
  const validation = validateBookingInput({
    date,
    startTime,
    endTime,
    purpose,
    attendeeCount,
  });

  if (!validation.ok) {
    redirect(`${back}?error=${validation.error}`);
  }

  if (isBookingSlotInPast({ date, startTime })) {
    redirect(`${back}?error=past-slot`);
  }

  const facility = await prisma.facility.findUnique({ where: { id: facilityId } });

  if (!facility || !facility.active) {
    redirect("/facilities?error=facility-unavailable");
  }

  if (attendeeCount > facility.capacity) {
    redirect(`${back}?error=over-capacity`);
  }

  const bookingDate = toBookingDate(date);

  if (
    await hasSlotConflict({ facilityId, date: bookingDate, startTime, endTime })
  ) {
    redirect(`${back}?error=slot-taken`);
  }

  await prisma.booking.create({
    data: {
      facilityId,
      requesterId: user.id,
      date: bookingDate,
      startTime,
      endTime,
      purpose,
      attendeeCount,
    },
  });

  await notifyAdmins(
    "New booking request",
    `${user.name} requested ${facility.name} on ${date} (${startTime}–${endTime}).`,
  );

  revalidatePath("/dashboard");
  revalidatePath("/admin/facilities");
  revalidatePath(back);
  redirect("/dashboard?booking=created");
}

// FAC-6 — admin approval workflow
export async function decideBookingAction(formData: FormData) {
  await requireRole(["ADMINISTRATOR"]);

  const bookingId = getString(formData, "bookingId");
  const decision = getString(formData, "decision");
  const comment = getString(formData, "comment");
  const status = decision === "APPROVED" ? "APPROVED" : "REJECTED";

  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data: { status, decisionComment: comment || null },
    include: { facility: true },
  });

  const slot = `${booking.facility.name} on ${booking.date
    .toISOString()
    .slice(0, 10)} (${booking.startTime}–${booking.endTime})`;

  await prisma.notification.create({
    data: {
      userId: booking.requesterId,
      title: `Booking ${status.toLowerCase()}`,
      message: `Your booking for ${slot} was ${status.toLowerCase()}.${
        comment ? ` Note: ${comment}` : ""
      }`,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/admin/facilities");
  redirect("/admin/facilities?booking=decided");
}

// FAC-7 — cancellation (releases the slot)
export async function cancelBookingAction(formData: FormData) {
  const user = await requireUser();

  const bookingId = getString(formData, "bookingId");
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { facility: true },
  });

  if (!booking || booking.requesterId !== user.id) {
    redirect("/dashboard?error=booking-not-found");
  }

  if (booking.status === "CANCELLED" || booking.status === "REJECTED") {
    redirect("/dashboard?error=booking-not-cancellable");
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED" },
  });

  await notifyAdmins(
    "Booking cancelled",
    `${user.name} cancelled their booking for ${booking.facility.name} on ${booking.date
      .toISOString()
      .slice(0, 10)} (${booking.startTime}–${booking.endTime}).`,
  );

  revalidatePath("/dashboard");
  revalidatePath("/admin/facilities");
  redirect("/dashboard?booking=cancelled");
}

// FAC-7 — rescheduling (re-checks availability, returns to PENDING)
export async function rescheduleBookingAction(formData: FormData) {
  const user = await requireUser();

  const bookingId = getString(formData, "bookingId");
  const date = getString(formData, "date");
  const startTime = getString(formData, "startTime");
  const endTime = getString(formData, "endTime");

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { facility: true },
  });

  if (!booking || booking.requesterId !== user.id) {
    redirect("/dashboard?error=booking-not-found");
  }

  if (booking.status === "CANCELLED" || booking.status === "REJECTED") {
    redirect("/dashboard?error=booking-not-reschedulable");
  }

  const validation = validateBookingInput({
    date,
    startTime,
    endTime,
    purpose: booking.purpose,
    attendeeCount: booking.attendeeCount,
  });

  if (!validation.ok) {
    redirect(`/dashboard?error=${validation.error}`);
  }

  if (isBookingSlotInPast({ date, startTime })) {
    redirect("/dashboard?error=past-slot");
  }

  const bookingDate = toBookingDate(date);

  if (
    await hasSlotConflict({
      facilityId: booking.facilityId,
      date: bookingDate,
      startTime,
      endTime,
      excludeBookingId: bookingId,
    })
  ) {
    redirect("/dashboard?error=slot-taken");
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { date: bookingDate, startTime, endTime, status: "PENDING", decisionComment: null },
  });

  await notifyAdmins(
    "Booking rescheduled",
    `${user.name} rescheduled their booking for ${booking.facility.name} to ${date} (${startTime}–${endTime}).`,
  );

  revalidatePath("/dashboard");
  revalidatePath("/admin/facilities");
  redirect("/dashboard?booking=rescheduled");
}
