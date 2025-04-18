import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, AlertTriangle, AlertCircle, Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export interface MaintenanceAlert {
  id: number;
  deviceId: number;
  deviceName?: string;
  alertType: string;
  message: string;
  severity: "low" | "medium" | "high" | "critical";
  triggeredAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: number;
  metricName?: string;
  triggerValue?: number;
}

interface MaintenanceAlertsListProps {
  alerts: MaintenanceAlert[];
  onAcknowledge: (alertId: number) => void;
  onView: (alertId: number) => void;
}

const getSeverityBadge = (severity: string) => {
  switch (severity) {
    case "low":
      return <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-100">Low</Badge>;
    case "medium":
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Medium</Badge>;
    case "high":
      return <Badge variant="outline" className="bg-orange-100 text-orange-800 hover:bg-orange-100">High</Badge>;
    case "critical":
      return <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-100">Critical</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
};

const getAlertTypeIcon = (alertType: string) => {
  switch (alertType) {
    case "threshold_exceeded":
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    case "anomaly_detected":
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    case "failure_predicted":
      return <Bell className="h-5 w-5 text-purple-500" />;
    default:
      return <AlertTriangle className="h-5 w-5 text-gray-500" />;
  }
};

const AlertItem: React.FC<{
  alert: MaintenanceAlert;
  onAcknowledge: (alertId: number) => void;
  onView: (alertId: number) => void;
}> = ({ alert, onAcknowledge, onView }) => {
  return (
    <Card className="mb-3">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            {getAlertTypeIcon(alert.alertType)}
            <div>
              <CardTitle className="text-sm">{alert.deviceName || `Device ${alert.deviceId}`}</CardTitle>
              <CardDescription className="text-xs capitalize">
                {alert.alertType.replace(/_/g, " ")}
              </CardDescription>
            </div>
          </div>
          {getSeverityBadge(alert.severity)}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">{alert.message}</p>
        <div className="flex justify-between items-end">
          <div className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(alert.triggeredAt))} ago
          </div>
          <div className="flex gap-2">
            {!alert.acknowledgedAt && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onAcknowledge(alert.id)}
                className="text-xs h-7 px-2"
              >
                <Check className="h-3 w-3 mr-1" />
                Acknowledge
              </Button>
            )}
            <Button 
              variant="default" 
              size="sm" 
              onClick={() => onView(alert.id)}
              className="text-xs h-7 px-2"
            >
              View
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const MaintenanceAlertsList: React.FC<MaintenanceAlertsListProps> = ({
  alerts,
  onAcknowledge,
  onView,
}) => {
  if (alerts.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            <Check className="mx-auto h-8 w-8 mb-2" />
            <p>No maintenance alerts</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <AlertItem
          key={alert.id}
          alert={alert}
          onAcknowledge={onAcknowledge}
          onView={onView}
        />
      ))}
    </div>
  );
};

export default MaintenanceAlertsList;