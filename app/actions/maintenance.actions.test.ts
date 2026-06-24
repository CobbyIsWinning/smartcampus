import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});

const revalidatePathMock = vi.fn();

const prismaMock = {
  maintenanceTicket: {
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
  },
  ticketFeedback: {
    create: vi.fn(),
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

describe("maintenance.actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a ticket and admin notifications", async () => {
    sessionMock.requireUser.mockResolvedValue({ id: "student-1", name: "Ada" });
    prismaMock.maintenanceTicket.create.mockResolvedValue({
      id: "ticket-1",
      title: "Leaking faucet",
      location: "Dorm A",
    });
    prismaMock.user.findMany.mockResolvedValue([{ id: "admin-1" }, { id: "admin-2" }]);
    prismaMock.maintenanceTicket.count.mockResolvedValue(3);

    const { createTicketAction } = await import("@/app/actions/maintenance.actions");
    const formData = new FormData();
    formData.set("title", "Leaking faucet");
    formData.set("description", "Water has been dripping for three days.");
    formData.set("location", "Dorm A");
    formData.set("priority", "HIGH");

    await expect(createTicketAction(formData)).rejects.toThrow("REDIRECT:/dashboard?ticket=created");
    expect(prismaMock.maintenanceTicket.create).toHaveBeenCalled();
    expect(prismaMock.notification.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ userId: "admin-1" }),
          expect.objectContaining({
            userId: "admin-2",
            message: expect.stringContaining("3 open tickets"),
          }),
        ]),
      }),
    );
  });

  it("updates a ticket, notifies the requester, and notifies a new assignee", async () => {
    sessionMock.requireRole.mockResolvedValue({ id: "admin-1" });
    prismaMock.maintenanceTicket.findUnique.mockResolvedValue({
      id: "ticket-1",
      status: "OPEN",
      priority: "MEDIUM",
      category: null,
      slaDueAt: new Date("2026-06-27T00:00:00.000Z"),
      assignedToId: null,
      createdAt: new Date("2026-06-24T00:00:00.000Z"),
    });
    prismaMock.maintenanceTicket.update.mockResolvedValue({
      id: "ticket-1",
      ticketNo: "MNT-ABCD1234",
      title: "Leaking faucet",
      location: "Dorm A",
      priority: "MEDIUM",
      requesterId: "student-1",
      assignedTo: { name: "Tech Sam" },
    });

    const { updateTicketStatusAction } = await import("@/app/actions/maintenance.actions");
    const formData = new FormData();
    formData.set("ticketId", "ticket-1");
    formData.set("status", "IN_PROGRESS");
    formData.set("priority", "MEDIUM");
    formData.set("assignedToId", "staff-1");

    await expect(updateTicketStatusAction(formData)).rejects.toThrow(
      "REDIRECT:/admin/maintenance?updated=1",
    );
    expect(prismaMock.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "student-1",
          title: "Maintenance ticket updated",
        }),
      }),
    );
    expect(prismaMock.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "staff-1",
          title: "Maintenance ticket assigned to you",
        }),
      }),
    );
  });

  it("locks a CLOSED ticket from being kept closed (MNT-6)", async () => {
    sessionMock.requireRole.mockResolvedValue({ id: "admin-1" });
    prismaMock.maintenanceTicket.findUnique.mockResolvedValue({
      id: "ticket-1",
      status: "CLOSED",
      priority: "MEDIUM",
      category: null,
      slaDueAt: null,
      assignedToId: null,
      createdAt: new Date("2026-06-24T00:00:00.000Z"),
    });

    const { updateTicketStatusAction } = await import("@/app/actions/maintenance.actions");
    const formData = new FormData();
    formData.set("ticketId", "ticket-1");
    formData.set("status", "CLOSED");
    formData.set("priority", "MEDIUM");

    await expect(updateTicketStatusAction(formData)).rejects.toThrow(
      "REDIRECT:/admin/maintenance?error=ticket-closed",
    );
    expect(prismaMock.maintenanceTicket.update).not.toHaveBeenCalled();
  });

  it("records requester feedback on a resolved ticket (MNT-7)", async () => {
    sessionMock.requireUser.mockResolvedValue({ id: "student-1" });
    prismaMock.maintenanceTicket.findUnique.mockResolvedValue({
      id: "ticket-1",
      requesterId: "student-1",
      status: "RESOLVED",
      feedback: null,
    });

    const { submitTicketFeedbackAction } = await import(
      "@/app/actions/maintenance.actions"
    );
    const formData = new FormData();
    formData.set("ticketId", "ticket-1");
    formData.set("rating", "5");
    formData.set("comment", "Fixed quickly.");

    await expect(submitTicketFeedbackAction(formData)).rejects.toThrow(
      "REDIRECT:/maintenance/ticket-1?feedback=submitted",
    );
    expect(prismaMock.ticketFeedback.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ ticketId: "ticket-1", rating: 5 }),
      }),
    );
  });

  it("flags a reopen request and notifies staff (MNT-7)", async () => {
    sessionMock.requireUser.mockResolvedValue({ id: "student-1", name: "Ada" });
    prismaMock.maintenanceTicket.findUnique.mockResolvedValue({
      id: "ticket-1",
      ticketNo: "MNT-ABCD1234",
      title: "Leaking faucet",
      requesterId: "student-1",
      status: "RESOLVED",
    });
    prismaMock.user.findMany.mockResolvedValue([{ id: "admin-1" }]);

    const { requestTicketReopenAction } = await import(
      "@/app/actions/maintenance.actions"
    );
    const formData = new FormData();
    formData.set("ticketId", "ticket-1");
    formData.set("reopenReason", "Still dripping.");

    await expect(requestTicketReopenAction(formData)).rejects.toThrow(
      "REDIRECT:/maintenance/ticket-1?reopen=requested",
    );
    expect(prismaMock.maintenanceTicket.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ reopenRequested: true }),
      }),
    );
    expect(prismaMock.notification.createMany).toHaveBeenCalled();
  });
});
