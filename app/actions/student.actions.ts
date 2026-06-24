"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/app/lib/prisma";
import { requireRole, requireUser } from "@/app/lib/session";
import { validateCourseInput } from "@/app/lib/validation";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

// STU-5 — create a course in the catalog (admin / faculty only).
export async function createCourseAction(formData: FormData) {
  await requireRole(["ADMINISTRATOR", "FACULTY"]);

  const code = getString(formData, "code").toUpperCase();
  const title = getString(formData, "title");
  const description = getString(formData, "description");
  const department = getString(formData, "department");
  const semester = getString(formData, "semester");
  const credits = Number(getString(formData, "credits"));
  const capacity = Number(getString(formData, "capacity"));

  const validation = validateCourseInput({
    code,
    title,
    semester,
    credits,
    capacity,
  });

  if (!validation.ok) {
    redirect(`/admin/courses?error=${validation.error}`);
  }

  const existing = await prisma.course.findUnique({ where: { code } });

  if (existing) {
    redirect("/admin/courses?error=code-exists");
  }

  await prisma.course.create({
    data: {
      code,
      title,
      description: description || null,
      department: department || null,
      semester,
      credits,
      capacity,
    },
  });

  revalidatePath("/admin/courses");
  revalidatePath("/courses");
  redirect("/admin/courses?course=created");
}

// STU-5 — enroll the current student in a course, with seat + duplicate checks.
export async function enrollAction(formData: FormData) {
  const user = await requireUser();
  const courseId = getString(formData, "courseId");

  const course = await prisma.course.findUnique({ where: { id: courseId } });

  if (!course || !course.active) {
    redirect("/courses?error=not-available");
  }

  const existing = await prisma.enrollment.findUnique({
    where: { courseId_studentId: { courseId, studentId: user.id } },
  });

  if (existing && existing.status === "ENROLLED") {
    redirect("/courses?error=already-enrolled");
  }

  const enrolledCount = await prisma.enrollment.count({
    where: { courseId, status: "ENROLLED" },
  });

  if (enrolledCount >= course.capacity) {
    redirect("/courses?error=course-full");
  }

  if (existing) {
    await prisma.enrollment.update({
      where: { id: existing.id },
      data: { status: "ENROLLED" },
    });
  } else {
    await prisma.enrollment.create({
      data: { courseId, studentId: user.id, status: "ENROLLED" },
    });
  }

  await prisma.notification.create({
    data: {
      userId: user.id,
      title: "Course enrollment confirmed",
      message: `You are enrolled in ${course.code} — ${course.title} (${course.semester}).`,
    },
  });

  revalidatePath("/courses");
  revalidatePath("/attendance");
  revalidatePath("/records");
  redirect("/courses?enrolled=1");
}

// STU-5 — drop a course the student is enrolled in.
export async function dropEnrollmentAction(formData: FormData) {
  const user = await requireUser();
  const courseId = getString(formData, "courseId");

  const enrollment = await prisma.enrollment.findUnique({
    where: { courseId_studentId: { courseId, studentId: user.id } },
  });

  if (!enrollment || enrollment.status !== "ENROLLED") {
    redirect("/courses?error=not-enrolled");
  }

  await prisma.enrollment.update({
    where: { id: enrollment.id },
    data: { status: "DROPPED" },
  });

  revalidatePath("/courses");
  revalidatePath("/attendance");
  redirect("/courses?dropped=1");
}
