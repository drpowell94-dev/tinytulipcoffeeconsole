import { useState, useMemo } from "react";
import { Trash2, Printer } from "lucide-react";
import { toast } from "sonner";
import {
  loadChecklists,
  toggleItem,
  deleteChecklist,
  type Checklist,
} from "@/lib/checklistStore";
import { EVENT_TYPE_LABELS } from "@/lib/eventStore";
import { formatTime } from "@/lib/utils";

export default function LogisticsPage() {
  const [lists, setLists] = useState<Checklist[]>(() => loadChecklists());
  const [openId, setOpenId] = useState<string | null>(lists[0]?.id ?? null);

  const open = useMemo(() => lists.find(l => l.id === openId) ?? null, [lists, openId]);

  const handleToggle = (checklistId: string, itemId: string) => {
    setLists(toggleItem(checklistId, itemId));
  };

  const handleDelete = (list: Checklist) => {
    const next = deleteChecklist(list.id);
    setLists(next);
    if (openId === list.id) setOpenId(next[0]?.id ?? null);
    toast(`Deleted checklist for "${list.eventName}"`);
  };

  const handlePrint = () => window.print();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Logistics</h1>
        <p className="text-sm text-muted-foreground font-body">
          Packing checklists — auto-generated when you create an event
        </p>
      </div>

      {lists.length === 0 ? (
        <div className="rounded-2xl bg-card border border-border p-10 text-center">
          <span className="text-4xl">📋</span>
          <p className="font-body text-muted-foreground mt-2">
            No checklists yet. Create an event and its packing list appears here automatically.
          </p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[260px_1fr] gap-4">
          {/* Checklist selector */}
          <div className="space-y-2">
            {lists.map(list => {
              const done = list.items.filter(i => i.checked).length;
              return (
                <button
                  key={list.id}
                  onClick={() => setOpenId(list.id)}
                  className={`w-full text-left rounded-xl border p-3 transition-colors ${
                    openId === list.id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-accent"
                  }`}
                >
                  <p className="font-body font-semibold text-sm truncate">{list.eventName}</p>
                  <p className={`text-xs font-body ${openId === list.id ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {EVENT_TYPE_LABELS[list.eventType]} · {done}/{list.items.length} packed
                  </p>
                </button>
              );
            })}
          </div>

          {/* Active checklist */}
          {open && (
            <div className="rounded-2xl bg-card border border-border p-5 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-display text-xl">{open.eventName}</h2>
                <div className="flex gap-1.5">
                  <button
                    onClick={handlePrint}
                    className="p-2 rounded-xl text-muted-foreground hover:bg-muted/40 transition-colors"
                    aria-label="Print checklist"
                  >
                    <Printer size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(open)}
                    className="p-2 rounded-xl text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    aria-label="Delete checklist"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Progress */}
              <Progress checklist={open} />

              {/* Items grouped by category */}
              {Array.from(new Set(open.items.map(i => i.category))).map(category => (
                <div key={category} className="mt-5">
                  <p className="text-xs font-body font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                    {category}
                  </p>
                  <div className="space-y-1.5">
                    {open.items
                      .filter(i => i.category === category)
                      .map(item => (
                        <label
                          key={item.id}
                          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer transition-colors ${
                            item.checked ? "bg-accent/10" : "bg-muted/20 hover:bg-muted/30"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={item.checked}
                            onChange={() => handleToggle(open.id, item.id)}
                            className="accent-[#e45b3c] w-5 h-5 shrink-0"
                          />
                          <span
                            className={`font-body text-sm flex-1 ${
                              item.checked ? "line-through text-muted-foreground" : "text-foreground"
                            }`}
                          >
                            {item.name}
                          </span>
                          {item.checked && item.checkedAt && (
                            <span className="text-[11px] font-body text-muted-foreground shrink-0">
                              ✓ {item.checkedBy} · {formatTime(new Date(item.checkedAt))}
                            </span>
                          )}
                        </label>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Progress({ checklist }: { checklist: Checklist }) {
  const done = checklist.items.filter(i => i.checked).length;
  const pct = checklist.items.length > 0 ? Math.round((done / checklist.items.length) * 100) : 0;
  return (
    <div className="mt-3">
      <div className="w-full h-2.5 rounded-full bg-muted/40 overflow-hidden">
        <div
          className="h-full rounded-full bg-accent transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs font-body text-muted-foreground mt-1 text-right">
        {done}/{checklist.items.length} packed ({pct}%)
        {pct === 100 && " — truck's loaded! 🚚"}
      </p>
    </div>
  );
}
