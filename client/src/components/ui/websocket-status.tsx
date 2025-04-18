import { useWebSocket } from '@/hooks/WebSocketProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, AlertTriangle, RefreshCw } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface WebSocketStatusProps {
  showBadge?: boolean;
  showRefresh?: boolean;
}

export function WebSocketStatus({ showBadge = false, showRefresh = false }: WebSocketStatusProps) {
  const { connected, reconnect } = useWebSocket();

  // Map connection state based on connected status
  const getStatusDetails = () => {
    if (connected) {
      return {
        icon: <Wifi className="h-4 w-4" />,
        label: 'Connected',
        badgeVariant: 'default' as const,
        tooltipText: 'Real-time data connection is active'
      };
    } else {
      return {
        icon: <WifiOff className="h-4 w-4" />,
        label: 'Disconnected',
        badgeVariant: 'outline' as const,
        tooltipText: 'Not connected to real-time data'
      };
    }
  };

  const { icon, label, badgeVariant, tooltipText } = getStatusDetails();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            {showBadge ? (
              <Badge variant={badgeVariant} className="flex items-center gap-2 py-1">
                {icon}
                <span>{label}</span>
              </Badge>
            ) : (
              <span className="flex items-center">{icon}</span>
            )}
            
            {showRefresh && !connected && (
              <Button 
                variant="ghost" 
                size="icon"
                className="h-8 w-8"
                onClick={() => reconnect()}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}