import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});

const revalidatePathMock = vi.fn();

const prismaMock = {
  asset: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  assetHistory: {
    create: vi.fn(),
  },
};

const sessionMock = {
  requireRole: vi.fn(),
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

describe("asset.actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers an asset and records CREATED history", async () => {
    sessionMock.requireRole.mockResolvedValue({ id: "admin-1" });
    prismaMock.asset.findUnique.mockResolvedValue(null);
    prismaMock.asset.create.mockResolvedValue({
      id: "asset-1",
      assetId: "AST-ABCD1234",
      serialNumber: "SN-1",
    });

    const { createAssetAction } = await import("@/app/actions/asset.actions");
    const formData = new FormData();
    formData.set("name", "Projector");
    formData.set("category", "AV");
    formData.set("serialNumber", "SN-1");

    await expect(createAssetAction(formData)).rejects.toThrow(
      "REDIRECT:/assets/asset-1?asset=created",
    );
    expect(prismaMock.asset.create).toHaveBeenCalled();
    expect(prismaMock.assetHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ changeType: "CREATED", assetId: "asset-1" }),
      }),
    );
  });

  it("blocks a duplicate serial number", async () => {
    sessionMock.requireRole.mockResolvedValue({ id: "admin-1" });
    prismaMock.asset.findUnique.mockResolvedValue({ id: "existing", serialNumber: "SN-1" });

    const { createAssetAction } = await import("@/app/actions/asset.actions");
    const formData = new FormData();
    formData.set("name", "Projector");
    formData.set("category", "AV");
    formData.set("serialNumber", "SN-1");

    await expect(createAssetAction(formData)).rejects.toThrow(
      "REDIRECT:/assets/new?error=duplicate-serial",
    );
    expect(prismaMock.asset.create).not.toHaveBeenCalled();
  });

  it("blocks allocating an asset that is not available", async () => {
    sessionMock.requireRole.mockResolvedValue({ id: "admin-1" });
    prismaMock.asset.findUnique.mockResolvedValue({ id: "asset-1", status: "ASSIGNED" });

    const { allocateAssetAction } = await import("@/app/actions/asset.actions");
    const formData = new FormData();
    formData.set("assetId", "asset-1");
    formData.set("assigneeId", "user-1");
    formData.set("responsiblePerson", "Ada Lovelace");

    await expect(allocateAssetAction(formData)).rejects.toThrow(
      "REDIRECT:/assets/asset-1?error=asset-unavailable",
    );
    expect(prismaMock.asset.update).not.toHaveBeenCalled();
  });

  it("allocates an available asset and records ALLOCATED history", async () => {
    sessionMock.requireRole.mockResolvedValue({ id: "admin-1" });
    prismaMock.asset.findUnique.mockResolvedValue({ id: "asset-1", status: "AVAILABLE" });
    prismaMock.asset.update.mockResolvedValue({ id: "asset-1" });

    const { allocateAssetAction } = await import("@/app/actions/asset.actions");
    const formData = new FormData();
    formData.set("assetId", "asset-1");
    formData.set("assigneeId", "user-1");
    formData.set("responsiblePerson", "Ada Lovelace");

    await expect(allocateAssetAction(formData)).rejects.toThrow(
      "REDIRECT:/assets/asset-1?asset=allocated",
    );
    expect(prismaMock.asset.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "ASSIGNED", assignedToId: "user-1" }),
      }),
    );
    expect(prismaMock.assetHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ changeType: "ALLOCATED" }),
      }),
    );
  });

  it("approves a pending transfer", async () => {
    sessionMock.requireRole.mockResolvedValue({ id: "admin-1" });
    prismaMock.asset.findUnique.mockResolvedValue({
      id: "asset-1",
      status: "UNDER_REVIEW",
      transferToId: "user-2",
      transferTo: { name: "Grace" },
    });
    prismaMock.asset.update.mockResolvedValue({ id: "asset-1" });

    const { approveTransferAction } = await import("@/app/actions/asset.actions");
    const formData = new FormData();
    formData.set("assetId", "asset-1");

    await expect(approveTransferAction(formData)).rejects.toThrow(
      "REDIRECT:/assets/asset-1?asset=transfer-approved",
    );
    expect(prismaMock.asset.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          assignedToId: "user-2",
          status: "ASSIGNED",
          transferToId: null,
        }),
      }),
    );
  });
});
