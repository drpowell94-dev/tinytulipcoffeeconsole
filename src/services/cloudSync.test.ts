import { describe, it, expect } from "vitest";
import { isNewerThanLastWrite } from "./cloudSync";

describe("isNewerThanLastWrite", () => {
  it("applies an update when there's no prior local write", () => {
    expect(isNewerThanLastWrite(undefined, "2026-07-03T10:00:00.000Z")).toBe(true);
  });

  it("rejects an echo of the exact write that was just made", () => {
    const t = "2026-07-03T10:00:00.000Z";
    expect(isNewerThanLastWrite(t, t)).toBe(false);
  });

  it("rejects a delayed echo of an earlier save arriving after a newer edit", () => {
    // Reproduces the bug: save A at t1, then save B at t2 (t2 > t1) before
    // A's echo comes back. The stale echo (updated_at = t1) must not
    // overwrite the newer local state (last write = t2).
    const t1 = "2026-07-03T10:00:00.000Z";
    const t2 = "2026-07-03T10:00:05.000Z";
    expect(isNewerThanLastWrite(t2, t1)).toBe(false);
  });

  it("applies a genuinely newer change from another device", () => {
    const myLastWrite = "2026-07-03T10:00:00.000Z";
    const otherDeviceWrite = "2026-07-03T10:05:00.000Z";
    expect(isNewerThanLastWrite(myLastWrite, otherDeviceWrite)).toBe(true);
  });

  it("applies when the incoming update lacks a timestamp (fail open, don't get stuck)", () => {
    expect(isNewerThanLastWrite("2026-07-03T10:00:00.000Z", undefined)).toBe(true);
  });
});
