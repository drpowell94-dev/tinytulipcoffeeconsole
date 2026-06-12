import type { BlogTone } from "./contentStore";
import type { SavedSession } from "./drinkStore";
import { getDrink } from "./drinkStore";

interface ToneVoice {
  opener: string;
  closer: string;
  exclaim: string;
}

const VOICES: Record<BlogTone, ToneVoice> = {
  friendly: {
    opener: "Hey friends!",
    closer: "See you at the next pop-up — first smile's on us.",
    exclaim: "!",
  },
  professional: {
    opener: "We're pleased to share an update from Tiny Tulip Coffee.",
    closer: "We look forward to serving you at an upcoming event.",
    exclaim: ".",
  },
  casual: {
    opener: "Okay so—",
    closer: "Come hang. Bring a friend.",
    exclaim: "!",
  },
};

function keywordList(keywords: string): string[] {
  return keywords
    .split(",")
    .map(k => k.trim())
    .filter(Boolean);
}

function weave(keywords: string[], fallback: string): string {
  return keywords.length > 0 ? keywords.join(", ") : fallback;
}

export function generateBlogDraft(
  templateId: string,
  tone: BlogTone,
  keywords: string
): { title: string; body: string } {
  const voice = VOICES[tone];
  const kws = keywordList(keywords);
  const theme = kws[0] ?? "";

  if (templateId === "coffee-origin") {
    const origin = theme || "our newest single origin";
    const notes = weave(kws.slice(1), "dark chocolate, toasted hazelnut, and a honeyed finish");
    return {
      title: `Origin Spotlight: ${theme ? theme : "Our Newest Beans"}`,
      body: [
        `## Meet ${origin}`,
        "",
        `${voice.opener} This month we're pouring something special: beans from ${origin}. Every batch is small-lot and roasted the week we serve it, so what hits your cup is as fresh as it gets${voice.exclaim}`,
        "",
        "### Tasting Notes",
        "",
        `Expect ${notes}. It shines as a pour-over, and it holds its own against oat milk in a latte.`,
        "",
        "### Why We Chose It",
        "",
        `We pick coffees the same way we pick our pop-up spots — by chasing what feels right. This one stopped us at first sip, and we think it'll do the same to you.`,
        "",
        "### How We Brew It",
        "",
        "At our events we pull it as espresso and batch it for cold brew. At home, try 1:16 with water just off the boil, and let it bloom for 30 seconds.",
        "",
        voice.closer + " 🌷",
      ].join("\n"),
    };
  }

  if (templateId === "seasonal-launch") {
    const drink = theme || "our new seasonal drink";
    const ingredients = weave(kws.slice(1), "real fruit, house-made syrup, and our signature espresso");
    return {
      title: `New on the Menu: ${theme || "A Seasonal Favorite"}`,
      body: [
        `## Introducing ${drink}`,
        "",
        `${voice.opener} The seasonal board just got a new headliner — ${drink} is officially here${voice.exclaim}`,
        "",
        "### What's In It",
        "",
        `We build it with ${ingredients}. No shortcuts, no artificial anything — the same way we make everything at the cart.`,
        "",
        "### Our Honest Review",
        "",
        "We test every seasonal drink on ourselves (tough job) until it earns a spot on the menu. This one didn't take long.",
        "",
        "### Where to Find It",
        "",
        "It's pouring at every pop-up and market while the season lasts. Follow along to see where the cart lands next.",
        "",
        voice.closer + " 🌷",
      ].join("\n"),
    };
  }

  // community-update (default)
  const focus = weave(kws, "markets, pop-ups, and new faces");
  return {
    title: "What's Brewing at Tiny Tulip",
    body: [
      "## What's Brewing",
      "",
      `${voice.opener} It's been a full stretch of ${focus} around here, and we wanted to catch you up${voice.exclaim}`,
      "",
      "### Lately",
      "",
      "The cart has been everywhere — early markets, afternoon pop-ups, and a few events that sold out before we finished setting up the tent. Thank you for that.",
      "",
      "### Coming Up",
      "",
      "More dates are landing on the calendar every week. Keep an eye on the schedule so you know where to find us.",
      "",
      "### Thank You",
      "",
      "Purely a pop-up, where the people are — and you keep showing up. It means everything.",
      "",
      voice.closer + " 🌷",
    ].join("\n"),
  };
}

export function generateEventRecap(session: SavedSession): { title: string; body: string } {
  const date = new Date(session.date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const topEntry = Object.entries(session.productCounts).sort((a, b) => b[1] - a[1])[0];
  const topDrink = topEntry ? getDrink(topEntry[0]) : undefined;
  const soldOut = session.preOrders > 0 && session.totalDrinks >= session.preOrders;
  const breakdown = Object.entries(session.productCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([id, count]) => `- ${getDrink(id)?.name ?? id}: ${count}`)
    .join("\n");

  return {
    title: `Recap: ${session.eventName}`,
    body: [
      `## ${session.eventName} — Recap`,
      "",
      `What a day. On ${date} we poured **${session.totalDrinks} drinks** at ${session.eventName}${soldOut ? " — and yes, we fulfilled every single pre-order!" : "."}`,
      "",
      "### The Numbers",
      "",
      breakdown,
      "",
      topDrink
        ? `${topDrink.name} took the crown as the day's favorite — no surprise to anyone who tried one.`
        : "",
      session.extraSales > 0
        ? `Beyond pre-orders, walk-ups kept the cart busy all day.`
        : "",
      "",
      "### Thank You",
      "",
      "To everyone who stopped by, said hi, and let us make your drink — this is why we do it. Purely a pop-up, where the people are.",
      "",
      "See you at the next one! 🌷",
    ]
      .filter(line => line !== null)
      .join("\n"),
  };
}
