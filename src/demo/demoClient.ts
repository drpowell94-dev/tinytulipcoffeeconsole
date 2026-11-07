import { DEMO_BLOCKED_MESSAGE } from "./demoMode";

// A small in-memory stand-in for the Supabase client, implementing only the
// query-builder surface this app actually uses. Swapped in for the real client
// in demo mode, so every store and page works unchanged on sample data.

export type Row = Record<string, unknown>;
/** Tables keyed by "schema.table". */
export type DemoTables = Record<string, Row[]>;

interface Result {
  data: unknown;
  error: { message: string; code?: string } | null;
  count: number | null;
  status: number;
}

/** Child table -> foreign key pointing at the parent's `id`, for embedded selects. */
const EMBED_FK: Record<string, string> = {
  product_counts: "session_id",
  todo_items: "list_id",
  checklist_items: "checklist_id",
  checklists: "event_id",
};

const TABLES_WITH_UPDATED_AT = new Set(["blog_posts", "settings"]);

interface SelectNode {
  name: string;
  children?: SelectNode[];
}

function splitTopLevel(s: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts.map(p => p.trim()).filter(Boolean);
}

export function parseSelect(s: string): SelectNode[] {
  return splitTopLevel(s).map(part => {
    const m = part.match(/^(\w+)\s*\(([\s\S]*)\)$/);
    return m ? { name: m[1], children: parseSelect(m[2]) } : { name: part };
  });
}

function compare(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

function looseEq(a: unknown, b: unknown): boolean {
  if (a == null || b == null) return a == null && b == null;
  return String(a) === String(b);
}

class DemoQuery implements PromiseLike<Result> {
  private op: "select" | "insert" | "update" | "upsert" | "delete" = "select";
  private selectNodes: SelectNode[] = [{ name: "*" }];
  private returning = false;
  private payload: Row[] = [];
  private patch: Row = {};
  private conflictCols = ["id"];
  private filters: Array<(r: Row) => boolean> = [];
  private orders: Array<{ col: string; asc: boolean }> = [];
  private limitN: number | null = null;
  private singleMode: "single" | "maybe" | null = null;
  private wantCount = false;

  constructor(
    private db: DemoTables,
    private schema: string,
    private table: string,
    private persist: () => void
  ) {}

  private get key() {
    return `${this.schema}.${this.table}`;
  }

  private rows(): Row[] {
    return (this.db[this.key] ??= []);
  }

  select(cols = "*", opts?: { count?: string }) {
    this.selectNodes = parseSelect(cols || "*");
    if (opts?.count) this.wantCount = true;
    if (this.op !== "select") this.returning = true;
    return this;
  }
  insert(v: Row | Row[]) {
    this.op = "insert";
    this.payload = Array.isArray(v) ? v : [v];
    return this;
  }
  upsert(v: Row | Row[], opts?: { onConflict?: string }) {
    this.op = "upsert";
    this.payload = Array.isArray(v) ? v : [v];
    if (opts?.onConflict) this.conflictCols = opts.onConflict.split(",").map(c => c.trim());
    return this;
  }
  update(v: Row) {
    this.op = "update";
    this.patch = v;
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }

  eq(col: string, v: unknown) {
    this.filters.push(r => looseEq(r[col], v));
    return this;
  }
  neq(col: string, v: unknown) {
    this.filters.push(r => !looseEq(r[col], v));
    return this;
  }
  gt(col: string, v: unknown) {
    this.filters.push(r => r[col] != null && compare(r[col], v) > 0);
    return this;
  }
  gte(col: string, v: unknown) {
    this.filters.push(r => r[col] != null && compare(r[col], v) >= 0);
    return this;
  }
  lt(col: string, v: unknown) {
    this.filters.push(r => r[col] != null && compare(r[col], v) < 0);
    return this;
  }
  lte(col: string, v: unknown) {
    this.filters.push(r => r[col] != null && compare(r[col], v) <= 0);
    return this;
  }
  in(col: string, vs: unknown[]) {
    this.filters.push(r => vs.some(v => looseEq(r[col], v)));
    return this;
  }
  is(col: string, v: unknown) {
    this.filters.push(r => (v === null ? r[col] == null : r[col] === v));
    return this;
  }
  not(col: string, op: string, v: unknown) {
    const test = op === "is" ? (r: Row) => (v === null ? r[col] == null : r[col] === v) : (r: Row) => looseEq(r[col], v);
    this.filters.push(r => !test(r));
    return this;
  }
  match(obj: Row) {
    for (const [col, v] of Object.entries(obj)) this.eq(col, v);
    return this;
  }
  order(col: string, opts?: { ascending?: boolean }) {
    this.orders.push({ col, asc: opts?.ascending ?? true });
    return this;
  }
  limit(n: number) {
    this.limitN = n;
    return this;
  }
  single() {
    this.singleMode = "single";
    return this;
  }
  maybeSingle() {
    this.singleMode = "maybe";
    return this;
  }

  then<T1 = Result, T2 = never>(
    onFulfilled?: ((value: Result) => T1 | PromiseLike<T1>) | null,
    onRejected?: ((reason: unknown) => T2 | PromiseLike<T2>) | null
  ): Promise<T1 | T2> {
    return Promise.resolve()
      .then(() => this.execute())
      .then(onFulfilled, onRejected);
  }

  private withDefaults(row: Row): Row {
    const now = new Date().toISOString();
    return {
      ...row,
      id: row.id ?? crypto.randomUUID(),
      created_at: row.created_at ?? now,
      ...(TABLES_WITH_UPDATED_AT.has(this.table) && row.updated_at == null ? { updated_at: now } : {}),
    };
  }

  private project(row: Row, nodes: SelectNode[]): Row {
    const out: Row = {};
    for (const node of nodes) {
      if (node.children) {
        const fk = EMBED_FK[node.name];
        const children = (this.db[`${this.schema}.${node.name}`] ?? []).filter(c => fk && looseEq(c[fk], row.id));
        out[node.name] = children.map(c => this.project(c, node.children!));
      } else if (node.name === "*") {
        Object.assign(out, row);
      } else {
        out[node.name] = row[node.name] ?? null;
      }
    }
    return out;
  }

  private matched(): Row[] {
    return this.rows().filter(r => this.filters.every(f => f(r)));
  }

  private execute(): Result {
    let affected: Row[] = [];
    const table = this.rows();

    if (this.op === "select") {
      affected = this.matched();
    } else if (this.op === "insert") {
      affected = this.payload.map(r => this.withDefaults(r));
      table.push(...affected);
    } else if (this.op === "upsert") {
      for (const incoming of this.payload) {
        const existing = table.find(r => this.conflictCols.every(c => looseEq(r[c], incoming[c])));
        if (existing) {
          Object.assign(existing, incoming);
          affected.push(existing);
        } else {
          const row = this.withDefaults(incoming);
          table.push(row);
          affected.push(row);
        }
      }
    } else if (this.op === "update") {
      affected = this.matched();
      for (const r of affected) Object.assign(r, this.patch);
    } else if (this.op === "delete") {
      affected = this.matched();
      this.db[this.key] = table.filter(r => !affected.includes(r));
    }

    if (this.op !== "select") this.persist();

    for (const { col, asc } of [...this.orders].reverse()) {
      affected = [...affected].sort((a, b) => (asc ? 1 : -1) * compare(a[col], b[col]));
    }
    const count = affected.length;
    if (this.limitN != null) affected = affected.slice(0, this.limitN);

    const returnsRows = this.op === "select" || this.returning;
    const data = returnsRows ? affected.map(r => this.project(r, this.selectNodes)) : null;

    if (this.singleMode && returnsRows) {
      const list = data as Row[];
      if (list.length > 1 || (list.length === 0 && this.singleMode === "single")) {
        return {
          data: null,
          error: { code: "PGRST116", message: `Expected one row, got ${list.length}` },
          count: null,
          status: 406,
        };
      }
      return { data: list[0] ?? null, error: null, count: this.wantCount ? count : null, status: 200 };
    }
    return { data, error: null, count: this.wantCount ? count : null, status: 200 };
  }
}

const noopChannel = {
  on() {
    return noopChannel;
  },
  subscribe() {
    return noopChannel;
  },
  unsubscribe() {
    return Promise.resolve("ok");
  },
};

export function createDemoClient(db: DemoTables, persist: () => void, onSignOut: () => void) {
  const from = (schema: string) => (table: string) => new DemoQuery(db, schema, table, persist);
  return {
    schema: (name: string) => ({ from: from(name) }),
    from: from("public"),
    channel: () => noopChannel,
    removeChannel: () => Promise.resolve("ok"),
    functions: {
      invoke: () => Promise.resolve({ data: null, error: { message: DEMO_BLOCKED_MESSAGE } }),
    },
    auth: {
      getSession: () => Promise.resolve({ data: { session: { user: { id: "demo" } } }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signInWithPassword: () => Promise.resolve({ error: null }),
      signOut: () => {
        onSignOut();
        return Promise.resolve({ error: null });
      },
    },
  };
}
