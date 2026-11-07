import { describe, it, expect, vi } from "vitest";
import { createDemoClient, parseSelect, type DemoTables } from "./demoClient";
import { buildDemoTables } from "./demoData";

function client(tables: DemoTables = {}) {
  const persist = vi.fn();
  return { db: createDemoClient(tables, persist, () => {}), persist, tables };
}

describe("parseSelect", () => {
  it("parses columns and nested embeds", () => {
    expect(parseSelect("id, name, checklists(id, checklist_items(is_completed))")).toEqual([
      { name: "id" },
      { name: "name" },
      { name: "checklists", children: [{ name: "id" }, { name: "checklist_items", children: [{ name: "is_completed" }] }] },
    ]);
  });
});

describe("demo client", () => {
  it("selects with filters, ordering and projection", async () => {
    const { db } = client({ "coffee.inventory": [
      { id: "a", name: "Lids", quantity: 4 },
      { id: "b", name: "Beans", quantity: 1 },
      { id: "c", name: "Cups", quantity: 9 },
    ] });
    const { data } = await db.schema("coffee").from("inventory").select("id, name").lte("quantity", 4).order("name");
    expect(data).toEqual([{ id: "b", name: "Beans" }, { id: "a", name: "Lids" }]);
  });

  it("embeds child rows by foreign key", async () => {
    const { db } = client({
      "coffee.todo_lists": [{ id: "l1", name: "Prep" }],
      "coffee.todo_items": [
        { id: "i1", list_id: "l1", title: "Ice" },
        { id: "i2", list_id: "other", title: "Nope" },
      ],
    });
    const { data } = await db.schema("coffee").from("todo_lists").select("*, todo_items(*)");
    expect(data).toEqual([{ id: "l1", name: "Prep", todo_items: [{ id: "i1", list_id: "l1", title: "Ice" }] }]);
  });

  it("inserts with generated id/created_at and returns the row via select().single()", async () => {
    const { db, persist, tables } = client();
    const { data, error } = await db.schema("coffee").from("sessions").insert({ event_id: "e1", total_drinks: 3 }).select().single();
    expect(error).toBeNull();
    expect(data).toMatchObject({ event_id: "e1", total_drinks: 3 });
    expect(typeof (data as { id: string }).id).toBe("string");
    expect(tables["coffee.sessions"]).toHaveLength(1);
    expect(persist).toHaveBeenCalled();
  });

  it("upserts on the conflict column and matches numeric ids loosely", async () => {
    const { db, tables } = client({ "coffee.settings": [{ id: 1, hours: "old" }] });
    await db.schema("coffee").from("settings").upsert({ id: 1, hours: "new" }, { onConflict: "id" });
    expect(tables["coffee.settings"]).toHaveLength(1);
    const { data } = await db.schema("coffee").from("settings").select("*").eq("id", 1).maybeSingle();
    expect(data).toMatchObject({ id: 1, hours: "new" });
  });

  it("updates and deletes only matching rows", async () => {
    const { db, tables } = client({ "coffee.events": [{ id: "a", status: "inquiry" }, { id: "b", status: "inquiry" }] });
    await db.schema("coffee").from("events").update({ status: "confirmed" }).eq("id", "a");
    await db.schema("coffee").from("events").delete().eq("id", "b");
    expect(tables["coffee.events"]).toEqual([{ id: "a", status: "confirmed" }]);
  });

  it("returns empty results (not errors) for tables the demo doesn't seed", async () => {
    const { db } = client();
    const { data, error } = await db.from("email_campaigns").select("*").eq("user_id", "x");
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("errors on single() with no rows, like PostgREST", async () => {
    const { db } = client();
    const { data, error } = await db.from("events").select("*").eq("id", "missing").single();
    expect(data).toBeNull();
    expect(error?.code).toBe("PGRST116");
  });
});

describe("demo seed data", () => {
  it("has an event today and only references seeded venues", () => {
    const t = buildDemoTables();
    const venueIds = new Set(t["coffee.venues"].map(v => v.id));
    const today = new Date().toDateString();
    expect(t["coffee.events"].some(e => new Date(e.date_start as string).toDateString() === today)).toBe(true);
    for (const e of t["coffee.events"]) {
      if (e.venue_id) expect(venueIds.has(e.venue_id)).toBe(true);
    }
  });

  it("uses only fictional contact details", () => {
    const t = buildDemoTables();
    for (const row of [...t["coffee.venues"], ...t["coffee.events"]]) {
      if (row.contact_email) expect(String(row.contact_email)).toMatch(/@example\.com$/);
      if (row.contact_phone) expect(String(row.contact_phone)).toMatch(/-555-/);
    }
  });
});
