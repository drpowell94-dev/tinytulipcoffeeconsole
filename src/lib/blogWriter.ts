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
    const flavor = theme || "our signature canned latte";
    const profile = weave(kws.slice(1), "smooth, cold-crafted, and ready to drink");
    return {
      title: `${theme || "Premium Canned Latte"}: Cold Crafted, Always Ready`,
      body: [
        `## ${flavor}`,
        "",
        `${voice.opener} We've perfected the art of the canned latte — ${profile}${voice.exclaim}`,
        "",
        "### What's Inside",
        "",
        `Premium espresso, high-quality dairy, and nothing artificial. Every can delivers the same smooth, cold-brew excellence you'd expect from our pop-ups.`,
        "",
        "### Why We Went Canned",
        "",
        `Convenience meets craftsmanship. Grab one before your day starts, share one with a friend, or stock your fridge. No preparation. No compromise.`,
        "",
        "### Where to Find",
        "",
        "Shop online, grab at our next pop-up, or ask your local retailer.",
        "",
        voice.closer + " 🌷",
      ].join("\n"),
    };
  }

  if (templateId === "popup-event-announcement") {
    const event = theme || "our next pop-up";
    const vibe = weave(kws.slice(1), "cold iced coffee, graffiti culture, and street style");
    return {
      title: `${theme || "Pop-Up Alert"}: Where Coffee Meets Culture`,
      body: [
        `## We're Popping Up Near You`,
        "",
        `${voice.opener} Bringing mobile iced coffee excellence and graffiti streetwear vibes to ${event}${voice.exclaim}`,
        "",
        "### What's On Tap",
        "",
        `Cold-crafted espresso drinks, premium canned lattes, and seasonal ice-cold creations. All built for the moment.`,
        "",
        "### The Vibe",
        "",
        `${vibe}. This isn't just coffee—it's an experience.`,
        "",
        "### Find Us",
        "",
        `Check our calendar for exact dates and locations. Follow along for surprise drops and limited collabs.`,
        "",
        voice.closer + " 🌷",
      ].join("\n"),
    };
  }

  // community-update (default)
  const focus = weave(kws, "pop-ups, collabs, and the graffiti coffee culture");
  return {
    title: "What's Brewing at Tiny Tulip",
    body: [
      "## What's Brewing",
      "",
      `${voice.opener} It's been a full stretch of ${focus} around here, and we wanted to catch you up${voice.exclaim}`,
      "",
      "### Lately",
      "",
      "Our mobile iced coffee pop-ups have been hitting new neighborhoods, our canned lattes are in new hands, and the community keeps showing up strong.",
      "",
      "### Coming Up",
      "",
      "New flavors launching, bigger pop-ups planned, and some exciting partnerships in the works. Stay tuned.",
      "",
      "### Thank You",
      "",
      "To everyone grabbing a cold one, rolling through our pop-ups, and keeping the culture alive. Purely a pop-up, where the people are.",
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
