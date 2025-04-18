import React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { AlertCircle, Battery, PanelTop, ThermometerSun, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

interface DeviceHealthCardProps {
  deviceId: number;
  deviceName: string;
  deviceType: string;
  healthScore: number;
  healthStatus: string;
  lastUpdated?: Date;
  remainingLife?: number;
  anomalyDetected?: boolean;
  onAnalyze: () => void;
  onViewDetails: () => void;
}

const getHealthColor = (score: number): string => {
  if (score >= 90) return "bg-green-500";
  if (score >= 70) return "bg-yellow-500";
  if (score >= 50) return "bg-orange-500";
  return "bg-red-500";
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "good":
      return <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">Good</Badge>;
    case "fair":
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Fair</Badge>;
    case "poor":
      return <Badge variant="outline" className="bg-orange-100 text-orange-800 hover:bg-orange-100">Poor</Badge>;
    case "critical":
      return <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-100">Critical</Badge>;
    default:
      return <Badge variant="outline" className="bg-gray-100 text-gray-800 hover:bg-gray-100">Unknown</Badge>;
  }
};

const DeviceIcon = ({ type }: { type: string }) => {
  switch (type) {
    case "battery_storage":
      return <Battery className="h-8 w-8 text-primary" />;
    case "solar_pv":
      return <PanelTop className="h-8 w-8 text-primary" />;
    case "inverter":
      return <Zap className="h-8 w-8 text-primary" />;
    default:
      return <ThermometerSun className="h-8 w-8 text-primary" />;
  }
};

const DeviceHealthCard: React.FC<DeviceHealthCardProps> = ({
  deviceId,
  deviceName,
  deviceType,
  healthScore,
  healthStatus,
  lastUpdated,
  remainingLife,
  anomalyDetected,
  onAnalyze,
  onViewDetails,
}) => {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <DeviceIcon type={deviceType} />
            <div>
              <CardTitle className="text-lg">{deviceName}</CardTitle>
              <CardDescription className="capitalize text-xs">
                {deviceType.replace("_", " ")}
              </CardDescription>
            </div>
          </div>
          {getStatusBadge(healthStatus)}
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Health Score</span>
            <span className="font-semibold">{healthScore}%</span>
          </div>
          <Progress value={healthScore} className={`h-2 ${getHealthColor(healthScore)}`} />
          
          {anomalyDetected && (
            <div className="flex items-center gap-1 text-red-500 text-xs mt-2">
              <AlertCircle className="h-4 w-4" />
              <span>Anomaly detected</span>
            </div>
          )}
          
          {remainingLife !== undefined && (
            <div className="text-xs text-muted-foreground mt-1">
              <span>Estimated remaining life: </span>
              <span className="font-medium">
                {remainingLife > 365
                  ? `${Math.round(remainingLife / 365)} years`
                  : `${remainingLife} days`}
              </span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between pt-2">
        <div className="text-xs text-muted-foreground">
          {lastUpdated && `Updated ${formatDistanceToNow(new Date(lastUpdated))} ago`}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onAnalyze}>
            Analyze
          </Button>
          <Button variant="default" size="sm" onClick={onViewDetails}>
            Details
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default DeviceHealthCard;