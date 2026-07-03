import { describe, it, expect, vi } from "vitest";

vi.mock("@/services/cloudSync", () => ({ pushState: vi.fn() }));

import { findBundledLiveDuplicates, type TulipEvent } from "./eventStore";

function makeEvent(overrides: Partial<TulipEvent> = {}): TulipEvent {
  return {
    id: overrides.id ?? "id-1",
    name: "Some Event",
    eventType: "popup",
    dateStart: "2026-06-10T13:00:00Z",
    location: "145 New Bern St",
    preOrders: 30,
    status: "completed",
    depositStatus: "pending",
    createdAt: "2026-07-03T00:00:00Z",
    venueId: "bradham-at-new-bern",
    ...overrides,
  };
}

describe("findBundledLiveDuplicates", () => {
  it("pairs a bundled (bare-UUID) record with a live (wix-booking:) record at the same venue/day", () => {
    const bundled = makeEvent({
      id: "bundled-1",
      name: "Bradham at New Bern",
      wixEventId: "6816bee6-83ee-4777-9ce4-0dd217ae6ec8",
    });
    const live = makeEvent({
      id: "live-1",
      name: "Christopher Johnson",
      wixEventId: "wix-booking:ed3af3dc-abcd-1234",
    });
    const pairs = findBundledLiveDuplicates([bundled, live]);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].remove.id).toBe("bundled-1");
    expect(pairs[0].keep.id).toBe("live-1");
  });

  it("does not pair two live records or two bundled records with each other", () => {
    const live1 = makeEvent({ id: "live-1", wixEventId: "wix-booking:aaa" });
    const live2 = makeEvent({ id: "live-2", wixEventId: "wix-booking:bbb" });
    expect(findBundledLiveDuplicates([live1, live2])).toHaveLength(0);

    const bundled1 = makeEvent({ id: "b-1", wixEventId: "aaaaaaaa-1111-1111-1111-111111111111" });
    const bundled2 = makeEvent({ id: "b-2", wixEventId: "bbbbbbbb-2222-2222-2222-222222222222" });
    expect(findBundledLiveDuplicates([bundled1, bundled2])).toHaveLength(0);
  });

  it("does not pair records on different days or at different venues", () => {
    const bundled = makeEvent({ id: "b-1", wixEventId: "aaaaaaaa-1111-1111-1111-111111111111" });
    const liveOtherDay = makeEvent({
      id: "l-1",
      wixEventId: "wix-booking:xyz",
      dateStart: "2026-06-11T13:00:00Z",
    });
    expect(findBundledLiveDuplicates([bundled, liveOtherDay])).toHaveLength(0);

    const liveOtherVenue = makeEvent({
      id: "l-2",
      wixEventId: "wix-booking:xyz",
      venueId: "savoy",
    });
    expect(findBundledLiveDuplicates([bundled, liveOtherVenue])).toHaveLength(0);
  });

  it("ignores cancelled and unlinked (no venueId) events", () => {
    const bundled = makeEvent({ id: "b-1", wixEventId: "aaaaaaaa-1111-1111-1111-111111111111", status: "cancelled" });
    const live = makeEvent({ id: "l-1", wixEventId: "wix-booking:xyz" });
    expect(findBundledLiveDuplicates([bundled, live])).toHaveLength(0);

    const bundledNoVenue = makeEvent({ id: "b-2", wixEventId: "aaaaaaaa-1111-1111-1111-111111111111", venueId: undefined });
    const live2 = makeEvent({ id: "l-2", wixEventId: "wix-booking:xyz", venueId: undefined });
    expect(findBundledLiveDuplicates([bundledNoVenue, live2])).toHaveLength(0);
  });
});
