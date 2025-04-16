import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlusIcon } from 'lucide-react';
import { Device } from '@/types/devices';
import SolarCard from '@/components/devices/SolarCard';
import BatteryCard from '@/components/devices/BatteryCard';
import EVChargerCard from '@/components/devices/EVChargerCard';
import SmartMeterCard from '@/components/devices/SmartMeterCard';
import { useDeviceReadings } from '@/hooks/useDevices';
import { deviceTypeToIcon } from '@/lib/icons';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { useCreateDevice } from '@/hooks/useDevices';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface DeviceManagementProps {
  devices: Device[];
  siteId: number;
}

// Form schema
const deviceFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  type: z.enum(['solar_pv', 'battery_storage', 'ev_charger', 'smart_meter', 'heat_pump']),
  model: z.string().optional(),
  manufacturer: z.string().optional(),
  capacity: z.string().optional().transform(val => val ? parseFloat(val) : undefined),
  siteId: z.number(),
});

type DeviceFormValues = z.infer<typeof deviceFormSchema>;

export default function DeviceManagement({ devices, siteId }: DeviceManagementProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { mutate: createDevice, isPending: isCreating } = useCreateDevice();

  const form = useForm<DeviceFormValues>({
    resolver: zodResolver(deviceFormSchema),
    defaultValues: {
      name: '',
      type: 'solar_pv',
      model: '',
      manufacturer: '',
      capacity: '',
      siteId: siteId,
    },
  });

  const onSubmit = (data: DeviceFormValues) => {
    createDevice(data, {
      onSuccess: () => {
        setDialogOpen(false);
        form.reset();
      }
    });
  };

  // Group devices by type
  const solarDevices = devices?.filter(d => d.type === 'solar_pv') || [];
  const batteryDevices = devices?.filter(d => d.type === 'battery_storage') || [];
  const evChargerDevices = devices?.filter(d => d.type === 'ev_charger') || [];
  const smartMeterDevices = devices?.filter(d => d.type === 'smart_meter') || [];

  return (
    <div className="px-4 sm:px-6 lg:px-8 mt-8">
      <div className="pb-5 border-b border-gray-200 dark:border-gray-800 sm:flex sm:items-center sm:justify-between">
        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Energy Assets</h3>
        <div className="mt-3 sm:mt-0 sm:ml-4">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusIcon className="mr-2 h-4 w-4" />
                Add Device
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Device</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Device Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter device name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Device Type</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select device type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="solar_pv">Solar PV</SelectItem>
                            <SelectItem value="battery_storage">Battery Storage</SelectItem>
                            <SelectItem value="ev_charger">EV Charger</SelectItem>
                            <SelectItem value="smart_meter">Smart Meter</SelectItem>
                            <SelectItem value="heat_pump">Heat Pump</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="manufacturer"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Manufacturer</FormLabel>
                          <FormControl>
                            <Input placeholder="Manufacturer" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="model"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Model</FormLabel>
                          <FormControl>
                            <Input placeholder="Model" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="capacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Capacity (kW/kWh)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="Capacity" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          For solar panels: kWp, for batteries: kWh, for EV chargers: kW
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="siteId"
                    render={({ field }) => (
                      <FormItem className="hidden">
                        <FormControl>
                          <Input type="hidden" {...field} value={siteId} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <DialogFooter>
                    <Button type="submit" disabled={isCreating}>
                      {isCreating ? 'Adding...' : 'Add Device'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Device Cards */}
      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Solar PV Devices */}
        {solarDevices.map(device => (
          <SolarCard key={device.id} device={device} />
        ))}
        
        {/* Battery Storage Devices */}
        {batteryDevices.map(device => (
          <BatteryCard key={device.id} device={device} />
        ))}
        
        {/* EV Charger Devices */}
        {evChargerDevices.map(device => (
          <EVChargerCard key={device.id} device={device} />
        ))}
        
        {/* Smart Meter Devices */}
        {smartMeterDevices.map(device => (
          <SmartMeterCard key={device.id} device={device} />
        ))}
      </div>
    </div>
  );
}
