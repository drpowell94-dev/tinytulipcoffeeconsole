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
): { title: string; body: string; seoKeywords: string } {
  const voice = VOICES[tone];
  const kws = keywordList(keywords);
  const theme = kws[0] ?? "";

  if (templateId === "canned-latte-feature") {
    const product = theme || "our new canned latte";
    const highlight = weave(kws.slice(1), "smooth, cold-crafted, and ready to go");
    return {
      title: `New Release: ${theme || "Cold-Crafted Canned Latte"}`,
      body: [
        `${voice.opener} We've done something we're really proud of — a canned latte that tastes like it came straight from the cart${voice.exclaim}`,
        "",
        `${highlight}. No artificial anything. Just real espresso, real milk, and the taste that made Tiny Tulip what it is.`,
        "",
        "We tested hundreds of combinations until we got one that felt right. This is it. Now available at select pop-ups and farmers markets. We're making limited batches, so grab one while they're here.",
        "",
        voice.closer + " 🌷",
      ].join("\n"),
      seoKeywords: "canned latte, cold brew, espresso, ready to drink, specialty coffee",
    };
  }

  if (templateId === "popup-event-announcement") {
    const event = theme || "a resident event we're stoked about";
    const community = weave(kws.slice(1), "neighbors, friends, and the community");
    return {
      title: `We're Popping Up: ${theme || "Bringing Coffee to Your Neighborhood"}`,
      body: [
        `${voice.opener} We're pulling up to an event that means something real — a chance to pour coffee for ${community}${voice.exclaim}`,
        "",
        "Cold-crafted drinks, good people, and coffee made the way we've always made it. No frills, just real. We'll be there all day.",
        "",
        "Pop-ups aren't just about the coffee. They're about showing up for your neighborhood and the people who make it home.",
        "",
        voice.closer + " 🌷",
      ].join("\n"),
      seoKeywords: "pop-up coffee, neighborhood event, specialty coffee, cold brew, community",
    };
  }

  // community-update (default)
  const focus = weave(kws, "markets, pop-ups, and new faces");
  return {
    title: "What's Brewing at Tiny Tulip",
    body: [
      `${voice.opener} It's been a full stretch of ${focus} around here, and we wanted to catch you up${voice.exclaim}`,
      "",
      "The cart has been everywhere — early markets, afternoon pop-ups, and a few events that sold out before we finished setting up the tent. Thank you for that.",
      "",
      "More dates are landing on the calendar every week. Keep an eye on the schedule so you know where to find us.",
      "",
      "Purely a pop-up, where the people are — and you keep showing up. It means everything.",
      "",
      voice.closer + " 🌷",
    ].join("\n"),
    seoKeywords: "coffee, pop-up, specialty coffee, farmers market, neighborhood",
  };
}

export function generateEventRecap(session: SavedSession): { title: string; body: string; seoKeywords: string } {
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
      `What a day. On ${date} we poured **${session.totalDrinks} drinks** at ${session.eventName}${soldOut ? " — and yes, we fulfilled every single pre-order!" : "."}`,
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
      "To everyone who stopped by, said hi, and let us make your drink — this is why we do it. Purely a pop-up, where the people are.",
      "",
      "See you at the next one! 🌷",
    ]
      .filter(line => line !== null)
      .join("\n"),
    seoKeywords: "event recap, coffee event, pop-up, specialty coffee",
  };
}
