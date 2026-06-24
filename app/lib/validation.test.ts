import { describe, expect, it } from "vitest";
import {
  isEligible,
  validateEventFeedbackInput,
  validateEventInput,
} from "@/app/lib/validation";

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
