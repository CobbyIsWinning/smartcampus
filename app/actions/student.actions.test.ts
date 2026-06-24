import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});

const revalidatePathMock = vi.fn();

const prismaMock = {
  course: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  enrollment: {
    findUnique: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
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

describe("student.actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("enrolls a student when seats are available", async () => {
    sessionMock.requireUser.mockResolvedValue({ id: "student-1" });
    prismaMock.course.findUnique.mockResolvedValue({
      id: "course-1",
      active: true,
      capacity: 30,
      code: "CS101",
      title: "Intro",
      semester: "Fall 2026",
    });
    prismaMock.enrollment.findUnique.mockResolvedValue(null);
    prismaMock.enrollment.count.mockResolvedValue(10);

    const { enrollAction } = await import("@/app/actions/student.actions");

    await expect(enrollAction(form({ courseId: "course-1" }))).rejects.toThrow(
      "REDIRECT:/courses?enrolled=1",
    );
    expect(prismaMock.enrollment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "ENROLLED", studentId: "student-1" }),
      }),
    );
  });

  it("blocks a duplicate enrollment", async () => {
    sessionMock.requireUser.mockResolvedValue({ id: "student-1" });
    prismaMock.course.findUnique.mockResolvedValue({
      id: "course-1",
      active: true,
      capacity: 30,
    });
    prismaMock.enrollment.findUnique.mockResolvedValue({
      id: "enr-1",
      status: "ENROLLED",
    });

    const { enrollAction } = await import("@/app/actions/student.actions");

    await expect(enrollAction(form({ courseId: "course-1" }))).rejects.toThrow(
      "REDIRECT:/courses?error=already-enrolled",
    );
    expect(prismaMock.enrollment.create).not.toHaveBeenCalled();
  });

  it("rejects enrollment when the course is full", async () => {
    sessionMock.requireUser.mockResolvedValue({ id: "student-1" });
    prismaMock.course.findUnique.mockResolvedValue({
      id: "course-1",
      active: true,
      capacity: 30,
    });
    prismaMock.enrollment.findUnique.mockResolvedValue(null);
    prismaMock.enrollment.count.mockResolvedValue(30);

    const { enrollAction } = await import("@/app/actions/student.actions");

    await expect(enrollAction(form({ courseId: "course-1" }))).rejects.toThrow(
      "REDIRECT:/courses?error=course-full",
    );
    expect(prismaMock.enrollment.create).not.toHaveBeenCalled();
  });

  it("re-enrolls a previously dropped student", async () => {
    sessionMock.requireUser.mockResolvedValue({ id: "student-1" });
    prismaMock.course.findUnique.mockResolvedValue({
      id: "course-1",
      active: true,
      capacity: 30,
      code: "CS101",
      title: "Intro",
      semester: "Fall 2026",
    });
    prismaMock.enrollment.findUnique.mockResolvedValue({
      id: "enr-1",
      status: "DROPPED",
    });
    prismaMock.enrollment.count.mockResolvedValue(5);

    const { enrollAction } = await import("@/app/actions/student.actions");

    await expect(enrollAction(form({ courseId: "course-1" }))).rejects.toThrow(
      "REDIRECT:/courses?enrolled=1",
    );
    expect(prismaMock.enrollment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "enr-1" },
        data: { status: "ENROLLED" },
      }),
    );
  });

  it("creates a course for an admin", async () => {
    sessionMock.requireRole.mockResolvedValue({ id: "admin-1", role: "ADMINISTRATOR" });
    prismaMock.course.findUnique.mockResolvedValue(null);
    prismaMock.course.create.mockResolvedValue({ id: "course-1" });

    const { createCourseAction } = await import("@/app/actions/student.actions");

    await expect(
      createCourseAction(
        form({
          code: "cs101",
          title: "Intro to CS",
          semester: "Fall 2026",
          credits: "3",
          capacity: "30",
        }),
      ),
    ).rejects.toThrow("REDIRECT:/admin/courses?course=created");
    expect(prismaMock.course.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ code: "CS101", credits: 3, capacity: 30 }),
      }),
    );
  });
});
