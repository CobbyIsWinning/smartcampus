import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/actions/notification.actions";
import { ActionToast } from "@/app/components/action-toast";
import { SubmitButton } from "@/app/components/submit-button";
import { AppShell, StatCard } from "@/app/components/ui";
import { prisma } from "@/app/lib/prisma";
import { requireUser } from "@/app/lib/session";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string }>;
}) {
  const params = await searchParams;
  const user = await requireUser();

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <AppShell user={user}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Activity
          </p>
          <h1 className="mt-2 font-heading text-4xl font-semibold uppercase tracking-wider">
            Notifications
          </h1>
        </div>
        <form action={markAllNotificationsReadAction}>
          <SubmitButton loadingText="Updating..." variant="secondary">
            Mark all read
          </SubmitButton>
        </form>
      </div>

      <ActionToast
        specs={[
          ...(params.updated === "1"
            ? [
                {
                  key: "updated",
                  value: "1",
                  message: "Notification marked as read.",
                  type: "success" as const,
                },
              ]
            : []),
          ...(params.updated === "all"
            ? [
                {
                  key: "updated",
                  value: "all",
                  message: "All notifications marked as read.",
                  type: "success" as const,
                },
              ]
            : []),
        ]}
      />

      <section className="-mx-5 mt-8 grid gap-4 border-y bg-muted/35 px-5 py-5 md:grid-cols-3">
        <StatCard label="Total notifications" value={notifications.length} />
        <StatCard label="Unread" value={unreadCount} />
        <StatCard label="Read" value={notifications.length - unreadCount} />
      </section>

      <section className="-mx-5 mt-8 border-y bg-background px-5 py-6">
        <div className="mb-5">
          <h2 className="font-heading text-2xl font-semibold uppercase tracking-wider">
            Notification history
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Every alert sent to your account, newest first.
          </p>
        </div>
        {notifications.length === 0 ? (
          <p className="text-muted-foreground">No notifications yet.</p>
        ) : (
          notifications.map((notification) => (
            <div key={notification.id}>
              <article
                className={`flex flex-wrap items-start justify-between gap-4 py-4 ${
                  notification.read ? "" : "bg-muted/40 px-4"
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{notification.title}</h3>
                    {notification.read ? null : (
                      <Badge variant="secondary">New</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {notification.message}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {notification.createdAt.toLocaleString("en", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                {notification.read ? (
                  <span className="text-xs text-muted-foreground">Read</span>
                ) : (
                  <form action={markNotificationReadAction}>
                    <input name="notificationId" type="hidden" value={notification.id} />
                    <SubmitButton loadingText="..." variant="secondary">
                      Mark read
                    </SubmitButton>
                  </form>
                )}
              </article>
              <Separator />
            </div>
          ))
        )}
      </section>
    </AppShell>
  );
}
