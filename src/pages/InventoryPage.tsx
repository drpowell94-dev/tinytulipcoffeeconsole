import { useState } from "react";
import { Plus, Minus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  loadInventory,
  addItem,
  updateItem,
  removeItem,
  type InventoryItem,
} from "@/lib/inventoryStore";
import { cn } from "@/lib/utils";

const input =
  "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring";

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>(() => loadInventory());
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", unit: "boxes", quantity: 0, reorderLevel: 2 });

  const lowCount = items.filter(i => i.quantity <= i.reorderLevel).length;

  const adjust = (item: InventoryItem, delta: number) => {
    const quantity = Math.max(0, item.quantity + delta);
    const next = updateItem(item.id, {
      quantity,
      ...(delta > 0 ? { lastRestocked: new Date().toISOString() } : {}),
    });
    setItems(next);
    if (quantity <= item.reorderLevel && delta < 0) {
      toast.warning(`${item.name} is at reorder level — time to restock!`);
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Item name is required");
      return;
    }
    setItems(addItem({ ...form, name: form.name.trim() }));
    setForm({ name: "", unit: "boxes", quantity: 0, reorderLevel: 2 });
    setShowForm(false);
    toast.success(`Added "${form.name}" to inventory`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl">Inventory</h1>
          <p className="text-sm text-muted-foreground font-body">
            Core supplies
            {lowCount > 0 && (
              <span className="text-destructive font-semibold"> · {lowCount} item{lowCount === 1 ? "" : "s"} low</span>
            )}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-xl bg-accent text-accent-foreground px-4 py-2.5 font-body font-semibold text-sm hover:opacity-90 active:scale-95 transition-all"
        >
          <Plus size={16} /> Add Item
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="rounded-2xl bg-card border border-border p-5 space-y-3 shadow-sm">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <input
              className={input}
              placeholder="Item name *"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
            <input
              className={input}
              placeholder="Unit (boxes, bags…)"
              value={form.unit}
              onChange={e => setForm({ ...form, unit: e.target.value })}
            />
            <input
              className={input}
              type="number"
              min={0}
              placeholder="Quantity"
              value={form.quantity || ""}
              onChange={e => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })}
            />
            <input
              className={input}
              type="number"
              min={0}
              placeholder="Reorder level"
              value={form.reorderLevel || ""}
              onChange={e => setForm({ ...form, reorderLevel: parseInt(e.target.value) || 0 })}
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-primary text-primary-foreground px-5 py-2 font-body font-semibold text-sm hover:opacity-90"
          >
            Add to Inventory
          </button>
        </form>
      )}

      <div className="space-y-2">
        {items.map(item => {
          const isLow = item.quantity <= item.reorderLevel;
          return (
            <div
              key={item.id}
              className={cn(
                "rounded-2xl border p-4 flex items-center gap-3 shadow-sm transition-colors",
                isLow ? "bg-destructive/5 border-destructive/40" : "bg-card border-border"
              )}
            >
              <div className="flex-1 min-w-0">
                <p className={cn("font-body font-bold", isLow ? "text-destructive" : "text-foreground")}>
                  {item.name}
                  {isLow && <span className="ml-2 text-[11px] font-semibold uppercase tracking-wide">🔴 Low</span>}
                </p>
                <p className="text-xs font-body text-muted-foreground">
                  Reorder at {item.reorderLevel} {item.unit}
                  {item.lastRestocked && ` · restocked ${new Date(item.lastRestocked).toLocaleDateString()}`}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => adjust(item, -1)}
                  className="w-9 h-9 rounded-xl bg-muted/40 flex items-center justify-center text-foreground hover:bg-muted/70 active:scale-90 transition-all"
                  aria-label={`Decrease ${item.name}`}
                >
                  <Minus size={16} />
                </button>
                <span className={cn("font-display text-2xl w-14 text-center", isLow && "text-destructive")}>
                  {item.quantity}
                </span>
                <button
                  onClick={() => adjust(item, 1)}
                  className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center text-accent hover:bg-accent hover:text-accent-foreground active:scale-90 transition-all"
                  aria-label={`Increase ${item.name}`}
                >
                  <Plus size={16} />
                </button>
                <span className="text-xs font-body text-muted-foreground w-12">{item.unit}</span>
                <button
                  onClick={() => {
                    setItems(removeItem(item.id));
                    toast(`Removed "${item.name}"`);
                  }}
                  className="p-2 rounded-xl text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  aria-label={`Delete ${item.name}`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
