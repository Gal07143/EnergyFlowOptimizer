import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { CalendarIcon, CheckCircle, ChevronRight, PlugZap, Settings, Zap, Battery, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSiteContext } from '@/hooks/use-site-context';
import { useDevicesBySite } from '@/hooks/useDevice.ts';
import { cn } from '@/lib/utils';

// VPP enrollment schema
const vppEnrollmentSchema = z.object({
  programId: z.string(),
  contractStartDate: z.date(),
  contractEndDate: z.date().optional(),
  maxCapacity: z.number().min(0.1).max(1000),
  minCapacity: z.number().min(0).max(1000),
  autoParticipate: z.boolean().default(true),
  notificationEmail: z.string().email().optional().or(z.literal('')),
  notificationSms: z.string().optional().or(z.literal('')),
  devicePreferences: z.record(z.string(), z.boolean()).default({}),
  responsePreferences: z.object({
    batteryDischarge: z.boolean().default(true),
    loadReduction: z.boolean().default(true),
    generationIncrease: z.boolean().default(false),
    evChargingPause: z.boolean().default(true)
  })
});

type VppEnrollmentValues = z.infer<typeof vppEnrollmentSchema>;

const mockPrograms = [
  {
    id: '1',
    name: 'Peak Demand Response',
    provider: 'Grid Operator Inc.',
    incentiveRate: 0.25,
    minCapacity: 2,
    description: 'Reduce load during peak demand periods to help balance the grid and earn incentives.',
    maxEvents: 20,
    typicalDuration: '2-3 hours',
    typicalTimes: 'Weekdays, 2pm-7pm',
    active: true
  },
  {
    id: '2',
    name: 'Frequency Regulation',
    provider: 'Energy Services Ltd.',
    incentiveRate: 0.18,
    minCapacity: 5,
    description: 'Help stabilize grid frequency with automated response to signals.',
    maxEvents: 'Unlimited',
    typicalDuration: '15-30 minutes',
    typicalTimes: '24/7, automatic response',
    active: true
  },
  {
    id: '3',
    name: 'Reserve Capacity',
    provider: 'National Grid',
    incentiveRate: 0.30,
    minCapacity: 10,
    description: 'Provide reserve capacity for emergency grid situations.',
    maxEvents: 8,
    typicalDuration: '1-4 hours',
    typicalTimes: 'Rare, emergency only',
    active: false
  },
];

// Wizard steps
type WizardStep = 'program' | 'capacity' | 'devices' | 'preferences' | 'confirmation';

export default function VppParticipationWizard() {
  const [currentStep, setCurrentStep] = useState<WizardStep>('program');
  const [selectedProgram, setSelectedProgram] = useState<typeof mockPrograms[0] | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const { toast } = useToast();
  const { currentSiteId } = useSiteContext();
  const { data: devices = [] } = useDevicesBySite(currentSiteId || undefined);

  // Calculate site capacity
  const totalSiteCapacity = devices
    .filter(d => ['battery', 'battery storage', 'ev charger', 'load'].includes(d.type || ''))
    .reduce((sum, device) => sum + (device.capacity || 0), 0);

  // Set up form with default values
  const form = useForm<VppEnrollmentValues>({
    resolver: zodResolver(vppEnrollmentSchema),
    defaultValues: {
      programId: '',
      contractStartDate: new Date(),
      maxCapacity: Math.min(totalSiteCapacity, 10),
      minCapacity: 1,
      autoParticipate: true,
      notificationEmail: '',
      notificationSms: '',
      devicePreferences: {},
      responsePreferences: {
        batteryDischarge: true,
        loadReduction: true,
        generationIncrease: false,
        evChargingPause: true
      }
    },
  });

  // When program selection changes, update the form value
  const handleProgramSelect = (program: typeof mockPrograms[0]) => {
    setSelectedProgram(program);
    form.setValue('programId', program.id);
  };

  // Navigation handlers
  const nextStep = () => {
    const steps: WizardStep[] = ['program', 'capacity', 'devices', 'preferences', 'confirmation'];
    const currentIndex = steps.indexOf(currentStep);
    
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const steps: WizardStep[] = ['program', 'capacity', 'devices', 'preferences', 'confirmation'];
    const currentIndex = steps.indexOf(currentStep);
    
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  // Handle form submission
  const onSubmit = async (data: VppEnrollmentValues) => {
    try {
      // In a real app, submit to API
      console.log('Submitting VPP enrollment:', data);
      
      // Simulate API call
      toast({
        title: 'Enrollment Submitted',
        description: `Successfully enrolled in ${selectedProgram?.name}`,
      });
      
      setIsComplete(true);
    } catch (error) {
      toast({
        title: 'Enrollment Failed',
        description: 'There was an error enrolling in the VPP program.',
        variant: 'destructive',
      });
    }
  };

  // Reset form
  const resetForm = () => {
    form.reset();
    setSelectedProgram(null);
    setCurrentStep('program');
    setIsComplete(false);
  };

  if (isComplete) {
    return (
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Enrollment Complete!</CardTitle>
          <CardDescription>Your VPP program enrollment has been successfully processed</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-6 pb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          
          <Alert className="max-w-lg">
            <AlertTitle className="flex items-center">
              <PlugZap className="h-4 w-4 mr-2" />
              {selectedProgram?.name} Enrollment Confirmed
            </AlertTitle>
            <AlertDescription>
              <p className="mb-2">Your site is now registered for this virtual power plant program. You'll receive notifications when there are opportunities to participate.</p>
              <p className="text-sm text-muted-foreground italic">Enrollment ID: VPP-{Math.floor(Math.random() * 10000)}</p>
            </AlertDescription>
          </Alert>
          
          <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
            <div className="p-3 bg-muted rounded-lg">
              <h3 className="text-sm font-medium">Contract Start Date</h3>
              <p>{format(form.getValues('contractStartDate'), 'MMMM d, yyyy')}</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <h3 className="text-sm font-medium">Max Capacity</h3>
              <p>{form.getValues('maxCapacity')} kW</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <h3 className="text-sm font-medium">Auto Participation</h3>
              <p>{form.getValues('autoParticipate') ? 'Enabled' : 'Disabled'}</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <h3 className="text-sm font-medium">Provider</h3>
              <p>{selectedProgram?.provider}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Settings className="h-4 w-4" />
            <p>You can manage your enrollment from the VPP Dashboard</p>
          </div>
        </CardContent>
        <CardFooter className="justify-center border-t pt-4">
          <Button onClick={resetForm}>Enroll in Another Program</Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>VPP Program Enrollment</CardTitle>
        <CardDescription>
          Join a Virtual Power Plant program to earn incentives by providing grid services
        </CardDescription>
      </CardHeader>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent>
            <div className="mb-6">
              <nav aria-label="Progress">
                <ol role="list" className="flex items-center">
                  {['Program', 'Capacity', 'Devices', 'Preferences', 'Confirmation'].map((step, index) => {
                    const stepKey = step.toLowerCase() as WizardStep;
                    const isCurrent = currentStep === stepKey;
                    const isCompleted = ['program', 'capacity', 'devices', 'preferences', 'confirmation'].indexOf(currentStep) >= index;
                    
                    return (
                      <li key={step} className={cn("relative flex-1", {
                        "text-primary font-medium": isCurrent,
                        "text-muted-foreground": !isCurrent && !isCompleted,
                        "text-primary/70": !isCurrent && isCompleted
                      })}>
                        {isCompleted && !isCurrent ? (
                          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white">
                            <CheckCircle className="h-4 w-4" />
                          </span>
                        ) : (
                          <span className={cn("flex items-center justify-center w-6 h-6 rounded-full border", {
                            "border-primary bg-primary/10": isCurrent,
                            "border-muted-foreground": !isCurrent && !isCompleted
                          })}>
                            {index + 1}
                          </span>
                        )}
                        <span className="ml-2 text-sm hidden sm:inline">{step}</span>
                        
                        {index < 4 && (
                          <div className="hidden sm:block absolute top-3 left-0 w-full">
                            <div className="h-0.5 w-full bg-gray-200">
                              {isCompleted && (
                                <div className="h-0.5 bg-primary" style={{ width: isCurrent ? '50%' : '100%' }}></div>
                              )}
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </nav>
            </div>
            
            {/* Step 1: Program Selection */}
            {currentStep === 'program' && (
              <div className="space-y-4">
                <h3 className="font-medium">Select a VPP Program</h3>
                <div className="grid gap-4">
                  {mockPrograms.map((program) => (
                    <div 
                      key={program.id}
                      onClick={() => program.active && handleProgramSelect(program)}
                      className={cn(
                        "relative flex flex-col p-4 border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors",
                        {
                          "border-primary bg-primary/5": selectedProgram?.id === program.id,
                          "opacity-60 cursor-not-allowed": !program.active
                        }
                      )}
                    >
                      {!program.active && (
                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
                          <div className="px-3 py-1 bg-muted rounded-full text-sm font-medium">Coming Soon</div>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <div className="font-medium">{program.name}</div>
                        <div className="flex items-center text-sm">
                          <span className="text-primary font-semibold">${program.incentiveRate.toFixed(2)}/kWh</span>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">{program.provider}</div>
                      <div className="mt-2 text-sm">{program.description}</div>
                      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1 text-muted-foreground" />
                          <span className="text-muted-foreground">Duration:</span> 
                          <span className="ml-1">{program.typicalDuration}</span>
                        </div>
                        <div className="flex items-center">
                          <Zap className="h-3 w-3 mr-1 text-muted-foreground" />
                          <span className="text-muted-foreground">Min Capacity:</span>
                          <span className="ml-1">{program.minCapacity} kW</span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1 text-muted-foreground" />
                          <span className="text-muted-foreground">Times:</span>
                          <span className="ml-1">{program.typicalTimes}</span>
                        </div>
                        <div className="flex items-center">
                          <CalendarIcon className="h-3 w-3 mr-1 text-muted-foreground" />
                          <span className="text-muted-foreground">Events/Year:</span>
                          <span className="ml-1">{program.maxEvents}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <FormField
                  control={form.control}
                  name="programId"
                  render={({ field }) => (
                    <FormItem className="hidden">
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
            
            {/* Step 2: Capacity Settings */}
            {currentStep === 'capacity' && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-lg font-medium">
                  <PlugZap className="h-5 w-5 text-primary" />
                  <h3>{selectedProgram?.name} Capacity Settings</h3>
                </div>
                
                <Alert>
                  <AlertTitle className="flex items-center text-base">
                    <Zap className="h-4 w-4 mr-2" />
                    Available Site Capacity
                  </AlertTitle>
                  <AlertDescription>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <div className="bg-muted/50 p-2 rounded-md">
                        <div className="text-xs text-muted-foreground">Battery Storage</div>
                        <div className="text-lg font-medium">
                          {devices.filter(d => d.type === 'battery' || d.type === 'battery storage')
                            .reduce((sum, device) => sum + (device.capacity || 0), 0)} kW
                        </div>
                      </div>
                      <div className="bg-muted/50 p-2 rounded-md">
                        <div className="text-xs text-muted-foreground">Flexible Loads</div>
                        <div className="text-lg font-medium">
                          {devices.filter(d => d.type === 'ev charger' || d.type === 'load')
                            .reduce((sum, device) => sum + (device.capacity || 0), 0)} kW
                        </div>
                      </div>
                      <div className="bg-muted/50 p-2 rounded-md">
                        <div className="text-xs text-muted-foreground">Total Capacity</div>
                        <div className="text-lg font-medium">{totalSiteCapacity} kW</div>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
                
                <FormField
                  control={form.control}
                  name="maxCapacity"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="flex items-center">
                        Maximum Capacity Commitment (kW)
                      </FormLabel>
                      <FormDescription>
                        The maximum power capacity you're willing to provide during VPP events
                      </FormDescription>
                      <div className="flex items-center space-x-4">
                        <Slider
                          min={selectedProgram?.minCapacity || 1}
                          max={totalSiteCapacity}
                          step={0.1}
                          value={[field.value]}
                          onValueChange={(values) => field.onChange(values[0])}
                          className="flex-1"
                        />
                        <div className="w-16">
                          <Input
                            type="number"
                            min={selectedProgram?.minCapacity || 1}
                            max={totalSiteCapacity}
                            step={0.1}
                            value={field.value}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          />
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="minCapacity"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="flex items-center">
                        Minimum Capacity Commitment (kW)
                      </FormLabel>
                      <FormDescription>
                        The minimum power capacity you'll guarantee to provide (can be 0)
                      </FormDescription>
                      <div className="flex items-center space-x-4">
                        <Slider
                          min={0}
                          max={form.getValues('maxCapacity')}
                          step={0.1}
                          value={[field.value]}
                          onValueChange={(values) => field.onChange(values[0])}
                          className="flex-1"
                        />
                        <div className="w-16">
                          <Input
                            type="number"
                            min={0}
                            max={form.getValues('maxCapacity')}
                            step={0.1}
                            value={field.value}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          />
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="contractStartDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Contract Start Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date < new Date() || date > new Date("2030-01-01")
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="contractEndDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Contract End Date (Optional)</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>No end date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date <= form.getValues('contractStartDate') ||
                                date > new Date("2035-01-01")
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}
            
            {/* Step 3: Device Selection */}
            {currentStep === 'devices' && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-lg font-medium">
                  <Battery className="h-5 w-5 text-primary" />
                  <h3>Device Participation</h3>
                </div>
                
                <div className="text-sm text-muted-foreground mb-4">
                  Select which devices should participate in VPP events. These devices will receive commands during events.
                </div>
                
                {devices
                  .filter(device => ['battery', 'battery storage', 'ev charger', 'heat pump', 'solar', 'solar pv', 'load'].includes(device.type || ''))
                  .map(device => (
                    <FormField
                      key={device.id}
                      control={form.control}
                      name={`devicePreferences.${device.id}`}
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">{device.name}</FormLabel>
                            <FormDescription>
                              {device.type} - {device.capacity || 0} kW
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
                  ))}
                
                {devices.filter(device => 
                  ['battery', 'battery storage', 'ev charger', 'heat pump', 'solar', 'solar pv', 'load'].includes(device.type || '')
                ).length === 0 && (
                  <Alert>
                    <AlertTitle>No suitable devices found</AlertTitle>
                    <AlertDescription>
                      You need to add at least one controllable device (battery, EV charger, etc.) to participate in VPP events.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
            
            {/* Step 4: Response Preferences */}
            {currentStep === 'preferences' && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-lg font-medium">
                  <Settings className="h-5 w-5 text-primary" />
                  <h3>Response Preferences</h3>
                </div>
                
                <div className="text-sm text-muted-foreground mb-4">
                  Configure how your system should respond to VPP events.
                </div>
                
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="responsePreferences.batteryDischarge"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Battery Discharge</FormLabel>
                          <FormDescription>
                            Use stored battery power during VPP events
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
                    name="responsePreferences.loadReduction"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Load Reduction</FormLabel>
                          <FormDescription>
                            Reduce power consumption of controllable loads
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
                    name="responsePreferences.evChargingPause"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">EV Charging Pause</FormLabel>
                          <FormDescription>
                            Temporarily pause EV charging during events
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
                    name="responsePreferences.generationIncrease"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Increase Generation</FormLabel>
                          <FormDescription>
                            Increase generation if you have dispatchable sources
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                  <FormField
                    control={form.control}
                    name="autoParticipate"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Automatic Participation</FormLabel>
                          <FormDescription>
                            Automatically opt-in to all VPP events
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="notificationEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Notifications</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="your@email.com"
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
                        <FormLabel>SMS Notifications</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="+1 234 567 8900"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}
            
            {/* Step 5: Confirmation */}
            {currentStep === 'confirmation' && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-lg font-medium">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <h3>Confirm Enrollment</h3>
                </div>
                
                <div className="text-sm text-muted-foreground mb-4">
                  Please review your VPP program enrollment details before submitting.
                </div>
                
                <div className="space-y-4">
                  <div className="rounded-lg border p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{selectedProgram?.name}</h4>
                        <p className="text-sm text-muted-foreground">{selectedProgram?.provider}</p>
                      </div>
                      <div className="bg-primary/10 text-primary font-medium rounded-full px-2 py-1 text-sm">
                        ${selectedProgram?.incentiveRate.toFixed(2)}/kWh
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div>
                        <div className="text-sm text-muted-foreground">Start Date</div>
                        <div>{format(form.getValues('contractStartDate'), 'MMMM d, yyyy')}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">End Date</div>
                        <div>{form.getValues('contractEndDate') 
                          ? format(form.getValues('contractEndDate'), 'MMMM d, yyyy')
                          : 'No end date (auto-renewal)'}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Max Capacity</div>
                        <div>{form.getValues('maxCapacity')} kW</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Min Capacity</div>
                        <div>{form.getValues('minCapacity')} kW</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Auto-Participation</div>
                        <div>{form.getValues('autoParticipate') ? 'Enabled' : 'Disabled'}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Device Count</div>
                        <div>{Object.values(form.getValues('devicePreferences')).filter(v => v).length} devices</div>
                      </div>
                    </div>
                  </div>
                  
                  <Alert>
                    <AlertTitle>Important Information</AlertTitle>
                    <AlertDescription className="text-sm">
                      <p className="mb-1">By enrolling in this VPP program, you agree to:</p>
                      <ul className="list-disc pl-4 space-y-1">
                        <li>Allow the program operator to send control signals to your devices during events</li>
                        <li>Respond to VPP events according to your configured preferences</li>
                        <li>Maintain your devices in operational condition</li>
                        <li>Receive incentive payments based on your actual participation</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                  
                  <div className="pt-2">
                    <FormField
                      control={form.control}
                      name="autoParticipate"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              I understand and agree to the program terms and conditions.
                            </FormLabel>
                            <FormDescription>
                              You can opt out of individual events or cancel your enrollment at any time.
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          
          <CardFooter className="flex justify-between border-t pt-6">
            {currentStep !== 'program' ? (
              <Button variant="outline" type="button" onClick={prevStep}>
                Back
              </Button>
            ) : (
              <div></div>
            )}
            
            {currentStep !== 'confirmation' ? (
              <Button 
                type="button" 
                onClick={nextStep}
                disabled={currentStep === 'program' && !selectedProgram}
              >
                Continue
              </Button>
            ) : (
              <Button type="submit">
                Complete Enrollment
              </Button>
            )}
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}