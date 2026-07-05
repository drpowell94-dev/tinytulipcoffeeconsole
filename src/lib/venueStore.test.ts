import { describe, it, expect } from "vitest";

import {
  streetKey,
  parseAddress,
  resolveVenue,
  buildVenueFromAddress,
  type Venue,
} from "./venueStore";

function makeVenue(overrides: Partial<Venue> = {}): Venue {
  return {
    id: "savoy",
    name: "Savoy",
    streetNumber: "650",
    streetName: "East Brooklyn Village Avenue",
    apt: "",
    city: "Charlotte",
    state: "NC",
    zip: "28202",
    formattedAddress: "650 E Brooklyn Vlg Ave, Charlotte, NC 28202, USA",
    lat: 35.2181992,
    lng: -80.8431848,
    defaultStartTime: "09:00",
    defaultCategory: "Pop Up",
    logoMediaId: "",
    logoUrl: "",
    logoW: 1200,
    logoH: 630,
    ...overrides,
  };
}

describe("streetKey", () => {
  it("normalizes abbreviations so Wix's format matches a hand-typed one", () => {
    expect(streetKey("650 E Brooklyn Vlg Ave")).toBe(
      streetKey("650 East Brooklyn Village Avenue")
    );
  });

  it("ignores everything after the first comma (city/state/zip/country noise)", () => {
    expect(streetKey("327 W Tremont Ave, Charlotte, NC, 28203, US")).toBe(
      streetKey("327 W Tremont Ave, Charlotte, NC 28203, USA")
    );
  });

  it("produces different keys for different streets", () => {
    expect(streetKey("650 E Brooklyn Vlg Ave")).not.toBe(streetKey("327 W Tremont Ave"));
  });

  it("returns empty string for a bare venue name with no street number", () => {
    expect(streetKey("Savoy")).toBe("");
    expect(streetKey("Charlotte")).toBe("");
  });

  it("returns empty string for blank/undefined input", () => {
    expect(streetKey("")).toBe("");
    expect(streetKey(undefined)).toBe("");
  });
});

describe("parseAddress", () => {
  it("parses a standard formatted address", () => {
    expect(parseAddress("650 E Brooklyn Vlg Ave, Charlotte, NC 28202, USA")).toEqual({
      streetNumber: "650",
      streetName: "E Brooklyn Vlg Ave",
      apt: "",
      city: "Charlotte",
      state: "NC",
      zip: "28202",
    });
  });

  it("parses an address with state/zip split across separate segments", () => {
    const result = parseAddress("327 W Tremont Ave, Charlotte, NC, 28203, US");
    expect(result.streetNumber).toBe("327");
    expect(result.streetName).toBe("W Tremont Ave");
    expect(result.city).toBe("Charlotte");
    expect(result.state).toBe("NC");
    expect(result.zip).toBe("28203");
  });

  it("captures a leading apartment/building name as apt", () => {
    const result = parseAddress("The ellis apt, 512 N College St, Charlotte, NC 28202, USA");
    expect(result.apt).toBe("The ellis apt");
    expect(result.streetNumber).toBe("512");
    expect(result.streetName).toBe("N College St");
  });

  it("defaults city to Charlotte and state to NC when absent", () => {
    const result = parseAddress("123 Main St");
    expect(result.city).toBe("Charlotte");
    expect(result.state).toBe("NC");
  });
});

describe("resolveVenue", () => {
  const savoy = makeVenue();
  const penrose = makeVenue({
    id: "the-penrose-southend",
    name: "The Penrose SouthEnd",
    streetNumber: "327",
    streetName: "West Tremont Avenue",
    formattedAddress: "327 W Tremont Ave, Charlotte, NC, 28203, US",
  });
  const venues = [savoy, penrose];

  it("matches by venueId first, ignoring conflicting name/address", () => {
    const found = resolveVenue({ venueId: "savoy", location: "not savoy at all" }, venues);
    expect(found?.id).toBe("savoy");
  });

  it("falls through to name/address matching when venueId isn't found", () => {
    const found = resolveVenue({ venueId: "ghost-id", location: "Savoy" }, venues);
    expect(found?.id).toBe("savoy");
  });

  it("matches by exact venue name via event.location", () => {
    expect(resolveVenue({ location: "Savoy" }, venues)?.id).toBe("savoy");
  });

  it("matches by exact venue name via event.name when location differs", () => {
    const found = resolveVenue(
      { name: "Savoy", location: "650 E Brooklyn Vlg Ave" },
      venues
    );
    expect(found?.id).toBe("savoy");
  });

  it("matches a booking whose location is a street address, not the venue name", () => {
    // This is the real shape the Wix booking sync produces, and the bug the
    // resolver was built to fix: location holds the address, not "Savoy".
    const found = resolveVenue({ location: "650 E Brooklyn Vlg Ave" }, venues);
    expect(found?.id).toBe("savoy");
  });

  it("matches even when the address is formatted differently than the stored venue", () => {
    const found = resolveVenue(
      { address: "650 East Brooklyn Village Avenue, Charlotte, NC 28202, USA" },
      venues
    );
    expect(found?.id).toBe("savoy");
  });

  it("prefers address over an unrelated event.location when both are present", () => {
    const found = resolveVenue(
      { location: "Some Contact Name", address: "327 W Tremont Ave, Charlotte, NC, 28203, US" },
      venues
    );
    expect(found?.id).toBe("the-penrose-southend");
  });

  it("returns undefined when nothing matches", () => {
    const found = resolveVenue({ location: "9999 Nowhere Rd, Nowhere, NC 00000" }, venues);
    expect(found).toBeUndefined();
  });

  it("returns undefined for an empty event", () => {
    expect(resolveVenue({}, venues)).toBeUndefined();
  });
});

describe("buildVenueFromAddress", () => {
  // createVenueFromAddress/upsertVenue now write to Supabase's `coffee` schema
  // instead of localStorage, so the persistence round-trip this used to test
  // is no longer unit-testable without a live/mocked client. buildVenueFromAddress
  // is the pure piece of that flow (parsing + shaping the in-memory Venue) and
  // stays fully testable.
  it("builds a venue whose fields can be found by resolveVenue afterward", () => {
    const built = buildVenueFromAddress({
      name: "New Venue",
      formattedAddress: "100 Test St, Charlotte, NC 28204, USA",
      lat: 35.2,
      lng: -80.8,
    });
    expect(built.streetNumber).toBe("100");
    expect(built.lat).toBe(35.2);

    const found = resolveVenue({ location: "100 Test St, Charlotte, NC 28204, USA" }, [built]);
    expect(found?.id).toBe(built.id);
  });

  it("is idempotent: the same name always derives the same id", () => {
    const first = buildVenueFromAddress({
      name: "Repeat Venue",
      formattedAddress: "200 Test Ave, Charlotte, NC 28204, USA",
      lat: 35.3,
      lng: -80.9,
    });
    const second = buildVenueFromAddress({
      name: "Repeat Venue",
      formattedAddress: "200 Test Ave, Charlotte, NC 28204, USA",
      lat: 35.3,
      lng: -80.9,
    });
    expect(second.id).toBe(first.id);
  });
});
