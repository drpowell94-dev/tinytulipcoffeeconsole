import { useEffect, useState } from "react";
import { TrendingUp, Users, CheckCircle2, XCircle, Clock } from "lucide-react";
import { getConversionFunnel, type ConversionFunnel } from "@/services/leadMetricsService";
import { cn } from "@/lib/utils";

export default function ConversionFunnelWidget({ userId }: { userId?: string }) {
  const [funnel, setFunnel] = useState<ConversionFunnel | null>(null);

  useEffect(() => {
    if (!userId) return;

    const loadFunnel = async () => {
      const data = await getConversionFunnel(userId);
      setFunnel(data);
    };

    loadFunnel();
  }, [userId]);

  if (!funnel) return null;

  return (
    <div className="rounded-lg bg-muted/20 p-6 space-y-6">
      <div className="flex items-center gap-2">
        <TrendingUp size={20} className="text-accent" strokeWidth={1.75} />
        <h2 className="font-display text-lg text-foreground">Conversion Funnel</h2>
      </div>

      {/* Main metrics row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          icon={<Users size={18} />}
          label="Total Leads"
          value={funnel.totalLeads}
          sublabel={`${funnel.totalLeads} this month`}
        />
        <MetricCard
          icon={<CheckCircle2 size={18} />}
          label="Accepted"
          value={funnel.acceptedLeads}
          sublabel={`${funnel.acceptanceRate}% acceptance`}
          highlight="success"
        />
        <MetricCard
          icon={<XCircle size={18} />}
          label="Declined"
          value={funnel.declinedLeads}
          sublabel={`${100 - funnel.acceptanceRate}% decline`}
          highlight="destructive"
        />
        <MetricCard
          icon={<TrendingUp size={18} />}
          label="Converted"
          value={funnel.convertedLeads}
          sublabel={`${funnel.conversionRate}% conversion`}
          highlight="accent"
        />
      </div>

      {/* Funnel visualization */}
      <div className="space-y-2">
        <FunnelBar
          label="Leads Received"
          count={funnel.totalLeads}
          percentage={100}
          color="muted"
        />
        <FunnelBar
          label="Accepted & Pending"
          count={funnel.acceptedLeads}
          percentage={funnel.acceptanceRate}
          color="accent"
        />
        <FunnelBar
          label="Converted to Booking"
          count={funnel.convertedLeads}
          percentage={funnel.conversionRate}
          color="success"
        />
      </div>

      {/* Response time */}
      {funnel.averageResponseTime > 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
          <Clock size={16} className="text-muted-foreground" />
          <div>
            <p className="text-xs font-body font-semibold text-muted-foreground">
              Avg Response Time
            </p>
            <p className="text-sm font-body font-bold text-foreground">
              {Math.floor(funnel.averageResponseTime / 60)} hours{" "}
              {funnel.averageResponseTime % 60} min
            </p>
          </div>
        </div>
      )}

      {/* By source breakdown */}
      {Object.keys(funnel.bySource).length > 0 && (
        <div className="space-y-2 border-t border-border pt-4">
          <p className="text-xs font-body font-semibold text-muted-foreground uppercase">
            By Source
          </p>
          <div className="space-y-1">
            {Object.entries(funnel.bySource).map(([source, stats]) => (
              <div
                key={source}
                className="flex items-center justify-between text-sm font-body"
              >
                <span className="text-foreground capitalize">{source}</span>
                <span className="text-muted-foreground">
                  {stats.total} leads • {stats.rate}% convert
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div className="rounded-lg bg-accent/8 p-3 text-xs font-body text-foreground space-y-1">
        {funnel.acceptanceRate < 70 && (
          <p>💡 Responding within 2 hours increases acceptance by 35%</p>
        )}
        {funnel.conversionRate < 50 && funnel.acceptedLeads > 0 && (
          <p>💡 Follow up with accepted leads within 24 hours for faster conversions</p>
        )}
        {funnel.totalLeads === 0 && (
          <p>💡 No leads yet. Share your booking link on Instagram and Wix to start receiving inquiries.</p>
        )}
      </div>
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
