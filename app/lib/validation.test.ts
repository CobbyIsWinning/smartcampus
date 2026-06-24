import { describe, expect, it } from "vitest";
import {
  attendancePercentage,
  bookingSlotsOverlap,
  computeGpa,
  isAllowedEmailDomain,
  isBookingSlotInPast,
  isEligible,
  isLowAttendance,
  validateAllocationInput,
  validateAssetInput,
  validateBookingInput,
  validateCourseInput,
  validateEventFeedbackInput,
  validateEventInput,
  validateFacilityInput,
  validatePasswordResetRequestInput,
  validateRegisterInput,
  validateResetPasswordInput,
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

const validEvent = {
  title: "Spring Hackathon",
  description: "A 24-hour campus-wide build sprint with mentors and prizes.",
  category: "Technology",
  venue: "Innovation Lab, Block C",
  capacity: 50,
  startsAt: "2026-07-01T09:00:00.000Z",
  endsAt: "2026-07-02T09:00:00.000Z",
};

describe("validateEventInput", () => {
  it("accepts a well-formed event", () => {
    expect(validateEventInput(validEvent)).toEqual({ ok: true });
  });

  it("rejects missing required fields", () => {
    expect(validateEventInput({ ...validEvent, title: "" })).toEqual({
      ok: false,
      error: "missing-fields",
    });
    expect(validateEventInput({ ...validEvent, category: "" })).toEqual({
      ok: false,
      error: "missing-fields",
    });
  });

  it("rejects a short title", () => {
    expect(validateEventInput({ ...validEvent, title: "Go" })).toEqual({
      ok: false,
      error: "invalid-title",
    });
  });

  it("rejects a non-positive or non-integer capacity", () => {
    expect(validateEventInput({ ...validEvent, capacity: 0 })).toEqual({
      ok: false,
      error: "invalid-capacity",
    });
    expect(validateEventInput({ ...validEvent, capacity: 2.5 })).toEqual({
      ok: false,
      error: "invalid-capacity",
    });
  });

  it("rejects an unparseable date", () => {
    expect(validateEventInput({ ...validEvent, startsAt: "not-a-date" })).toEqual({
      ok: false,
      error: "invalid-date",
    });
  });

  it("rejects an end that is not after the start", () => {
    expect(
      validateEventInput({
        ...validEvent,
        startsAt: "2026-07-02T09:00:00.000Z",
        endsAt: "2026-07-01T09:00:00.000Z",
      }),
    ).toEqual({ ok: false, error: "invalid-date-range" });
  });
});

describe("validateEventFeedbackInput", () => {
  it("accepts a rating within range", () => {
    expect(validateEventFeedbackInput({ rating: 4, comment: "Great event" })).toEqual({
      ok: true,
    });
  });

  it("rejects an out-of-range rating", () => {
    expect(validateEventFeedbackInput({ rating: 0, comment: "" })).toEqual({
      ok: false,
      error: "invalid-rating",
    });
    expect(validateEventFeedbackInput({ rating: 6, comment: "" })).toEqual({
      ok: false,
      error: "invalid-rating",
    });
  });

  it("rejects an over-long comment", () => {
    expect(
      validateEventFeedbackInput({ rating: 3, comment: "x".repeat(2001) }),
    ).toEqual({ ok: false, error: "invalid-comment" });
  });
});

describe("isEligible", () => {
  it("treats empty or open eligibility as available to everyone", () => {
    expect(isEligible(null, null)).toBe(true);
    expect(isEligible("", "Biology")).toBe(true);
    expect(isEligible("All Students", null)).toBe(true);
    expect(isEligible("open", null)).toBe(true);
  });

  it("requires a matching department when eligibility is restricted", () => {
    expect(isEligible("Computer Science", "Computer Science")).toBe(true);
    expect(isEligible("Science", "Computer Science")).toBe(true);
    expect(isEligible("Computer Science", "Biology")).toBe(false);
    expect(isEligible("Computer Science", null)).toBe(false);
  });
});

// --- Epic 1: Student Management Portal ---

describe("isAllowedEmailDomain", () => {
  it("allows any email when no allowlist is given", () => {
    expect(isAllowedEmailDomain("a@gmail.com")).toBe(true);
    expect(isAllowedEmailDomain("a@gmail.com", [])).toBe(true);
  });

  it("accepts an exact domain match and subdomains", () => {
    expect(isAllowedEmailDomain("a@campus.edu", ["campus.edu"])).toBe(true);
    expect(isAllowedEmailDomain("a@cs.campus.edu", ["campus.edu"])).toBe(true);
  });

  it("rejects a non-matching domain", () => {
    expect(isAllowedEmailDomain("a@gmail.com", ["campus.edu"])).toBe(false);
  });
});

describe("validateRegisterInput", () => {
  const base = {
    name: "Ada Lovelace",
    email: "ada@campus.edu",
    password: "password123",
    confirmPassword: "password123",
  };

  it("accepts a valid signup", () => {
    expect(validateRegisterInput(base)).toEqual({ ok: true });
  });

  it("enforces the email-domain allowlist when configured", () => {
    expect(
      validateRegisterInput(
        { ...base, email: "ada@gmail.com" },
        { allowedEmailDomains: ["campus.edu"] },
      ),
    ).toEqual({ ok: false, error: "invalid-email-domain" });
  });

  it("rejects a too-short student id", () => {
    expect(validateRegisterInput({ ...base, studentId: "ab" })).toEqual({
      ok: false,
      error: "invalid-student-id",
    });
  });

  it("accepts an optional student id and department", () => {
    expect(
      validateRegisterInput({ ...base, studentId: "S12345", department: "CS" }),
    ).toEqual({ ok: true });
  });
});

describe("validatePasswordResetRequestInput", () => {
  it("requires a valid email", () => {
    expect(validatePasswordResetRequestInput({ email: "" })).toEqual({
      ok: false,
      error: "missing-fields",
    });
    expect(validatePasswordResetRequestInput({ email: "nope" })).toEqual({
      ok: false,
      error: "invalid-email",
    });
    expect(
      validatePasswordResetRequestInput({ email: "a@campus.edu" }),
    ).toEqual({ ok: true });
  });
});

describe("validateResetPasswordInput", () => {
  it("requires a strong, matching password", () => {
    expect(
      validateResetPasswordInput({ password: "short", confirmPassword: "short" }),
    ).toEqual({ ok: false, error: "weak-password" });
    expect(
      validateResetPasswordInput({
        password: "password123",
        confirmPassword: "different123",
      }),
    ).toEqual({ ok: false, error: "password-mismatch" });
    expect(
      validateResetPasswordInput({
        password: "password123",
        confirmPassword: "password123",
      }),
    ).toEqual({ ok: true });
  });
});

describe("validateCourseInput", () => {
  const base = {
    code: "CS101",
    title: "Intro to CS",
    semester: "Fall 2026",
    credits: 3,
    capacity: 30,
  };

  it("accepts a valid course", () => {
    expect(validateCourseInput(base)).toEqual({ ok: true });
  });

  it("rejects missing fields", () => {
    expect(validateCourseInput({ ...base, code: "" })).toEqual({
      ok: false,
      error: "missing-fields",
    });
  });

  it("rejects out-of-range credits and capacity", () => {
    expect(validateCourseInput({ ...base, credits: 0 })).toEqual({
      ok: false,
      error: "invalid-credits",
    });
    expect(validateCourseInput({ ...base, capacity: 0 })).toEqual({
      ok: false,
      error: "invalid-capacity",
    });
  });
});

describe("attendancePercentage", () => {
  it("returns 100 when nothing is recorded", () => {
    expect(
      attendancePercentage({ present: 0, late: 0, absent: 0, excused: 0 }),
    ).toBe(100);
  });

  it("counts present and late as attended, excludes excused", () => {
    expect(
      attendancePercentage({ present: 7, late: 1, absent: 2, excused: 5 }),
    ).toBe(80);
  });
});

describe("isLowAttendance", () => {
  it("flags percentages below the threshold", () => {
    expect(isLowAttendance(74)).toBe(true);
    expect(isLowAttendance(75)).toBe(false);
    expect(isLowAttendance(60, 50)).toBe(false);
  });
});

describe("computeGpa", () => {
  it("returns 0 with no graded credits", () => {
    expect(computeGpa([])).toBe(0);
    expect(computeGpa([{ gradePoints: null, credits: 3 }])).toBe(0);
  });

  it("weights grade points by credits", () => {
    expect(
      computeGpa([
        { gradePoints: 4, credits: 3 },
        { gradePoints: 3, credits: 1 },
      ]),
    ).toBe(3.75);
  });
});
