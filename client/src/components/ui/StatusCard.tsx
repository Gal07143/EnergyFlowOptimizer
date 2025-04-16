import { AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';

interface StatusCardProps {
  title: string;
  status: 'optimal' | 'warning' | 'critical' | 'offline';
  message: string;
}

export default function StatusCard({
  title,
  status,
  message
}: StatusCardProps) {
  // Define styling and icon based on status
  const getStatusConfig = () => {
    switch (status) {
      case 'optimal':
        return {
          indicatorClass: 'bg-green-500',
          badgeClass: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
          badgeText: 'Optimal',
          icon: CheckCircle,
          iconClass: 'text-green-500'
        };
      case 'warning':
        return {
          indicatorClass: 'bg-amber-500',
          badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
          badgeText: 'Warning',
          icon: AlertTriangle,
          iconClass: 'text-amber-500'
        };
      case 'critical':
        return {
          indicatorClass: 'bg-red-500',
          badgeClass: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
          badgeText: 'Critical',
          icon: AlertCircle,
          iconClass: 'text-red-500'
        };
      case 'offline':
        return {
          indicatorClass: 'bg-gray-500',
          badgeClass: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
          badgeText: 'Offline',
          icon: AlertCircle,
          iconClass: 'text-gray-500'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <div className={`w-3 h-3 ${config.indicatorClass} rounded-full mr-2`}></div>
          <h4 className="text-md font-medium text-gray-900 dark:text-white">{title}</h4>
        </div>
        <span className={`px-2 py-1 text-xs rounded-full ${config.badgeClass}`}>
          {config.badgeText}
        </span>
      </div>
      <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        <p>{message}</p>
      </div>
    </div>
  );
}
