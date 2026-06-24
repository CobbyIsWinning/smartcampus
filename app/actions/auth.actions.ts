"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/app/lib/prisma";
import { sendEmail } from "@/app/lib/email";
import { hashPassword, verifyPassword } from "@/app/lib/password";
import { clearSession, createSession, isAppRole, requireRole, requireUser } from "@/app/lib/session";
import {
  validateLoginInput,
  validatePasswordResetRequestInput,
  validateRegisterInput,
  validateResetPasswordInput,
} from "@/app/lib/validation";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

// STU-2 — optional university-email-domain allowlist (comma-separated env var).
// Empty/unset disables the check, so local/dev signups are unaffected.
function allowedEmailDomains(): string[] {
  return (process.env.UNIVERSITY_EMAIL_DOMAINS ?? "")
    .split(",")
    .map((domain) => domain.trim())
    .filter(Boolean);
}

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

function parseRole(value: string) {
  return isAppRole(value) ? value : "STUDENT";
}

export async function registerAction(formData: FormData) {
  const name = getString(formData, "name");
  const email = getString(formData, "email").toLowerCase();
  const password = getString(formData, "password");
  const confirmPassword = getString(formData, "confirmPassword");
  const studentId = getString(formData, "studentId");
  const department = getString(formData, "department");
  const validation = validateRegisterInput(
    {
      name,
      email,
      password,
      confirmPassword,
      studentId,
      department,
    },
    { allowedEmailDomains: allowedEmailDomains() },
  );

  if (!validation.ok) {
    redirect(`/register?error=${validation.error}`);
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    redirect("/register?error=email-exists");
  }

  // STU-2 — block duplicate student IDs across accounts.
  if (studentId) {
    const existingStudentId = await prisma.user.findFirst({
      where: { studentId },
      select: { id: true },
    });

    if (existingStudentId) {
      redirect("/register?error=student-id-exists");
    }
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: hashPassword(password),
      role: "STUDENT",
      studentId: studentId || null,
      department: department || null,
    },
  });

  await createSession(user.id);
  redirect("/dashboard?welcome=1");
}

export async function loginAction(formData: FormData) {
  const email = getString(formData, "email").toLowerCase();
  const password = getString(formData, "password");
  const validation = validateLoginInput({ email, password });

  if (!validation.ok) {
    redirect(`/login?error=${validation.error}`);
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !verifyPassword(password, user.passwordHash)) {
    redirect("/login?error=invalid");
  }

  await createSession(user.id);
  redirect("/dashboard");
}

export async function logoutAction() {
  await clearSession();
  redirect("/login?message=signed-out");
}

export async function updateProfileAction(formData: FormData) {
  const user = await requireUser();
  const studentId = getString(formData, "studentId");

  // STU-2/STU-4 — keep student IDs unique when one is set.
  if (studentId) {
    const clash = await prisma.user.findFirst({
      where: { studentId, NOT: { id: user.id } },
      select: { id: true },
    });

    if (clash) {
      redirect("/dashboard?error=student-id-exists");
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: getString(formData, "name") || user.name,
      studentId: studentId || null,
      department: getString(formData, "department") || null,
      phone: getString(formData, "phone") || null,
      // STU-4 profile fields
      address: getString(formData, "address") || null,
      emergencyContact: getString(formData, "emergencyContact") || null,
    },
  });

  redirect("/dashboard?profile=updated");
}

export async function updateUserRoleAction(formData: FormData) {
  const admin = await requireRole(["ADMINISTRATOR"]);
  const userId = getString(formData, "userId");
  const role = parseRole(getString(formData, "role"));

  if (!userId) {
    redirect("/admin/users?error=missing-user");
  }

  if (userId === admin.id && role !== "ADMINISTRATOR") {
    redirect("/admin/users?error=self-admin");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role },
  });

  revalidatePath("/admin/users");
  revalidatePath("/dashboard");
  redirect("/admin/users?updated=1");
}

// STU-3 — request a password reset link. We never reveal whether an account
// exists; on success we mint a single-use token and "email" the link (the dev
// email stub logs it, and we surface it on the page for local testing).
export async function requestPasswordResetAction(formData: FormData) {
  const email = getString(formData, "email").toLowerCase();
  const validation = validatePasswordResetRequestInput({ email });

  if (!validation.ok) {
    redirect(`/forgot-password?error=${validation.error}`);
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    // Avoid account enumeration — behave the same as the success path.
    redirect("/forgot-password?sent=1");
  }

  const token = randomBytes(32).toString("hex");
  await prisma.passwordReset.create({
    data: {
      token,
      userId: user.id,
      expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
    },
  });

  const resetPath = `/reset-password/${token}`;
  await sendEmail({
    to: email,
    subject: "Reset your Smart Campus password",
    body: `Open this link to choose a new password (valid for 1 hour): ${resetPath}`,
  });

  // No email provider in dev — surface the link via the query string so a
  // developer can complete the flow locally.
  redirect(`/forgot-password?sent=1&devToken=${token}`);
}

// STU-3 — consume a reset token (single-use + expiry enforced) and set a new
// password. Any active session is invalidated so the user must sign in again.
export async function resetPasswordAction(formData: FormData) {
  const token = getString(formData, "token");
  const password = getString(formData, "password");
  const confirmPassword = getString(formData, "confirmPassword");

  if (!token) {
    redirect("/forgot-password?error=invalid-token");
  }

  const validation = validateResetPasswordInput({ password, confirmPassword });

  if (!validation.ok) {
    redirect(`/reset-password/${token}?error=${validation.error}`);
  }

  const reset = await prisma.passwordReset.findUnique({ where: { token } });

  if (!reset || reset.usedAt || reset.expiresAt.getTime() < Date.now()) {
    redirect(`/reset-password/${token}?error=invalid-token`);
  }

  await prisma.user.update({
    where: { id: reset.userId },
    data: {
      passwordHash: hashPassword(password),
      sessionToken: null,
      sessionExpires: null,
    },
  });

  await prisma.passwordReset.update({
    where: { id: reset.id },
    data: { usedAt: new Date() },
  });

  redirect("/login?message=password-reset");
}
