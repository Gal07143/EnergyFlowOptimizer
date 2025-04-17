import { useState, useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, Activity } from "lucide-react";

interface WebSocketStatusProps {
  showTooltip?: boolean;
  showBadge?: boolean;
  className?: string;
}

export function WebSocketStatus({ 
  showTooltip = true,
  showBadge = false,
  className = ""
}: WebSocketStatusProps) {
  const { isConnected, connectionId } = useWebSocket();
  const [hasActivity, setHasActivity] = useState(false);
  
  // Flash activity indicator
  useEffect(() => {
    if (isConnected) {
      setHasActivity(true);
      
      const timeout = setTimeout(() => {
        setHasActivity(false);
      }, 500);
      
      return () => clearTimeout(timeout);
    }
  }, [isConnected, connectionId]);
  
  const statusIcon = isConnected 
    ? <Wifi className={`h-4 w-4 ${hasActivity ? 'text-green-500' : 'text-green-400'}`} />
    : <WifiOff className="h-4 w-4 text-red-500" />;
  
  const activityIndicator = hasActivity && (
    <Activity className="h-3 w-3 text-blue-500 absolute -top-1 -right-1 animate-pulse" />
  );
  
  const statusBadge = showBadge && (
    <Badge 
      variant={isConnected ? "default" : "destructive"}
      className="h-5 text-xs gap-1 px-1.5"
    >
      {statusIcon}
      <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
    </Badge>
  );
  
  const tooltipContent = (
    <div className="flex flex-col gap-2 p-1">
      <div className="flex items-center gap-2">
        <span className="font-semibold">Status:</span>
        <Badge variant={isConnected ? "default" : "destructive"}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </Badge>
      </div>
      {isConnected && connectionId && (
        <div className="text-xs text-muted-foreground">
          Connection ID: {connectionId}
        </div>
      )}
    </div>
  );
  
  if (showTooltip) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <div className={`relative ${className}`}>
              {showBadge ? statusBadge : statusIcon}
              {activityIndicator}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {tooltipContent}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return (
    <div className={`relative ${className}`}>
      {showBadge ? statusBadge : statusIcon}
      {activityIndicator}
    </div>
  );
}