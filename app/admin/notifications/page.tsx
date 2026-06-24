import {
  sendTestNotificationAction,
  updateNotificationRuleAction,
} from "@/app/actions/notification.actions";
import { ActionToast } from "@/app/components/action-toast";
import { SubmitButton } from "@/app/components/submit-button";
import { AppShell, StatCard } from "@/app/components/ui";
import {
  mergeNotificationRules,
  type PersistedRule,
} from "@/app/lib/notifications";
import { prisma } from "@/app/lib/prisma";
import { requireRole } from "@/app/lib/session";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function Toggle({
  name,
  checked,
  label,
}: {
  name: string;
  checked: boolean;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        name={name}
        defaultChecked={checked}
        className="size-4 rounded border-input accent-primary"
      />
      {label}
    </label>
  );
}

const STATUS_VARIANT: Record<string, "secondary" | "destructive" | "outline"> = {
  SENT: "secondary",
  FAILED: "destructive",
  SKIPPED: "outline",
};

export default async function AdminNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string; sent?: string; error?: string }>;
}) {
  const params = await searchParams;
  const admin = await requireRole(["ADMINISTRATOR"]);

  const [persisted, deliveries]: [PersistedRule[], Array<{
    id: string;
    ruleKey: string;
    channel: string;
    status: string;
    recipient: string;
    detail: string | null;
    createdAt: Date;
  }>] = await Promise.all([
    prisma.notificationRule.findMany({
      select: { key: true, inApp: true, email: true, enabled: true },
    }),
    prisma.notificationDelivery.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  const rules = mergeNotificationRules(persisted);
  const emailEnabledCount = rules.filter((r) => r.enabled && r.email).length;
  const inAppEnabledCount = rules.filter((r) => r.enabled && r.inApp).length;

  const errorMessages: Record<string, string> = {
    "unknown-rule": "That notification trigger is not recognised.",
    "rule-disabled": "Enable the trigger before sending a test.",
  };

  return (
    <AppShell user={admin}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Admin operations
          </p>
          <h1 className="mt-2 font-heading text-4xl font-semibold uppercase tracking-wider">
            Notification rules
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">{rules.length} triggers</p>
      </div>

      <ActionToast
        specs={[
          ...(params.updated === "1"
            ? [
                {
                  key: "updated",
                  value: "1",
                  message: "Notification rule saved.",
                  type: "success" as const,
                },
              ]
            : []),
          ...(params.sent === "1"
            ? [
                {
                  key: "sent",
                  value: "1",
                  message: "Test notification dispatched. See the delivery log.",
                  type: "success" as const,
                },
              ]
            : []),
          ...(params.error
            ? [
                {
                  key: "error",
                  value: params.error,
                  message: errorMessages[params.error] ?? "Notification action failed.",
                  type: "error" as const,
                },
              ]
            : []),
        ]}
      />

      <section className="-mx-5 mt-8 grid gap-4 border-y bg-muted/35 px-5 py-5 md:grid-cols-3">
        <StatCard label="Configured triggers" value={rules.length} />
        <StatCard label="In-app enabled" value={inAppEnabledCount} />
        <StatCard label="Email enabled" value={emailEnabledCount} />
      </section>

      <section className="-mx-5 mt-8 border-y bg-background px-5 py-6">
        <div className="mb-5">
          <h2 className="font-heading text-2xl font-semibold uppercase tracking-wider">
            Triggers & channels
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Toggle in-app and email delivery per trigger. Email uses the no-op
            provider stub in this environment.
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Trigger</TableHead>
              <TableHead className="w-[360px]">Channels</TableHead>
              <TableHead className="w-[160px]">Test</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((rule) => (
              <TableRow key={rule.key}>
                <TableCell className="align-top whitespace-normal">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{rule.name}</p>
                    {rule.customized ? (
                      <Badge variant="outline">customized</Badge>
                    ) : (
                      <Badge variant="secondary">default</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{rule.description}</p>
                  <code className="text-xs text-muted-foreground">{rule.key}</code>
                </TableCell>
                <TableCell className="align-top">
                  <form
                    action={updateNotificationRuleAction}
                    className="flex flex-col gap-3"
                  >
                    <input name="key" type="hidden" value={rule.key} />
                    <Toggle name="enabled" checked={rule.enabled} label="Enabled" />
                    <Toggle name="inApp" checked={rule.inApp} label="In-app" />
                    <Toggle name="email" checked={rule.email} label="Email" />
                    <SubmitButton loadingText="Saving..." variant="secondary">
                      Save
                    </SubmitButton>
                  </form>
                </TableCell>
                <TableCell className="align-top">
                  <form action={sendTestNotificationAction}>
                    <input name="key" type="hidden" value={rule.key} />
                    <SubmitButton loadingText="Sending...">Send test</SubmitButton>
                  </form>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section className="-mx-5 mt-8 border-y bg-background px-5 py-6">
        <div className="mb-5">
          <h2 className="font-heading text-2xl font-semibold uppercase tracking-wider">
            Delivery log
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Most recent delivery attempts and their status (in-app vs email).
          </p>
        </div>
        {deliveries.length === 0 ? (
          <p className="text-muted-foreground">
            No deliveries recorded yet. Send a test to populate the log.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveries.map((delivery) => (
                <TableRow key={delivery.id}>
                  <TableCell className="align-top text-sm text-muted-foreground">
                    {delivery.createdAt.toLocaleString("en", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell className="align-top">
                    <code className="text-xs">{delivery.ruleKey}</code>
                  </TableCell>
                  <TableCell className="align-top text-sm">
                    {delivery.channel === "IN_APP" ? "In-app" : "Email"}
                  </TableCell>
                  <TableCell className="align-top">
                    <Badge variant={STATUS_VARIANT[delivery.status] ?? "secondary"}>
                      {delivery.status.toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="align-top whitespace-normal text-sm">
                    {delivery.recipient}
                  </TableCell>
                  <TableCell className="align-top whitespace-normal text-sm text-muted-foreground">
                    {delivery.detail}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </AppShell>
  );
}
