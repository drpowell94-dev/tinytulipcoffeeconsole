import { getCharlotteApartments, createProperty } from "./propertyStore";
import { loadEvents } from "./eventStore";

export function seedCharlotteProperties() {
  const existing = getCharlotteApartments();
  if (existing.length > 0) return; // Already seeded

  const properties = [
    {
      name: "704 At The Quarter",
      address: "704 W Tremont Ave, Charlotte 28203",
      zipCode: "28203",
      instagramHandle: "@704atthequarter",
      instagramFollowing: true,
    },
    {
      name: "Vera at Savona Mill",
      address: "725 Savona Mill Ln, Charlotte 28208",
      zipCode: "28208",
      instagramHandle: "@verasavonamill",
      instagramFollowing: true,
    },
    {
      name: "Broadstone Ayrsley",
      address: "2200 Silver Crescent Dr, Charlotte 28273",
      zipCode: "28273",
      instagramHandle: "@broadstoneayrsley",
      instagramFollowing: true,
    },
    {
      name: "The Rowe at Commonwealth",
      address: "1711 Commonwealth Ave, Charlotte 28205",
      zipCode: "28205",
      instagramHandle: "@roweatcommonwealth",
      instagramFollowing: true,
    },
    {
      name: "Bradham at New Bern",
      address: "145 New Bern St, Charlotte 28209",
      zipCode: "28209",
      instagramHandle: "@bradhamapts",
      instagramFollowing: true,
    },
    {
      name: "The Campbell",
      address: "2025 Cleveland Ave, Charlotte 28203",
      zipCode: "28203",
      instagramHandle: "@thecampbellclt",
      instagramFollowing: true,
    },
    {
      name: "Presley Uptown",
      address: "900 E Brooklyn Village Ave, Charlotte 28204",
      zipCode: "28204",
      instagramHandle: "@presleyuptown",
      instagramFollowing: true,
    },
    {
      name: "Yards at NoDa",
      address: "703 Rollerton Rd, Charlotte 28205",
      zipCode: "28205",
      instagramHandle: "",
      instagramFollowing: false,
    },
    {
      name: "The Prospect",
      address: "1115 S Mint St, Charlotte 28203",
      zipCode: "28203",
      instagramHandle: "@livetheprospect",
      instagramFollowing: true,
    },
    {
      name: "Hanover Dilworth",
      address: "711 E Morehead St, Charlotte 28202",
      zipCode: "28202",
      instagramHandle: "@hanoverdilworth",
      instagramFollowing: true,
    },
    {
      name: "The Penrose",
      address: "327 W Tremont Ave, Charlotte 28203",
      zipCode: "28203",
      instagramHandle: "@penrosecharlotte",
      instagramFollowing: true,
    },
    {
      name: "Ayrsley Lofts",
      address: "9336 Kings Parade Blvd, Charlotte 28273",
      zipCode: "28273",
      instagramHandle: "@ayrsleylofts",
      instagramFollowing: true,
    },
    {
      name: "Enclave at Radius Dilworth",
      address: "515 Royal Ct, Charlotte 28202",
      zipCode: "28202",
      instagramHandle: "@radiusdilworth",
      instagramFollowing: true,
    },
  ];

  properties.forEach(p => {
    createProperty(p.name, "charlotte_apartment", {
      address: p.address,
      zipCode: p.zipCode,
      instagramHandle: p.instagramHandle || undefined,
      instagramFollowing: p.instagramFollowing,
    });
  });
}

export function seedSampleEvents() {
  const events = loadEvents();
  // Only seed if there are very few completed events with proper venue data
  const completedWithVenue = events.filter(
    e => e.status === "completed" && e.location && e.location !== "TBD"
  );

  if (completedWithVenue.length >= 3) return; // Enough data exists

  // Data will be populated from Wix imports, so we just ensure we have some
  // The app uses actual event data for recommendations
}
