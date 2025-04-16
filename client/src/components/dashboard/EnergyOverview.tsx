import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  Zap, 
  Plug, 
  Sun, 
  Leaf, 
  ArrowUp, 
  ArrowDown, 
  CalendarIcon
} from 'lucide-react';
import { EnergyReading } from '@/types/energy';
import { formatNumber, formatDate } from '@/lib/utils/data-utils';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';

interface EnergyOverviewProps {
  latestReading: EnergyReading;
}

export default function EnergyOverview({ latestReading }: EnergyOverviewProps) {
  const [date, setDate] = useState<Date>(new Date());

  // Calculate percentage changes (simplified example)
  const currentPowerChange = 12; // Normally would be calculated from historical data
  const consumptionChange = 8; // Normally would be calculated from yesterday's data
  const solarChange = 5; // Normally would be calculated from forecast
  const selfSufficiencyChange = 18; // Normally would be calculated from last week

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="pb-5 border-b border-gray-200 dark:border-gray-800 sm:flex sm:items-center sm:justify-between">
        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Energy Overview</h3>
        <div className="mt-3 flex sm:mt-0 sm:ml-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="ml-auto">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(date, 'PPP')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarComponent
                mode="single"
                selected={date}
                onSelect={(date) => date && setDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Current Power */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-md bg-primary-100 dark:bg-primary-900/30">
                <Zap className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Current Power</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatNumber(latestReading.gridPower, 1)} kW
                </div>
              </div>
            </div>
            <div className="mt-3 text-sm">
              <span className={`font-medium flex items-center ${currentPowerChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {currentPowerChange >= 0 ? <ArrowUp className="mr-1 h-3 w-3" /> : <ArrowDown className="mr-1 h-3 w-3" />}
                {Math.abs(currentPowerChange)}%
              </span>
              <span className="text-gray-500 dark:text-gray-400 ml-2">from average</span>
            </div>
          </CardContent>
        </Card>

        {/* Daily Energy Consumption */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-md bg-secondary-100 dark:bg-secondary-900/30">
                <Plug className="h-5 w-5 text-secondary-600 dark:text-secondary-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Today's Consumption</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatNumber(latestReading.homeEnergy + latestReading.evEnergy, 1)} kWh
                </div>
              </div>
            </div>
            <div className="mt-3 text-sm">
              <span className={`font-medium flex items-center ${consumptionChange >= 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                {consumptionChange >= 0 ? <ArrowUp className="mr-1 h-3 w-3" /> : <ArrowDown className="mr-1 h-3 w-3" />}
                {Math.abs(consumptionChange)}%
              </span>
              <span className="text-gray-500 dark:text-gray-400 ml-2">from yesterday</span>
            </div>
          </CardContent>
        </Card>

        {/* PV Production */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-md bg-amber-100 dark:bg-amber-900/30">
                <Sun className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Solar Production</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatNumber(latestReading.solarEnergy, 1)} kWh
                </div>
              </div>
            </div>
            <div className="mt-3 text-sm">
              <span className={`font-medium flex items-center ${solarChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {solarChange >= 0 ? <ArrowUp className="mr-1 h-3 w-3" /> : <ArrowDown className="mr-1 h-3 w-3" />}
                {Math.abs(solarChange)}%
              </span>
              <span className="text-gray-500 dark:text-gray-400 ml-2">above forecast</span>
            </div>
          </CardContent>
        </Card>

        {/* Self-Sufficiency */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-md bg-green-100 dark:bg-green-900/30">
                <Leaf className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Self-Sufficiency</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatNumber(latestReading.selfSufficiency, 0)}%
                </div>
              </div>
            </div>
            <div className="mt-3 text-sm">
              <span className={`font-medium flex items-center ${selfSufficiencyChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {selfSufficiencyChange >= 0 ? <ArrowUp className="mr-1 h-3 w-3" /> : <ArrowDown className="mr-1 h-3 w-3" />}
                {Math.abs(selfSufficiencyChange)}%
              </span>
              <span className="text-gray-500 dark:text-gray-400 ml-2">from last week</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
