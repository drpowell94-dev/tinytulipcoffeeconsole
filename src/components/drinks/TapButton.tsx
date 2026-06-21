import { useState, useCallback } from "react";
import type { DrinkProduct } from "@/lib/drinkStore";
import { DrinkIcon } from "@/components/drinks/DrinkIcon";
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
      aria-label={`Add ${product.name} - $${product.price}`}
      className={cn(
        "tap-ripple relative flex flex-col items-center justify-center gap-2 rounded-lg bg-muted/20 hover:bg-muted/35 p-5 shadow-sm-elevation transition-all select-none hover-scale",
        animating && "tapped animate-tap-spring"
      )}
      style={{ minHeight: 140 }}
    >
      <DrinkIcon id={product.id} size={48} className="text-foreground" />
      <div className="flex flex-col items-center gap-1">
        <span className="font-body font-semibold text-sm text-foreground leading-tight text-center">
          {product.name}
        </span>
        <span className="font-body text-xs text-accent font-bold">${product.price}</span>
      </div>
      <span
        className={cn(
          "absolute top-3 right-3 font-display font-bold text-2xl text-accent",
          animating && "animate-count-pop"
        )}
      >
        {count}
      </span>
    </button>
  );
}
