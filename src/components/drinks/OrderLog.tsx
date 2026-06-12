import { getDrink, type OrderItem } from "@/lib/drinkStore";
import { DrinkIcon, TulipLogo } from "@/components/drinks/DrinkIcon";
import { formatTime } from "@/lib/utils";

export function OrderLog({ orders }: { orders: OrderItem[] }) {
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <TulipLogo size={36} className="mb-2 opacity-60" />
        <p className="text-sm font-body">No sales yet — start tapping!</p>
      </div>
    );
  }

  const reversed = [...orders].reverse();

  return (
    <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
      {reversed.map(order => {
        const product = getDrink(order.product);
        return (
          <div
            key={order.id}
            className="flex items-center justify-between rounded-lg bg-muted/20 px-4 py-2.5 text-sm font-body"
          >
            <div className="flex items-center gap-3">
              <DrinkIcon id={order.product} size={22} className="text-muted-foreground" />
              <span className="font-semibold text-foreground">{product?.name}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {formatTime(new Date(order.timestamp))}
            </span>
          </div>
        );
      })}
    </div>
  );
}
