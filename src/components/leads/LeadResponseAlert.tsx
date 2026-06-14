import { useEffect, useState } from "react";
import { AlertTriangle, Clock } from "lucide-react";
import { getPendingLeadsWithAlerts } from "@/services/leadMetricsService";

interface PendingLeadAlert {
  leadId: string;
  leadName: string;
  hoursOverdue: number;
  createdAt: string;
}

export default function LeadResponseAlert({ userId }: { userId?: string }) {
  const [alerts, setAlerts] = useState<PendingLeadAlert[]>([]);

  useEffect(() => {
    if (!userId) return;

    const loadAlerts = async () => {
      const pendingLeads = await getPendingLeadsWithAlerts(userId);
      setAlerts(pendingLeads || []);
    };

    loadAlerts();
    // Check every 5 minutes
    const interval = setInterval(loadAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [userId]);

  if (alerts.length === 0) return null;

  return (
    <div className="rounded-lg border-l-4 border-destructive bg-destructive/10 p-5 space-y-2">
      <div className="flex items-center gap-2">
        <AlertTriangle size={18} className="text-destructive" strokeWidth={2} />
        <h3 className="font-body font-semibold text-foreground">
          {alerts.length} lead{alerts.length !== 1 ? "s" : ""} waiting for response
        </h3>
      </div>
      <div className="space-y-1">
        {alerts.map(alert => (
          <div key={alert.leadId} className="flex items-center justify-between text-sm font-body">
            <span className="text-foreground">{alert.leadName}</span>
            <span className="flex items-center gap-1 text-destructive font-semibold">
              <Clock size={14} />
              {alert.hoursOverdue}h overdue
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Quick responses increase acceptance rates by up to 40%
      </p>
    </div>
  );
}
