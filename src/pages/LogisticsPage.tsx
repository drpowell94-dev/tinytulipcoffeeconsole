import { useState, useMemo } from "react";
import { Trash2, Printer, ClipboardList } from "lucide-react";
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
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl text-foreground">Logistics</h1>
        <p className="text-sm text-muted-foreground font-body mt-1">
          Packing checklists auto-generated with each event
        </p>
      </div>

      {lists.length === 0 ? (
        <div className="rounded-lg bg-muted/20 p-12 text-center">
          <ClipboardList size={40} strokeWidth={1.25} className="mx-auto mb-3 text-muted-foreground" />
          <p className="font-body text-muted-foreground">
            No checklists yet. Create an event and its packing list appears here.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-[240px_1fr] gap-6">
          {/* Checklist selector */}
          <div className="space-y-2">
            {lists.map(list => {
              const done = list.items.filter(i => i.checked).length;
              return (
                <button
                  key={list.id}
                  onClick={() => setOpenId(list.id)}
                  className={`w-full text-left rounded-lg p-5 transition-colors ${
                    openId === list.id ? "bg-accent text-accent-foreground" : "bg-muted/20 hover:bg-muted/35 text-foreground"
                  }`}
                >
                  <p className="font-body font-semibold text-sm truncate">{list.eventName}</p>
                  <p className={`text-xs font-body mt-1 ${openId === list.id ? "text-accent-foreground/70" : "text-muted-foreground"}`}>
                    {EVENT_TYPE_LABELS[list.eventType]} • {done}/{list.items.length}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Active checklist */}
          {open && (
            <div className="rounded-lg bg-muted/15 p-5">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-2xl text-foreground">{open.eventName}</h2>
                <div className="flex gap-2">
                  <button
                    onClick={handlePrint}
                    className="p-2 rounded-lg text-foreground/60 hover:bg-muted/30 transition-colors"
                    aria-label="Print checklist"
                  >
                    <Printer size={18} strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={() => handleDelete(open)}
                    className="p-2 rounded-lg text-foreground/60 hover:bg-destructive/10 hover:text-destructive transition-colors"
                    aria-label="Delete checklist"
                  >
                    <Trash2 size={18} strokeWidth={1.5} />
                  </button>
                </div>
              </div>

              {/* Progress - Razor-thin */}
              <Progress checklist={open} />

              {/* Items grouped by category */}
              <div className="space-y-6">
                {Array.from(new Set(open.items.map(i => i.category))).map(category => (
                  <div key={category}>
                    <p className="text-xs font-body font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                      {category}
                    </p>
                    <div className="space-y-2">
                      {open.items
                        .filter(i => i.category === category)
                        .map(item => (
                          <label
                            key={item.id}
                            className={`flex items-center gap-3 rounded-lg px-4 py-3 cursor-pointer transition-colors ${
                              item.checked ? "bg-accent/10" : "bg-muted/20 hover:bg-muted/30"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={item.checked}
                              onChange={() => handleToggle(open.id, item.id)}
                              className="accent-accent w-5 h-5 shrink-0"
                            />
                            <span
                              className={`font-body text-sm flex-1 transition-all ${
                                item.checked
                                  ? "text-muted-foreground/60 opacity-60"
                                  : "text-foreground"
                              }`}
                            >
                              {item.name}
                            </span>
                            {item.checked && item.checkedAt && (
                              <span className="text-[10px] font-body text-muted-foreground/70 shrink-0 whitespace-nowrap">
                                ✓ {item.checkedBy} · {formatTime(new Date(item.checkedAt))}
                              </span>
                            )}
                          </label>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
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
    <div className="mb-6">
      <div className="w-full h-px rounded-full bg-muted/40 overflow-hidden">
        <div
          className="h-full rounded-full bg-accent transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs font-body text-muted-foreground mt-2 text-right">
        {done}/{checklist.items.length} packed {pct === 100 && "✓ complete"}
      </p>
    </div>
  );
}
