import React, { useState } from 'react';
import { useSiteContext } from '@/hooks/use-site-context';
import EnergyFlowHeatmap from '@/components/visualizations/EnergyFlowHeatmap';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Calendar, DownloadIcon, LayoutDashboard } from 'lucide-react';
import { useLocation } from 'wouter';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

// Sample data for energy snapshots (in a real app, this would come from the API)
const sampleSnapshots = [
  { id: 1, name: 'Morning Peak', timestamp: '2025-04-19T08:30:00Z', description: 'Peak morning energy consumption' },
  { id: 2, name: 'Solar Generation Max', timestamp: '2025-04-19T12:15:00Z', description: 'Maximum solar generation' },
  { id: 3, name: 'Evening Peak', timestamp: '2025-04-19T19:45:00Z', description: 'Peak evening energy consumption' },
  { id: 4, name: 'Night Battery Usage', timestamp: '2025-04-19T02:30:00Z', description: 'Overnight battery discharge' },
];

export default function EnergyFlowHeatmapPage() {
  const { currentSiteId } = useSiteContext();
  const [, navigate] = useLocation();
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('day');
  
  // Handle navigation back to dashboard
  const handleBackToDashboard = () => {
    navigate('/');
  };
  
  return (
    <div className="container py-6 px-4 max-w-[1600px] mx-auto">
      <div className="flex flex-col space-y-4">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold">Interactive Energy Flow</h1>
            <p className="text-muted-foreground">Real-time visualization of energy flows between your devices</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleBackToDashboard}>
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <DownloadIcon className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Export Options</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  Save as PNG
                </DropdownMenuItem>
                <DropdownMenuItem>
                  Save as PDF
                </DropdownMenuItem>
                <DropdownMenuItem>
                  Generate Report
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* Time Range Selector */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-muted-foreground" />
                <span className="text-sm font-medium">Time Range</span>
              </div>
              <Tabs value={timeRange} onValueChange={(value) => setTimeRange(value as 'day' | 'week' | 'month')}>
                <TabsList>
                  <TabsTrigger value="day">Day</TabsTrigger>
                  <TabsTrigger value="week">Week</TabsTrigger>
                  <TabsTrigger value="month">Month</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>
        
        {/* Main Heatmap Visualization */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Main Visualization */}
          <div className="lg:col-span-9">
            {/* The main visualization will fill most of the space */}
            <div className="w-full aspect-square md:aspect-[4/3] lg:aspect-[16/9] 2xl:aspect-[2/1]">
              <EnergyFlowHeatmap siteId={currentSiteId} fullscreen={true} />
            </div>
          </div>
          
          {/* Side Panel */}
          <div className="lg:col-span-3 space-y-4">
            {/* Energy Snapshots */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Activity className="h-5 w-5 mr-2 text-primary" />
                  Energy Snapshots
                </CardTitle>
                <CardDescription>
                  Compare different energy states
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {sampleSnapshots.map(snapshot => (
                  <Button 
                    key={snapshot.id} 
                    variant="outline" 
                    className="w-full justify-start text-left h-auto py-2 px-3"
                  >
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{snapshot.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(snapshot.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </Button>
                ))}
              </CardContent>
            </Card>
            
            {/* Current Energy Stats */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Current Stats</CardTitle>
                <CardDescription>Key energy metrics right now</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-muted/30 p-2 rounded-md">
                    <div className="text-xs text-muted-foreground">Solar</div>
                    <div className="text-lg font-semibold">2.4 kW</div>
                  </div>
                  <div className="bg-muted/30 p-2 rounded-md">
                    <div className="text-xs text-muted-foreground">Battery</div>
                    <div className="text-lg font-semibold">64%</div>
                  </div>
                  <div className="bg-muted/30 p-2 rounded-md">
                    <div className="text-xs text-muted-foreground">Grid</div>
                    <div className="text-lg font-semibold">0.8 kW</div>
                  </div>
                  <div className="bg-muted/30 p-2 rounded-md">
                    <div className="text-xs text-muted-foreground">Home</div>
                    <div className="text-lg font-semibold">1.9 kW</div>
                  </div>
                </div>
                
                <div className="pt-2">
                  <div className="text-xs font-medium mb-1">Energy Balance</div>
                  <div className="w-full bg-muted/20 h-2 rounded-full overflow-hidden">
                    <div className="bg-primary h-full" style={{ width: '65%' }}></div>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Consumption: 3.2 kW</span>
                    <span>Production: 4.8 kW</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}