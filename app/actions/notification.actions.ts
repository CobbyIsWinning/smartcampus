"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sendEmail } from "@/app/lib/email";
import {
  isNotificationRuleKey,
  mergeNotificationRules,
  NOTIFICATION_TRIGGERS,
  type PersistedRule,
} from "@/app/lib/notifications";
import { prisma } from "@/app/lib/prisma";
import { requireRole, requireUser } from "@/app/lib/session";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getCheckbox(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

// ANA-2: mark a single notification read from the history page.
export async function markNotificationReadAction(formData: FormData) {
  const user = await requireUser();
  const notificationId = getString(formData, "notificationId");

  if (notificationId) {
    await prisma.notification.updateMany({
      where: { id: notificationId, userId: user.id },
      data: { read: true },
    });
  }

  revalidatePath("/notifications");
  revalidatePath("/dashboard");
  redirect("/notifications?updated=1");
}

// ANA-2: mark every notification read from the history page.
export async function markAllNotificationsReadAction() {
  const user = await requireUser();

  await prisma.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  });

  revalidatePath("/notifications");
  revalidatePath("/dashboard");
  redirect("/notifications?updated=all");
}

// ANA-3: persist the channel toggles for a notification trigger.
export async function updateNotificationRuleAction(formData: FormData) {
  await requireRole(["ADMINISTRATOR"]);

  const key = getString(formData, "key");

  if (!isNotificationRuleKey(key)) {
    redirect("/admin/notifications?error=unknown-rule");
  }

  const inApp = getCheckbox(formData, "inApp");
  const email = getCheckbox(formData, "email");
  const enabled = getCheckbox(formData, "enabled");

  await prisma.notificationRule.upsert({
    where: { key },
    create: { key, inApp, email, enabled },
    update: { inApp, email, enabled },
  });

  revalidatePath("/admin/notifications");
  redirect("/admin/notifications?updated=1");
}

// ANA-3: fire a test delivery for a trigger to the current admin, recording an
// in-app notification and/or an email attempt in the delivery log.
export async function sendTestNotificationAction(formData: FormData) {
  const user = await requireRole(["ADMINISTRATOR"]);
  const key = getString(formData, "key");

  if (!isNotificationRuleKey(key)) {
    redirect("/admin/notifications?error=unknown-rule");
  }

  const persisted: PersistedRule[] = await prisma.notificationRule.findMany({
    select: { key: true, inApp: true, email: true, enabled: true },
  });
  const rule = mergeNotificationRules(persisted).find((r) => r.key === key);
  const trigger = NOTIFICATION_TRIGGERS.find((t) => t.key === key);

  if (!rule || !trigger || !rule.enabled) {
    redirect("/admin/notifications?error=rule-disabled");
  }

  const title = `Test: ${trigger.name}`;
  const message = `This is a test notification for the "${trigger.name}" trigger.`;

  const deliveries: Array<{
    ruleKey: string;
    channel: "IN_APP" | "EMAIL";
    status: "SENT" | "FAILED" | "SKIPPED";
    recipient: string;
    detail: string | null;
  }> = [];

  if (rule.inApp) {
    await prisma.notification.create({
      data: { userId: user.id, title, message },
    });
    deliveries.push({
      ruleKey: key,
      channel: "IN_APP",
      status: "SENT",
      recipient: user.id,
      detail: "In-app notification created.",
    });
  } else {
    deliveries.push({
      ruleKey: key,
      channel: "IN_APP",
      status: "SKIPPED",
      recipient: user.id,
      detail: "In-app channel disabled for this trigger.",
    });
  }

  if (rule.email) {
    const result = await sendEmail({ to: user.email, subject: title, body: message });
    deliveries.push({
      ruleKey: key,
      channel: "EMAIL",
      status: result.ok ? "SENT" : "FAILED",
      recipient: user.email,
      detail: result.ok
        ? `Sent via ${result.provider}.`
        : `Provider ${result.provider} error: ${result.error}.`,
    });
  } else {
    deliveries.push({
      ruleKey: key,
      channel: "EMAIL",
      status: "SKIPPED",
      recipient: user.email,
      detail: "Email channel disabled for this trigger.",
    });
  }

  await prisma.notificationDelivery.createMany({ data: deliveries });

  revalidatePath("/admin/notifications");
  redirect("/admin/notifications?sent=1");
}
