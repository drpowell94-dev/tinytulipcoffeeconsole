import { getDrink, type OrderItem } from "@/lib/drinkStore";
import { formatTime } from "@/lib/utils";

export function OrderLog({ orders }: { orders: OrderItem[] }) {
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <span className="text-3xl mb-2">🌷</span>
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
            className="flex items-center justify-between rounded-xl bg-muted/30 px-4 py-2.5 text-sm font-body"
          >
            <div className="flex items-center gap-2">
              <span>{product?.emoji}</span>
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
