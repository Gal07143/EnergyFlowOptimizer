import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Settings, Bell, Clock, Zap, DollarSign, Smartphone, Mail, MessageSquare } from 'lucide-react';
import { SiteDemandResponseSettings, useUpdateDemandResponseSettings } from '@/hooks/useDemandResponse';
import { useToast } from '@/hooks/use-toast';
import { useDevicesBySite } from '@/hooks/useDevice';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

// Define schema for form validation
const settingsSchema = z.object({
  isEnrolled: z.boolean(),
  maxReductionCapacity: z.union([
    z.number().min(0).optional(),
    z.string().transform(val => val === '' ? undefined : Number(val))
  ]),
  defaultParticipation: z.enum(['opt_in', 'opt_out', 'automatic']),
  autoResponseEnabled: z.boolean(),
  notificationEmail: z.string().email().optional().or(z.literal('')),
  notificationSms: z.string().optional().or(z.literal('')),
  notificationPush: z.boolean(),
  minimumIncentiveThreshold: z.union([
    z.number().min(0).optional(),
    z.string().transform(val => val === '' ? undefined : Number(val))
  ]),
  devicePriorities: z.record(z.string(), z.number()).optional(),
  responseStrategy: z.record(z.string(), z.any()).optional(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

interface SettingsFormProps {
  settings?: SiteDemandResponseSettings;
  siteId: number;
  onSettingsUpdate?: () => void;
  className?: string;
}

export default function SettingsForm({
  settings,
  siteId,
  onSettingsUpdate,
  className
}: SettingsFormProps) {
  const { toast } = useToast();
  const updateSettingsMutation = useUpdateDemandResponseSettings();
  
  // Fetch devices for the site to set priorities
  const { data: devices = [] } = useDevicesBySite(siteId);
  
  // Set up form with default values
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      isEnrolled: settings?.isEnrolled || false,
      maxReductionCapacity: settings?.maxReductionCapacity || undefined,
      defaultParticipation: settings?.defaultParticipation || 'opt_in',
      autoResponseEnabled: settings?.autoResponseEnabled || false,
      notificationEmail: settings?.notificationEmail || '',
      notificationSms: settings?.notificationSms || '',
      notificationPush: settings?.notificationPush || true,
      minimumIncentiveThreshold: settings?.minimumIncentiveThreshold || undefined,
      devicePriorities: settings?.devicePriorities || {},
      responseStrategy: settings?.responseStrategy || {
        loadShifting: true,
        batteryDischarge: true,
        hvacAdjustment: true,
        evChargingDelay: true
      },
    },
  });
  
  // Handle form submission
  const onSubmit = async (data: SettingsFormValues) => {
    try {
      await updateSettingsMutation.mutateAsync({
        siteId,
        settingsData: {
          ...data,
          siteId,
        }
      });
      
      toast({
        title: "Success",
        description: "Demand response settings updated successfully",
      });
      
      if (onSettingsUpdate) {
        onSettingsUpdate();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update demand response settings",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Demand Response Settings</CardTitle>
            <CardDescription>Configure how your site participates in demand response programs</CardDescription>
          </div>
          {settings && (
            <Badge className={settings.isEnrolled ? "bg-green-500" : "bg-gray-500"}>
              {settings.isEnrolled ? "Enrolled" : "Not Enrolled"}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            {/* Enrollment Status */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <FormField
                  control={form.control}
                  name="isEnrolled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm w-full">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base flex items-center">
                          <Settings className="h-4 w-4 mr-2" />
                          Program Enrollment
                        </FormLabel>
                        <FormDescription>
                          Enable or disable participation in demand response programs
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Maximum Reduction Capacity */}
            <FormField
              control={form.control}
              name="maxReductionCapacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center">
                    <Zap className="h-4 w-4 mr-2" />
                    Maximum Reduction Capacity (kW)
                  </FormLabel>
                  <FormDescription>
                    The maximum power reduction your site can provide during demand response events
                  </FormDescription>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="Enter maximum kW reduction"
                      {...field}
                      value={field.value === undefined ? '' : field.value}
                      onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Default Participation */}
            <FormField
              control={form.control}
              name="defaultParticipation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    Default Participation
                  </FormLabel>
                  <FormDescription>
                    Choose how you want to participate in demand response events by default
                  </FormDescription>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select default participation" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="opt_in">Opt-in (Manual participation)</SelectItem>
                      <SelectItem value="opt_out">Opt-out (Participate unless declined)</SelectItem>
                      <SelectItem value="automatic">Automatic (Always participate)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Auto Response */}
            <FormField
              control={form.control}
              name="autoResponseEnabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base flex items-center">
                      <Settings className="h-4 w-4 mr-2" />
                      Automatic Response
                    </FormLabel>
                    <FormDescription>
                      Automatically adjust devices during events based on your strategy settings
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Minimum Incentive Threshold */}
            <FormField
              control={form.control}
              name="minimumIncentiveThreshold"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Minimum Incentive Threshold ($)
                  </FormLabel>
                  <FormDescription>
                    Minimum incentive amount required for automatic participation
                  </FormDescription>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Enter minimum incentive amount"
                      {...field}
                      value={field.value === undefined ? '' : field.value}
                      onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notification Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center">
                <Bell className="h-4 w-4 mr-2" />
                Notification Settings
              </h3>

              <FormField
                control={form.control}
                name="notificationEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center">
                      <Mail className="h-4 w-4 mr-2" />
                      Email Notifications
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Enter email address for notifications"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notificationSms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      SMS Notifications
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="Enter phone number for SMS"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notificationPush"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base flex items-center">
                        <DeviceMobile className="h-4 w-4 mr-2" />
                        Push Notifications
                      </FormLabel>
                      <FormDescription>
                        Receive notifications in your browser and mobile app
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Response Strategy */}
            {form.watch('autoResponseEnabled') && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Response Strategy</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Configure how your system responds to demand response events
                </p>

                <div className="space-y-2">
                  <FormField
                    control={form.control}
                    name="responseStrategy.loadShifting"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Load Shifting</FormLabel>
                          <FormDescription>
                            Move non-critical loads to off-peak times
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="responseStrategy.batteryDischarge"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Battery Discharge</FormLabel>
                          <FormDescription>
                            Use stored battery power during events
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="responseStrategy.hvacAdjustment"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">HVAC Adjustment</FormLabel>
                          <FormDescription>
                            Temporarily adjust heating/cooling setpoints
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="responseStrategy.evChargingDelay"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">EV Charging Delay</FormLabel>
                          <FormDescription>
                            Pause or reduce EV charging during events
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}
          </CardContent>
          
          <CardFooter className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              type="button"
              onClick={() => form.reset()}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={updateSettingsMutation.isPending}
            >
              {updateSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}