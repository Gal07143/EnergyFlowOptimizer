import { useState } from 'react';
import DeviceCard from './DeviceCard';
import { Device } from '@/types/devices';
import { useDeviceReadings } from '@/hooks/useDevices';
import { formatNumber } from '@/lib/utils/data-utils';
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
  Filler,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface SolarCardProps {
  device: Device;
}

export default function SolarCard({ device }: SolarCardProps) {
  const { data: readings } = useDeviceReadings(device.id, 10);
  
  // Extract current output and today's yield
  const latestReading = readings && readings.length > 0 ? readings[0] : null;
  const currentOutput = latestReading?.power !== undefined 
    ? latestReading.power 
    : 5.6; // Default value for display
    
  const todaysYield = latestReading?.energy !== undefined 
    ? latestReading.energy 
    : 12.4; // Default value for display

  // Prepare chart data
  const chartData = {
    labels: readings?.slice().reverse().map((_, i) => `${i * 10}m ago`) || 
      Array(8).fill(0).map((_, i) => `${i * 10}m ago`),
    datasets: [
      {
        label: 'Power Output',
        data: readings?.slice().reverse().map(r => r.power) || 
          [0, 0.2, 1.4, 2.8, 3.5, 4.5, 5.2, 5.6],
        borderColor: '#FCD34D',
        backgroundColor: 'rgba(252, 211, 77, 0.2)',
        tension: 0.3,
        fill: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `${context.raw.toFixed(1)} kW`;
          }
        }
      }
    },
    scales: {
      x: {
        display: false,
      },
      y: {
        display: false,
        min: 0,
      },
    },
    elements: {
      point: {
        radius: 0,
      },
    },
  };

  return (
    <DeviceCard device={device}>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="bg-gray-50 dark:bg-gray-800 rounded p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">Current Output</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {formatNumber(currentOutput, 1)} kW
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">Today's Yield</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {formatNumber(todaysYield, 1)} kWh
          </p>
        </div>
      </div>

      {/* Mini Chart */}
      <div className="mt-4 h-16 bg-gray-50 dark:bg-gray-800 rounded overflow-hidden">
        <Line data={chartData} options={chartOptions} />
      </div>
    </DeviceCard>
  );
}
