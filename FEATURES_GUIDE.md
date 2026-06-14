# Features Guide - Tiny Tulip Coffee Console

Complete guide to all features now visible in the app. Each feature is designed to automate business operations and improve decision-making.

---

## Dashboard

### Overview Cards
- **Events This Week** - Count of upcoming events (next 7 days)
- **Drinks This Month** - Total drinks sold from saved sessions
- **Revenue This Month** - Sum of all drink sales this month
- **Low Stock Items** - Count of inventory items below reorder level

### Upcoming Events Section
Shows next 7 days of confirmed events with:
- Event name, date, location
- Time remaining (e.g., "3d away" or "Today")
- Quick link to drink counter

### Smart Recommendations (Insights)
Shows when there are no upcoming events:
- **Venue Outreach** - AI suggests most profitable venues to target based on past events
- **Revenue Trends** - Alerts if revenue is declining month-over-month
- **Prep Reminders** - Notifications for events happening tomorrow with unchecked checklists
- **Lead Opportunities** - Recommendations based on pending leads

### Quick Actions
- New Event
- New Blog Post
- Inventory Management

---

## Events

### Pending Leads Section
Inbound booking requests that need responses. For each lead:
- Lead name and contact date
- **Accept** button - converts to confirmed event (adds to calendar, creates checklist)
- **Decline** button - removes lead from queue

**How Leads Arrive:**
- Website booking form submissions via `/v1/leads-booking` edge function
- Manual creation via "Add a New Lead" button
- Imported from Wix if using Wix integration

### Event Tabs

**Upcoming Tab:**
- All confirmed events for the next 30+ days
- Shows: name, date, location, guest count, pre-orders
- "Counter" button links to drink tracking interface
- Expandable "Predicted Supply Needs" showing:
  - Estimated cups, beans, milk needed
  - Confidence level (high/medium/low)
  - Methodology explanation

**Past Tab:**
- Historical events with drink counts and revenue
- Sortable by date (newest first)
- View session details and export data

**Leads Tab:**
- All pending leads awaiting response
- Accept/Decline actions
- Shows contact info and special notes

### Create Event Form
Create new events or leads with:
- Event name, type (popup, catering, farmers market)
- Status: Lead (Inquiry) or Confirmed
- Date and location
- Guest count, pre-orders, estimated revenue
- Contact information and notes

---

## Content & Website

### Blog Generator

**Templates:**
- Coffee Origin Spotlight - Tell the story of a coffee bean origin
- Seasonal Drink Launch - Announce a new seasonal menu item
- Community Update - Share event recap or business news

**AI Features:**
1. **Auto-Generate Draft** - Click "Generate variants" to:
   - Write a full blog post from template
   - Generate social media caption
   - Extract email newsletter excerpt
   - Create SEO keywords

2. **Content Variants** (shown when generated):
   - **Social Caption** - Pre-formatted for Instagram/TikTok
   - **Email Excerpt** - Copy-paste into newsletters
   - **SEO Keywords** - Pre-filled metadata for search optimization

**Publishing:**
- Save as draft (auto-saves every 2 seconds)
- Publish to blog
- Sync to website (if Wix integration enabled)

### Website Management

Quick updates without touching code:
- **Operating Hours** - Update business hours
- **Seasonal Menu** - Add/remove seasonal items
- **Alert Banner** - Show closure/event announcements

### Instagram Integration

**Connect Instagram:**
1. Click "Connect Instagram" banner
2. Authorize Tiny Tulip app
3. Account is linked for automated features

**Features (once connected):**
- **Auto-Reply to Comments** - When comments mention "catering", "menu", "booking", or "event", automatically send DM with booking link
- **Event Stories** - Publish event details as Instagram Stories (date, location, guest count)
- **DM Tracking** - Store conversation history for reference

---

## Logistics

### Checklist Manager

Pre-built templates based on event type:
- **Catering Setup** - Espresso machine, grinders, syrups, cups, milk
- **Farmers Market** - Tent, weights, display, point of sale system
- **Pop-up Event** - Minimal setup checklist

**Features:**
- Create checklists for events
- Check off items with timestamps
- See who checked what and when
- Archive completed checklists
- Export to PDF for printing

### Predictive Needs

The app learns from past events and predicts:
- How many cups you'll need
- How much coffee beans (in lbs)
- How much milk (in liters)
- How many napkins, lids, etc.

Factors considered:
- Guest count
- Event type
- Historical usage data
- Seasonal trends

---

## Inventory

### Stock Tracking

Monitor core supplies:
- Coffee beans, milk, cups, lids, napkins
- Equipment (espresso machine, grinder, scales)
- Current quantity vs. reorder level
- Visual alerts when low stock

### Low Stock Alerts
- Dashboard shows count of items below reorder level
- Red highlighting for critical items
- Reorder level is customizable per item

### Usage History
- Track consumption linked to events
- See which items are used most
- Plan restocking schedule

---

## Features Map

```
Dashboard
├─ Overview Cards (events, drinks, revenue, low stock)
├─ Upcoming Events (with counter links)
├─ Smart Insights (venue outreach, revenue trends, prep reminders)
└─ Quick Actions (new event, new blog, inventory)

Events
├─ Pending Leads Section
│  ├─ Accept/Decline actions
│  └─ Quick Lead Form
├─ Event Tabs
│  ├─ Upcoming (with predicted supply needs)
│  ├─ Past (with revenue data)
│  └─ Leads (pending inquiries)
└─ Create Event Form (with status selection)

Content & Website
├─ Blog Generator
│  ├─ Templates (origin, seasonal, community)
│  ├─ Generate Variants
│  │  ├─ Social Caption
│  │  ├─ Email Excerpt
│  │  └─ SEO Keywords
│  └─ Publish/Draft
├─ Website Management
│  ├─ Operating Hours
│  ├─ Seasonal Menu
│  └─ Alert Banner
└─ Instagram Integration
   ├─ Connect Account
   ├─ Auto-Reply to Comments
   ├─ Event Stories
   └─ DM Tracking

Logistics
├─ Checklist Manager
│  ├─ Templates (catering, farmers market, popup)
│  ├─ Check-off with timestamps
│  └─ Archive/Export
└─ Predictive Needs
   ├─ Cup estimates
   ├─ Bean consumption
   └─ Confidence levels

Inventory
├─ Stock Tracker
├─ Low Stock Alerts
└─ Usage History
```

---

## API Endpoints

All features use backend APIs. Edge functions available at:

- `POST /v1/leads-booking` - Accept website form submissions
- `GET /v1/dashboard-insights` - Fetch AI insights
- `GET /v1/event-logistics` - Predict supply needs
- `POST /v1/content-generator` - Generate content variants
- `POST /v1/instagram-auth` - Get OAuth authorization URL
- `POST /v1/instagram-callback` - Handle OAuth callback
- `POST /v1/instagram-webhook` - Receive webhook events
- `POST /v1/instagram-story-publish` - Publish Instagram Stories

See `API_ENDPOINTS.md` for detailed specs.

---

## Data Flow

### Lead to Booking
```
Website Booking Form
    ↓
POST /v1/leads-booking
    ↓
Create event with status='inquiry'
    ↓
Dashboard shows under Pending Leads
    ↓
Accept → status='confirmed' → creates checklist
or
Decline → event deleted
```

### Content Publishing
```
Write Blog Post
    ↓
Click "Generate Variants"
    ↓
POST /v1/content-generator
    ↓
Returns: social caption, email excerpt, keywords
    ↓
Publish → saves to blog
    ↓
Click "Website" → syncs to Wix CMS
```

### Instagram Automation
```
Instagram Comment: "Do you do catering?"
    ↓
Instagram Webhook → POST /v1/instagram-webhook
    ↓
Keyword match → generates booking link
    ↓
Auto-send DM: "Check our catering: [link]"
    ↓
Store in instagram_dm_conversations table
```

### Event Preparation
```
Event created
    ↓
Auto-create packing checklist
    ↓
Team checks off items (24hrs before)
    ↓
Dashboard reminds: "Complete prep checklist!"
    ↓
Event day → use drink counter
    ↓
End session → save to history
    ↓
Dashboard shows: drinks sold, revenue
```

---

## Tips & Tricks

### Maximize Insights
- Complete all event data (guest count, revenue estimates)
- Mark events as completed when done
- Let the system track usage over time
- Insights improve with more historical data

### Content Multiplier
- Generate variants once, use across channels
- Copy-paste social caption to Instagram, TikTok, Twitter
- Email excerpt → newsletter, promotional emails
- SEO keywords → meta tags, alt text

### Lead Management
- Review pending leads daily
- Set expectations for response time
- Log follow-ups in notes field
- Track conversion rate (accepted vs declined)

### Logistics Accuracy
- Record actual usage (not just predictions)
- Update guest count when finalized
- Review predictions after each event
- System learns from your patterns

---

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

---

## Keyboard Shortcuts

- **Cmd/Ctrl + K** - Focus search (future feature)
- **Cmd/Ctrl + N** - New event
- **Cmd/Ctrl + B** - New blog post
- **Enter** - Submit forms

---

## Offline Support

The drink counter works fully offline:
- All data stored in localStorage
- Automatic sync when reconnected
- No data loss even without internet

Other sections require internet connection.

---

## Data Security

- Supabase handles authentication
- Row-level security policies (RLS) protect data
- Edge functions validate all inputs
- Instagram tokens stored securely
- No sensitive data exposed to frontend

---

## Roadmap

Planned features:
- Email notification system
- Slack integration
- Advanced analytics dashboard
- Multi-user account management
- Mobile app for on-site management
- Real-time collaboration
- Custom reports builder

---

**Questions?** Check `DEPLOYMENT_GUIDE.md` for setup help or review individual service files for API details.
