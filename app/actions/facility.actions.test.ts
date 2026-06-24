import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});

const revalidatePathMock = vi.fn();

const prismaMock = {
  facility: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  booking: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  user: {
    findMany: vi.fn(),
  },
  notification: {
    create: vi.fn(),
    createMany: vi.fn(),
  },
};

const sessionMock = {
  requireRole: vi.fn(),
  requireUser: vi.fn(),
};

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("@/app/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/app/lib/session", () => sessionMock);

const FUTURE_DATE = "2999-01-01";

function bookingForm(overrides: Record<string, string> = {}) {
  const formData = new FormData();
  formData.set("facilityId", "facility-1");
  formData.set("date", FUTURE_DATE);
  formData.set("startTime", "09:00");
  formData.set("endTime", "10:00");
  formData.set("purpose", "Project meeting");
  formData.set("attendeeCount", "5");
  for (const [key, value] of Object.entries(overrides)) {
    formData.set(key, value);
  }
  return formData;
}

describe("facility.actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a booking and notifies admins", async () => {
    sessionMock.requireUser.mockResolvedValue({ id: "student-1", name: "Ada" });
    prismaMock.facility.findUnique.mockResolvedValue({
      id: "facility-1",
      name: "Lab 1",
      active: true,
      capacity: 40,
    });
    prismaMock.booking.findMany.mockResolvedValue([]);
    prismaMock.booking.create.mockResolvedValue({ id: "booking-1" });
    prismaMock.user.findMany.mockResolvedValue([{ id: "admin-1" }]);

    const { createBookingAction } = await import("@/app/actions/facility.actions");

    await expect(createBookingAction(bookingForm())).rejects.toThrow(
      "REDIRECT:/dashboard?booking=created",
    );
    expect(prismaMock.booking.create).toHaveBeenCalled();
    expect(prismaMock.notification.createMany).toHaveBeenCalled();
  });

  it("prevents double-booking on an overlapping slot", async () => {
    sessionMock.requireUser.mockResolvedValue({ id: "student-1", name: "Ada" });
    prismaMock.facility.findUnique.mockResolvedValue({
      id: "facility-1",
      name: "Lab 1",
      active: true,
      capacity: 40,
    });
    prismaMock.booking.findMany.mockResolvedValue([
      { startTime: "09:30", endTime: "11:00" },
    ]);

    const { createBookingAction } = await import("@/app/actions/facility.actions");

    await expect(createBookingAction(bookingForm())).rejects.toThrow(
      "REDIRECT:/facilities/facility-1?error=slot-taken",
    );
    expect(prismaMock.booking.create).not.toHaveBeenCalled();
  });

  it("rejects bookings over facility capacity", async () => {
    sessionMock.requireUser.mockResolvedValue({ id: "student-1", name: "Ada" });
    prismaMock.facility.findUnique.mockResolvedValue({
      id: "facility-1",
      name: "Lab 1",
      active: true,
      capacity: 4,
    });

    const { createBookingAction } = await import("@/app/actions/facility.actions");

    await expect(
      createBookingAction(bookingForm({ attendeeCount: "10" })),
    ).rejects.toThrow("REDIRECT:/facilities/facility-1?error=over-capacity");
  });

  it("notifies the requester when a booking is decided", async () => {
    sessionMock.requireRole.mockResolvedValue({ id: "admin-1" });
    prismaMock.booking.update.mockResolvedValue({
      id: "booking-1",
      requesterId: "student-1",
      startTime: "09:00",
      endTime: "10:00",
      date: new Date("2999-01-01T00:00:00.000Z"),
      facility: { name: "Lab 1" },
    });

    const { decideBookingAction } = await import("@/app/actions/facility.actions");
    const formData = new FormData();
    formData.set("bookingId", "booking-1");
    formData.set("decision", "APPROVED");
    formData.set("comment", "Approved for use.");

    await expect(decideBookingAction(formData)).rejects.toThrow(
      "REDIRECT:/admin/facilities?booking=decided",
    );
    expect(prismaMock.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "student-1",
          title: "Booking approved",
        }),
      }),
    );
  });
});
