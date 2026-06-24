import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "@prisma/client";
import { prisma } from "@/app/lib/prisma";

const SESSION_COOKIE = "smartcampus_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export const APP_ROLES = [
  "STUDENT",
  "FACULTY",
  "ADMINISTRATOR",
  "MAINTENANCE_STAFF",
  "MAINTENANCE_SUPERVISOR",
  "EVENT_ORGANIZER",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const ROLE_LABELS: Record<AppRole, string> = {
  STUDENT: "Student",
  FACULTY: "Faculty",
  ADMINISTRATOR: "Administrator",
  MAINTENANCE_STAFF: "Maintenance staff",
  MAINTENANCE_SUPERVISOR: "Maintenance supervisor",
  EVENT_ORGANIZER: "Event organizer",
};

export function isAppRole(value: string): value is AppRole {
  return (APP_ROLES as readonly string[]).includes(value);
}

export type CurrentUser = Pick<
  User,
  "id" | "name" | "email" | "role" | "studentId" | "department" | "phone"
>;

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  await prisma.user.update({
    where: { id: userId },
    data: {
      sessionToken: token,
      sessionExpires: expires,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await prisma.user.updateMany({
      where: { sessionToken: token },
      data: {
        sessionToken: null,
        sessionExpires: null,
      },
    });
  }

  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const user = await prisma.user.findFirst({
    where: {
      sessionToken: token,
      sessionExpires: {
        gt: new Date(),
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      studentId: true,
      department: true,
      phone: true,
    },
  });

  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireRole(roles: AppRole[]) {
  const user = await requireUser();

  if (!roles.includes(user.role)) {
    redirect("/dashboard");
  }

  return user;
}
