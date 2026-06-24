import { describe, expect, it } from "vitest";
import {
  NOTIFICATION_TRIGGERS,
  isNotificationRuleKey,
  mergeNotificationRules,
} from "@/app/lib/notifications";

describe("mergeNotificationRules", () => {
  it("returns catalog defaults when nothing is persisted", () => {
    const merged = mergeNotificationRules([]);

    expect(merged).toHaveLength(NOTIFICATION_TRIGGERS.length);
    const updated = merged.find((r) => r.key === "maintenance.ticket.updated");
    expect(updated).toMatchObject({
      inApp: true,
      email: true,
      enabled: true,
      customized: false,
    });
  });

  it("applies persisted overrides and marks them customized", () => {
    const merged = mergeNotificationRules([
      {
        key: "maintenance.ticket.created",
        inApp: false,
        email: true,
        enabled: false,
      },
    ]);

    const created = merged.find((r) => r.key === "maintenance.ticket.created");
    expect(created).toMatchObject({
      inApp: false,
      email: true,
      enabled: false,
      customized: true,
    });
  });

  it("ignores persisted rows for unknown keys", () => {
    const merged = mergeNotificationRules([
      { key: "ghost.trigger", inApp: false, email: false, enabled: false },
    ]);

    expect(merged.every((r) => r.customized === false)).toBe(true);
    expect(merged).toHaveLength(NOTIFICATION_TRIGGERS.length);
  });
});

describe("isNotificationRuleKey", () => {
  it("accepts catalog keys and rejects others", () => {
    expect(isNotificationRuleKey("booking.decision")).toBe(true);
    expect(isNotificationRuleKey("nope")).toBe(false);
  });
});
