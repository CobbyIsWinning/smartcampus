import { describe, expect, it } from "vitest";
import {
  averageDurationMs,
  barScale,
  csvField,
  dateRangeFilter,
  formatDuration,
  groupByCount,
  parseDateFilter,
  percentage,
  profileCompletion,
  toCsv,
} from "@/app/lib/analytics";

describe("csvField", () => {
  it("passes through plain values", () => {
    expect(csvField("hello")).toBe("hello");
    expect(csvField(42)).toBe("42");
  });

  it("renders null/undefined as empty", () => {
    expect(csvField(null)).toBe("");
    expect(csvField(undefined)).toBe("");
  });

  it("quotes and escapes fields with commas, quotes, or newlines", () => {
    expect(csvField("a,b")).toBe('"a,b"');
    expect(csvField('say "hi"')).toBe('"say ""hi"""');
    expect(csvField("line1\nline2")).toBe('"line1\nline2"');
  });
});

describe("toCsv", () => {
  it("builds a header + rows document ending in a newline", () => {
    const csv = toCsv(
      ["name", "count"],
      [
        ["Lab A", 3],
        ["Hall, Main", 5],
      ],
    );

    expect(csv).toBe('name,count\nLab A,3\n"Hall, Main",5\n');
  });
});

describe("percentage", () => {
  it("rounds to whole numbers", () => {
    expect(percentage(1, 3)).toBe(33);
    expect(percentage(2, 3)).toBe(67);
  });

  it("returns 0 when total is 0", () => {
    expect(percentage(5, 0)).toBe(0);
  });
});

describe("barScale", () => {
  it("scales relative to the max", () => {
    expect(barScale(5, 10)).toBe(50);
    expect(barScale(10, 10)).toBe(100);
  });

  it("returns 0 when max is 0", () => {
    expect(barScale(0, 0)).toBe(0);
  });
});

describe("groupByCount", () => {
  it("counts items by derived key", () => {
    const result = groupByCount(
      [{ s: "OPEN" }, { s: "OPEN" }, { s: "CLOSED" }],
      (item) => item.s,
    );

    expect(result).toEqual({ OPEN: 2, CLOSED: 1 });
  });
});

describe("averageDurationMs", () => {
  it("averages valid start/end pairs", () => {
    const base = new Date("2026-06-01T00:00:00Z");
    const result = averageDurationMs([
      { start: base, end: new Date(base.getTime() + 1000) },
      { start: base, end: new Date(base.getTime() + 3000) },
    ]);

    expect(result).toBe(2000);
  });

  it("ignores missing ends and negative durations", () => {
    const base = new Date("2026-06-01T00:00:00Z");
    const result = averageDurationMs([
      { start: base, end: null },
      { start: base, end: new Date(base.getTime() - 1000) },
      { start: base, end: new Date(base.getTime() + 4000) },
    ]);

    expect(result).toBe(4000);
  });

  it("returns null with no valid pairs", () => {
    expect(averageDurationMs([{ start: new Date(), end: null }])).toBeNull();
  });
});

describe("formatDuration", () => {
  it("formats null as n/a", () => {
    expect(formatDuration(null)).toBe("n/a");
  });

  it("formats sub-minute durations", () => {
    expect(formatDuration(30 * 1000)).toBe("<1m");
  });

  it("formats minutes, hours, and days", () => {
    expect(formatDuration(8 * 60 * 1000)).toBe("8m");
    expect(formatDuration((5 * 60 + 12) * 60 * 1000)).toBe("5h 12m");
    expect(formatDuration((2 * 24 * 60 + 3 * 60) * 60 * 1000)).toBe("2d 3h");
  });
});

describe("profileCompletion", () => {
  it("returns 100 when all fields filled", () => {
    expect(
      profileCompletion({ studentId: "S1", department: "CS", phone: "123" }),
    ).toBe(100);
  });

  it("treats blank strings as missing", () => {
    expect(
      profileCompletion({ studentId: "S1", department: "  ", phone: null }),
    ).toBe(33);
  });
});

describe("parseDateFilter", () => {
  it("parses a valid yyyy-mm-dd string", () => {
    expect(parseDateFilter("2026-06-24")?.toISOString()).toBe(
      "2026-06-24T00:00:00.000Z",
    );
  });

  it("rejects invalid or empty input", () => {
    expect(parseDateFilter("")).toBeNull();
    expect(parseDateFilter("06/24/2026")).toBeNull();
    expect(parseDateFilter(undefined)).toBeNull();
  });
});

describe("dateRangeFilter", () => {
  it("returns undefined with no bounds", () => {
    expect(dateRangeFilter(null, null)).toBeUndefined();
  });

  it("makes the to-bound inclusive of the whole day", () => {
    const from = new Date("2026-06-01T00:00:00.000Z");
    const to = new Date("2026-06-30T00:00:00.000Z");
    const range = dateRangeFilter(from, to);

    expect(range?.gte).toEqual(from);
    expect(range?.lte?.toISOString()).toBe("2026-06-30T23:59:59.999Z");
  });
});
