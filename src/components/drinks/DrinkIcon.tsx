/**
 * Custom drink icon set — one consistent language: 48×48 grid,
 * 2.5px rounded strokes, currentColor. Tint via text-* classes.
 */

interface IconProps {
  size?: number;
  className?: string;
}

const svgProps = (size: number, className?: string) => ({
  width: size,
  height: size,
  viewBox: "0 0 48 48",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className,
  "aria-hidden": true,
});

function HotCoffee({ size = 48, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M19 5c-1.5 2 1.5 3 0 5.5M27 5c-1.5 2 1.5 3 0 5.5" />
      <path d="M11 17h24l-2.3 15.2A4.5 4.5 0 0 1 28.3 36h-8.6a4.5 4.5 0 0 1-4.4-3.8L11 17Z" />
      <path d="M35 21h2a4.5 4.5 0 0 1 0 9h-3" />
      <path d="M13 42h22" />
    </svg>
  );
}

function IcedCoffee({ size = 48, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M14 12h20l-2.2 27a3.5 3.5 0 0 1-3.5 3.2h-8.6a3.5 3.5 0 0 1-3.5-3.2L14 12Z" />
      <path d="M27 12l3.5-8" />
      <path d="M15 21h18" />
      <rect x="18.5" y="26" width="5.5" height="5.5" rx="1.2" transform="rotate(10 21.2 28.8)" />
      <rect x="25.5" y="31" width="5" height="5" rx="1.2" transform="rotate(-12 28 33.5)" />
    </svg>
  );
}

function ColdBrewCan({ size = 48, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <rect x="13.5" y="9" width="21" height="33" rx="3.5" />
      <path d="M13.5 15h21" />
      <path d="M13.5 36h21" />
      <path d="M24 20.5c2.8 3.6 4.2 5.4 4.2 7.5a4.2 4.2 0 1 1-8.4 0c0-2.1 1.4-3.9 4.2-7.5Z" />
    </svg>
  );
}

function Lemonade({ size = 48, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M14 15h20l-2 24a3.5 3.5 0 0 1-3.5 3.2h-9a3.5 3.5 0 0 1-3.5-3.2L14 15Z" />
      <path d="M20 15l-3.5-9" />
      <path d="M15 24h18" />
      <circle cx="33.5" cy="11" r="5.5" />
      <path d="M33.5 5.5v11M28.7 8.2l9.6 5.6M38.3 8.2l-9.6 5.6" />
    </svg>
  );
}

function ChocolateMilk({ size = 48, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M19.5 5h9" />
      <path d="M20.5 5v5c0 2.5-4.5 4.5-4.5 8.5V38a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4V18.5c0-4-4.5-6-4.5-8.5V5" />
      <path d="M16.5 25c2.5-1.8 5 1.8 7.5 0s5 1.8 7.5 0" />
    </svg>
  );
}

const ICONS: Record<string, (p: IconProps) => JSX.Element> = {
  "hot-coffee": HotCoffee,
  "iced-coffee": IcedCoffee,
  "cold-brew-can": ColdBrewCan,
  "lemonade": Lemonade,
  "chocolate-milk": ChocolateMilk,
};

export function DrinkIcon({ id, size = 48, className }: IconProps & { id: string }) {
  const Icon = ICONS[id];
  return Icon ? <Icon size={size} className={className} /> : null;
}

/** Brand mark — coral bloom, taupe stem. */
export function TulipLogo({ size = 32, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M14 7v8.5a10 10 0 0 0 20 0V7l-5.5 4.5L24 6l-4.5 5.5L14 7Z"
        fill="hsl(11 76% 56%)"
        stroke="hsl(11 76% 56%)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <g stroke="hsl(33 24% 44%)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M24 26v17" />
        <path d="M24 38c0-5.5-3.8-7.5-8-8.5.3 5.5 3.5 8.5 8 8.5Z" />
        <path d="M24 38c0-5.5 3.8-7.5 8-8.5-.3 5.5-3.5 8.5-8 8.5Z" />
      </g>
    </svg>
  );
}
