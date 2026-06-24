import { describe, expect, it } from "vitest";
import {
  validateAllocationInput,
  validateAssetInput,
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
