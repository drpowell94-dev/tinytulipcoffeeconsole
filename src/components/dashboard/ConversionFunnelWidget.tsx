import { useEffect, useState } from "react";
import { TrendingUp, Users, CheckCircle2, XCircle, Clock, ChevronDown } from "lucide-react";
import { getConversionFunnel, type ConversionFunnel } from "@/services/leadMetricsService";
import { cn } from "@/lib/utils";

export default function ConversionFunnelWidget({ userId }: { userId?: string }) {
  const [funnel, setFunnel] = useState<ConversionFunnel | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const loadFunnel = async () => {
      const data = await getConversionFunnel(userId);
      setFunnel(data);
    };

    loadFunnel();
  }, [userId]);

  // Show empty state even without data
  const displayFunnel = funnel || {
    totalLeads: 0,
    acceptedLeads: 0,
    declinedLeads: 0,
    convertedLeads: 0,
    acceptanceRate: 0,
    conversionRate: 0,
    averageResponseTime: 0,
    bySource: {},
  };

  // No active leads → collapse to a single quiet line so it doesn't eat prime space.
  if (displayFunnel.totalLeads === 0) {
    return (
      <div className="rounded-lg bg-muted/20 p-4 flex items-center gap-3">
        <TrendingUp size={18} className="text-accent shrink-0" strokeWidth={1.75} />
        <div className="min-w-0">
          <p className="font-body font-semibold text-sm text-foreground">Conversion Funnel</p>
          <p className="text-xs font-body text-muted-foreground">
            No active leads yet — share your booking link on Instagram and Wix to start tracking.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-muted/20 p-5 space-y-4">
      {/* Condensed header: title + inline summary + expand toggle */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between gap-3 text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <TrendingUp size={20} className="text-accent shrink-0" strokeWidth={1.75} />
          <h2 className="font-display text-lg text-foreground">Conversion Funnel</h2>
        </div>
        <ChevronDown size={18} className={cn("text-muted-foreground shrink-0 transition-transform", expanded && "rotate-180")} />
      </button>

      <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm font-body">
        <span className="text-foreground"><b className="font-display">{displayFunnel.totalLeads}</b> leads</span>
        <span className="text-green-600 dark:text-green-400"><b className="font-display">{displayFunnel.acceptedLeads}</b> accepted ({displayFunnel.acceptanceRate}%)</span>
        <span className="text-accent"><b className="font-display">{displayFunnel.convertedLeads}</b> converted ({displayFunnel.conversionRate}%)</span>
      </div>

      {expanded && (
        <div className="space-y-6 pt-2">
          {/* Main metrics row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard icon={<Users size={18} />} label="Total Leads" value={displayFunnel.totalLeads} sublabel={`${displayFunnel.totalLeads} this month`} />
            <MetricCard icon={<CheckCircle2 size={18} />} label="Accepted" value={displayFunnel.acceptedLeads} sublabel={`${displayFunnel.acceptanceRate}% acceptance`} highlight="success" />
            <MetricCard icon={<XCircle size={18} />} label="Declined" value={displayFunnel.declinedLeads} sublabel={`${100 - displayFunnel.acceptanceRate}% decline`} highlight="destructive" />
            <MetricCard icon={<TrendingUp size={18} />} label="Converted" value={displayFunnel.convertedLeads} sublabel={`${displayFunnel.conversionRate}% conversion`} highlight="accent" />
          </div>

          {/* Funnel visualization */}
          <div className="space-y-2">
            <FunnelBar label="Leads Received" count={displayFunnel.totalLeads} percentage={100} color="muted" />
            <FunnelBar label="Accepted & Pending" count={displayFunnel.acceptedLeads} percentage={displayFunnel.acceptanceRate} color="accent" />
            <FunnelBar label="Converted to Booking" count={displayFunnel.convertedLeads} percentage={displayFunnel.conversionRate} color="success" />
          </div>

          {/* Response time */}
          {displayFunnel.averageResponseTime > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
              <Clock size={16} className="text-muted-foreground" />
              <div>
                <p className="text-xs font-body font-semibold text-muted-foreground">Avg Response Time</p>
                <p className="text-sm font-body font-bold text-foreground">
                  {Math.floor(displayFunnel.averageResponseTime / 60)} hours {displayFunnel.averageResponseTime % 60} min
                </p>
              </div>
            </div>
          )}

          {/* By source breakdown */}
          {Object.keys(displayFunnel.bySource).length > 0 && (
            <div className="space-y-2 border-t border-border pt-4">
              <p className="text-xs font-body font-semibold text-muted-foreground uppercase">By Source</p>
              <div className="space-y-1">
                {Object.entries(displayFunnel.bySource).map(([source, stats]) => (
                  <div key={source} className="flex items-center justify-between text-sm font-body">
                    <span className="text-foreground capitalize">{source}</span>
                    <span className="text-muted-foreground">{stats.total} leads • {stats.rate}% convert</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {(displayFunnel.acceptanceRate < 70 || (displayFunnel.conversionRate < 50 && displayFunnel.acceptedLeads > 0)) && (
            <div className="rounded-lg bg-accent/8 p-3 text-xs font-body text-foreground space-y-1">
              {displayFunnel.acceptanceRate < 70 && <p>💡 Responding within 2 hours increases acceptance by 35%</p>}
              {displayFunnel.conversionRate < 50 && displayFunnel.acceptedLeads > 0 && (
                <p>💡 Follow up with accepted leads within 24 hours for faster conversions</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  sublabel,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sublabel: string;
  highlight?: "accent" | "success" | "destructive" | "muted";
}) {
  const colorMap = {
    accent: "text-accent",
    success: "text-green-600 dark:text-green-400",
    destructive: "text-destructive",
    muted: "text-muted-foreground",
  };

  return (
    <div className="rounded-lg bg-background/50 p-3 space-y-1">
      <div className={cn("text-foreground/60", icon && colorMap[highlight || "muted"])}>
        {icon}
      </div>
      <p className="text-2xl font-display font-bold text-foreground">{value}</p>
      <p className="text-[10px] font-body text-muted-foreground">{label}</p>
      <p className="text-xs font-body font-semibold text-muted-foreground">{sublabel}</p>
    </div>
  );
}

function FunnelBar({
  label,
  count,
  percentage,
  color,
}: {
  label: string;
  count: number;
  percentage: number;
  color: "muted" | "accent" | "success" | "destructive";
}) {
  const colorMap: Record<"muted" | "accent" | "success" | "destructive", string> = {
    muted: "bg-muted",
    accent: "bg-accent",
    success: "bg-green-600/70 dark:bg-green-700",
    destructive: "bg-destructive/70",
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-body font-semibold text-foreground">{label}</span>
        <span className="text-xs font-body text-muted-foreground">{count}</span>
      </div>
      <div className="h-8 rounded-lg bg-muted/30 overflow-hidden">
        <div
          className={cn("h-full rounded-lg flex items-center px-2 text-xs font-semibold transition-all", colorMap[color])}
          style={{ width: `${Math.max(percentage, 5)}%` }}
        >
          {percentage > 20 && <span className="text-white/90">{percentage}%</span>}
        </div>
      </div>
    </div>
  );
}
