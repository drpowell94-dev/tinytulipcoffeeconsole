import { useState } from "react";
import { Plus, Minus, Trash2, Package } from "lucide-react";
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
  "w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-accent/50";

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
    <div className="space-y-8">
      <div className="flex items-baseline justify-between gap-2 sm:gap-4">
        <div>
          <h1 className="font-display text-4xl text-foreground">Inventory</h1>
          <p className="text-sm text-muted-foreground font-body mt-1">
            Core supplies
            {lowCount > 0 && (
              <span className="text-destructive font-semibold"> · {lowCount} low</span>
            )}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-lg bg-accent text-accent-foreground px-3 sm:px-4 py-2 sm:py-2.5 font-body font-semibold text-xs sm:text-sm hover-scale active:scale-95 transition-all shrink-0"
        >
          <Plus size={16} strokeWidth={2} /> <span className="hidden sm:inline">Add</span>
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="rounded-lg bg-muted/20 p-4 sm:p-5 space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <input
              className={input}
              placeholder="Item name *"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              autoFocus
            />
            <input
              className={input}
              placeholder="Unit"
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
              placeholder="Reorder at"
              value={form.reorderLevel || ""}
              onChange={e => setForm({ ...form, reorderLevel: parseInt(e.target.value) || 0 })}
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-primary text-primary-foreground px-4 sm:px-6 py-2 sm:py-2.5 font-body font-semibold text-xs sm:text-sm hover-scale active:scale-95 transition-all"
          >
            Add Item
          </button>
        </form>
      )}

      <div className="space-y-3 sm:space-y-4">
        {items.length === 0 ? (
          <div className="rounded-lg bg-muted/20 p-8 sm:p-12 text-center space-y-3">
            <Package size={32} className="mx-auto text-muted-foreground sm:w-[40px] sm:h-[40px]" />
            <p className="font-body text-xs sm:text-sm text-muted-foreground">
              No inventory items yet. Add supplies to track stock levels and get low-stock alerts.
            </p>
          </div>
        ) : (
          items.map(item => {
            const isLow = item.quantity <= item.reorderLevel;
            return (
              <div
                key={item.id}
                className={cn(
                  "rounded-lg p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 transition-colors",
                  isLow ? "bg-destructive/8" : "bg-muted/20 hover:bg-muted/35"
                )}
              >
                <div className="flex-1 min-w-0 w-full sm:w-auto">
                  <p className={cn("font-body font-semibold text-sm sm:text-base", isLow ? "text-destructive" : "text-foreground")}>
                    {item.name}
                    {isLow && (
                      <span className="ml-2 align-middle inline-block rounded-md bg-destructive/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-destructive">
                        Low
                      </span>
                    )}
                  </p>
                  <p className="text-xs font-body text-muted-foreground mt-1">
                    Reorder at {item.reorderLevel} {item.unit}
                    {item.lastRestocked && ` • restocked ${new Date(item.lastRestocked).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 w-full sm:w-auto">
                  <button
                    onClick={() => adjust(item, -1)}
                    className="w-9 sm:w-10 h-9 sm:h-10 rounded-lg bg-muted/40 flex items-center justify-center text-foreground hover:bg-muted/70 active:scale-90 transition-all"
                    aria-label={`Decrease ${item.name}`}
                  >
                    <Minus size={16} strokeWidth={1.5} />
                  </button>
                  <span className={cn("font-display text-2xl sm:text-3xl w-12 sm:w-16 text-center", isLow && "text-destructive")}>
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => adjust(item, 1)}
                    className="w-9 sm:w-10 h-9 sm:h-10 rounded-lg bg-accent/20 flex items-center justify-center text-accent hover:bg-accent hover:text-accent-foreground active:scale-90 transition-all"
                    aria-label={`Increase ${item.name}`}
                  >
                    <Plus size={16} strokeWidth={1.5} />
                  </button>
                  <span className="text-xs font-body text-muted-foreground w-10 sm:w-14 text-center">{item.unit}</span>
                  <button
                    onClick={() => {
                      setItems(removeItem(item.id));
                      toast(`Removed "${item.name}"`);
                    }}
                    className="p-2 sm:p-2.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    aria-label={`Delete ${item.name}`}
                  >
                    <Trash2 size={14} strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
