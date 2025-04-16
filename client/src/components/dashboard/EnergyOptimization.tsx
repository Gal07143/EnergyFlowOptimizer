import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart2 } from 'lucide-react';
import PowerChart from '@/components/charts/PowerChart';
import { OptimizationSettings } from '@/types/energy';
import { Switch } from '@/components/ui/switch';
import { useUpdateOptimizationSettings } from '@/hooks/useOptimization';
import { useState } from 'react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

interface EnergyOptimizationProps {
  siteId: number;
  settings?: OptimizationSettings;
}

export default function EnergyOptimization({ siteId, settings }: EnergyOptimizationProps) {
  const [viewMode, setViewMode] = useState('week');
  const { mutate: updateSettings } = useUpdateOptimizationSettings();

  const handleToggleOptimization = (type: string, enabled: boolean) => {
    if (!settings) return;

    const updatedSettings: Partial<OptimizationSettings> = { ...settings };
    
    switch (type) {
      case 'peakShaving':
        updatedSettings.peakShavingEnabled = enabled;
        break;
      case 'selfConsumption':
        updatedSettings.selfConsumptionEnabled = enabled;
        break;
      case 'batteryArbitrage':
        updatedSettings.batteryArbitrageEnabled = enabled;
        break;
    }

    updateSettings({ 
      siteId, 
      ...updatedSettings 
    });
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 mt-8">
      <div className="pb-5 border-b border-gray-200 dark:border-gray-800 sm:flex sm:items-center sm:justify-between">
        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Energy Optimization</h3>
        <div className="mt-3 sm:mt-0 sm:ml-4">
          <Button variant="outline">
            <BarChart2 className="mr-2 h-4 w-4" />
            View All Analytics
          </Button>
        </div>
      </div>

      <Card className="mt-6">
        <CardContent className="p-0">
          <div className="px-4 py-5 sm:px-6 flex flex-wrap justify-between items-center">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Energy Forecasts & Optimization</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">AI-powered predictions and optimization strategies</p>
            </div>
            <Tabs defaultValue="week" className="mt-3 sm:mt-0" onValueChange={setViewMode} value={viewMode}>
              <TabsList>
                <TabsTrigger value="day">Day</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-800 px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Forecasting Chart */}
              <div className="col-span-2 h-80">
                <PowerChart mode={viewMode} />
              </div>

              {/* Optimization Strategies */}
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium text-gray-900 dark:text-white flex items-center">
                      <span className="flex items-center justify-center w-6 h-6 bg-green-100 dark:bg-green-900 rounded-full mr-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-green-600 dark:text-green-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                      </span>
                      Peak Shaving
                    </h4>
                    <Switch 
                      checked={settings?.peakShavingEnabled || false}
                      onCheckedChange={(checked) => handleToggleOptimization('peakShaving', checked)}
                    />
                  </div>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Reduce grid demand by {settings?.peakShavingTarget || 3.2} kW during peak hours (10AM-2PM).
                  </p>
                  <div className="mt-2 text-xs text-green-600 dark:text-green-400 font-medium">
                    Estimated savings: $12.50/month
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium text-gray-900 dark:text-white flex items-center">
                      <span className="flex items-center justify-center w-6 h-6 bg-amber-100 dark:bg-amber-900 rounded-full mr-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-amber-600 dark:text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                        </svg>
                      </span>
                      Self-Consumption
                    </h4>
                    <Switch 
                      checked={settings?.selfConsumptionEnabled || false}
                      onCheckedChange={(checked) => handleToggleOptimization('selfConsumption', checked)}
                    />
                  </div>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Maximize use of solar energy for household consumption.
                  </p>
                  <div className="mt-2 text-xs text-green-600 dark:text-green-400 font-medium">
                    Potential to increase to 85%
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium text-gray-900 dark:text-white flex items-center">
                      <span className="flex items-center justify-center w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full mr-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-blue-600 dark:text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                        </svg>
                      </span>
                      Battery Arbitrage
                    </h4>
                    <Switch 
                      checked={settings?.batteryArbitrageEnabled || false}
                      onCheckedChange={(checked) => handleToggleOptimization('batteryArbitrage', checked)}
                    />
                  </div>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Charge battery during low-price periods, discharge during high-price periods.
                  </p>
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 font-medium">
                    Requires Time-of-Use tariff
                  </div>
                </div>

                <Button className="w-full">
                  Apply AI Recommendations
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
