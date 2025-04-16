import { useState } from 'react';
import { useDevices } from '@/hooks/useDevices';
import { useSiteSelector } from '@/hooks/useSiteData';
import { Device } from '@/types/devices';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageHeader from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { PlusIcon } from 'lucide-react';
import SolarCard from '@/components/devices/SolarCard';
import BatteryCard from '@/components/devices/BatteryCard';
import EVChargerCard from '@/components/devices/EVChargerCard';
import SmartMeterCard from '@/components/devices/SmartMeterCard';
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

export default function DevicesPage() {
  const { currentSiteId } = useSiteSelector();
  const { data: devices, isLoading } = useDevices(currentSiteId);
  const [activeTab, setActiveTab] = useState('all');
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
      siteId: currentSiteId,
    },
  });

  // Group devices by type
  const solarDevices = devices?.filter(d => d.type === 'solar_pv') || [];
  const batteryDevices = devices?.filter(d => d.type === 'battery_storage') || [];
  const evChargerDevices = devices?.filter(d => d.type === 'ev_charger') || [];
  const smartMeterDevices = devices?.filter(d => d.type === 'smart_meter') || [];

  const onSubmit = (data: DeviceFormValues) => {
    createDevice(data, {
      onSuccess: () => {
        setDialogOpen(false);
        form.reset();
      }
    });
  };

  const renderDevicesByType = (type: string = 'all') => {
    let filteredDevices: Device[] = [];
    
    if (type === 'all') {
      filteredDevices = devices || [];
    } else {
      filteredDevices = devices?.filter(d => d.type === type) || [];
    }
    
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-6">
        {filteredDevices.map(device => {
          switch (device.type) {
            case 'solar_pv':
              return <SolarCard key={device.id} device={device} />;
            case 'battery_storage':
              return <BatteryCard key={device.id} device={device} />;
            case 'ev_charger':
              return <EVChargerCard key={device.id} device={device} />;
            case 'smart_meter':
              return <SmartMeterCard key={device.id} device={device} />;
            default:
              return null;
          }
        })}

        {filteredDevices.length === 0 && (
          <div className="col-span-full text-center py-10 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-gray-500 dark:text-gray-400">
              No devices found. Add a new device to get started.
            </p>
          </div>
        )}
      </div>
    );
  };

  const getDeviceCountByType = (type: string) => {
    return devices?.filter(d => d.type === type).length || 0;
  };

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <PageHeader title="Energy Assets" subtitle="Manage and monitor your connected energy devices">
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
                        <Input type="hidden" {...field} value={currentSiteId} />
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
      </PageHeader>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList className="mb-4">
          <TabsTrigger value="all">
            All Devices ({devices?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="solar_pv">
            Solar PV ({getDeviceCountByType('solar_pv')})
          </TabsTrigger>
          <TabsTrigger value="battery_storage">
            Battery ({getDeviceCountByType('battery_storage')})
          </TabsTrigger>
          <TabsTrigger value="ev_charger">
            EV Chargers ({getDeviceCountByType('ev_charger')})
          </TabsTrigger>
          <TabsTrigger value="smart_meter">
            Smart Meters ({getDeviceCountByType('smart_meter')})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">{renderDevicesByType('all')}</TabsContent>
        <TabsContent value="solar_pv">{renderDevicesByType('solar_pv')}</TabsContent>
        <TabsContent value="battery_storage">{renderDevicesByType('battery_storage')}</TabsContent>
        <TabsContent value="ev_charger">{renderDevicesByType('ev_charger')}</TabsContent>
        <TabsContent value="smart_meter">{renderDevicesByType('smart_meter')}</TabsContent>
      </Tabs>
    </div>
  );
}
