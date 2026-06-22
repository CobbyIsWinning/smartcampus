"use server";

import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { prisma } from "@/app/lib/prisma";
import { hashPassword, verifyPassword } from "@/app/lib/password";
import { clearSession, createSession, requireUser } from "@/app/lib/session";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseRole(value: string) {
  if (value === Role.ADMINISTRATOR || value === Role.MAINTENANCE_STAFF) {
    return value;
  }

  return Role.STUDENT;
}

export async function registerAction(formData: FormData) {
  const name = getString(formData, "name");
  const email = getString(formData, "email").toLowerCase();
  const password = getString(formData, "password");
  const confirmPassword = getString(formData, "confirmPassword");
  const role = parseRole(getString(formData, "role"));

  if (!name || !email || password.length < 8) {
    redirect("/register?error=missing-fields");
  }

  if (password !== confirmPassword) {
    redirect("/register?error=password-mismatch");
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
      role,
    },
  });

  await createSession(user.id);
  redirect("/dashboard");
}

export async function loginAction(formData: FormData) {
  const email = getString(formData, "email").toLowerCase();
  const password = getString(formData, "password");
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !verifyPassword(password, user.passwordHash)) {
    redirect("/login?error=invalid");
  }

  await createSession(user.id);
  redirect("/dashboard");
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
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
