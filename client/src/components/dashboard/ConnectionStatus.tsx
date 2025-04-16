import { useWebSocket } from "@/hooks/useWebSocket";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, Clock, WifiOff } from "lucide-react";

interface ConnectionStatusProps {
  siteId: number;
}

export function ConnectionStatus({ siteId }: ConnectionStatusProps) {
  const [tooltipMessage, setTooltipMessage] = useState("Connecting to real-time data stream...");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  // Initialize WebSocket connection
  const { 
    isConnected, 
    lastMessage, 
    connectionAttempts, 
    connect, 
    subscribe 
  } = useWebSocket({
    autoConnect: true,
    autoReconnect: true,
    reconnectInterval: 2000,
    maxReconnectAttempts: 30,
    onOpen: () => {
      if (siteId) {
        subscribe(siteId);
      }
    },
    onMessage: (data) => {
      if (data.type === 'energyReading' || data.type === 'deviceReading') {
        setLastUpdate(new Date());
      }
    }
  });
  
  // Subscribe to site when siteId changes
  useEffect(() => {
    if (isConnected && siteId) {
      subscribe(siteId);
    }
  }, [isConnected, siteId, subscribe]);
  
  // Update tooltip message based on connection status
  useEffect(() => {
    if (!isConnected) {
      setTooltipMessage(
        connectionAttempts > 1 
          ? `Reconnecting to data stream (Attempt ${connectionAttempts})...` 
          : "Connecting to real-time data stream..."
      );
    } else {
      if (lastUpdate) {
        const seconds = Math.floor((new Date().getTime() - lastUpdate.getTime()) / 1000);
        
        if (seconds < 60) {
          setTooltipMessage(`Last update: ${seconds} seconds ago`);
        } else if (seconds < 3600) {
          const minutes = Math.floor(seconds / 60);
          setTooltipMessage(`Last update: ${minutes} minute${minutes !== 1 ? 's' : ''} ago`);
        } else {
          const hours = Math.floor(seconds / 3600);
          setTooltipMessage(`Last update: ${hours} hour${hours !== 1 ? 's' : ''} ago`);
        }
      } else {
        setTooltipMessage("Connected to real-time data stream. Waiting for data...");
      }
    }
  }, [isConnected, lastUpdate, connectionAttempts]);
  
  // Update time ago message every minute
  useEffect(() => {
    if (!lastUpdate) return;
    
    const interval = setInterval(() => {
      const seconds = Math.floor((new Date().getTime() - lastUpdate.getTime()) / 1000);
      
      if (seconds < 60) {
        setTooltipMessage(`Last update: ${seconds} seconds ago`);
      } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        setTooltipMessage(`Last update: ${minutes} minute${minutes !== 1 ? 's' : ''} ago`);
      } else {
        const hours = Math.floor(seconds / 3600);
        setTooltipMessage(`Last update: ${hours} hour${hours !== 1 ? 's' : ''} ago`);
      }
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [lastUpdate]);
  
  // Determine status icon and badge style
  const getStatusBadge = () => {
    if (!isConnected) {
      return {
        icon: <WifiOff className="h-3 w-3 mr-1" />,
        variant: "destructive" as const,
        text: "Disconnected"
      };
    }
    
    if (!lastUpdate) {
      return {
        icon: <Clock className="h-3 w-3 mr-1" />,
        variant: "secondary" as const,
        text: "Waiting for data"
      };
    }
    
    const secondsSinceLastUpdate = Math.floor((new Date().getTime() - lastUpdate.getTime()) / 1000);
    
    if (secondsSinceLastUpdate < 60) {
      return {
        icon: <CheckCircle className="h-3 w-3 mr-1" />,
        variant: "default" as const,
        text: "Real-time"
      };
    }
    
    if (secondsSinceLastUpdate < 300) { // 5 minutes
      return {
        icon: <CheckCircle className="h-3 w-3 mr-1" />,
        variant: "outline" as const,
        text: "Connected"
      };
    }
    
    return {
      icon: <AlertCircle className="h-3 w-3 mr-1" />,
      variant: "secondary" as const,
      text: "Stale data"
    };
  };
  
  const { icon, variant, text } = getStatusBadge();
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            <Badge variant={variant} className="cursor-help flex items-center">
              {icon}
              <span>{text}</span>
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipMessage}</p>
          {!isConnected && (
            <button 
              onClick={() => connect()}
              className="text-xs underline mt-1 text-primary"
            >
              Click to reconnect
            </button>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}