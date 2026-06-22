import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});

const prismaMock = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
};

const sessionMock = {
  clearSession: vi.fn(),
  createSession: vi.fn(),
  requireUser: vi.fn(),
};

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/app/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/app/lib/session", () => sessionMock);

describe("auth.actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers new users only as students", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({ id: "user-1" });

    const { registerAction } = await import("@/app/actions/auth.actions");
    const formData = new FormData();
    formData.set("name", "Ada Lovelace");
    formData.set("email", "ada@example.com");
    formData.set("password", "password123");
    formData.set("confirmPassword", "password123");
    formData.set("role", "ADMINISTRATOR");

    await expect(registerAction(formData)).rejects.toThrow("REDIRECT:/dashboard?welcome=1");
    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: "STUDENT",
        }),
      }),
    );
    expect(sessionMock.createSession).toHaveBeenCalledWith("user-1");
  });

  it("rejects invalid login input before querying credentials", async () => {
    const { loginAction } = await import("@/app/actions/auth.actions");
    const formData = new FormData();
    formData.set("email", "not-an-email");
    formData.set("password", "secret123");

    await expect(loginAction(formData)).rejects.toThrow("REDIRECT:/login?error=invalid-email");
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });
});
