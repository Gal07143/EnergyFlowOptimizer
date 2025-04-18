import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RealTimeEnergyFlow from '@/components/dashboard/RealTimeEnergyFlow';
import { Activity, ArrowDown, ArrowUp, Battery, ChevronDown, ChevronUp, Home, PlugZap, SunIcon, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { format, subHours } from 'date-fns';
import { useSiteContext } from '@/hooks/use-site-context';

// Sample data for energy flow history
const generateEnergyFlowData = () => {
  const data = [];
  const now = new Date();
  
  for (let i = 24; i >= 0; i--) {
    const time = subHours(now, i);
    const hour = time.getHours();
    
    // Generate more realistic patterns
    // Solar peaks during the day
    let solarGen = 0;
    if (hour >= 6 && hour <= 18) {
      solarGen = 5 * Math.sin(Math.PI * (hour - 6) / 12);
    }
    
    // Home consumption has morning and evening peaks
    let homeConsumption = 0.8;
    if (hour >= 6 && hour <= 9) {
      homeConsumption = 2.0;
    } else if (hour >= 17 && hour <= 22) {
      homeConsumption = 2.8;
    }
    
    // EV charging mainly in the evening
    let evCharging = 0;
    if (hour >= 18 && hour <= 23) {
      evCharging = 3.5;
    }
    
    // Heat pump usage varies with temperature (more in early morning and evening)
    let heatPump = 0;
    if (hour >= 5 && hour <= 9) {
      heatPump = 1.2;
    } else if (hour >= 16 && hour <= 22) {
      heatPump = 1.5;
    }
    
    // Calculate grid and battery interactions
    const totalConsumption = homeConsumption + evCharging + heatPump;
    
    // Battery state
    let batteryCharge = 0;
    let batteryDischarge = 0;
    let batterySOC = 50; // average state of charge
    
    // Charge battery when excess solar
    if (solarGen > totalConsumption) {
      batteryCharge = Math.min(3, solarGen - totalConsumption);
      batterySOC += 5;
    } 
    // Discharge battery in evening when demand is high
    else if (hour >= 17 && hour <= 22 && totalConsumption > solarGen) {
      batteryDischarge = Math.min(3, totalConsumption - solarGen);
      batterySOC -= 5;
    }
    
    // Constrain battery SOC to realistic values
    batterySOC = Math.max(20, Math.min(95, batterySOC));
    
    // Calculate grid interaction
    const netHomeConsumption = totalConsumption - solarGen;
    const gridImport = Math.max(0, netHomeConsumption - batteryDischarge);
    const gridExport = Math.max(0, solarGen - totalConsumption - batteryCharge);
    
    data.push({
      time: format(time, 'HH:mm'),
      hour,
      date: format(time, 'MMM dd, HH:mm'),
      solarGeneration: parseFloat(solarGen.toFixed(1)),
      homeConsumption: parseFloat(homeConsumption.toFixed(1)),
      evCharging: parseFloat(evCharging.toFixed(1)),
      heatPump: parseFloat(heatPump.toFixed(1)),
      totalConsumption: parseFloat(totalConsumption.toFixed(1)),
      batteryCharge: parseFloat(batteryCharge.toFixed(1)),
      batteryDischarge: parseFloat(batteryDischarge.toFixed(1)),
      batterySOC: batterySOC,
      gridImport: parseFloat(gridImport.toFixed(1)),
      gridExport: parseFloat(gridExport.toFixed(1))
    });
  }
  
  return data;
};

// Energy source distribution data
const energySourceData = [
  { name: 'Solar', value: 42, color: '#22c55e' },
  { name: 'Battery', value: 18, color: '#3b82f6' },
  { name: 'Grid (Green)', value: 25, color: '#84cc16' },
  { name: 'Grid (Standard)', value: 15, color: '#f97316' }
];

// Energy consumption distribution data
const energyConsumptionData = [
  { name: 'Home Appliances', value: 35, color: '#8b5cf6' },
  { name: 'EV Charging', value: 25, color: '#ec4899' },
  { name: 'Heat Pump', value: 20, color: '#f43f5e' },
  { name: 'Water Heating', value: 12, color: '#06b6d4' },
  { name: 'Other', value: 8, color: '#94a3b8' }
];

// Dummy energy stats
const energyStats = {
  totalGeneration: 32.5,
  totalConsumption: 28.7,
  gridImport: 10.2,
  gridExport: 14.0,
  selfConsumptionRate: 72,
  batteryRoundTrip: 85,
  co2Saved: 15.3,
  peakReduction: 3.8
};

export default function EnergyFlowPage() {
  const energyFlowData = generateEnergyFlowData();
  const { currentSiteId } = useSiteContext();
  
  return (
    <div className="container py-6 px-4">
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold">Energy Flow</h1>
            <p className="text-muted-foreground">Detailed view of your site's energy flows and distributions</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline">Day</Button>
            <Button variant="outline">Week</Button>
            <Button variant="outline">Month</Button>
            <Button variant="outline">Year</Button>
          </div>
        </div>
        
        {/* Real-time energy flow visualization */}
        <div className="w-full mx-auto max-w-[1200px]">
          <RealTimeEnergyFlow />
        </div>
        
        {/* Historical Energy Flow */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2 text-primary" />
              Energy Flow History
            </CardTitle>
            <CardDescription>
              24-hour view of energy generation, consumption, and grid interaction
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="generation">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="generation">Generation</TabsTrigger>
                <TabsTrigger value="consumption">Consumption</TabsTrigger>
                <TabsTrigger value="grid">Grid Exchange</TabsTrigger>
                <TabsTrigger value="battery">Battery</TabsTrigger>
              </TabsList>
              
              <TabsContent value="generation" className="pt-4">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={energyFlowData}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="time" 
                        tickFormatter={(time) => time}
                      />
                      <YAxis 
                        label={{ value: 'Power (kW)', angle: -90, position: 'insideLeft', dx: -10 }}
                      />
                      <Tooltip 
                        formatter={(value, name) => [
                          `${value} kW`, 
                          name === 'solarGeneration' ? 'Solar Generation' : name
                        ]}
                        labelFormatter={(label) => `Time: ${label}`}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="solarGeneration" 
                        stroke="#22c55e" 
                        fill="#bbf7d0" 
                        name="Solar Generation"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="text-xs text-muted-foreground">Peak Generation</div>
                    <div className="flex items-center justify-between">
                      <div className="text-2xl font-semibold">{Math.max(...energyFlowData.map(d => d.solarGeneration))} kW</div>
                      <SunIcon className="h-8 w-8 text-yellow-500" />
                    </div>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="text-xs text-muted-foreground">Total Generation Today</div>
                    <div className="flex items-center justify-between">
                      <div className="text-2xl font-semibold">{energyStats.totalGeneration} kWh</div>
                      <Zap className="h-8 w-8 text-green-500" />
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="consumption" className="pt-4">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={energyFlowData}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="time" 
                        tickFormatter={(time) => time}
                      />
                      <YAxis 
                        label={{ value: 'Power (kW)', angle: -90, position: 'insideLeft', dx: -10 }}
                      />
                      <Tooltip 
                        formatter={(value, name) => [`${value} kW`, name]}
                        labelFormatter={(label) => `Time: ${label}`}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="homeConsumption" 
                        stackId="1"
                        stroke="#8b5cf6" 
                        fill="#c4b5fd" 
                        name="Home"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="evCharging" 
                        stackId="1"
                        stroke="#ec4899" 
                        fill="#fbcfe8" 
                        name="EV Charging"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="heatPump" 
                        stackId="1"
                        stroke="#f43f5e" 
                        fill="#fecdd3" 
                        name="Heat Pump"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="text-xs text-muted-foreground">Peak Consumption</div>
                    <div className="flex items-center justify-between">
                      <div className="text-2xl font-semibold">{Math.max(...energyFlowData.map(d => d.totalConsumption))} kW</div>
                      <Activity className="h-8 w-8 text-blue-500" />
                    </div>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="text-xs text-muted-foreground">Total Consumption Today</div>
                    <div className="flex items-center justify-between">
                      <div className="text-2xl font-semibold">{energyStats.totalConsumption} kWh</div>
                      <Home className="h-8 w-8 text-purple-500" />
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="grid" className="pt-4">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={energyFlowData}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="time" 
                        tickFormatter={(time) => time}
                      />
                      <YAxis 
                        label={{ value: 'Power (kW)', angle: -90, position: 'insideLeft', dx: -10 }}
                      />
                      <Tooltip 
                        formatter={(value, name) => [`${value} kW`, name]}
                        labelFormatter={(label) => `Time: ${label}`}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="gridImport" 
                        stroke="#f97316" 
                        fill="#fed7aa" 
                        name="Grid Import"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="gridExport" 
                        stroke="#22c55e" 
                        fill="#bbf7d0" 
                        name="Grid Export"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="text-xs text-muted-foreground">Total Grid Import</div>
                    <div className="flex items-center justify-between">
                      <div className="text-2xl font-semibold">
                        {energyStats.gridImport} kWh
                      </div>
                      <ArrowDown className="h-8 w-8 text-orange-500" />
                    </div>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="text-xs text-muted-foreground">Total Grid Export</div>
                    <div className="flex items-center justify-between">
                      <div className="text-2xl font-semibold">
                        {energyStats.gridExport} kWh
                      </div>
                      <ArrowUp className="h-8 w-8 text-green-500" />
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="battery" className="pt-4">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={energyFlowData}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="time" 
                        tickFormatter={(time) => time}
                      />
                      <YAxis 
                        yAxisId="power"
                        label={{ value: 'Power (kW)', angle: -90, position: 'insideLeft', dx: -10 }}
                      />
                      <YAxis 
                        yAxisId="soc"
                        orientation="right"
                        domain={[0, 100]}
                        label={{ value: 'State of Charge (%)', angle: 90, position: 'insideRight', dx: 10 }}
                      />
                      <Tooltip 
                        formatter={(value, name, props) => {
                          if (name === 'batterySOC') {
                            return [`${value}%`, 'State of Charge'];
                          }
                          return [`${value} kW`, name === 'batteryCharge' ? 'Charging' : 'Discharging'];
                        }}
                        labelFormatter={(label) => `Time: ${label}`}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="batteryCharge" 
                        yAxisId="power"
                        stroke="#3b82f6" 
                        fill="#bfdbfe" 
                        name="Battery Charge"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="batteryDischarge" 
                        yAxisId="power"
                        stroke="#f97316" 
                        fill="#fed7aa" 
                        name="Battery Discharge"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="batterySOC" 
                        yAxisId="soc"
                        stroke="#22c55e" 
                        fill="none" 
                        name="Battery SOC"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="text-xs text-muted-foreground">Current State of Charge</div>
                    <div className="flex items-center justify-between">
                      <div className="text-2xl font-semibold">
                        {energyFlowData[energyFlowData.length - 1].batterySOC}%
                      </div>
                      <Battery className="h-8 w-8 text-green-500" />
                    </div>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="text-xs text-muted-foreground">Efficiency</div>
                    <div className="flex items-center justify-between">
                      <div className="text-2xl font-semibold">
                        {energyStats.batteryRoundTrip}%
                      </div>
                      <Zap className="h-8 w-8 text-blue-500" />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        {/* Energy Distribution Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Energy Sources */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="h-5 w-5 mr-2 text-primary" />
                Energy Sources
              </CardTitle>
              <CardDescription>Distribution of energy by source</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={energySourceData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {energySourceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip formatter={(value) => [`${value}%`, 'Portion']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="mt-4 bg-muted/50 p-3 rounded-lg">
                <div className="text-xs text-muted-foreground">Self-Consumption Rate</div>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-semibold">
                    {energyStats.selfConsumptionRate}%
                  </div>
                  <div className="text-sm text-muted-foreground">
                    of energy is used on-site
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Energy Consumption */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Home className="h-5 w-5 mr-2 text-primary" />
                Energy Consumption
              </CardTitle>
              <CardDescription>Distribution of energy by consumption type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={energyConsumptionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {energyConsumptionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip formatter={(value) => [`${value}%`, 'Portion']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="mt-4 bg-muted/50 p-3 rounded-lg">
                <div className="text-xs text-muted-foreground">CO₂ Emissions Avoided</div>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-semibold">
                    {energyStats.co2Saved} kg
                  </div>
                  <div className="text-sm text-muted-foreground">
                    through renewable energy use
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}