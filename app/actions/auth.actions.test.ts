import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});

const prismaMock = {
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  passwordReset: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};

const sessionMock = {
  clearSession: vi.fn(),
  createSession: vi.fn(),
  requireUser: vi.fn(),
};

const emailMock = { sendEmail: vi.fn() };

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/app/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/app/lib/session", () => sessionMock);

vi.mock("@/app/lib/email", () => emailMock);

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

  it("blocks registration with a duplicate student id", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.findFirst.mockResolvedValue({ id: "other-user" });

    const { registerAction } = await import("@/app/actions/auth.actions");
    const formData = new FormData();
    formData.set("name", "Ada Lovelace");
    formData.set("email", "ada@example.com");
    formData.set("password", "password123");
    formData.set("confirmPassword", "password123");
    formData.set("studentId", "S12345");

    await expect(registerAction(formData)).rejects.toThrow(
      "REDIRECT:/register?error=student-id-exists",
    );
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("issues a single-use reset token for an existing account", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "user-1" });
    prismaMock.passwordReset.create.mockResolvedValue({ id: "reset-1" });

    const { requestPasswordResetAction } = await import("@/app/actions/auth.actions");
    const formData = new FormData();
    formData.set("email", "ada@example.com");

    await expect(requestPasswordResetAction(formData)).rejects.toThrow(/REDIRECT:\/forgot-password\?sent=1&devToken=/);
    expect(prismaMock.passwordReset.create).toHaveBeenCalled();
    expect(emailMock.sendEmail).toHaveBeenCalled();
  });

  it("does not reveal whether an account exists", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const { requestPasswordResetAction } = await import("@/app/actions/auth.actions");
    const formData = new FormData();
    formData.set("email", "ghost@example.com");

    await expect(requestPasswordResetAction(formData)).rejects.toThrow(
      "REDIRECT:/forgot-password?sent=1",
    );
    expect(prismaMock.passwordReset.create).not.toHaveBeenCalled();
  });

  it("rejects an expired reset token", async () => {
    prismaMock.passwordReset.findUnique.mockResolvedValue({
      id: "reset-1",
      userId: "user-1",
      usedAt: null,
      expiresAt: new Date(Date.now() - 1000),
    });

    const { resetPasswordAction } = await import("@/app/actions/auth.actions");
    const formData = new FormData();
    formData.set("token", "tok-123");
    formData.set("password", "password123");
    formData.set("confirmPassword", "password123");

    await expect(resetPasswordAction(formData)).rejects.toThrow(
      "REDIRECT:/reset-password/tok-123?error=invalid-token",
    );
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("resets the password and marks the token used", async () => {
    prismaMock.passwordReset.findUnique.mockResolvedValue({
      id: "reset-1",
      userId: "user-1",
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });

    const { resetPasswordAction } = await import("@/app/actions/auth.actions");
    const formData = new FormData();
    formData.set("token", "tok-123");
    formData.set("password", "password123");
    formData.set("confirmPassword", "password123");

    await expect(resetPasswordAction(formData)).rejects.toThrow(
      "REDIRECT:/login?message=password-reset",
    );
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "user-1" } }),
    );
    expect(prismaMock.passwordReset.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "reset-1" }, data: { usedAt: expect.any(Date) } }),
    );
  });
});
