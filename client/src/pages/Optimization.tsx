import { useState } from 'react';
import { useOptimizationSettings, useUpdateOptimizationSettings } from '@/hooks/useOptimization';
import { useSiteSelector } from '@/hooks/useSiteData';
import { Link } from 'wouter';
import PageHeader from '@/components/common/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  BatteryCharging, 
  Zap, 
  TrendingUp, 
  Leaf, 
  CreditCard, 
  BarChart4, 
  Clock, 
  Shield 
} from 'lucide-react';
import PowerChart from '@/components/charts/PowerChart';

export default function OptimizationPage() {
  const { currentSiteId } = useSiteSelector();
  const { data: settings, isLoading } = useOptimizationSettings(currentSiteId);
  const { mutate: updateSettings } = useUpdateOptimizationSettings();
  const [activeTab, setActiveTab] = useState('strategies');
  
  const handleToggleStrategy = (strategy: string, enabled: boolean) => {
    if (!settings) return;
    
    const updatedSettings = { ...settings };
    
    switch (strategy) {
      case 'peakShaving':
        updatedSettings.peakShavingEnabled = enabled;
        break;
      case 'selfConsumption':
        updatedSettings.selfConsumptionEnabled = enabled;
        break;
      case 'batteryArbitrage':
        updatedSettings.batteryArbitrageEnabled = enabled;
        break;
      case 'v2g':
        updatedSettings.v2gEnabled = enabled;
        break;
      case 'vpp':
        updatedSettings.vppEnabled = enabled;
        break;
      case 'aiRecommendations':
        updatedSettings.aiRecommendationsEnabled = enabled;
        break;
    }
    
    updateSettings({
      siteId: currentSiteId,
      ...updatedSettings
    });
  };
  
  const handlePeakShavingTarget = (value: number[]) => {
    if (!settings) return;
    
    updateSettings({
      siteId: currentSiteId,
      ...settings,
      peakShavingTarget: value[0]
    });
  };
  
  const changeOptimizationMode = (mode: 'cost_saving' | 'self_sufficiency' | 'peak_shaving' | 'carbon_reduction' | 'grid_relief') => {
    if (!settings) return;
    
    updateSettings({
      siteId: currentSiteId,
      ...settings,
      mode
    });
  };

  if (isLoading) {
    return (
      <div className="py-6 px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-4 w-1/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-6 w-1/2"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <PageHeader 
        title="Energy Optimization" 
        subtitle="Configure optimization strategies to maximize your energy efficiency"
      >
        <Link to="/optimization/wizard">
          <Button className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span>Optimization Wizard</span>
          </Button>
        </Link>
      </PageHeader>
      
      <Tabs defaultValue="strategies" value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList className="mb-6">
          <TabsTrigger value="strategies">Optimization Strategies</TabsTrigger>
          <TabsTrigger value="schedules">Schedules</TabsTrigger>
          <TabsTrigger value="tariffs">Tariffs</TabsTrigger>
          <TabsTrigger value="advanced">Advanced Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="strategies">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Optimization Mode</CardTitle>
                  <CardDescription>Select your primary optimization goal</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Button 
                      variant={settings?.mode === 'cost_saving' ? 'default' : 'outline'}
                      className="h-auto py-4 flex flex-col items-center gap-2" 
                      onClick={() => changeOptimizationMode('cost_saving')}
                    >
                      <CreditCard className="h-6 w-6" />
                      <span>Cost Saving</span>
                    </Button>
                    
                    <Button 
                      variant={settings?.mode === 'self_sufficiency' ? 'default' : 'outline'}
                      className="h-auto py-4 flex flex-col items-center gap-2"
                      onClick={() => changeOptimizationMode('self_sufficiency')}
                    >
                      <Leaf className="h-6 w-6" />
                      <span>Self-Sufficiency</span>
                    </Button>
                    
                    <Button 
                      variant={settings?.mode === 'peak_shaving' ? 'default' : 'outline'}
                      className="h-auto py-4 flex flex-col items-center gap-2"
                      onClick={() => changeOptimizationMode('peak_shaving')}
                    >
                      <BarChart4 className="h-6 w-6" />
                      <span>Peak Shaving</span>
                    </Button>
                    
                    <Button 
                      variant={settings?.mode === 'carbon_reduction' ? 'default' : 'outline'}
                      className="h-auto py-4 flex flex-col items-center gap-2"
                      onClick={() => changeOptimizationMode('carbon_reduction')}
                    >
                      <Leaf className="h-6 w-6" />
                      <span>Carbon Reduction</span>
                    </Button>
                    
                    <Button 
                      variant={settings?.mode === 'grid_relief' ? 'default' : 'outline'}
                      className="h-auto py-4 flex flex-col items-center gap-2"
                      onClick={() => changeOptimizationMode('grid_relief')}
                    >
                      <Zap className="h-6 w-6" />
                      <span>Grid Relief</span>
                    </Button>
                  </div>
                  
                  <div className="mt-6">
                    <div className="h-[300px]">
                      <PowerChart mode="week" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Active Strategies</CardTitle>
                  <CardDescription>Enable or disable optimization strategies</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart4 className="h-5 w-5 text-primary" />
                      <div>
                        <h4 className="text-sm font-medium">Peak Shaving</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Reduce peak demand</p>
                      </div>
                    </div>
                    <Switch 
                      checked={settings?.peakShavingEnabled} 
                      onCheckedChange={(checked) => handleToggleStrategy('peakShaving', checked)}
                    />
                  </div>
                  
                  {settings?.peakShavingEnabled && (
                    <div className="ml-7 pl-2 border-l border-gray-200 dark:border-gray-800">
                      <Label className="text-xs mb-2 block">Peak Target (kW)</Label>
                      <div className="flex items-center gap-4">
                        <Slider 
                          defaultValue={[settings?.peakShavingTarget || 5]} 
                          max={15}
                          step={0.5}
                          min={1}
                          onValueChange={handlePeakShavingTarget}
                          className="flex-1"
                        />
                        <span className="text-sm font-medium w-10 text-right">
                          {settings?.peakShavingTarget || 5} kW
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Leaf className="h-5 w-5 text-green-500" />
                      <div>
                        <h4 className="text-sm font-medium">Self-Consumption</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Maximize solar usage</p>
                      </div>
                    </div>
                    <Switch 
                      checked={settings?.selfConsumptionEnabled} 
                      onCheckedChange={(checked) => handleToggleStrategy('selfConsumption', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-500" />
                      <div>
                        <h4 className="text-sm font-medium">Battery Arbitrage</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Charge at low prices, discharge at high</p>
                      </div>
                    </div>
                    <Switch 
                      checked={settings?.batteryArbitrageEnabled} 
                      onCheckedChange={(checked) => handleToggleStrategy('batteryArbitrage', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BatteryCharging className="h-5 w-5 text-purple-500" />
                      <div>
                        <h4 className="text-sm font-medium">V2G/V2H</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Bidirectional EV charging</p>
                      </div>
                    </div>
                    <Switch 
                      checked={settings?.v2gEnabled} 
                      onCheckedChange={(checked) => handleToggleStrategy('v2g', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-green-500" />
                      <div>
                        <h4 className="text-sm font-medium">AI Recommendations</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Intelligent suggestions</p>
                      </div>
                    </div>
                    <Switch 
                      checked={settings?.aiRecommendationsEnabled} 
                      onCheckedChange={(checked) => handleToggleStrategy('aiRecommendations', checked)}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="schedules">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Battery Schedules</CardTitle>
                <CardDescription>Configure when to charge and discharge your battery</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Charge Windows</h4>
                    {settings?.schedules?.batteryCharge?.map((schedule, index) => (
                      <div key={index} className="flex items-center gap-4 mb-2">
                        <div className="grid grid-cols-2 gap-2 flex-1">
                          <div>
                            <Label className="text-xs mb-1 block">From</Label>
                            <Input 
                              type="time" 
                              value={schedule.start} 
                              className="h-9"
                              // This would need a proper handler to update the schedule
                            />
                          </div>
                          <div>
                            <Label className="text-xs mb-1 block">To</Label>
                            <Input 
                              type="time" 
                              value={schedule.end} 
                              className="h-9"
                              // This would need a proper handler to update the schedule
                            />
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="mt-5">
                          Remove
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" className="mt-2">
                      + Add Charge Window
                    </Button>
                  </div>
                  
                  <div className="mt-6">
                    <h4 className="text-sm font-medium mb-2">Discharge Windows</h4>
                    {settings?.schedules?.batteryDischarge?.map((schedule, index) => (
                      <div key={index} className="flex items-center gap-4 mb-2">
                        <div className="grid grid-cols-2 gap-2 flex-1">
                          <div>
                            <Label className="text-xs mb-1 block">From</Label>
                            <Input 
                              type="time" 
                              value={schedule.start} 
                              className="h-9"
                              // This would need a proper handler to update the schedule
                            />
                          </div>
                          <div>
                            <Label className="text-xs mb-1 block">To</Label>
                            <Input 
                              type="time" 
                              value={schedule.end} 
                              className="h-9"
                              // This would need a proper handler to update the schedule
                            />
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="mt-5">
                          Remove
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" className="mt-2">
                      + Add Discharge Window
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>EV Charging Schedules</CardTitle>
                <CardDescription>Configure when to charge your electric vehicle</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {settings?.schedules?.evCharging?.map((schedule, index) => (
                    <div key={index} className="flex items-center gap-4 mb-2">
                      <div className="grid grid-cols-3 gap-2 flex-1">
                        <div>
                          <Label className="text-xs mb-1 block">From</Label>
                          <Input 
                            type="time" 
                            value={schedule.start} 
                            className="h-9"
                            // This would need a proper handler to update the schedule
                          />
                        </div>
                        <div>
                          <Label className="text-xs mb-1 block">To</Label>
                          <Input 
                            type="time" 
                            value={schedule.end} 
                            className="h-9"
                            // This would need a proper handler to update the schedule
                          />
                        </div>
                        <div>
                          <Label className="text-xs mb-1 block">Mode</Label>
                          <select 
                            value={schedule.mode} 
                            className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            // This would need a proper handler to update the schedule
                          >
                            <option value="solar_only">Solar Only</option>
                            <option value="balanced">Balanced</option>
                            <option value="fast">Fast</option>
                          </select>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="mt-5">
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="mt-2">
                    + Add Charging Schedule
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="tariffs">
          <Card>
            <CardHeader>
              <CardTitle>Electricity Tariffs</CardTitle>
              <CardDescription>Configure your electricity pricing for accurate savings calculations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium mb-2">Standard Tariff</h4>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs mb-1 block">Import Rate (per kWh)</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
                        <Input className="pl-7" placeholder="0.20" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">Export Rate (per kWh)</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
                        <Input className="pl-7" placeholder="0.05" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch id="tou-tariff" />
                      <Label htmlFor="tou-tariff">Use Time-of-Use Tariff</Label>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-2">Peak/Off-Peak Hours</h4>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs mb-1 block">Peak Hours</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input type="time" placeholder="16:00" />
                        <Input type="time" placeholder="20:00" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">Peak Rate (per kWh)</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
                        <Input className="pl-7" placeholder="0.30" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">Off-Peak Rate (per kWh)</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
                        <Input className="pl-7" placeholder="0.10" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <Button>Save Tariff Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="advanced">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
              <CardDescription>Configure advanced optimization parameters</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium mb-2">Battery Parameters</h4>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs mb-1 block">Minimum State of Charge (%)</Label>
                      <div className="flex items-center gap-4">
                        <Slider 
                          defaultValue={[20]} 
                          max={50}
                          step={5}
                          min={5}
                          className="flex-1"
                        />
                        <span className="text-sm font-medium w-8 text-right">20%</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">Reserve Capacity for Outages (%)</Label>
                      <div className="flex items-center gap-4">
                        <Slider 
                          defaultValue={[10]} 
                          max={50}
                          step={5}
                          min={0}
                          className="flex-1"
                        />
                        <span className="text-sm font-medium w-8 text-right">10%</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-2">EV Charging Parameters</h4>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs mb-1 block">Default Target SoC (%)</Label>
                      <div className="flex items-center gap-4">
                        <Slider 
                          defaultValue={[80]} 
                          max={100}
                          step={5}
                          min={50}
                          className="flex-1"
                        />
                        <span className="text-sm font-medium w-8 text-right">80%</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">Solar-Only Mode Min. Power (kW)</Label>
                      <div className="flex items-center gap-4">
                        <Slider 
                          defaultValue={[1.5]} 
                          max={5}
                          step={0.5}
                          min={0.5}
                          className="flex-1"
                        />
                        <span className="text-sm font-medium w-10 text-right">1.5 kW</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <h4 className="text-sm font-medium mb-2">Grid Connection</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs mb-1 block">Grid Connection Point (kW)</Label>
                    <Input type="number" placeholder="11.0" />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Feed-in Limitation (%)</Label>
                    <div className="flex items-center gap-4">
                      <Slider 
                        defaultValue={[70]} 
                        max={100}
                        step={5}
                        min={0}
                        className="flex-1"
                      />
                      <span className="text-sm font-medium w-8 text-right">70%</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <Button>Save Advanced Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
