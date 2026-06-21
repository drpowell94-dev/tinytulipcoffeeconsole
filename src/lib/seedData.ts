import { getCharlotteApartments, createProperty } from "./propertyStore";
import { loadEvents } from "./eventStore";

export function seedCharlotteProperties() {
  const existing = getCharlotteApartments();
  if (existing.length > 0) return; // Already seeded

  const properties = [
    {
      name: "The Retreat at Southend",
      address: "1234 East Blvd, Charlotte, NC",
      zipCode: "28202",
      instagramHandle: "@theretreatatsouthend",
      instagramFollowing: true,
    },
    {
      name: "Dilworth Lofts",
      address: "456 East Ave, Charlotte, NC",
      zipCode: "28203",
      instagramHandle: "@dilworthlofts",
      instagramFollowing: true,
    },
    {
      name: "South End Apartments",
      address: "789 Main St, Charlotte, NC",
      zipCode: "28202",
      instagramHandle: "@southendapts",
      instagramFollowing: false,
    },
    {
      name: "Uptown Place",
      address: "321 Tryon St, Charlotte, NC",
      zipCode: "28202",
      instagramHandle: "@uptownplace",
      instagramFollowing: false,
    },
    {
      name: "NoDa Lofts",
      address: "654 North Davidson, Charlotte, NC",
      zipCode: "28202",
      instagramHandle: "@nodalofts",
      instagramFollowing: true,
    },
  ];

  properties.forEach(p => {
    createProperty(p.name, "charlotte_apartment", {
      address: p.address,
      zipCode: p.zipCode,
      instagramHandle: p.instagramHandle,
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
