import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});

const revalidatePathMock = vi.fn();

const prismaMock = {
  event: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  eventRegistration: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  eventFeedback: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  notification: {
    create: vi.fn(),
  },
};

const sessionMock = {
  requireRole: vi.fn(),
  requireUser: vi.fn(),
};

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/app/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/app/lib/session", () => sessionMock);

function form(entries: Record<string, string>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    fd.set(key, value);
  }
  return fd;
}

describe("event.actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a draft event for a faculty organizer", async () => {
    sessionMock.requireRole.mockResolvedValue({ id: "faculty-1", role: "FACULTY" });
    prismaMock.event.create.mockResolvedValue({ id: "event-1" });

    const { createEventAction } = await import("@/app/actions/event.actions");

    await expect(
      createEventAction(
        form({
          title: "Spring Hackathon",
          description: "A 24-hour campus-wide build sprint with mentors.",
          category: "Technology",
          venue: "Innovation Lab",
          capacity: "50",
          startsAt: "2026-07-01T09:00",
          endsAt: "2026-07-02T09:00",
          eligibility: "",
        }),
      ),
    ).rejects.toThrow("REDIRECT:/events/manage?event=created");

    expect(prismaMock.event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizerId: "faculty-1", capacity: 50 }),
      }),
    );
  });

  it("registers a student when seats are available", async () => {
    sessionMock.requireUser.mockResolvedValue({ id: "student-1", department: null });
    prismaMock.event.findUnique.mockResolvedValue({
      id: "event-1",
      status: "PUBLISHED",
      capacity: 50,
      eligibility: null,
      title: "Spring Hackathon",
      startsAt: new Date("2026-07-01T09:00:00Z"),
    });
    prismaMock.eventRegistration.findUnique.mockResolvedValue(null);
    prismaMock.eventRegistration.count.mockResolvedValue(10);

    const { registerForEventAction } = await import("@/app/actions/event.actions");

    await expect(
      registerForEventAction(form({ eventId: "event-1" })),
    ).rejects.toThrow("REDIRECT:/events?registered=1");

    expect(prismaMock.eventRegistration.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "REGISTERED", studentId: "student-1" }),
      }),
    );
  });

  it("waitlists a student when the event is full", async () => {
    sessionMock.requireUser.mockResolvedValue({ id: "student-2", department: null });
    prismaMock.event.findUnique.mockResolvedValue({
      id: "event-1",
      status: "PUBLISHED",
      capacity: 50,
      eligibility: null,
      title: "Spring Hackathon",
      startsAt: new Date("2026-07-01T09:00:00Z"),
    });
    prismaMock.eventRegistration.findUnique.mockResolvedValue(null);
    prismaMock.eventRegistration.count.mockResolvedValue(50);

    const { registerForEventAction } = await import("@/app/actions/event.actions");

    await expect(
      registerForEventAction(form({ eventId: "event-1" })),
    ).rejects.toThrow("REDIRECT:/events?registered=waitlist");

    expect(prismaMock.eventRegistration.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "WAITLISTED" }),
      }),
    );
  });

  it("blocks a duplicate registration", async () => {
    sessionMock.requireUser.mockResolvedValue({ id: "student-1", department: null });
    prismaMock.event.findUnique.mockResolvedValue({
      id: "event-1",
      status: "PUBLISHED",
      capacity: 50,
      eligibility: null,
    });
    prismaMock.eventRegistration.findUnique.mockResolvedValue({
      id: "reg-1",
      status: "REGISTERED",
    });

    const { registerForEventAction } = await import("@/app/actions/event.actions");

    await expect(
      registerForEventAction(form({ eventId: "event-1" })),
    ).rejects.toThrow("REDIRECT:/events?error=already-registered");
    expect(prismaMock.eventRegistration.create).not.toHaveBeenCalled();
  });

  it("blocks registration when not eligible", async () => {
    sessionMock.requireUser.mockResolvedValue({ id: "student-1", department: "Biology" });
    prismaMock.event.findUnique.mockResolvedValue({
      id: "event-1",
      status: "PUBLISHED",
      capacity: 50,
      eligibility: "Computer Science",
    });

    const { registerForEventAction } = await import("@/app/actions/event.actions");

    await expect(
      registerForEventAction(form({ eventId: "event-1" })),
    ).rejects.toThrow("REDIRECT:/events?error=not-eligible");
  });

  it("promotes the next waitlisted student on cancellation", async () => {
    sessionMock.requireUser.mockResolvedValue({ id: "student-1", department: null });
    prismaMock.eventRegistration.findUnique.mockResolvedValue({
      id: "reg-1",
      status: "REGISTERED",
      event: { title: "Spring Hackathon" },
    });
    prismaMock.eventRegistration.findFirst.mockResolvedValue({
      id: "reg-2",
      studentId: "student-2",
    });

    const { cancelRegistrationAction } = await import("@/app/actions/event.actions");

    await expect(
      cancelRegistrationAction(form({ eventId: "event-1" })),
    ).rejects.toThrow("REDIRECT:/events?cancelled=1");

    expect(prismaMock.eventRegistration.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "reg-2" },
        data: { status: "REGISTERED" },
      }),
    );
    expect(prismaMock.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: "student-2" }),
      }),
    );
  });

  it("prevents a duplicate check-in", async () => {
    sessionMock.requireUser.mockResolvedValue({ id: "student-1" });
    prismaMock.event.findUnique.mockResolvedValue({ id: "event-1" });
    prismaMock.eventRegistration.findUnique.mockResolvedValue({
      id: "reg-1",
      status: "REGISTERED",
      checkedInAt: new Date(),
    });

    const { checkInAction } = await import("@/app/actions/event.actions");

    await expect(
      checkInAction(form({ checkInToken: "token-123" })),
    ).rejects.toThrow("REDIRECT:/events/checkin/token-123?error=already-checked-in");
    expect(prismaMock.eventRegistration.update).not.toHaveBeenCalled();
  });
});
