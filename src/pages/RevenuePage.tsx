import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { loadEvents, EVENT_TYPE_LABELS } from "@/lib/eventStore";
import { loadVenues, resolveVenue } from "@/lib/venueStore";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function RevenuePage() {
  const venues = loadVenues();
  const events = loadEvents()
    .filter(e => e.status !== "cancelled" && (e.estimatedRevenue || 0) > 0)
    .sort((a, b) => b.dateStart.localeCompare(a.dateStart));

  const total = events.reduce((sum, e) => sum + (e.estimatedRevenue || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/dashboard" className="p-2 rounded-lg hover:bg-muted/30 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="font-display text-2xl text-foreground">Revenue</h1>
          <p className="text-sm font-body text-muted-foreground">Where the money is coming from, by event</p>
        </div>
      </div>

      <div className="rounded-lg bg-muted/20 p-5">
        <p className="text-xs font-body text-muted-foreground">Total (all events shown below)</p>
        <p className="font-display text-3xl text-foreground">{formatCurrency(total)}</p>
      </div>

      <div className="rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-sm font-body">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-semibold">Venue</th>
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold text-right">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {events.map(e => {
              const venue = resolveVenue(e, venues);
              return (
                <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/15">
                  <td className="px-4 py-3 text-foreground font-semibold">{venue?.name || e.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(e.dateStart)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{EVENT_TYPE_LABELS[e.eventType]}</td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">{e.status}</td>
                  <td className="px-4 py-3 text-right text-foreground font-semibold">{formatCurrency(e.estimatedRevenue || 0)}</td>
                </tr>
              );
            })}
            {events.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No revenue recorded yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
