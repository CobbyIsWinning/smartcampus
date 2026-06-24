// Epic 6 (ANA-3 / P0.6): the notification trigger catalog plus pure helpers for
// merging persisted overrides onto the catalog defaults. The catalog is the
// source of truth for which triggers exist; the `NotificationRule` table only
// stores overrides, so triggers without a row fall back to these defaults.

export type NotificationRuleKey =
  | "maintenance.ticket.created"
  | "maintenance.ticket.updated"
  | "booking.submitted"
  | "booking.decision"
  | "event.registration"
  | "asset.allocated";

export type NotificationTrigger = {
  key: NotificationRuleKey;
  name: string;
  description: string;
  defaultInApp: boolean;
  defaultEmail: boolean;
};

export const NOTIFICATION_TRIGGERS: NotificationTrigger[] = [
  {
    key: "maintenance.ticket.created",
    name: "Maintenance ticket created",
    description: "Notify administrators when a new maintenance ticket is submitted.",
    defaultInApp: true,
    defaultEmail: false,
  },
  {
    key: "maintenance.ticket.updated",
    name: "Maintenance ticket updated",
    description: "Notify the requester when a ticket status or assignment changes.",
    defaultInApp: true,
    defaultEmail: true,
  },
  {
    key: "booking.submitted",
    name: "Facility booking submitted",
    description: "Notify administrators when a facility booking needs review.",
    defaultInApp: true,
    defaultEmail: false,
  },
  {
    key: "booking.decision",
    name: "Facility booking decision",
    description: "Notify the requester when a booking is approved or rejected.",
    defaultInApp: true,
    defaultEmail: true,
  },
  {
    key: "event.registration",
    name: "Event registration",
    description: "Notify a student when their event registration is confirmed or waitlisted.",
    defaultInApp: true,
    defaultEmail: false,
  },
  {
    key: "asset.allocated",
    name: "Asset allocated",
    description: "Notify the responsible person when an asset is allocated to them.",
    defaultInApp: true,
    defaultEmail: false,
  },
];

export type PersistedRule = {
  key: string;
  inApp: boolean;
  email: boolean;
  enabled: boolean;
};

export type EffectiveRule = {
  key: NotificationRuleKey;
  name: string;
  description: string;
  inApp: boolean;
  email: boolean;
  enabled: boolean;
  // True when a persisted override exists for this trigger.
  customized: boolean;
};

/**
 * Combine the static trigger catalog with persisted overrides. Pure so it can be
 * unit-tested without a database. Unknown persisted keys are ignored (a renamed
 * or removed trigger should not surface a phantom row).
 */
export function mergeNotificationRules(
  persisted: PersistedRule[],
): EffectiveRule[] {
  const byKey = new Map(persisted.map((rule) => [rule.key, rule]));

  return NOTIFICATION_TRIGGERS.map((trigger) => {
    const override = byKey.get(trigger.key);

    if (!override) {
      return {
        key: trigger.key,
        name: trigger.name,
        description: trigger.description,
        inApp: trigger.defaultInApp,
        email: trigger.defaultEmail,
        enabled: true,
        customized: false,
      };
    }

    return {
      key: trigger.key,
      name: trigger.name,
      description: trigger.description,
      inApp: override.inApp,
      email: override.email,
      enabled: override.enabled,
      customized: true,
    };
  });
}

export function isNotificationRuleKey(value: string): value is NotificationRuleKey {
  return NOTIFICATION_TRIGGERS.some((trigger) => trigger.key === value);
}
