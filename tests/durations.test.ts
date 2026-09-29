import { describe, it, expect } from "vitest";
import { parseDuration, formatDurationLabel } from "../src/discord/durations";

describe("parseDuration", () => {
  it("parses hours", () => {
    const result = parseDuration("24h");
    expect(result?.permanent).toBe(false);
    expect(result?.ms).toBe(24 * 60 * 60 * 1000);
  });

  it("parses days", () => {
    const result = parseDuration("7d");
    expect(result?.ms).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it("parses minutes", () => {
    const result = parseDuration("30m");
    expect(result?.ms).toBe(30 * 60 * 1000);
  });

  it("parses weeks", () => {
    const result = parseDuration("2w");
    expect(result?.ms).toBe(2 * 7 * 24 * 60 * 60 * 1000);
  });

  it("treats 'perm' and 'permanent' as permanent", () => {
    expect(parseDuration("perm")?.permanent).toBe(true);
    expect(parseDuration("permanent")?.permanent).toBe(true);
    expect(parseDuration("perm")?.ms).toBeNull();
  });

  it("rejects garbage input", () => {
    expect(parseDuration("banana")).toBeNull();
    expect(parseDuration("")).toBeNull();
    expect(parseDuration("0h")).toBeNull();
    expect(parseDuration("-5d")).toBeNull();
  });

  it("is case-insensitive", () => {
    expect(parseDuration("24H")?.ms).toBe(24 * 60 * 60 * 1000);
    expect(parseDuration("PERM")?.permanent).toBe(true);
  });
});

describe("formatDurationLabel", () => {
  it("formats sub-hour durations as minutes", () => {
    expect(formatDurationLabel(30 * 60 * 1000)).toBe("30m");
  });
  it("formats sub-day durations as hours", () => {
    expect(formatDurationLabel(5 * 60 * 60 * 1000)).toBe("5h");
  });
  it("formats sub-week durations as days", () => {
    expect(formatDurationLabel(3 * 24 * 60 * 60 * 1000)).toBe("3d");
  });
  it("formats longer durations as weeks", () => {
    expect(formatDurationLabel(14 * 24 * 60 * 60 * 1000)).toBe("2w");
  });
});
