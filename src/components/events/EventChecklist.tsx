import { useState, useMemo } from "react";
import { X, Printer, ClipboardList } from "lucide-react";
import {
  loadChecklists,
  toggleItem,
  createChecklistForEvent,
  type Checklist,
} from "@/lib/checklistStore";
import { EVENT_TYPE_LABELS, type TulipEvent } from "@/lib/eventStore";
import { formatTime } from "@/lib/utils";

interface Props {
  event: Pick<TulipEvent, "id" | "name" | "eventType">;
  onClose: () => void;
}

/**
 * Packing checklist for a single event, shown as a modal from the Events page.
 * Creates the checklist on demand if the event doesn't have one yet (e.g. it
 * was imported or created before checklists were generated).
 */
export default function EventChecklist({ event, onClose }: Props) {
  const [checklist, setChecklist] = useState<Checklist>(() => {
    const existing = loadChecklists().find(l => l.eventId === event.id);
    return existing ?? createChecklistForEvent(event.id, event.name, event.eventType);
  });

  const done = useMemo(() => checklist.items.filter(i => i.checked).length, [checklist]);
  const pct = checklist.items.length > 0 ? Math.round((done / checklist.items.length) * 100) : 0;
  const categories = useMemo(
    () => Array.from(new Set(checklist.items.map(i => i.category))),
    [checklist]
  );

  const handleToggle = (itemId: string) => {
    const lists = toggleItem(checklist.id, itemId);
    const next = lists.find(l => l.id === checklist.id);
    if (next) setChecklist(next);
  };

  const handlePrint = () => window.print();

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-background w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] flex flex-col shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-border">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-accent mb-1">
              <ClipboardList size={16} strokeWidth={1.75} />
              <span className="text-xs font-body font-semibold uppercase tracking-widest">
                Packing checklist
              </span>
            </div>
            <h2 className="font-display text-2xl text-foreground truncate">{event.name}</h2>
            <p className="text-xs text-muted-foreground font-body mt-0.5">
              {EVENT_TYPE_LABELS[event.eventType]} • {done}/{checklist.items.length} packed
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handlePrint}
              className="p-2 rounded-lg text-foreground/60 hover:bg-muted/30 transition-colors"
              aria-label="Print checklist"
            >
              <Printer size={18} strokeWidth={1.5} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-foreground/60 hover:bg-muted/30 transition-colors"
              aria-label="Close checklist"
            >
              <X size={20} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="px-5 pt-4">
          <div className="w-full h-px rounded-full bg-muted/40 overflow-hidden">
            <div
              className="h-full rounded-full bg-accent transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs font-body text-muted-foreground mt-2 text-right">
            {pct === 100 ? "✓ All packed" : `${pct}% packed`}
          </p>
        </div>

        {/* Items grouped by category */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {categories.map(category => (
            <div key={category}>
              <p className="text-xs font-body font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                {category}
              </p>
              <div className="space-y-2">
                {checklist.items
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
                        onChange={() => handleToggle(item.id)}
                        className="accent-accent w-5 h-5 shrink-0"
                      />
                      <span
                        className={`font-body text-sm flex-1 transition-all ${
                          item.checked ? "text-muted-foreground/60 opacity-60" : "text-foreground"
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
    </div>
  );
}
