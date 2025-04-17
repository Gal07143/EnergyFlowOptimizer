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
  const { connectionState, connect } = useWebSocket();

  // Map connection state to colors and icons
  const getStatusDetails = () => {
    switch (connectionState) {
      case 'connected':
        return {
          icon: <Wifi className="h-4 w-4" />,
          label: 'Connected',
          badgeVariant: 'default' as const,
          tooltipText: 'Real-time data connection is active'
        };
      case 'connecting':
        return {
          icon: <RefreshCw className="h-4 w-4 animate-spin" />,
          label: 'Connecting',
          badgeVariant: 'secondary' as const,
          tooltipText: 'Establishing real-time data connection'
        };
      case 'disconnected':
        return {
          icon: <WifiOff className="h-4 w-4" />,
          label: 'Disconnected',
          badgeVariant: 'outline' as const,
          tooltipText: 'Not connected to real-time data'
        };
      case 'error':
        return {
          icon: <AlertTriangle className="h-4 w-4" />,
          label: 'Error',
          badgeVariant: 'destructive' as const,
          tooltipText: 'Connection error'
        };
      default:
        return {
          icon: <WifiOff className="h-4 w-4" />,
          label: 'Unknown',
          badgeVariant: 'outline' as const,
          tooltipText: 'Connection status unknown'
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
            
            {showRefresh && connectionState !== 'connected' && connectionState !== 'connecting' && (
              <Button 
                variant="ghost" 
                size="icon"
                className="h-8 w-8"
                onClick={() => connect()}
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