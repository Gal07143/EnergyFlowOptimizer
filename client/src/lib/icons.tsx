import { 
  Battery, 
  BatteryCharging, 
  Sun, 
  Gauge, 
  Thermometer, 
  LayoutDashboard, 
  Zap, 
  Lightbulb,
  BarChart2,
  Settings,
  Plug,
  Home,
} from 'lucide-react';

// Map device types to their respective icon components
export const deviceTypeToIcon = (type: string) => {
  switch (type) {
    case 'solar_pv':
      return Sun;
    case 'battery_storage':
      return Battery;
    case 'ev_charger':
      return BatteryCharging;
    case 'smart_meter':
      return Gauge;
    case 'heat_pump':
      return Thermometer;
    default:
      return Zap;
  }
};

// Energy flow icons mapped by type
export const energyFlowIconByType = {
  grid: Plug,
  solar: Sun,
  battery: Battery,
  ev: BatteryCharging,
  home: Home,
};

// Navigation icons
export const navigationIcons = {
  dashboard: LayoutDashboard,
  devices: Zap,
  analytics: BarChart2,
  optimization: Lightbulb,
  settings: Settings,
};

export default {
  deviceTypeToIcon,
  energyFlowIconByType,
  navigationIcons
};
