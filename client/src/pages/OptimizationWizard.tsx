import { useState } from 'react';
import { useLocation } from 'wouter';
import { 
  useOptimizationPresets, 
  useApplyOptimizationPreset, 
  type OptimizationPreset 
} from '@/hooks/useOptimizationWizard';
import { useSiteSelector } from '@/hooks/useSiteSelector';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  BatteryChargingIcon,
  BatteryIcon,
  BoltIcon,
  CheckCircleIcon,
  CogIcon,
  DollarSignIcon,
  GlobeIcon,
  HomeIcon,
  LightbulbIcon,
  LineChartIcon,
  NetworkIcon,
  SaveIcon,
  ShieldIcon,
  SparklesIcon,
  SunIcon
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';

// Icon mapping for optimization modes
const presetIcons: Record<string, React.ReactNode> = {
  cost_saving: <DollarSignIcon className="h-6 w-6 text-green-500" />,
  self_sufficiency: <HomeIcon className="h-6 w-6 text-blue-500" />,
  peak_shaving: <LineChartIcon className="h-6 w-6 text-purple-500" />,
  carbon_reduction: <GlobeIcon className="h-6 w-6 text-emerald-500" />,
  grid_relief: <NetworkIcon className="h-6 w-6 text-orange-500" />,
};

const features: Record<string, { icon: React.ReactNode, title: string, description: string }> = {
  peakShavingEnabled: {
    icon: <LineChartIcon className="h-5 w-5" />,
    title: "Peak Shaving",
    description: "Automatically reduce your power consumption during peak demand periods"
  },
  selfConsumptionEnabled: {
    icon: <SunIcon className="h-5 w-5" />,
    title: "Self Consumption",
    description: "Prioritize using your own generated energy before drawing from the grid"
  },
  batteryArbitrageEnabled: {
    icon: <BatteryIcon className="h-5 w-5" />,
    title: "Battery Arbitrage",
    description: "Charge your battery when energy is cheap and discharge when it's expensive"
  },
  v2gEnabled: {
    icon: <BoltIcon className="h-5 w-5" />,
    title: "Vehicle-to-Grid",
    description: "Use your electric vehicle as a power source when beneficial"
  },
  vppEnabled: {
    icon: <NetworkIcon className="h-5 w-5" />,
    title: "Virtual Power Plant",
    description: "Participate in grid services by aggregating with other energy assets"
  },
  p2pEnabled: {
    icon: <HomeIcon className="h-5 w-5" />,
    title: "Peer-to-Peer Trading",
    description: "Trade excess energy with neighbors in your community"
  },
  demandResponseEnabled: {
    icon: <ShieldIcon className="h-5 w-5" />,
    title: "Demand Response",
    description: "Adjust energy usage in response to grid conditions and events"
  },
  aiRecommendationsEnabled: {
    icon: <SparklesIcon className="h-5 w-5" />,
    title: "AI Recommendations",
    description: "Receive smart suggestions to optimize your energy usage patterns"
  }
};

export default function OptimizationWizard() {
  const { currentSiteId } = useSiteSelector();
  const { data: presets = [], isLoading: isLoadingPresets } = useOptimizationPresets();
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [step, setStep] = useState<'select' | 'review' | 'success'>('select');
  const [customFeatures, setCustomFeatures] = useState<Record<string, boolean>>({});
  const { mutate: applyPreset, isPending } = useApplyOptimizationPreset(currentSiteId);
  const navigate = useNavigate();

  // Find the currently selected preset
  const activePreset = presets.find(p => p.id === selectedPreset);

  const handleSelectPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    // Initialize custom features with preset defaults
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
      setCustomFeatures({
        peakShavingEnabled: preset.peakShavingEnabled,
        selfConsumptionEnabled: preset.selfConsumptionEnabled,
        batteryArbitrageEnabled: preset.batteryArbitrageEnabled,
        v2gEnabled: preset.v2gEnabled,
        vppEnabled: preset.vppEnabled,
        p2pEnabled: preset.p2pEnabled,
        demandResponseEnabled: preset.demandResponseEnabled,
        aiRecommendationsEnabled: preset.aiRecommendationsEnabled,
      });
    }
  };

  const handleNextStep = () => {
    if (step === 'select' && selectedPreset) {
      setStep('review');
    } else if (step === 'review') {
      applyPreset(
        { 
          presetMode: selectedPreset!,
          // Only include custom settings if they differ from the preset
          deviceConfiguration: Object.keys(customFeatures).some(
            key => customFeatures[key] !== (activePreset as any)[key]
          ) ? customFeatures : undefined
        },
        {
          onSuccess: () => setStep('success')
        }
      );
    } else if (step === 'success') {
      navigate('/optimization');
    }
  };

  const handlePreviousStep = () => {
    if (step === 'review') {
      setStep('select');
    }
  };

  const toggleFeature = (feature: string) => {
    setCustomFeatures(prev => ({
      ...prev,
      [feature]: !prev[feature]
    }));
  };

  if (isLoadingPresets) {
    return (
      <div className="py-6 px-4 sm:px-6 lg:px-8">
        <PageHeader 
          title="Energy Optimization Wizard" 
          subtitle="Loading optimization options..."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {[1, 2, 3, 4, 5].map(i => (
            <Card key={i} className="border shadow-sm">
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-9 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <PageHeader 
        title="Energy Optimization Wizard" 
        subtitle={
          step === 'select' 
            ? "Select an optimization strategy that best fits your energy goals" 
            : step === 'review'
              ? "Review and customize your optimization strategy"
              : "Your optimization strategy has been successfully applied"
        }
      />

      {step === 'select' && (
        <>
          <Alert className="mt-6 mb-8 bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
            <LightbulbIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertTitle>One-click Optimization</AlertTitle>
            <AlertDescription>
              Choose the optimization strategy that aligns with your energy goals. 
              Each strategy is preconfigured with optimal settings that you can customize in the next step.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {presets.map((preset) => (
              <Card 
                key={preset.id} 
                className={`border cursor-pointer transition-all ${
                  selectedPreset === preset.id 
                    ? 'border-primary shadow-md ring-2 ring-primary/20' 
                    : 'hover:border-primary/30 hover:shadow-sm'
                }`}
                onClick={() => handleSelectPreset(preset.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    {presetIcons[preset.id] || <CogIcon className="h-6 w-6 text-gray-500" />}
                    {selectedPreset === preset.id && (
                      <CheckCircleIcon className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <CardTitle className="text-xl mt-2">{preset.name}</CardTitle>
                  <CardDescription>{preset.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(preset)
                      .filter(([key, value]) => typeof value === 'boolean' && value === true && key in features)
                      .map(([key]) => (
                        <div key={key} className="flex items-center gap-2">
                          <div className="h-4 w-4 text-primary">
                            {(features as any)[key]?.icon}
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {(features as any)[key]?.title}
                          </span>
                        </div>
                      ))
                    }
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant={selectedPreset === preset.id ? "default" : "outline"} 
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectPreset(preset.id);
                    }}
                  >
                    {selectedPreset === preset.id ? "Selected" : "Select"}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          <div className="mt-8 flex justify-end">
            <Button 
              size="lg" 
              disabled={!selectedPreset} 
              onClick={handleNextStep}
            >
              Continue to Customization
              <ArrowRightIcon className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </>
      )}

      {step === 'review' && activePreset && (
        <>
          <Alert className="mt-6 mb-8 bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800">
            <AlertTriangleIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertTitle>Review Before Applying</AlertTitle>
            <AlertDescription>
              You can customize which features to enable for your optimization strategy. 
              The default settings are recommended, but you can adjust them to better match your specific requirements.
            </AlertDescription>
          </Alert>

          <Card className="border shadow-sm mb-8">
            <CardHeader>
              <div className="flex items-center gap-3">
                {presetIcons[activePreset.id] || <CogIcon className="h-6 w-6 text-gray-500" />}
                <div>
                  <CardTitle>{activePreset.name}</CardTitle>
                  <CardDescription>{activePreset.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="features" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="features">Features</TabsTrigger>
                  <TabsTrigger value="schedules">Schedules</TabsTrigger>
                </TabsList>
                
                <TabsContent value="features" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(features).map(([key, feature]) => (
                      <div 
                        key={key} 
                        className="flex items-start space-x-3 p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                      >
                        <Checkbox 
                          id={key} 
                          checked={customFeatures[key] || false}
                          onCheckedChange={() => toggleFeature(key)}
                          className="mt-0.5"
                        />
                        <div>
                          <label 
                            htmlFor={key} 
                            className="text-sm font-medium flex items-center gap-2 cursor-pointer"
                          >
                            <span className="text-primary">{feature.icon}</span>
                            {feature.title}
                          </label>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="schedules">
                  <div className="space-y-6">
                    {activePreset.schedules?.batteryCharging && (
                      <div>
                        <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
                          <BatteryChargingIcon className="h-5 w-5 text-green-500" />
                          Battery Charging Schedule
                        </h3>
                        <div className="space-y-2">
                          {activePreset.schedules.batteryCharging.map((schedule, index) => (
                            <div key={index} className="flex items-center gap-3 p-3 rounded-lg border">
                              <Badge variant={
                                schedule.priority === 'high' ? 'default' : 
                                schedule.priority === 'medium' ? 'secondary' : 'outline'
                              }>
                                {schedule.priority.charAt(0).toUpperCase() + schedule.priority.slice(1)}
                              </Badge>
                              <span>{schedule.startTime} - {schedule.endTime}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {activePreset.schedules?.batteryDischarging && (
                      <div>
                        <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
                          <BatteryIcon className="h-5 w-5 text-orange-500" />
                          Battery Discharging Schedule
                        </h3>
                        <div className="space-y-2">
                          {activePreset.schedules.batteryDischarging.map((schedule, index) => (
                            <div key={index} className="flex items-center gap-3 p-3 rounded-lg border">
                              <Badge variant={
                                schedule.priority === 'high' ? 'default' : 
                                schedule.priority === 'medium' ? 'secondary' : 'outline'
                              }>
                                {schedule.priority.charAt(0).toUpperCase() + schedule.priority.slice(1)}
                              </Badge>
                              <span>{schedule.startTime} - {schedule.endTime}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {activePreset.schedules?.evCharging && (
                      <div>
                        <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
                          <BoltIcon className="h-5 w-5 text-blue-500" />
                          EV Charging Schedule
                        </h3>
                        <div className="space-y-2">
                          {activePreset.schedules.evCharging.map((schedule, index) => (
                            <div key={index} className="flex items-center gap-3 p-3 rounded-lg border">
                              <Badge variant={
                                schedule.priority === 'high' ? 'default' : 
                                schedule.priority === 'medium' ? 'secondary' : 'outline'
                              }>
                                {schedule.priority.charAt(0).toUpperCase() + schedule.priority.slice(1)}
                              </Badge>
                              <span>{schedule.startTime} - {schedule.endTime}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {!activePreset.schedules?.batteryCharging && 
                     !activePreset.schedules?.batteryDischarging && 
                     !activePreset.schedules?.evCharging && (
                      <div className="text-center py-8 text-gray-500">
                        No schedules configured for this optimization strategy.
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <div className="mt-8 flex justify-between">
            <Button 
              variant="outline" 
              onClick={handlePreviousStep}
            >
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Back to Selection
            </Button>
            <Button 
              size="lg" 
              onClick={handleNextStep}
              disabled={isPending}
            >
              {isPending ? (
                <>Applying Strategy...</>
              ) : (
                <>
                  Apply Optimization Strategy
                  <SaveIcon className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </>
      )}

      {step === 'success' && (
        <div className="mt-8 flex flex-col items-center justify-center">
          <div className="w-full max-w-md text-center">
            <div className="mx-auto bg-green-100 dark:bg-green-900 rounded-full h-16 w-16 flex items-center justify-center mb-4">
              <CheckCircleIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Optimization Strategy Applied!</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-8">
              Your energy system is now optimized using the <span className="font-semibold">{activePreset?.name}</span> strategy. 
              You can always adjust these settings later from the Optimization page.
            </p>
            
            <Separator className="my-8" />
            
            <div className="flex flex-col gap-4">
              <Button 
                size="lg" 
                className="w-full"
                onClick={() => navigate('/optimization')}
              >
                Go to Optimization Dashboard
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate('/')}
              >
                Return to Home
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}