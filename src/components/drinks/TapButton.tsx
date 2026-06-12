import { useState, useCallback } from "react";
import type { DrinkProduct } from "@/lib/drinkStore";
import { cn } from "@/lib/utils";

interface TapButtonProps {
  product: DrinkProduct;
  count: number;
  onTap: (productId: string) => void;
}

export function TapButton({ product, count, onTap }: TapButtonProps) {
  const [animating, setAnimating] = useState(false);

  const handleTap = useCallback(() => {
    onTap(product.id);
    setAnimating(true);
    setTimeout(() => setAnimating(false), 300);
  }, [product.id, onTap]);

  return (
    <button
      onClick={handleTap}
      className={cn(
        "tap-ripple relative flex flex-col items-center justify-center gap-1 rounded-2xl bg-card border-2 border-border p-4 shadow-sm transition-all active:scale-95 select-none",
        animating && "animate-bounce-tap tapped"
      )}
      style={{ minHeight: 120 }}
    >
      <span className="text-4xl">{product.emoji}</span>
      <span className="font-body font-semibold text-sm text-foreground leading-tight text-center">
        {product.name}
      </span>
      <span className="font-body font-bold text-xs text-accent">${product.price}</span>
      <span
        className={cn(
          "absolute top-2 right-3 font-body font-bold text-xl text-primary",
          animating && "animate-count-pop"
        )}
      >
        {count}
      </span>
    </button>
  );
}
