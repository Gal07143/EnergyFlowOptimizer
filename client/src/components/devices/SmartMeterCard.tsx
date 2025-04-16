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

interface SmartMeterCardProps {
  device: Device;
}

export default function SmartMeterCard({ device }: SmartMeterCardProps) {
  const { data: readings } = useDeviceReadings(device.id, 10);
  
  // Extract current power and energy values
  const latestReading = readings && readings.length > 0 ? readings[0] : null;
  const currentPower = latestReading?.power !== undefined 
    ? latestReading.power 
    : 3.2; // Default value for display
    
  const totalEnergy = latestReading?.energy !== undefined 
    ? latestReading.energy 
    : 12.8; // Default value for display

  // Grid frequency and voltage
  const frequency = latestReading?.frequency || 50;
  const voltage = latestReading?.voltage || 230;

  // Prepare chart data
  const chartData = {
    labels: readings?.slice().reverse().map((_, i) => `${i * 10}m ago`) || 
      Array(8).fill(0).map((_, i) => `${i * 10}m ago`),
    datasets: [
      {
        label: 'Grid Power',
        data: readings?.slice().reverse().map(r => r.power) || 
          [2.9, 3.1, 3.0, 3.5, 3.2, 3.3, 3.1, 3.2],
        borderColor: '#6B7280',
        backgroundColor: 'rgba(107, 114, 128, 0.2)',
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
          <p className="text-xs text-gray-500 dark:text-gray-400">Current Power</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {formatNumber(currentPower, 1)} kW
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">Today's Energy</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {formatNumber(totalEnergy, 1)} kWh
          </p>
        </div>
      </div>

      {/* Additional Grid Stats */}
      <div className="mt-4 flex justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>Voltage: {formatNumber(voltage, 0)} V</span>
        <span>Frequency: {formatNumber(frequency, 1)} Hz</span>
      </div>

      {/* Mini Chart */}
      <div className="mt-2 h-16 bg-gray-50 dark:bg-gray-800 rounded overflow-hidden">
        <Line data={chartData} options={chartOptions} />
      </div>
    </DeviceCard>
  );
}
