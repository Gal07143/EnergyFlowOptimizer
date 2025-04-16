import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MaximizeIcon } from 'lucide-react';
import { EnergyReading } from '@/types/energy';
import { Device } from '@/types/devices';
import EnergyFlowDiagram from '@/components/charts/EnergyFlowDiagram';
import StatusCard from '@/components/ui/StatusCard';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  LightbulbIcon, 
  PiggyBank, 
  CheckCircle 
} from 'lucide-react';
import { calculateSavings } from '@/lib/utils/energy-utils';

interface EnergyFlowProps {
  latestReading: EnergyReading;
  devices: Device[];
}

export default function EnergyFlow({ latestReading, devices }: EnergyFlowProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Get the latest readings for devices
  const batteryDevice = devices?.find(d => d.type === 'battery_storage');
  const batterySOC = 82; // This would come from device readings
  
  // Get optimization suggestions
  const hasExcessSolar = latestReading && latestReading.solarPower > (latestReading.homePower + latestReading.evPower);
  
  // Calculate today's savings
  const todaySavings = calculateSavings(latestReading);

  return (
    <div className="px-4 sm:px-6 lg:px-8 mt-8">
      <div className="pb-5 border-b border-gray-200 dark:border-gray-800 sm:flex sm:items-center sm:justify-between">
        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Energy Flow</h3>
        <div className="mt-3 sm:mt-0 sm:ml-4">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <MaximizeIcon className="mr-2 h-4 w-4" />
                Full View
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl h-[80vh]">
              <DialogHeader>
                <DialogTitle>Energy Flow Diagram</DialogTitle>
              </DialogHeader>
              <div className="h-full w-full p-4">
                <EnergyFlowDiagram
                  gridPower={latestReading.gridPower}
                  solarPower={latestReading.solarPower}
                  batteryPower={latestReading.batteryPower}
                  evPower={latestReading.evPower}
                  homePower={latestReading.homePower}
                  batterySOC={batterySOC}
                  fullscreen
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Energy Flow Diagram */}
      <Card className="mt-6 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="w-full md:w-8/12 h-72 relative">
              <EnergyFlowDiagram
                gridPower={latestReading.gridPower}
                solarPower={latestReading.solarPower}
                batteryPower={latestReading.batteryPower}
                evPower={latestReading.evPower}
                homePower={latestReading.homePower}
                batterySOC={batterySOC}
              />
            </div>

            {/* Energy Status Cards */}
            <div className="w-full md:w-4/12 space-y-4">
              <StatusCard 
                title="System Status" 
                status="optimal" 
                message="All assets online and working efficiently. PV production is above forecast."
              />

              {/* Smart Suggestions */}
              {hasExcessSolar && (
                <div className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-4 border border-primary-100 dark:border-primary-900">
                  <div className="flex items-center">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-800">
                      <LightbulbIcon className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                    </div>
                    <h4 className="ml-2 text-md font-medium text-primary-900 dark:text-primary-100">AI Suggestion</h4>
                  </div>
                  <div className="mt-2 text-sm text-primary-700 dark:text-primary-300">
                    <p>Excess solar production detected. Consider charging the battery to 100% before evening peak hours.</p>
                  </div>
                  <div className="mt-3 flex space-x-2">
                    <Button size="sm" variant="default">Apply</Button>
                    <Button size="sm" variant="outline" className="border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400">Dismiss</Button>
                  </div>
                </div>
              )}

              {/* Energy Savings */}
              <div className="bg-secondary-50 dark:bg-secondary-900/20 rounded-lg p-4 border border-secondary-100 dark:border-secondary-900">
                <div className="flex items-center">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary-100 dark:bg-secondary-800">
                    <PiggyBank className="h-4 w-4 text-secondary-600 dark:text-secondary-400" />
                  </div>
                  <h4 className="ml-2 text-md font-medium text-secondary-900 dark:text-secondary-100">Today's Savings</h4>
                </div>
                <div className="flex items-end mt-2">
                  <span className="text-2xl font-bold text-secondary-600 dark:text-secondary-400">${todaySavings.toFixed(2)}</span>
                  <span className="ml-1 text-xs text-secondary-500 dark:text-secondary-500 mb-1">saved</span>
                </div>
                <div className="mt-1 flex items-center text-sm text-secondary-700 dark:text-secondary-300">
                  <CheckCircle className="mr-1 h-3 w-3 text-green-500" />
                  <span>12% more than yesterday</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
