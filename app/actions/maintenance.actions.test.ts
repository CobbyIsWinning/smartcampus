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

  it("updates a ticket and notifies the requester", async () => {
    sessionMock.requireRole.mockResolvedValue({ id: "admin-1" });
    prismaMock.maintenanceTicket.update.mockResolvedValue({
      id: "ticket-1",
      title: "Leaking faucet",
      requesterId: "student-1",
      assignedTo: { name: "Tech Sam" },
    });

    const { updateTicketStatusAction } = await import("@/app/actions/maintenance.actions");
    const formData = new FormData();
    formData.set("ticketId", "ticket-1");
    formData.set("status", "IN_PROGRESS");
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
  });
});
