import { Card, CardContent } from '@/components/ui/card';
import { useState } from 'react';
import { Device, DeviceReading } from '@/types/devices';
import { useDeviceReadings } from '@/hooks/useDevices';
import { formatNumber } from '@/lib/utils/data-utils';
import { Cog, MoreVertical, ExternalLink } from 'lucide-react';
import { deviceTypeToIcon } from '@/lib/icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Link } from 'wouter';

interface DeviceCardProps {
  device: Device;
  children?: React.ReactNode;
}

export default function DeviceCard({ device, children }: DeviceCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: readings } = useDeviceReadings(device.id, 1);
  const latestReading = readings && readings.length > 0 ? readings[0] : null;

  const Icon = deviceTypeToIcon(device.type);

  // Get appropriate status badge color based on device status
  const getStatusBadgeClass = () => {
    switch (device.status) {
      case 'online':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'offline':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'maintenance':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center">
              <div className="flex-shrink-0 p-2 rounded-md bg-gray-100 dark:bg-gray-800">
                <Icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">{device.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {device.capacity ? `${device.capacity} ${device.type === 'battery_storage' ? 'kWh' : 'kW'}` : ''} 
                  {device.model ? ` • ${device.model}` : ''}
                </p>
              </div>
            </div>
          </div>
          <div className="flex-shrink-0">
            <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeClass()}`}>
              {device.status.charAt(0).toUpperCase() + device.status.slice(1)}
            </span>
          </div>
        </div>

        {/* Device-specific content */}
        {children}

        <div className="mt-4 flex justify-between items-center">
          <Link href={`/devices/${device.id}`} className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center">
            View details
            <ExternalLink className="ml-1 h-3 w-3" />
          </Link>
          <div className="flex space-x-2">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <button className="p-1 rounded text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
                  <Cog className="h-5 w-5" />
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{device.name} Settings</DialogTitle>
                </DialogHeader>
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Type</p>
                      <p className="mt-1">{device.type.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</p>
                      <p className="mt-1">{device.status}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Manufacturer</p>
                      <p className="mt-1">{device.manufacturer || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Model</p>
                      <p className="mt-1">{device.model || 'N/A'}</p>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Serial Number</p>
                    <p className="mt-1">{device.serialNumber || 'N/A'}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Firmware</p>
                    <p className="mt-1">{device.firmwareVersion || 'N/A'}</p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1 rounded text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
                  <MoreVertical className="h-5 w-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Options</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Refresh data</DropdownMenuItem>
                <DropdownMenuItem>Edit device</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600 dark:text-red-400">Remove device</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
