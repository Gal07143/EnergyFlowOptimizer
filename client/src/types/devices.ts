// Device data types
export interface Device {
  id: number;
  name: string;
  type: 'solar_pv' | 'battery_storage' | 'ev_charger' | 'smart_meter' | 'heat_pump';
  model?: string;
  manufacturer?: string;
  serialNumber?: string;
  firmwareVersion?: string;
  capacity?: number;
  status: 'online' | 'offline' | 'error' | 'maintenance' | 'idle';
  ipAddress?: string;
  connectionProtocol?: string;
  settings?: any;
  siteId: number;
  createdAt: string;
  updatedAt: string;
}

export interface DeviceReading {
  id: number;
  deviceId: number;
  timestamp: string;
  power?: number;
  energy?: number;
  stateOfCharge?: number;
  voltage?: number;
  current?: number;
  frequency?: number;
  temperature?: number;
  additionalData?: any;
}

export interface DeviceSummary {
  id: number;
  name: string;
  type: string;
  status: string;
  currentOutput?: number;
  dailyEnergy?: number;
  stateOfCharge?: number;
  temperature?: number;
  currentTemp?: number;
  targetTemp?: number;
  operatingMode?: string;
  cop?: number; // Coefficient of Performance for heat pumps
}

export interface BatteryDevice extends Device {
  type: 'battery_storage';
  settings: {
    maxChargeRate?: number;
    maxDischargeRate?: number;
    minSoC?: number;
  };
}

export interface BatteryReading extends DeviceReading {
  stateOfCharge: number;
  powerFlow: number; // Positive for charging, negative for discharging
  temperature: number;
}

export interface SolarDevice extends Device {
  type: 'solar_pv';
  settings: {
    orientation?: string;
    tilt?: number;
    panels?: number;
    inverterType?: string;
  };
}

export interface SolarReading extends DeviceReading {
  power: number;
  energy: number;
  temperature: number;
}

export interface EVChargerDevice extends Device {
  type: 'ev_charger';
  settings: {
    maxCurrent?: number;
    phases?: number;
    cableType?: string;
  };
}

export interface EVChargerReading extends DeviceReading {
  power: number;
  energy: number;
  stateOfCharge?: number;
  isConnected?: boolean;
  chargingMode?: 'solar_only' | 'balanced' | 'fast' | 'scheduled' | 'v2g';
}

export interface SmartMeterDevice extends Device {
  type: 'smart_meter';
  settings: {
    meterType?: string;
    interval?: number;
  };
}

export interface SmartMeterReading extends DeviceReading {
  power: number;
  energy: number;
  voltage: number;
  current: number;
  frequency: number;
}

export interface HeatPumpDevice extends Device {
  type: 'heat_pump';
  settings: {
    maxThermalOutput?: number;
    minTemperature?: number;
    maxTemperature?: number;
    operationModes?: string[];
  };
}

export interface HeatPumpReading extends DeviceReading {
  power: number;
  energy: number;
  temperature: number;
  additionalData: {
    currentTemp: number;
    targetTemp: number;
    mode: 'heating' | 'cooling' | 'auto' | 'off';
    cop: number; // Coefficient of Performance
  };
}

// For device filtering and organization
export interface DeviceGroup {
  type: string;
  label: string;
  devices: Device[];
}

export interface DeviceControlAction {
  deviceId: number;
  action: string;
  parameters?: any;
}
