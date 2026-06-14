# Frontend Visual Integration Guide

Visual reference for all new UI elements added to the Tiny Tulip app.

---

## 1. Dashboard: Actionable Insights Card

**Location:** Below "Good morning" greeting, in place of "Upcoming Events" section when empty

```
┌─ Upcoming Events ────────────────────────────────────────┐
│                                                      View all → │
├──────────────────────────────────────────────────────────┤
│ ⚡ Suggest outreach to 1532 East Blvd                      │
│    (avg $2,100/event from past 90 days)                  │
│    Draft pitch →                                          │
│                                                          │
│ ⚡ Revenue down 35% vs last month.                         │
│    Consider seasonal drink launch or promotion.           │
└──────────────────────────────────────────────────────────┘
```

**Colors:**
- Border: Accent (Bloomi red) on left
- Background: Subtle accent tint (bg-accent/8 to /12)
- Icons: Zap (accent color)
- Text: "Draft pitch →" is clickable link (accent text)

**Responsive:** Full width on mobile, maintains same structure

---

## 2. Content Page: Generated Content Variants Section

**Location:** Between textarea and action buttons

### Closed State:
```
┌─────────────────────────────────────────────────────┐
│ ✨ AI-Generated Content Variants                  ▼ │
└─────────────────────────────────────────────────────┘
```

### Expanded State:
```
┌─────────────────────────────────────────────────────┐
│ ✨ AI-Generated Content Variants                  ▲ │
├─────────────────────────────────────────────────────┤
│                                                     │
│ 📤 Social Caption                                  │
│ ┌───────────────────────────────────────────────┐ │
│ │ ☕ Discover the story behind our beans...     │ │
│ │ #CoffeeOrigin #TinyTulip                      │ │
│ └───────────────────────────────────────────────┘ │
│                                                     │
│ ✉️  Email Excerpt                                  │
│ ┌───────────────────────────────────────────────┐ │
│ │ Our Ethiopian coffee beans come from the      │ │
│ │ Yirgacheffe region, known for bright, fruity │ │
│ │ notes...                                       │ │
│ └───────────────────────────────────────────────┘ │
│                                                     │
│ 🏷️  SEO Keywords                                   │
│ [ethiopian] [coffee] [origin] [single-origin]     │
│ [yirgacheffe]                                      │
└─────────────────────────────────────────────────────┘
```

**Styling:**
- Border: accent/20 (light accent color)
- Background: accent/8 (very subtle)
- Keywords: accent/15 background, accent text
- Icons: Small, accent color
- Toggle: Full-width button with chevron animation

**Responsive:** 
- Desktop: Full width expanded view
- Mobile: Same layout, text clamps to 3 lines if needed

---

## 3. Events Page: Tab Navigation

**Location:** Above event lists, replaces the section headers

```
UPCOMING (8)  |  PAST (22)  |  PENDING LEADS (3)
─────────────┘
```

**Active Tab Styling:**
- Text: Foreground color, font-semibold
- Underline: Accent color (2px border-b)
- Transition: Smooth 200ms

**Inactive Tab Styling:**
- Text: Muted-foreground, lighter
- No underline
- Hover: Text changes to foreground, bg subtle

---

## 4. Events Page: Pending Lead Card

**Location:** Under "Pending Leads" tab

```
┌─ Catering Request - Jane Smith ─────────────────────┐
│                         🔴 New Lead               │
│                                                   │
│ July 15, 2026 • 1532 East Blvd, Portland, OR   │
│ Catering • 150 guests                           │
│                                                   │
│                     [✓ Accept] [✗]              │
└───────────────────────────────────────────────────┘
```

**Colors:**
- Background: muted/20 (same as regular event cards)
- Badge "New Lead": Status color (accent background, accent text)
- "Accept" button: Accent background, white text, hovers with scale-up
- "Decline" button: Icon only, destructive color on hover

**Interaction:**
- Click "Accept" → Event converts to "Confirmed" and moves to Upcoming tab
- Click "Decline" → Event deleted, toast confirmation

---

## 5. Events Page: Predicted Logistics Section

**Location:** Below each upcoming event card (when expanded)

### Collapsed State:
```
[⚡ Predicted Supply Needs] ▼
```

### Expanded State:
```
[⚡ Predicted Supply Needs] ▲
┌──────────────────────────────────────────┐
│ Cups        Beans (lbs)   Milk (L)       │
│ 185         18.5          22              │
│                                          │
│ Lids        Napkins       Confidence     │
│ 185         300           High            │
│                                          │
│ Based on 12 past events in this zip code │
└──────────────────────────────────────────┘
```

**Styling:**
- Button: accent/8 background, accent/20 border
- Metrics grid: Responsive 2/3 column layout
- Values: font-bold, large text (text-sm)
- Confidence badge: 
  - "High": accent/20 background, accent text
  - "Medium": accent/15 background, accent text
  - "Low": muted/30 background, muted text
- Methodology: Smaller text, muted color

**Responsive:**
- Mobile: 2-column grid (Cups/Beans/Lids, Milk/Napkins/Confidence)
- Desktop: 3-column grid

---

## 6. Content Page: Action Buttons

**New Layout:**
```
┌────────────────────────────────────────────────────┐
│ [✨ Generate variants] [💾 Publish] [🌐 Website]  │
│ Auto-saving...                                    │
└────────────────────────────────────────────────────┘
```

**Button Styling:**
- Generate variants: Accent background, white text, loading state
- Publish: Primary background, white text (unchanged)
- Website: Secondary background, dark text (new)
- All: hover-scale (2% up), active:scale-95

**Loading State:**
- During generation: "Generating..." text, button disabled, 50% opacity

---

## 7. Color Palette Reference

All new UI elements use existing design tokens:

```
ACCENT (Bloomi Red)        #e65a3c  ← Insight cards, Accept buttons, Keywords
PRIMARY (Deep Espresso)    #1a1410  ← Publish button
SECONDARY (Taupe)         #8b7355  ← Website button
DESTRUCTIVE (Red)         #ef4444  ← Decline button
MUTED/BACKGROUND          #b8a89b  ← Inactive, secondary text
BACKGROUND                #fffbf4  ← All section backgrounds
```

**Opacity Variations:**
- bg-accent/8: Very subtle (backgrounds)
- bg-accent/12: Slightly more visible (hover states)
- bg-accent/15: Keywords, medium emphasis
- bg-accent/20: Borders, stronger emphasis
- text-accent/70: Lighter text (labels)

---

## 8. Typography Reference

| Element | Font | Size | Weight | Usage |
|---------|------|------|--------|-------|
| Insight text | Body | sm (12px) | semibold | Card content |
| "Draft pitch" link | Body | xs (10px) | semibold | Action links |
| Generated variants section | Body | sm (12px) | semibold | Section headers |
| Keywords | Body | xs (10px) | semibold | Tags/labels |
| Logistics metrics | Body | sm (12px) | bold | Values |
| Logistics labels | Body | xs (10px) | semibold | Metric names |
| Tab headers | Body | sm (12px) | semibold | Tab labels |
| Lead name | Body | base (14px) | semibold | Card titles |

---

## 9. Animation & Interaction Patterns

### Hover States:
- Cards: `hover:bg-muted/30` (subtle lightening)
- Buttons: `hover-scale` (2% zoom + translate-y -0.5)
- Links: `opacity-70` fade

### Active/Tap States:
- All buttons: `active:scale-95` (compression feedback)
- Duration: 200ms ease-out

### Transitions:
- Toggle arrows: `rotate-180` on expand (200ms)
- Tab underlines: Smooth color transition

### Loading States:
- Generate button: Disabled appearance (50% opacity)
- Toasts: Sonner-based (bottom-right, accent colors)

---

## 10. Mobile Optimization

**Dashboard Insights:**
- Full width card layout
- Insights stack vertically on small screens
- Touch targets: 44px minimum height

**Content Variants:**
- Expanded view takes full textarea width
- Keywords wrap naturally
- Social/email excerpts use line-clamp-3 to prevent overflow

**Events Tabs:**
- Horizontal scroll on mobile (all tabs visible)
- Tab buttons pad with 16px
- Event cards stack vertically

**Logistics:**
- 2-column grid on mobile
- 3-column on tablets/desktop
- Metrics values remain readable (text-sm min)

---

## 11. Accessibility Features

- All buttons have aria-labels (delete, decline, etc.)
- Icons paired with text labels
- Color not sole indicator (icons + text for status)
- Focus rings present on all interactive elements
- Tab navigation supported
- Sufficient contrast (accent on background)

---

## Testing Visual Consistency

After deployment, verify:

- [ ] Insight cards match dashboard padding/spacing
- [ ] Generated content section aligns with textarea width
- [ ] Tab underlines smooth when switching
- [ ] Logistics grid cells remain aligned on resize
- [ ] All buttons respond to hover (scale-up)
- [ ] Tap feedback visible on mobile (scale-down)
- [ ] Colors match Bloomi brand (hex #e65a3c)
- [ ] Typography sizes consistent with app

---

**Version:** 1.0  
**Last Updated:** 2026-06-14  
**Design System:** Tiny Tulip Coffee Console v0.1
