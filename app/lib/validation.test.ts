import { describe, expect, it } from "vitest";
import {
  bookingSlotsOverlap,
  isBookingSlotInPast,
  validateAllocationInput,
  validateAssetInput,
  validateBookingInput,
  validateFacilityInput,
  validateTransferInput,
} from "@/app/lib/validation";

describe("validateAssetInput", () => {
  const base = { name: "Projector", category: "AV", serialNumber: "SN-1", cost: "" };

  it("accepts a valid asset", () => {
    expect(validateAssetInput(base)).toEqual({ ok: true });
  });

  it("requires name, category, and serial", () => {
    expect(validateAssetInput({ ...base, name: "" })).toEqual({
      ok: false,
      error: "missing-fields",
    });
    expect(validateAssetInput({ ...base, category: "" })).toEqual({
      ok: false,
      error: "missing-fields",
    });
    expect(validateAssetInput({ ...base, serialNumber: "" })).toEqual({
      ok: false,
      error: "missing-fields",
    });
  });

  it("rejects an over-long name", () => {
    expect(validateAssetInput({ ...base, name: "x".repeat(121) })).toEqual({
      ok: false,
      error: "invalid-name",
    });
  });

  it("rejects a negative or non-numeric cost", () => {
    expect(validateAssetInput({ ...base, cost: "-5" })).toEqual({
      ok: false,
      error: "invalid-cost",
    });
    expect(validateAssetInput({ ...base, cost: "abc" })).toEqual({
      ok: false,
      error: "invalid-cost",
    });
  });

  it("accepts a valid numeric cost", () => {
    expect(validateAssetInput({ ...base, cost: "1200.50" })).toEqual({ ok: true });
  });
});

describe("validateAllocationInput", () => {
  it("requires an assignee and responsible person", () => {
    expect(
      validateAllocationInput({ assigneeId: "", responsiblePerson: "Ada" }),
    ).toEqual({ ok: false, error: "missing-fields" });
    expect(
      validateAllocationInput({ assigneeId: "u1", responsiblePerson: "" }),
    ).toEqual({ ok: false, error: "missing-fields" });
  });

  it("rejects a too-short responsible person", () => {
    expect(
      validateAllocationInput({ assigneeId: "u1", responsiblePerson: "A" }),
    ).toEqual({ ok: false, error: "invalid-responsible-person" });
  });

  it("accepts valid allocation input", () => {
    expect(
      validateAllocationInput({ assigneeId: "u1", responsiblePerson: "Ada Lovelace" }),
    ).toEqual({ ok: true });
  });
});

describe("validateTransferInput", () => {
  it("requires a transfer target", () => {
    expect(validateTransferInput({ transferToId: "" })).toEqual({
      ok: false,
      error: "missing-transfer-target",
    });
  });

  it("accepts a transfer target", () => {
    expect(validateTransferInput({ transferToId: "u2" })).toEqual({ ok: true });
  });
});

describe("validateFacilityInput", () => {
  const base = {
    name: "Seminar Room A",
    capacity: 30,
    building: "Block A",
    location: "Floor 2",
  };

  it("accepts a valid facility", () => {
    expect(validateFacilityInput(base)).toEqual({ ok: true });
  });

  it("rejects missing fields", () => {
    expect(validateFacilityInput({ ...base, name: "" })).toEqual({
      ok: false,
      error: "missing-fields",
    });
  });

  it("rejects a non-positive capacity", () => {
    expect(validateFacilityInput({ ...base, capacity: 0 })).toEqual({
      ok: false,
      error: "invalid-capacity",
    });
  });

  it("rejects a non-integer capacity", () => {
    expect(validateFacilityInput({ ...base, capacity: 12.5 })).toEqual({
      ok: false,
      error: "invalid-capacity",
    });
  });
});

describe("validateBookingInput", () => {
  const base = {
    date: "2026-07-01",
    startTime: "09:00",
    endTime: "10:30",
    purpose: "Team workshop",
    attendeeCount: 12,
  };

  it("accepts a valid booking", () => {
    expect(validateBookingInput(base)).toEqual({ ok: true });
  });

  it("rejects missing fields", () => {
    expect(validateBookingInput({ ...base, purpose: "" })).toEqual({
      ok: false,
      error: "missing-fields",
    });
  });

  it("rejects a malformed time", () => {
    expect(validateBookingInput({ ...base, startTime: "9am" })).toEqual({
      ok: false,
      error: "invalid-time",
    });
  });

  it("rejects an end time at or before the start", () => {
    expect(validateBookingInput({ ...base, endTime: "09:00" })).toEqual({
      ok: false,
      error: "invalid-time-range",
    });
  });

  it("rejects a zero attendee count", () => {
    expect(validateBookingInput({ ...base, attendeeCount: 0 })).toEqual({
      ok: false,
      error: "invalid-attendees",
    });
  });
});

describe("isBookingSlotInPast", () => {
  const now = new Date("2026-06-24T12:00:00");

  it("flags a slot earlier than now", () => {
    expect(isBookingSlotInPast({ date: "2026-06-24", startTime: "09:00" }, now)).toBe(true);
  });

  it("allows a future slot", () => {
    expect(isBookingSlotInPast({ date: "2026-06-25", startTime: "09:00" }, now)).toBe(false);
  });

  it("treats an unparseable slot as past", () => {
    expect(isBookingSlotInPast({ date: "not-a-date", startTime: "09:00" }, now)).toBe(true);
  });
});

describe("bookingSlotsOverlap", () => {
  it("detects overlapping slots", () => {
    expect(
      bookingSlotsOverlap(
        { startTime: "09:00", endTime: "11:00" },
        { startTime: "10:00", endTime: "12:00" },
      ),
    ).toBe(true);
  });

  it("treats back-to-back slots as non-overlapping", () => {
    expect(
      bookingSlotsOverlap(
        { startTime: "09:00", endTime: "10:00" },
        { startTime: "10:00", endTime: "11:00" },
      ),
    ).toBe(false);
  });

  it("treats disjoint slots as non-overlapping", () => {
    expect(
      bookingSlotsOverlap(
        { startTime: "09:00", endTime: "10:00" },
        { startTime: "13:00", endTime: "14:00" },
      ),
    ).toBe(false);
  });
});
