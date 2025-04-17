import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useSiteContext } from '@/hooks/use-site-context';
import { useDevicesBySite } from '@/hooks/useDevice.ts';
import { Brain, Zap, BatteryCharging, PlugZap, Lightbulb, Activity, BarChart2, ExternalLink, DownloadCloud, Check, RefreshCw, Settings, AlertCircle, Clock } from 'lucide-react';
import RealTimeEnergyFlow from '@/components/dashboard/RealTimeEnergyFlow';
import { motion } from 'framer-motion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { format } from 'date-fns';
import VppParticipationWizard from '@/components/vpp/VppParticipationWizard';

// Mock data for the optimization panel
const mockOptimizationModes = [
  { id: 'cost_saving', name: 'Cost Saving', description: 'Minimize energy costs by optimizing usage during low-price periods and maximizing self-consumption.' },
  { id: 'self_sufficiency', name: 'Self Sufficiency', description: 'Maximize use of your own energy generation to reduce grid dependency.' },
  { id: 'peak_shaving', name: 'Peak Shaving', description: 'Reduce grid import during peak periods to avoid demand charges.' },
  { id: 'battery_life', name: 'Battery Life', description: 'Extend battery lifespan by optimizing charge/discharge cycles.' },
];

const mockOptimizationResults = [
  {
    id: 'opt-123',
    timestamp: new Date().toISOString(),
    mode: 'cost_saving',
    recommendations: [
      { deviceId: 1, command: 'setChargeMode', params: { mode: 'economy' }, priority: 1 },
      { deviceId: 2, command: 'setDischargeRate', params: { rate: 2.5 }, priority: 2 },
    ],
    predictedSavings: 12.5,
    confidenceScore: 0.85,
    reasoning: 'Based on the forecast for high electricity prices between 4-7pm, the system recommends charging the battery from solar during the day and discharging during peak hours.',
  },
  {
    id: 'opt-124',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    mode: 'self_sufficiency',
    recommendations: [
      { deviceId: 1, command: 'setChargeMode', params: { mode: 'solar_only' }, priority: 1 },
      { deviceId: 3, command: 'setChargingLimit', params: { limit: 3.7 }, priority: 2 },
    ],
    predictedSavings: 9.2,
    confidenceScore: 0.78,
    reasoning: 'With the forecasted sunny weather, storing excess solar energy in the battery and reducing EV charging speed will maximize self-consumption.',
  },
];

// Mock forecast data for charts
const generateForecastData = () => {
  const data = [];
  const now = new Date();
  
  for (let i = 0; i < 24; i++) {
    const time = new Date(now.getTime() + i * 3600000);
    const hour = time.getHours();
    
    // Price curve (higher in evening)
    let price = 0.10;
    if (hour >= 17 && hour <= 21) {
      price = 0.28;
    } else if (hour >= 7 && hour <= 16) {
      price = 0.15;
    }
    
    // Solar generation curve (peak at noon)
    let solarGen = 0;
    if (hour >= 6 && hour <= 20) {
      solarGen = 5 * Math.sin(Math.PI * (hour - 6) / 14);
    }
    
    // Consumption curve (peaks in morning and evening)
    let consumption = 0.8;
    if (hour >= 6 && hour <= 9) {
      consumption = 2.5;
    } else if (hour >= 17 && hour <= 22) {
      consumption = 3.5;
    }
    
    data.push({
      time: format(time, 'HH:mm'),
      hour: hour,
      price: price,
      solarGeneration: Math.max(0, solarGen.toFixed(1)),
      consumption: consumption.toFixed(1),
      gridImport: Math.max(0, (consumption - solarGen).toFixed(1)),
    });
  }
  
  return data;
};

const forecastData = generateForecastData();

export default function OptimizationDashboard() {
  const [optimizationMode, setOptimizationMode] = useState('cost_saving');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [realTimeControl, setRealTimeControl] = useState(true);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [selectedOptimization, setSelectedOptimization] = useState<string | null>(null);
  const { toast } = useToast();
  const { currentSiteId } = useSiteContext();
  const { data: devices = [], isLoading: devicesLoading } = useDevicesBySite(currentSiteId || undefined);

  // Handle optimization run
  const runOptimization = () => {
    setIsOptimizing(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsOptimizing(false);
      toast({
        title: 'Optimization Complete',
        description: 'New energy optimization recommendations are available',
      });
    }, 2500);
  };

  // Get the currently selected optimization
  const currentOptimization = mockOptimizationResults.find(opt => opt.id === selectedOptimization) || 
    (mockOptimizationResults.length > 0 ? mockOptimizationResults[0] : null);
  
  // Apply optimization recommendations
  const applyRecommendations = () => {
    if (!currentOptimization) return;
    
    toast({
      title: 'Recommendations Applied',
      description: `${currentOptimization.recommendations.length} device commands have been scheduled`,
    });
  };

  return (
    <div className="container py-6 px-4">
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold">Energy Optimization</h1>
            <p className="text-muted-foreground">AI-powered energy management and optimization</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              className="flex items-center"
              onClick={() => setActiveTab('vpp')}
            >
              <PlugZap className="mr-2 h-4 w-4" />
              VPP Programs
            </Button>
            <Button 
              className="flex items-center"
              onClick={runOptimization}
              disabled={isOptimizing}
            >
              {isOptimizing ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Brain className="mr-2 h-4 w-4" />
              )}
              Run Optimization
            </Button>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="optimization">Optimization Engine</TabsTrigger>
            <TabsTrigger value="vpp">VPP Participation</TabsTrigger>
          </TabsList>
          
          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Optimization Status Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <Brain className="mr-2 h-5 w-5 text-primary" />
                    Optimization Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <div className="font-medium">Active</div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Current Mode</div>
                    <div className="font-medium flex items-center">
                      {optimizationMode === 'cost_saving' && <DownloadCloud className="mr-2 h-4 w-4 text-blue-500" />}
                      {optimizationMode === 'self_sufficiency' && <BatteryCharging className="mr-2 h-4 w-4 text-green-500" />}
                      {optimizationMode === 'peak_shaving' && <Activity className="mr-2 h-4 w-4 text-purple-500" />}
                      {optimizationMode === 'battery_life' && <Zap className="mr-2 h-4 w-4 text-yellow-500" />}
                      {mockOptimizationModes.find(m => m.id === optimizationMode)?.name}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Last Optimization</div>
                    <div className="font-medium">
                      {mockOptimizationResults.length > 0 
                        ? format(new Date(mockOptimizationResults[0].timestamp), 'MMM d, yyyy HH:mm')
                        : 'Never'}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Scheduled Recommendations</div>
                    <div className="font-medium">
                      {mockOptimizationResults.length > 0 
                        ? mockOptimizationResults[0].recommendations.length
                        : 0} actions
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">AI Confidence Score</div>
                    <div className="flex items-center">
                      <Progress
                        value={mockOptimizationResults.length > 0 
                          ? mockOptimizationResults[0].confidenceScore * 100
                          : 0}
                        className="h-2 flex-1 mr-2"
                      />
                      <div className="w-10 text-right font-medium">
                        {mockOptimizationResults.length > 0 
                          ? `${(mockOptimizationResults[0].confidenceScore * 100).toFixed(0)}%`
                          : '0%'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Real-Time Energy Flow */}
              <RealTimeEnergyFlow />
              
              {/* Forecast Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <BarChart2 className="mr-2 h-5 w-5 text-primary" />
                    Energy Forecast
                  </CardTitle>
                  <CardDescription>24-hour forecasts for your site</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Tabs defaultValue="price">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="price">Price</TabsTrigger>
                      <TabsTrigger value="generation">Generation</TabsTrigger>
                      <TabsTrigger value="consumption">Consumption</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="price" className="pt-4">
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={forecastData}
                            margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis 
                              dataKey="time"
                              tick={{ fontSize: 12 }}
                              tickFormatter={(time) => time.split(':')[0]}
                            />
                            <YAxis
                              tick={{ fontSize: 12 }}
                              tickFormatter={(value) => `$${value}`}
                              domain={[0, 0.30]}
                            />
                            <Tooltip 
                              formatter={(value) => [`$${value}`, 'Price per kWh']}
                              labelFormatter={(time) => `Time: ${time}`}
                            />
                            <Area 
                              type="monotone" 
                              dataKey="price" 
                              stroke="#f59e0b" 
                              fill="#fcd34d"
                              strokeWidth={2}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                        <div>
                          Average: <span className="font-medium">${(forecastData.reduce((sum, d) => sum + d.price, 0) / forecastData.length).toFixed(2)}/kWh</span>
                        </div>
                        <div>
                          Peak: <span className="font-medium">${Math.max(...forecastData.map(d => d.price))}/kWh</span>
                        </div>
                        <div>
                          Off-Peak: <span className="font-medium">${Math.min(...forecastData.map(d => d.price))}/kWh</span>
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="generation" className="pt-4">
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={forecastData}
                            margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis 
                              dataKey="time"
                              tick={{ fontSize: 12 }}
                              tickFormatter={(time) => time.split(':')[0]}
                            />
                            <YAxis
                              tick={{ fontSize: 12 }}
                              tickFormatter={(value) => `${value}`}
                              domain={[0, 5]}
                            />
                            <Tooltip 
                              formatter={(value) => [`${value} kW`, 'Solar Generation']}
                              labelFormatter={(time) => `Time: ${time}`}
                            />
                            <Area 
                              type="monotone" 
                              dataKey="solarGeneration" 
                              stroke="#22c55e" 
                              fill="#86efac"
                              strokeWidth={2}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                        <div>
                          Peak: <span className="font-medium">{Math.max(...forecastData.map(d => parseFloat(d.solarGeneration)))?.toFixed(1)} kW</span>
                        </div>
                        <div>
                          Total: <span className="font-medium">{forecastData.reduce((sum, d) => sum + parseFloat(d.solarGeneration), 0).toFixed(1)} kWh</span>
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="consumption" className="pt-4">
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={forecastData}
                            margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis 
                              dataKey="time"
                              tick={{ fontSize: 12 }}
                              tickFormatter={(time) => time.split(':')[0]}
                            />
                            <YAxis
                              tick={{ fontSize: 12 }}
                              tickFormatter={(value) => `${value}`}
                              domain={[0, 4]}
                            />
                            <Tooltip 
                              formatter={(value) => [`${value} kW`, 'Consumption']}
                              labelFormatter={(time) => `Time: ${time}`}
                            />
                            <Area 
                              type="monotone" 
                              dataKey="consumption" 
                              stroke="#3b82f6" 
                              fill="#93c5fd"
                              strokeWidth={2}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                        <div>
                          Peak: <span className="font-medium">{Math.max(...forecastData.map(d => parseFloat(d.consumption)))?.toFixed(1)} kW</span>
                        </div>
                        <div>
                          Total: <span className="font-medium">{forecastData.reduce((sum, d) => sum + parseFloat(d.consumption), 0).toFixed(1)} kWh</span>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Optimization Recommendations */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <Lightbulb className="mr-2 h-5 w-5 text-primary" />
                    Optimization Recommendations
                  </CardTitle>
                  <CardDescription>
                    AI-generated recommendations for your energy assets
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {mockOptimizationResults.length > 0 ? (
                    <div className="space-y-4">
                      <Accordion 
                        type="single" 
                        defaultValue={mockOptimizationResults[0].id} 
                        collapsible
                        onValueChange={setSelectedOptimization}
                      >
                        {mockOptimizationResults.map((opt) => (
                          <AccordionItem key={opt.id} value={opt.id}>
                            <AccordionTrigger className="py-3">
                              <div className="flex items-center text-left">
                                <div>
                                  <div className="font-medium flex items-center">
                                    {opt.mode === 'cost_saving' && <DownloadCloud className="mr-2 h-4 w-4 text-blue-500" />}
                                    {opt.mode === 'self_sufficiency' && <BatteryCharging className="mr-2 h-4 w-4 text-green-500" />}
                                    {opt.mode === 'peak_shaving' && <Activity className="mr-2 h-4 w-4 text-purple-500" />}
                                    {opt.mode === 'battery_life' && <Zap className="mr-2 h-4 w-4 text-yellow-500" />}
                                    {mockOptimizationModes.find(m => m.id === opt.mode)?.name}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {format(new Date(opt.timestamp), 'MMM d, HH:mm')} • {opt.recommendations.length} actions
                                  </div>
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pb-4">
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="text-sm text-muted-foreground">Predicted savings</div>
                                  <div className="font-medium text-green-600">${opt.predictedSavings.toFixed(2)}</div>
                                </div>
                                
                                <div className="text-sm text-muted-foreground mb-1">Device recommendations</div>
                                <div className="space-y-2">
                                  {opt.recommendations.map((rec, idx) => {
                                    const device = devices.find(d => d.id === rec.deviceId);
                                    return (
                                      <div key={idx} className="bg-muted/50 p-2 rounded-md flex items-center justify-between">
                                        <div>
                                          <div className="font-medium">{device?.name || `Device ${rec.deviceId}`}</div>
                                          <div className="text-xs text-muted-foreground">
                                            {rec.command} {JSON.stringify(rec.params)}
                                          </div>
                                        </div>
                                        <Badge variant="outline" className="text-xs">
                                          Priority {rec.priority}
                                        </Badge>
                                      </div>
                                    );
                                  })}
                                </div>
                                
                                <div>
                                  <div className="text-sm text-muted-foreground mb-1">Reasoning</div>
                                  <div className="text-sm">{opt.reasoning}</div>
                                </div>
                                
                                <Button
                                  className="w-full mt-2"
                                  onClick={applyRecommendations}
                                >
                                  Apply Recommendations
                                </Button>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Brain className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground mb-4">No optimization recommendations yet</p>
                      <Button onClick={runOptimization}>Run Optimization</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Optimization Performance */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <Activity className="mr-2 h-5 w-5 text-primary" />
                    Optimization Performance
                  </CardTitle>
                  <CardDescription>
                    Monitor the effectiveness of energy optimizations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="text-xs text-muted-foreground">Monthly Savings</div>
                      <div className="text-xl font-semibold text-green-600">$124.50</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="text-xs text-muted-foreground">Self-Consumption</div>
                      <div className="text-xl font-semibold">78%</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="text-xs text-muted-foreground">Peak Reduction</div>
                      <div className="text-xl font-semibold">3.5 kW</div>
                    </div>
                  </div>
                  
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={[
                          { date: '05/10', actual: 8.2, baseline: 12.4 },
                          { date: '05/11', actual: 7.9, baseline: 11.8 },
                          { date: '05/12', actual: 8.1, baseline: 12.1 },
                          { date: '05/13', actual: 7.6, baseline: 11.6 },
                          { date: '05/14', actual: 7.2, baseline: 10.9 },
                          { date: '05/15', actual: 6.8, baseline: 10.5 },
                          { date: '05/16', actual: 6.5, baseline: 9.8 },
                        ]}
                        margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="date"
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis
                          tick={{ fontSize: 12 }}
                          label={{ value: '$ / day', angle: -90, position: 'insideLeft', dy: 40 }}
                          width={50}
                        />
                        <Tooltip />
                        <Line 
                          type="monotone" 
                          dataKey="baseline" 
                          name="Baseline Cost"
                          stroke="#94a3b8" 
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={{ r: 4 }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="actual" 
                          name="Optimized Cost"
                          stroke="#22c55e" 
                          strokeWidth={2}
                          dot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <div className="text-sm font-medium mb-1">AI Improvement Over Time</div>
                    <p className="text-sm text-muted-foreground">
                      The AI optimization engine has improved efficiency by learning from your usage patterns.
                      Optimization has reduced energy costs by 22% compared to baseline.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Optimization Engine Tab */}
          <TabsContent value="optimization" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Optimization Settings */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="mr-2 h-5 w-5 text-primary" />
                    Optimization Settings
                  </CardTitle>
                  <CardDescription>
                    Configure the AI optimization engine
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Optimization Mode</Label>
                    <Select value={optimizationMode} onValueChange={setOptimizationMode}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select mode..." />
                      </SelectTrigger>
                      <SelectContent>
                        {mockOptimizationModes.map((mode) => (
                          <SelectItem key={mode.id} value={mode.id}>
                            {mode.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {mockOptimizationModes.find(m => m.id === optimizationMode)?.description}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Real-Time Control</Label>
                      <Switch 
                        checked={realTimeControl} 
                        onCheckedChange={setRealTimeControl} 
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Automatically apply optimization recommendations to your devices
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Look-Ahead Hours</Label>
                    <Select defaultValue="24">
                      <SelectTrigger>
                        <SelectValue placeholder="Select hours..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="6">6 hours</SelectItem>
                        <SelectItem value="12">12 hours</SelectItem>
                        <SelectItem value="24">24 hours</SelectItem>
                        <SelectItem value="48">48 hours</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      How far in advance the AI should plan optimizations
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Optimization Schedule</Label>
                    <Select defaultValue="hourly">
                      <SelectTrigger>
                        <SelectValue placeholder="Select schedule..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15min">Every 15 minutes</SelectItem>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="4hour">Every 4 hours</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      How often the optimization process should run
                    </p>
                  </div>
                  
                  <div className="pt-2">
                    <Button className="w-full" onClick={runOptimization} disabled={isOptimizing}>
                      {isOptimizing ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Running Optimization...
                        </>
                      ) : (
                        <>
                          <Brain className="mr-2 h-4 w-4" />
                          Run Optimization Now
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              {/* Device Participation */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <PlugZap className="mr-2 h-5 w-5 text-primary" />
                    Device Participation
                  </CardTitle>
                  <CardDescription>
                    Select which devices are controlled by the AI optimization engine
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {devicesLoading ? (
                    <div className="flex items-center justify-center p-8">
                      <RefreshCw className="h-8 w-8 animate-spin text-primary/70" />
                    </div>
                  ) : devices.length > 0 ? (
                    <div className="space-y-4">
                      <ScrollArea className="h-[350px] pr-4">
                        <div className="space-y-3">
                          {devices.map((device) => (
                            <div 
                              key={device.id} 
                              className="flex items-center justify-between p-3 border rounded-lg"
                            >
                              <div>
                                <div className="font-medium">{device.name}</div>
                                <div className="text-sm text-muted-foreground">{device.type} • {device.capacity || 0} kW</div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline" className={
                                  device.status === 'online' || device.status === 'connected'
                                    ? 'bg-green-50 text-green-700 border-green-200'
                                    : 'bg-gray-50 text-gray-700 border-gray-200'
                                }>
                                  {device.status || 'unknown'}
                                </Badge>
                                <Switch defaultChecked={true} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                      
                      <Alert>
                        <AlertTitle className="flex items-center">
                          <Info className="h-4 w-4 mr-2" />
                          Optimization Access
                        </AlertTitle>
                        <AlertDescription>
                          <p className="text-sm mb-2">
                            Devices included in optimization will receive commands based on the selected optimization mode.
                            You can exclude sensitive devices at any time.
                          </p>
                          <div className="flex items-center space-x-2">
                            <div className="text-xs text-muted-foreground">
                              {devices.length} devices available for optimization
                            </div>
                            <span className="text-xs text-muted-foreground">•</span>
                            <div className="text-xs font-medium text-green-600">
                              {devices.length} devices included
                            </div>
                          </div>
                        </AlertDescription>
                      </Alert>
                    </div>
                  ) : (
                    <Alert>
                      <AlertTitle className="flex items-center">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        No Devices Found
                      </AlertTitle>
                      <AlertDescription>
                        <p className="mb-2">No devices are available for optimization.</p>
                        <Button variant="outline" size="sm">Add Devices</Button>
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {/* AI Engine & Constraints */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* AI Engine Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Brain className="mr-2 h-5 w-5 text-primary" />
                    AI Engine Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert className="bg-primary/5 border-primary/20">
                    <div className="flex items-center">
                      <AlertCircle className="h-4 w-4 mr-2 text-primary" />
                      <AlertTitle>Advanced Settings</AlertTitle>
                    </div>
                    <AlertDescription className="mt-2 text-sm">
                      These settings control the behavior of the AI optimization engine.
                      Changes may affect the quality of recommendations.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>AI Model</Label>
                      <Select defaultValue="gpt4o">
                        <SelectTrigger>
                          <SelectValue placeholder="Select model..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gpt4o">GPT-4o (Recommended)</SelectItem>
                          <SelectItem value="gpt35turbo">GPT-3.5 Turbo</SelectItem>
                          <SelectItem value="claude3">Claude 3 Sonnet</SelectItem>
                          <SelectItem value="local">Local Reinforcement Learning</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Enable Reinforcement Learning</Label>
                        <Switch defaultChecked={true} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Use feedback from past optimizations to improve future recommendations
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Temperature</Label>
                        <span className="font-medium text-sm">0.2</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-muted-foreground">Precise</span>
                        <Slider 
                          defaultValue={[0.2]} 
                          max={1} 
                          step={0.1} 
                          className="flex-1"
                        />
                        <span className="text-xs text-muted-foreground">Creative</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Confidence Threshold</Label>
                      <Select defaultValue="0.7">
                        <SelectTrigger>
                          <SelectValue placeholder="Select threshold..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0.5">0.5 (More Recommendations)</SelectItem>
                          <SelectItem value="0.7">0.7 (Balanced)</SelectItem>
                          <SelectItem value="0.9">0.9 (High Confidence Only)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Minimum confidence required to apply recommendations
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Optimization Constraints */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="mr-2 h-5 w-5 text-primary" />
                    Optimization Constraints
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Set limits on how the AI engine can control your devices
                  </p>
                  
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Battery Minimum State of Charge</Label>
                      <div className="flex items-center space-x-2">
                        <Slider 
                          defaultValue={[20]} 
                          max={50}
                          className="flex-1"
                        />
                        <div className="w-12 text-right font-medium">20%</div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Battery won't discharge below this level for optimization
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>EV Charging Priority</Label>
                      <Select defaultValue="medium">
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">High (Charge as fast as possible)</SelectItem>
                          <SelectItem value="medium">Medium (Balance with other loads)</SelectItem>
                          <SelectItem value="low">Low (Optimize for cost)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Allow Grid Export Control</Label>
                        <Switch defaultChecked={true} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Allow AI to manage excess solar export to grid
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Comfort Priority</Label>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-muted-foreground">Economy</span>
                          <Slider 
                            defaultValue={[50]} 
                            max={100}
                            step={25}
                            className="w-32"
                          />
                          <span className="text-xs text-muted-foreground">Comfort</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Balance between energy savings and comfort for HVAC/heat pump control
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Quiet Hours</Label>
                        <span className="font-medium text-sm">10:00 PM - 7:00 AM</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Limit device operations during these hours
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* VPP Participation Tab */}
          <TabsContent value="vpp" className="mt-4">
            <VppParticipationWizard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}