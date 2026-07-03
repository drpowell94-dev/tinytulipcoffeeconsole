import { describe, it, expect } from "vitest";
import { nyWallClockToUtc, resolveStartDate } from "./wix-convert";

describe("nyWallClockToUtc", () => {
  it("converts an EST (winter) wall-clock time correctly", () => {
    // Jan 15 2027, 9:00am ET is UTC-5 in winter.
    const utc = nyWallClockToUtc(2027, 1, 15, 9, 0);
    expect(utc.toISOString()).toBe("2027-01-15T14:00:00.000Z");
  });

  it("converts an EDT (summer) wall-clock time correctly", () => {
    // Jul 10 2026, 10:30am ET is UTC-4 in summer (DST).
    const utc = nyWallClockToUtc(2026, 7, 10, 10, 30);
    expect(utc.toISOString()).toBe("2026-07-10T14:30:00.000Z");
  });

  it("handles the spring-forward DST boundary correctly", () => {
    // DST starts Mar 8 2026 at 2am ET -> 3am. 9am that day is already EDT (UTC-4).
    const utc = nyWallClockToUtc(2026, 3, 8, 9, 0);
    expect(utc.toISOString()).toBe("2026-03-08T13:00:00.000Z");
  });

  it("handles the fall-back DST boundary correctly", () => {
    // DST ends Nov 1 2026. 9am that day is already back to EST (UTC-5).
    const utc = nyWallClockToUtc(2026, 11, 1, 9, 0);
    expect(utc.toISOString()).toBe("2026-11-01T14:00:00.000Z");
  });
});

describe("resolveStartDate", () => {
  it("preserves an explicit time already on dateStart", () => {
    const result = resolveStartDate("2026-07-10T14:30:00.000Z", "09:00");
    expect(result?.toISOString()).toBe("2026-07-10T14:30:00.000Z");
  });

  it("falls back to the venue default start time when dateStart is timeless (UTC midnight)", () => {
    // Penrose: no explicit time, venue default is 10:30am ET.
    const result = resolveStartDate("2026-07-10T00:00:00.000Z", "10:30");
    expect(result?.toISOString()).toBe("2026-07-10T14:30:00.000Z");
  });

  it("falls back to 9am ET when there is no venue default either", () => {
    const result = resolveStartDate("2026-07-10T00:00:00.000Z", undefined);
    expect(result?.toISOString()).toBe("2026-07-10T13:00:00.000Z");
  });

  it("returns null for an unparseable date, so the caller can block publishing", () => {
    expect(resolveStartDate("not-a-date", "09:00")).toBeNull();
  });
});
