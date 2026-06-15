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

  if (templateId === "canned-latte-feature") {
    const product = theme || "our new canned latte";
    const highlight = weave(kws.slice(1), "smooth, cold-crafted, and ready to go");
    return {
      title: `New Release: ${theme || "Cold-Crafted Canned Latte"}`,
      body: [
        `## Introducing ${product}`,
        "",
        `${voice.opener} We've done something we're really proud of — a canned latte that tastes like it came straight from the cart${voice.exclaim}`,
        "",
        "### What Makes It Special",
        "",
        `${highlight}. No artificial anything. Just real espresso, real milk, and the taste that made Tiny Tulip what it is.`,
        "",
        "### How We Got Here",
        "",
        "We tested hundreds of combinations until we got one that felt right. This is it.",
        "",
        "### How to Get One",
        "",
        "Now available at select pop-ups and farmers markets. We're making limited batches, so grab one while they're here.",
        "",
        voice.closer + " 🌷",
      ].join("\n"),
    };
  }

  if (templateId === "popup-event-announcement") {
    const partner = theme || "a collab we're excited about";
    const vibe = weave(kws.slice(1), "coffee, community, and good vibes");
    return {
      title: `Pop-Up Alert: ${theme || "You Don't Want to Miss This"}`,
      body: [
        `## Special Event: ${partner}`,
        "",
        `${voice.opener} We're popping up somewhere special, and we want you there${voice.exclaim}`,
        "",
        "### The Plan",
        "",
        `We're bringing the cart to connect over ${vibe}. It's the kind of event where you show up for the coffee and stay for the company.`,
        "",
        "### Mark Your Calendar",
        "",
        "[DATE] — [TIME] — [LOCATION]. Limited time, limited quantities. First come, first served.",
        "",
        "### Why You Should Go",
        "",
        "Because pop-ups are where the magic happens. And we'd love to see you there.",
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
