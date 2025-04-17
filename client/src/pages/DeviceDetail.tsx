import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useDevice, useDeviceReadings } from '@/hooks/useDevices';
import { useDeviceWebSocket, DeviceReading } from '@/hooks/useDeviceWebSocket';
import PageHeader from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, Power, Battery, Zap, Thermometer, Gauge, Droplet, Info, BarChart4 } from 'lucide-react';
import { useSiteSelector } from '@/hooks/useSiteData';
import { deviceTypeToIcon } from '@/lib/icons';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import 'chartjs-adapter-date-fns';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  TimeScale,
  Title,
  Tooltip,
  Legend
);

// Interface for device details
interface Device {
  id: number;
  name: string;
  type: string;
  model: string;
  manufacturer: string;
  status: string;
  siteId: number;
  createdAt: string;
}

// Interface for DataPoint component props
interface DataPointProps {
  title: string;
  value: number | string | null | undefined;
  unit: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

// Interface for DataChart component props
interface DataChartProps {
  data: DeviceReading[];
  label: string;
  color?: string;
  dataKey?: string;
}

// DataPoint component for displaying readings
const DataPoint = ({ title, value, unit, icon: Icon }: DataPointProps) => (
  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
    <div className="flex items-center mb-2">
      <Icon className="h-5 w-5 text-primary mr-2" />
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
    </div>
    <p className="text-2xl font-semibold">
      {typeof value === 'number' ? value.toFixed(1) : value || 'N/A'} {unit}
    </p>
  </div>
);

// Chart component for historical data
const DataChart = ({ data, label, color = 'rgb(99, 102, 241)', dataKey = 'power' }: DataChartProps) => {
  if (!data || data.length === 0) {
    return <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg">No data available</div>;
  }

  const chartData = {
    datasets: [
      {
        label,
        data: data.map((reading: DeviceReading) => ({
          x: new Date(reading.timestamp),
          y: reading[dataKey as keyof DeviceReading] as number || 0
        })),
        borderColor: color,
        backgroundColor: `${color}33`, // Add transparency
        fill: true,
        tension: 0.2,
        borderWidth: 2,
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: 'minute' as const,
          displayFormats: {
            minute: 'HH:mm'
          }
        },
        title: {
          display: true,
          text: 'Time'
        }
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: dataKey === 'power' ? 'Power (W)' : 
                dataKey === 'energy' ? 'Energy (kWh)' : 
                dataKey === 'stateOfCharge' ? 'SoC (%)' :
                dataKey === 'temperature' ? 'Temperature (°C)' : 'Value'
        }
      }
    },
    plugins: {
      legend: {
        display: false
      }
    }
  };

  return (
    <div className="h-64 bg-white dark:bg-gray-800 rounded-lg p-2">
      <Line data={chartData} options={options} />
    </div>
  );
};

export default function DeviceDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { currentSiteId } = useSiteSelector();
  const deviceId = parseInt(id);
  
  // Fetch device details
  const { data: device, isLoading: isLoadingDevice } = useDevice(deviceId);
  
  // Fetch historical device readings
  const { data: historicalReadings = [], isLoading: isLoadingReadings } = useDeviceReadings(deviceId, 50);
  
  // Use our WebSocket hook for real-time readings
  const { readings: wsReadings, latestReading, isConnected } = useDeviceWebSocket(deviceId);
  
  // Combine WebSocket readings with historical readings
  const allReadings = [...wsReadings, ...historicalReadings.filter(hr => 
    !wsReadings.some(r => r.timestamp === hr.timestamp)
  )].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  // Set active reading to either latest from WebSocket or first historical
  const activeReading = latestReading || (historicalReadings.length > 0 ? historicalReadings[0] : null);
  
  // Get icon based on device type
  const DeviceIcon = device ? deviceTypeToIcon(device.type) : Info;
  
  if (isLoadingDevice) {
    return (
      <div className="py-6 px-4 sm:px-6 lg:px-8 flex items-center justify-center h-[80vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!device) {
    return (
      <div className="py-6 px-4 sm:px-6 lg:px-8">
        <Card className="mx-auto max-w-2xl">
          <CardHeader>
            <CardTitle>Device Not Found</CardTitle>
            <CardDescription>The device you're looking for doesn't exist or you don't have access to it.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => setLocation('/devices')}>
              <ChevronLeft className="mr-2 h-4 w-4" /> Back to Devices
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <PageHeader 
        title={device.name} 
        subtitle={`${device.manufacturer} ${device.model} • ${device.type.replace('_', ' ')}`}>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setLocation('/devices')}>
            <ChevronLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </div>
      </PageHeader>
      
      {/* Connection status indicator */}
      <div className="flex items-center my-2">
        <div className={`h-2 w-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <span className="text-sm text-gray-500">
          {isConnected ? 'Real-time connection active' : 'Offline mode'}
        </span>
      </div>
      
      {/* Device status card */}
      <div className="mt-4">
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-primary/10 mr-3">
                  <DeviceIcon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{device.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    ID: {device.id} • Added on {format(new Date(device.createdAt), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
              <div>
                <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                  ${device.status === 'online' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 
                    device.status === 'offline' ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' : 
                    device.status === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : 
                    'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'}`}>
                  {device.status.charAt(0).toUpperCase() + device.status.slice(1)}
                </div>
              </div>
            </div>
            
            {/* Last updated */}
            {activeReading && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Last updated: {format(new Date(activeReading.timestamp), 'MMM d, yyyy HH:mm:ss')}
              </p>
            )}
            
            {/* Current readings grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              {/* Show appropriate data points based on device type */}
              {device.type === 'solar_pv' && (
                <>
                  <DataPoint 
                    title="Current Output" 
                    value={activeReading?.power ? activeReading.power / 1000 : null} 
                    unit="kW" 
                    icon={Power} 
                  />
                  <DataPoint 
                    title="Today's Yield" 
                    value={activeReading?.energy} 
                    unit="kWh" 
                    icon={Zap} 
                  />
                  <DataPoint 
                    title="Voltage" 
                    value={activeReading?.voltage} 
                    unit="V" 
                    icon={Zap} 
                  />
                  <DataPoint 
                    title="Temperature" 
                    value={activeReading?.temperature} 
                    unit="°C" 
                    icon={Thermometer} 
                  />
                </>
              )}
              
              {device.type === 'battery_storage' && (
                <>
                  <DataPoint 
                    title="Power" 
                    value={activeReading?.power ? activeReading.power / 1000 : null} 
                    unit="kW" 
                    icon={Power} 
                  />
                  <DataPoint 
                    title="State of Charge" 
                    value={activeReading?.stateOfCharge} 
                    unit="%" 
                    icon={Battery} 
                  />
                  <DataPoint 
                    title="Energy" 
                    value={activeReading?.energy} 
                    unit="kWh" 
                    icon={Zap} 
                  />
                  <DataPoint 
                    title="Temperature" 
                    value={activeReading?.temperature} 
                    unit="°C" 
                    icon={Thermometer} 
                  />
                </>
              )}
              
              {device.type === 'ev_charger' && (
                <>
                  <DataPoint 
                    title="Charging Power" 
                    value={activeReading?.power ? activeReading.power / 1000 : null} 
                    unit="kW" 
                    icon={Power} 
                  />
                  <DataPoint 
                    title="Session Energy" 
                    value={activeReading?.energy} 
                    unit="kWh" 
                    icon={Zap} 
                  />
                  <DataPoint 
                    title="Voltage" 
                    value={activeReading?.voltage} 
                    unit="V" 
                    icon={Zap} 
                  />
                  <DataPoint 
                    title="Status" 
                    value={activeReading?.additionalData?.isCharging ? 'Charging' : 'Idle'} 
                    unit="" 
                    icon={Info} 
                  />
                </>
              )}
              
              {device.type === 'smart_meter' && (
                <>
                  <DataPoint 
                    title="Power" 
                    value={activeReading?.power ? activeReading.power / 1000 : null} 
                    unit="kW" 
                    icon={Power} 
                  />
                  <DataPoint 
                    title="Energy" 
                    value={activeReading?.energy} 
                    unit="kWh" 
                    icon={Zap} 
                  />
                  <DataPoint 
                    title="Frequency" 
                    value={activeReading?.frequency} 
                    unit="Hz" 
                    icon={Gauge} 
                  />
                  <DataPoint 
                    title="Voltage" 
                    value={activeReading?.voltage} 
                    unit="V" 
                    icon={Zap} 
                  />
                </>
              )}
              
              {device.type === 'heat_pump' && (
                <>
                  <DataPoint 
                    title="Power" 
                    value={activeReading?.power ? activeReading.power / 1000 : null} 
                    unit="kW" 
                    icon={Power} 
                  />
                  <DataPoint 
                    title="Energy" 
                    value={activeReading?.energy} 
                    unit="kWh" 
                    icon={Zap} 
                  />
                  <DataPoint 
                    title="Output Temperature" 
                    value={activeReading?.temperature} 
                    unit="°C" 
                    icon={Thermometer} 
                  />
                  <DataPoint 
                    title="COP" 
                    value={activeReading?.additionalData?.cop} 
                    unit="" 
                    icon={Droplet} 
                  />
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Tabs for different charts */}
      <Tabs defaultValue="power" className="mt-6">
        <TabsList>
          <TabsTrigger value="power">Power</TabsTrigger>
          {device.type === 'battery_storage' && (
            <TabsTrigger value="soc">State of Charge</TabsTrigger>
          )}
          <TabsTrigger value="energy">Energy</TabsTrigger>
          {(device.type === 'solar_pv' || device.type === 'battery_storage' || device.type === 'heat_pump') && (
            <TabsTrigger value="temperature">Temperature</TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="power">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart4 className="h-5 w-5 mr-2" />
                Power History
              </CardTitle>
              <CardDescription>
                {device.type === 'solar_pv' ? 'Solar power output' : 
                 device.type === 'battery_storage' ? 'Battery power flow (positive = discharge, negative = charge)' :
                 device.type === 'ev_charger' ? 'EV charging power' :
                 device.type === 'smart_meter' ? 'Grid power flow (positive = import, negative = export)' :
                 'Power consumption'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataChart 
                data={allReadings} 
                label="Power (kW)" 
                color={
                  device.type === 'solar_pv' ? 'rgb(234, 179, 8)' : 
                  device.type === 'battery_storage' ? 'rgb(6, 182, 212)' :
                  device.type === 'ev_charger' ? 'rgb(16, 185, 129)' :
                  device.type === 'smart_meter' ? 'rgb(99, 102, 241)' :
                  'rgb(236, 72, 153)'
                }
                dataKey="power" 
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        {device.type === 'battery_storage' && (
          <TabsContent value="soc">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Battery className="h-5 w-5 mr-2" />
                  State of Charge History
                </CardTitle>
                <CardDescription>
                  Battery state of charge as a percentage of total capacity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataChart 
                  data={allReadings} 
                  label="SoC (%)" 
                  color="rgb(6, 182, 212)" 
                  dataKey="stateOfCharge" 
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}
        
        <TabsContent value="energy">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="h-5 w-5 mr-2" />
                Energy History
              </CardTitle>
              <CardDescription>
                {device.type === 'solar_pv' ? 'Solar energy generation' : 
                 device.type === 'battery_storage' ? 'Battery energy throughput' :
                 device.type === 'ev_charger' ? 'EV charging session energy' :
                 device.type === 'smart_meter' ? 'Energy consumption/export' :
                 'Energy consumption'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataChart 
                data={allReadings} 
                label="Energy (kWh)" 
                color={
                  device.type === 'solar_pv' ? 'rgb(234, 179, 8)' : 
                  device.type === 'battery_storage' ? 'rgb(6, 182, 212)' :
                  device.type === 'ev_charger' ? 'rgb(16, 185, 129)' :
                  device.type === 'smart_meter' ? 'rgb(99, 102, 241)' :
                  'rgb(236, 72, 153)'
                }
                dataKey="energy" 
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        {(device.type === 'solar_pv' || device.type === 'battery_storage' || device.type === 'heat_pump') && (
          <TabsContent value="temperature">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Thermometer className="h-5 w-5 mr-2" />
                  Temperature History
                </CardTitle>
                <CardDescription>
                  {device.type === 'solar_pv' ? 'Solar panel temperature' : 
                   device.type === 'battery_storage' ? 'Battery temperature' :
                   'Heat pump output temperature'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataChart 
                  data={allReadings} 
                  label="Temperature (°C)" 
                  color={
                    device.type === 'solar_pv' ? 'rgb(234, 179, 8)' : 
                    device.type === 'battery_storage' ? 'rgb(6, 182, 212)' :
                    'rgb(236, 72, 153)'
                  }
                  dataKey="temperature" 
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
      
      {/* Additional device details */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Device Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Manufacturer</h4>
              <p className="mt-1">{device.manufacturer || 'N/A'}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Model</h4>
              <p className="mt-1">{device.model || 'N/A'}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Type</h4>
              <p className="mt-1">{device.type.replace('_', ' ')}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Device ID</h4>
              <p className="mt-1">{device.id}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</h4>
              <p className="mt-1">{device.status}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Site ID</h4>
              <p className="mt-1">{device.siteId}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}