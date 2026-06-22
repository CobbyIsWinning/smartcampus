"use server";

import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { prisma } from "@/app/lib/prisma";
import { hashPassword, verifyPassword } from "@/app/lib/password";
import { clearSession, createSession, requireUser } from "@/app/lib/session";
import { validateLoginInput, validateRegisterInput } from "@/app/lib/validation";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function registerAction(formData: FormData) {
  const name = getString(formData, "name");
  const email = getString(formData, "email").toLowerCase();
  const password = getString(formData, "password");
  const confirmPassword = getString(formData, "confirmPassword");
  const validation = validateRegisterInput({
    name,
    email,
    password,
    confirmPassword,
  });

  if (!validation.ok) {
    redirect(`/register?error=${validation.error}`);
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    redirect("/register?error=email-exists");
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: hashPassword(password),
      role: Role.STUDENT,
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

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: getString(formData, "name") || user.name,
      studentId: getString(formData, "studentId") || null,
      department: getString(formData, "department") || null,
      phone: getString(formData, "phone") || null,
    },
  });

  redirect("/dashboard?profile=updated");
}
