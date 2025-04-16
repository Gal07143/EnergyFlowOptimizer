// Energy data types
export interface EnergyReading {
  id: number;
  siteId: number;
  timestamp: string;
  gridPower: number;
  solarPower: number;
  batteryPower: number;
  evPower: number;
  homePower: number;
  gridEnergy: number;
  solarEnergy: number;
  batteryEnergy: number;
  evEnergy: number;
  homeEnergy: number;
  selfSufficiency: number;
  carbon: number;
}

export interface EnergySummary {
  currentPower: number;
  todayConsumption: number;
  solarProduction: number;
  selfSufficiency: number;
  todaySavings: number;
  carbonSaved: number;
}

export interface EnergyFlow {
  grid: number;
  solar: number;
  battery: number;
  ev: number;
  home: number;
  batterySOC: number;
  evSOC: number;
}

export interface OptimizationSettings {
  id: number;
  siteId: number;
  mode: 'cost_saving' | 'self_sufficiency' | 'peak_shaving' | 'carbon_reduction' | 'grid_relief';
  peakShavingEnabled: boolean;
  peakShavingTarget?: number;
  selfConsumptionEnabled: boolean;
  batteryArbitrageEnabled: boolean;
  v2gEnabled: boolean;
  vppEnabled: boolean;
  p2pEnabled: boolean;
  aiRecommendationsEnabled: boolean;
  schedules: {
    batteryCharge: ScheduleEntry[];
    batteryDischarge: ScheduleEntry[];
    evCharging: ScheduleEntry[];
  };
  updatedAt: string;
}

export interface ScheduleEntry {
  start: string;
  end: string;
  priority: 'low' | 'medium' | 'high';
  mode?: string;
}

export interface Tariff {
  id: number;
  siteId: number;
  name: string;
  provider?: string;
  importRate: number;
  exportRate: number;
  isTimeOfUse: boolean;
  scheduleData?: any;
  currency: string;
}

export interface OptimizationRecommendation {
  type: string;
  deviceId: number;
  deviceName: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  potentialSavings: {
    amount: number;
    currency: string;
  };
}

export interface EnergyStats {
  dailyConsumption: number;
  dailyProduction: number;
  peakPower: number;
  averageSelfSufficiency: number;
  totalSavings: number;
  currency: string;
}

export interface EnergySummaryByPeriod {
  period: string;
  gridEnergy: number;
  solarEnergy: number;
  batteryEnergy: number;
  evEnergy: number;
  homeEnergy: number;
  selfSufficiency: number;
}
