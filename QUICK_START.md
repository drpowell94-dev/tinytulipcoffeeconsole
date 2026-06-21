# Quick Start Guide - Tiny Tulip Coffee Console

Get up and running with all features in 5 minutes.

---

## What's New?

✅ **Hamburger menu** - Mobile navigation sidebar  
✅ **Leads tab** - Inbound booking requests with accept/decline  
✅ **Dashboard insights** - AI recommendations based on business data  
✅ **Content variants** - Auto-generate social captions & email excerpts  
✅ **Instagram integration** - Backend ready (OAuth + webhooks)  
✅ **Event logistics** - Predict supply needs using historical data  
✅ **Redesigned UI** - All features now visible and accessible  

---

## Local Development

### 1. Start Dev Server

```bash
npm install
npm run dev
```

Your app runs at `http://localhost:5173`

### 2. Test Mobile View

- Open DevTools (F12)
- Click device icon → toggle mobile view
- See hamburger menu appear
- Tap hamburger to open sidebar

### 3. Test Leads Feature

Go to **Events** page:
1. Scroll to "Pending Leads" section (empty initially)
2. Click "+ Add a New Lead" button
3. Fill in:
   - Lead name: "Acme Corp"
   - Phone: "(555) 123-4567" (optional)
   - Notes: "Wedding reception, 100 guests" (optional)
4. Click "Add Lead"
5. Lead appears in pending leads section
6. Try:
   - **Accept** → converts to confirmed event
   - **Decline** → removes from queue

### 4. Test Dashboard Insights

Go to **Dashboard** page:
1. If no upcoming events, "Smart Recommendations" section appears below
2. Insights show:
   - Venue outreach suggestions
   - Revenue trend warnings
   - Prep reminders for tomorrow's events

Create an event to see how dashboard updates.

### 5. Test Content Generation

Go to **Content** page → **Blog** tab:
1. Select template: "Seasonal Drink Launch"
2. Change tone: "Casual"
3. Enter keywords: "fall, pumpkin spice, cozy"
4. Click "Generate variants"
5. See:
   - ✨ AI-Generated Content Variants section expands
   - 📱 Social Caption (Instagram-ready)
   - ✉️ Email Excerpt (newsletter-ready)
   - 🏷️ SEO Keywords (with hashtags)

You can now copy each section independently.

### 6. Test Event Logistics

Go to **Events** page:
1. Create an event with guest count
2. Click event to expand
3. Click "Predicted Supply Needs"
4. See predictions:
   - Cups needed
   - Coffee beans (lbs)
   - Milk (liters)
   - Confidence level (high/medium/low)
   - Methodology explanation

### 7. Test Instagram Connection

Go to **Content** page:
1. Scroll to Instagram integration banner
2. Click "Connect Instagram"
3. You'll be redirected to Instagram OAuth (in production)
4. Once authorized, account is linked

**Note:** Full Instagram automation requires:
- Instagram business account
- App credentials configured
- Edge functions deployed to Supabase

---

## Testing Checklist

### Dashboard
- [ ] Overview cards show correct counts
- [ ] Upcoming events listed
- [ ] Insights appear when no events
- [ ] Quick actions link to correct pages

### Events
- [ ] Hamburger menu toggles sidebar on mobile
- [ ] Pending leads section visible
- [ ] Can add new lead via quick form
- [ ] Accept converts lead to event
- [ ] Decline removes lead
- [ ] Event logistics expand/collapse
- [ ] Supply predictions show confidence level

### Content
- [ ] Blog generator loads templates
- [ ] Generate variants button works
- [ ] Variants section shows all three outputs:
  - Social caption
  - Email excerpt
  - Keywords
- [ ] Instagram connect button visible
- [ ] Blog auto-saves draft

### Logistics (if applicable)
- [ ] Checklists create with templates
- [ ] Can check off items
- [ ] Timestamps captured

### Inventory (if applicable)
- [ ] Low stock items highlighted
- [ ] Can update quantities
- [ ] Alerts show on dashboard

---

## Environment Variables (Local)

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add (for full feature testing):

```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_INSTAGRAM_CLIENT_ID=demo
VITE_INSTAGRAM_CLIENT_SECRET=demo
VITE_INSTAGRAM_REDIRECT_URI=http://localhost:5173/instagram-callback
VITE_INSTAGRAM_WEBHOOK_VERIFY_TOKEN=demo-token
```

Most features work without these (using mock/localStorage data).

---

## Production Checklist

Before deploying to production:

### Supabase
- [ ] Project created
- [ ] Database migrations run
- [ ] API credentials copied to Vercel env vars
- [ ] Service role key stored securely

### Edge Functions
- [ ] Functions deployed: `supabase functions deploy`
- [ ] Environment variables set in Supabase
- [ ] Functions accessible via REST

### Vercel
- [ ] Repository connected
- [ ] Environment variables configured
- [ ] Build successful
- [ ] Site deployed at custom domain

### Instagram (optional)
- [ ] Meta app created
- [ ] Client credentials generated
- [ ] OAuth redirect URI configured
- [ ] Webhook URL configured
- [ ] Instagram account connected

See **DEPLOYMENT_GUIDE.md** for detailed instructions.

---

## Common Issues

### Features Not Showing

**Problem:** Leads tab or insights not visible

**Solution:**
- Refresh page (Cmd/Ctrl + Shift + R)
- Check browser console for errors
- Verify environment variables loaded
- Try adding a test event

### Variants Not Generating

**Problem:** Content variants section stays empty

**Solution:**
- Edge function might not be deployed
- Check browser console for fetch errors
- Verify `VITE_SUPABASE_URL` is correct
- See DEPLOYMENT_GUIDE.md for edge function setup

### Instagram Not Connecting

**Problem:** "Instagram integration setup required" message

**Solution:**
- Instagram Client ID not set
- In production, set `VITE_INSTAGRAM_CLIENT_ID` in Vercel
- Meta app must be created first
- See DEPLOYMENT_GUIDE.md → Instagram Integration

### Mobile Menu Not Working

**Problem:** Hamburger doesn't toggle sidebar

**Solution:**
- Clear browser cache
- Hard refresh (Cmd/Ctrl + Shift + R)
- Check mobile view is active in DevTools
- Sidebar should appear on screens < 768px

---

## Feature Architecture

```
Frontend (React)
│
├─ Dashboard
│  └─ calls: generateInsights() → analyticsService
│     └─ fetches: /v1/dashboard-insights (edge function)
│
├─ Events
│  ├─ Leads Tab
│  │  └─ local: eventStore (localStorage)
│  │  └─ manual: createEvent(status='inquiry')
│  │
│  └─ Event Logistics
│     └─ calls: getPredictedNeeds() → logisticsService
│        └─ fetches: /v1/event-logistics (edge function)
│
├─ Content
│  ├─ Blog Generator
│  │  └─ calls: generateBlogDraft() → blogWriter
│  │  └─ fetches: /v1/content-generator (edge function)
│  │
│  └─ Instagram
│     └─ calls: generateInstagramAuthUrl() → instagramService
│        └─ redirects to: Instagram OAuth
│           └─ callback: /v1/instagram-callback (edge function)
│
└─ Layout
   └─ MainLayout with hamburger toggle for mobile sidebar

Database (Supabase PostgreSQL)
│
├─ Tables
│  ├─ events (core data)
│  ├─ event_contacts (client info)
│  ├─ instagram_integrations (OAuth tokens)
│  ├─ instagram_webhook_events (comment tracking)
│  ├─ dashboard_insights (cached recommendations)
│  └─ activity_log (audit trail)
│
└─ Edge Functions
   ├─ leads-booking (POST)
   ├─ dashboard-insights (GET)
   ├─ event-logistics (GET)
   ├─ content-generator (POST)
   ├─ instagram-auth (POST)
   ├─ instagram-callback (POST)
   ├─ instagram-webhook (POST/GET)
   └─ instagram-story-publish (POST)
```

---

## Next Steps After Testing

1. **Deploy to Vercel** - See DEPLOYMENT_GUIDE.md
2. **Set up Supabase** - Run migrations, deploy functions
3. **Connect Instagram** (optional) - Create Meta app, get credentials
4. **Configure Wix** (optional) - Set up webhook receiver for event imports
5. **Monitor logs** - Check edge function performance in production

---

## Support & Debugging

### View Logs
- **Frontend:** Browser DevTools → Console
- **Backend:** Supabase → Functions → [function name] → Logs
- **Edge:** Supabase → Functions → Deployments → [deployment] → Logs

### Common Queries
```sql
-- See latest events
SELECT * FROM events ORDER BY created_at DESC LIMIT 10;

-- See pending leads
SELECT * FROM events WHERE status = 'inquiry';

-- See Instagram integrations
SELECT instagram_username, is_active FROM instagram_integrations;

-- See webhook events
SELECT event_type, processed FROM instagram_webhook_events ORDER BY created_at DESC;
```

### Test Data Generator
Want test data for development?
```bash
# Create test events
npm run seed

# Clear test data
npm run clean-db
```

---

## Tips & Tricks

### Speed Up Development
- Use localhost with hot reload: `npm run dev`
- Edge functions auto-update on deploy
- Use DevTools to mock API responses
- localStorage persists across refreshes

### Debug Insights
- Check DashboardPage.tsx → generateInsights()
- Insights only show when upcoming.length === 0
- Add console.log() to analyticsService.ts to trace

### Debug Content Variants
- Check ContentPage.tsx → handleGenerate()
- Variants only show if content-generator returns data
- Look at VITE_SUPABASE_URL in browser DevTools

### Test Instagram Flow
1. Open browser DevTools → Network tab
2. Click "Connect Instagram"
3. Watch network request to Instagram auth URL
4. Verify redirect URI matches configuration

---

**Questions?** Check:
- FEATURES_GUIDE.md - Feature overview
- DEPLOYMENT_GUIDE.md - Production setup
- Individual service files - API details
- Supabase docs - Database help
