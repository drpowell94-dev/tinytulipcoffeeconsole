import type { DemoTables, Row } from "./demoClient";

// Fictional sample data for demo mode. Pop-ups use 30 pre-orders: that's the
// product (30 included coffees), and the drink counter only opens for it.
// Names, addresses and contacts are invented (example.com emails, 555 phone
// numbers). Dates are relative to "now" so the demo always has a today event,
// upcoming bookings and history.

function at(daysFromNow: number, hour = 9, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function dateOnly(daysFromNow: number): string {
  return at(daysFromNow).split("T")[0];
}

const VENUES: Row[] = [
  { id: "demo-willow-lofts", name: "The Willow Lofts", street_number: "120", street_name: "Maple Grove Ave", contact_name: "Dana Reyes", default_category: "Pop Up", default_start_time: "08:00", notes: "Lobby setup by the mail room. Residents love iced lattes." },
  { id: "demo-juniper-commons", name: "Juniper Commons", street_number: "455", street_name: "Cedar Park Blvd", contact_name: "Marcus Lee", default_category: "Pop Up", default_start_time: "09:00", notes: "Courtyard if the weather is nice, clubhouse otherwise." },
  { id: "demo-harbor-pine", name: "Harbor & Pine Apartments", street_number: "78", street_name: "Lakeside Dr", contact_name: "Priya Shah", default_category: "Pop Up", default_start_time: "07:30" },
  { id: "demo-sunbeam-market", name: "Sunbeam Farmers Market", street_number: "300", street_name: "Market St", contact_name: "Sam Ortiz", default_category: "Market", default_start_time: "08:00", notes: "Booth 14. Bring tent weights." },
  { id: "demo-brightside-medical", name: "Brightside Medical Plaza", street_number: "902", street_name: "Wellness Way", contact_name: "Jordan Kim", default_category: "Private Event", default_start_time: "07:00" },
  { id: "demo-foundry-coworking", name: "The Foundry Coworking", street_number: "61", street_name: "Ironworks Ln", contact_name: "Alex Morgan", default_category: "Grab & Go", default_start_time: "09:30" },
].map((v, i) => ({
  city: "Charlotte",
  state: "NC",
  zip: `282${String(i + 2).padStart(2, "0")}`,
  apt: "",
  lat: 35.22 + i * 0.01,
  lng: -80.84 - i * 0.01,
  logo_url: "",
  logo_media_id: "",
  logo_w: 1200,
  logo_h: 630,
  instagram_handle: null,
  instagram_following: false,
  contact_email: `${String(v.contact_name).split(" ")[0].toLowerCase()}@example.com`,
  contact_phone: `704-555-01${String(10 + i)}`,
  notes: null,
  created_at: at(-120),
  ...v,
}));

const venueById = new Map(VENUES.map(v => [v.id as string, v]));

function event(e: Row): Row {
  const venue = venueById.get(e.venue_id as string);
  return {
    event_type: "popup",
    date_end: null,
    contact_name: venue?.contact_name ?? null,
    contact_email: venue?.contact_email ?? null,
    contact_phone: venue?.contact_phone ?? null,
    deposit_status: "paid",
    wix_event_id: null,
    wix_published_event_id: null,
    address: venue ? `${venue.street_number} ${venue.street_name}, Charlotte, NC ${venue.zip}, USA` : null,
    location: venue?.name ?? "",
    guest_count: null,
    notes: null,
    property_id: null,
    follow_up_date: null,
    follow_up_note: null,
    day_of_parking: null,
    day_of_entry: null,
    day_of_setup_location: null,
    day_of_arrival_time: null,
    day_of_other_notes: null,
    created_at: at(-60),
    name: venue?.name ?? "Event",
    ...e,
  };
}

const EVENTS: Row[] = [
  // Today
  event({ id: "demo-evt-today", venue_id: "demo-willow-lofts", date_start: at(0, 8), status: "confirmed", pre_orders: 30, estimated_revenue: 300, day_of_arrival_time: "7:15am", day_of_setup_location: "Lobby", day_of_parking: "Visitor spots by the gate", day_of_entry: "Front desk buzzes you in" }),
  // Upcoming
  event({ id: "demo-evt-juniper", venue_id: "demo-juniper-commons", date_start: at(3, 9), status: "confirmed", pre_orders: 30, estimated_revenue: 300, wix_published_event_id: "demo-published" }),
  event({ id: "demo-evt-market", venue_id: "demo-sunbeam-market", event_type: "farmers_market", date_start: at(5, 8), status: "confirmed", pre_orders: 0, estimated_revenue: 450, notes: "Expect a big crowd for the fall festival." }),
  event({ id: "demo-evt-brightside", venue_id: "demo-brightside-medical", event_type: "catering", date_start: at(9, 7), status: "confirmed", pre_orders: 60, estimated_revenue: 720, deposit_status: "pending", guest_count: 60 }),
  event({ id: "demo-evt-harbor", venue_id: "demo-harbor-pine", date_start: at(14, 7, 30), status: "confirmed", pre_orders: 30, estimated_revenue: 300 }),
  // Leads
  event({ id: "demo-lead-foundry", venue_id: "demo-foundry-coworking", event_type: "other", name: "The Foundry Coworking", date_start: at(21, 9, 30), status: "inquiry", pre_orders: 0, estimated_revenue: 300, deposit_status: "pending", follow_up_date: dateOnly(0), follow_up_note: "Send the monthly grab-and-go pricing sheet." }),
  event({ id: "demo-lead-gallery", venue_id: null, name: "Northside Art Walk", location: "Northside Art District", address: null, contact_name: "Riley Chen", contact_email: "riley@example.com", contact_phone: "704-555-0199", event_type: "popup", date_start: at(30, 17), status: "inquiry", pre_orders: 0, estimated_revenue: 400, deposit_status: "pending", follow_up_date: dateOnly(2), follow_up_note: "Confirm power access for the espresso machine." }),
  // Past
  event({ id: "demo-evt-past-1", venue_id: "demo-willow-lofts", date_start: at(-7, 8), status: "completed", pre_orders: 30, estimated_revenue: 340 }),
  event({ id: "demo-evt-past-2", venue_id: "demo-juniper-commons", date_start: at(-12, 9), status: "completed", pre_orders: 30, estimated_revenue: 320 }),
  event({ id: "demo-evt-past-3", venue_id: "demo-sunbeam-market", event_type: "farmers_market", date_start: at(-19, 8), status: "completed", pre_orders: 0, estimated_revenue: 510 }),
  event({ id: "demo-evt-past-4", venue_id: "demo-harbor-pine", date_start: at(-26, 7, 30), status: "completed", pre_orders: 30, estimated_revenue: 300 }),
  event({ id: "demo-evt-past-5", venue_id: "demo-brightside-medical", event_type: "catering", date_start: at(-33, 7), status: "completed", pre_orders: 45, estimated_revenue: 540 }),
  event({ id: "demo-evt-past-6", venue_id: "demo-willow-lofts", date_start: at(-40, 8), status: "completed", pre_orders: 30, estimated_revenue: 300 }),
  event({ id: "demo-evt-cancelled", venue_id: "demo-foundry-coworking", event_type: "other", date_start: at(-15, 9, 30), status: "cancelled", pre_orders: 0, estimated_revenue: 0 }),
];

function session(id: string, eventId: string, daysAgo: number, counts: Record<string, number>, preOrders: number): { session: Row; counts: Row[] } {
  const prices: Record<string, number> = { "hot-coffee": 5, "iced-coffee": 7, "cold-brew-can": 7, lemonade: 5, "chocolate-milk": 5 };
  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  const revenue = Object.entries(counts).reduce((s, [p, n]) => s + (prices[p] ?? 0) * n, 0);
  const ev = EVENTS.find(e => e.id === eventId);
  return {
    session: {
      id,
      event_id: eventId,
      event_name: ev?.name ?? "Event",
      total_drinks: total,
      total_revenue: revenue,
      pre_orders: preOrders,
      extra_sales: Math.max(0, total - preOrders) * 6,
      created_at: at(-daysAgo, 11),
    },
    counts: Object.entries(counts).map(([product, quantity], i) => ({
      id: `${id}-pc-${i}`,
      session_id: id,
      product,
      quantity,
      created_at: at(-daysAgo, 11),
    })),
  };
}

const SESSIONS = [
  session("demo-sess-1", "demo-evt-past-1", 7, { "hot-coffee": 12, "iced-coffee": 18, lemonade: 4, "chocolate-milk": 3 }, 30),
  session("demo-sess-2", "demo-evt-past-2", 12, { "hot-coffee": 9, "iced-coffee": 14, "cold-brew-can": 7 }, 30),
  session("demo-sess-3", "demo-evt-past-3", 19, { "hot-coffee": 22, "iced-coffee": 31, "cold-brew-can": 12, lemonade: 9, "chocolate-milk": 6 }, 0),
];

const INVENTORY: Row[] = [
  { id: "demo-inv-beans", name: "Coffee Beans", unit: "bags", quantity: 9, reorder_level: 4, supplier: "Example Roasters" },
  { id: "demo-inv-oat", name: "Oat Milk", unit: "cartons", quantity: 5, reorder_level: 6, supplier: "Example Dairy Co." },
  { id: "demo-inv-whole", name: "Whole Milk", unit: "gallons", quantity: 6, reorder_level: 3, supplier: "Example Dairy Co." },
  { id: "demo-inv-cups", name: "12oz Cups", unit: "boxes", quantity: 2, reorder_level: 2, supplier: "Example Packaging" },
  { id: "demo-inv-lids", name: "Lids", unit: "boxes", quantity: 4, reorder_level: 2, supplier: "Example Packaging" },
  { id: "demo-inv-lemonade", name: "Lemonade Concentrate", unit: "jugs", quantity: 3, reorder_level: 1 },
  { id: "demo-inv-napkins", name: "Napkins", unit: "packs", quantity: 10, reorder_level: 3 },
].map(i => ({ supplier: null, last_restocked: at(-10), created_at: at(-90), ...i }));

const BLOG_POSTS: Row[] = [
  {
    id: "demo-post-1",
    title: "Fall at the Farmers Market",
    template: "seasonal-launch",
    tone: "friendly",
    keywords: "fall, farmers market, maple cold brew",
    status: "draft",
    body: "## Introducing: Maple Cold Brew\n\nOur new seasonal drink is here! Smooth cold brew with a touch of real maple.\n\nFind us at the Sunbeam Farmers Market this weekend! 🌷",
    created_at: at(-3),
    updated_at: at(-1),
  },
];

const SETTINGS: Row[] = [
  {
    id: 1,
    hours: "Mon–Fri: 7am–2pm\nSat: 8am–12pm (farmers market)\nSun: Closed",
    seasonal_menu: "Maple Cold Brew\nLavender Latte\nSpiced Chai",
    alert_banner: "",
    alert_active: false,
    updated_at: at(-5),
  },
];

const TODO_LISTS: Row[] = [{ id: "demo-todo-weekly", name: "Weekly Prep", created_at: at(-14) }];

const TODO_ITEMS: Row[] = [
  { id: "demo-todo-1", title: "Order oat milk before Friday", priority: "high", completed: false },
  { id: "demo-todo-2", title: "Print new menu boards", priority: "medium", completed: false },
  { id: "demo-todo-3", title: "Deep clean the espresso machine", priority: "medium", completed: true, completed_at: at(-1) },
  { id: "demo-todo-4", title: "Email Juniper Commons about parking", priority: "low", completed: false },
].map(i => ({ list_id: "demo-todo-weekly", completed_at: null, created_at: at(-7), ...i }));

const CHECKLISTS: Row[] = [
  { id: "demo-checklist-juniper", event_id: "demo-evt-juniper", event_name: "Juniper Commons", event_type: "popup", created_at: at(-2) },
];

const CHECKLIST_ITEMS: Row[] = [
  { name: "Portable espresso machine", category: "Equipment", checked: true },
  { name: "Manual grinder", category: "Equipment", checked: true },
  { name: "Hot water thermos", category: "Equipment", checked: false },
  { name: "Pre-brewed coffee", category: "Supplies", checked: false },
  { name: "Cups, lids, napkins", category: "Supplies", checked: true },
  { name: "Square reader", category: "Tech", checked: false },
  { name: "Venue permission / permit", category: "Documents", checked: true },
].map((item, i) => ({
  id: `demo-ci-${i}`,
  checklist_id: "demo-checklist-juniper",
  checked_at: item.checked ? at(-1) : null,
  checked_by: item.checked ? "Staff" : null,
  created_at: at(-2),
  ...item,
}));

const DAILY_ITEMS: Row[] = [
  { id: "demo-daily-1", task: "Restock cups and lids in the van", completed: true, completed_at: at(0, 7) },
  { id: "demo-daily-2", task: "Charge the Square reader", completed: false, completed_at: null },
  { id: "demo-daily-3", task: "Pick up ice", completed: false, completed_at: null },
].map(i => ({ date: new Date().toISOString().split("T")[0], created_at: at(0, 6), ...i }));

export function buildDemoTables(): DemoTables {
  // Deep copy so in-session edits never mutate the seed constants.
  return JSON.parse(
    JSON.stringify({
      "coffee.venues": VENUES,
      "coffee.events": EVENTS,
      "coffee.sessions": SESSIONS.map(s => s.session),
      "coffee.product_counts": SESSIONS.flatMap(s => s.counts),
      "coffee.inventory": INVENTORY,
      "coffee.blog_posts": BLOG_POSTS,
      "coffee.settings": SETTINGS,
      "coffee.todo_lists": TODO_LISTS,
      "coffee.todo_items": TODO_ITEMS,
      "coffee.checklists": CHECKLISTS,
      "coffee.checklist_items": CHECKLIST_ITEMS,
      "coffee.daily_checklist_items": DAILY_ITEMS,
    })
  );
}
