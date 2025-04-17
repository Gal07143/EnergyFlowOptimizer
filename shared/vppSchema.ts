/**
 * Virtual Power Plant (VPP) Schema Definitions
 */

// VPP program types
export type VPPProgramType = 'demand_response' | 'frequency_regulation' | 'capacity_market' | 'energy_market';

// VPP event status
export type VPPEventStatus = 'upcoming' | 'active' | 'completed' | 'cancelled';

// VPP participation mode
export type VPPParticipationMode = 'automatic' | 'manual' | 'opt_out';

// VPP resource type
export type VPPResourceType = 'battery' | 'ev_charger' | 'flexible_load' | 'generator' | 'solar_pv';

// VPP response direction
export type VPPResponseDirection = 'increase' | 'decrease' | 'maintain';

// Base VPP program interface
export interface VPPProgram {
  id: number;
  name: string;
  provider: string;
  type: VPPProgramType;
  description: string;
  minCapacity: number; // Minimum capacity in kW required to participate
  maxCapacity?: number; // Maximum capacity in kW allowed to participate
  compensationRate: number; // Compensation rate per kWh
  compensationCurrency: string; // Currency for compensation
  participationMode: VPPParticipationMode;
  activeHours: {
    start: string; // Time in HH:MM format
    end: string; // Time in HH:MM format
    daysOfWeek: number[]; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  };
  resourceTypes: VPPResourceType[]; // Eligible resource types
  minResponseTime: number; // Minimum response time in seconds
  maxEventDuration: number; // Maximum event duration in minutes
  cooldownPeriod: number; // Cooldown period between events in hours
  isActive: boolean;
  requiresRegistration: boolean;
  apiEndpoint?: string; // External API endpoint for program
  apiCredentials?: {
    clientId: string;
    clientSecret?: string;
    apiKey?: string;
  };
  customSettings?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// VPP program enrollment
export interface VPPEnrollment {
  id: number;
  programId: number;
  siteId: number;
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'inactive';
  capacity: number; // Committed capacity in kW
  participationMode: VPPParticipationMode;
  autoAcceptEvents: boolean;
  resourceIds: number[]; // IDs of enrolled devices/resources
  startDate: string;
  endDate?: string;
  registrationNumber?: string; // Program-specific registration number
  customFields?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// VPP event interface
export interface VPPEvent {
  id: number;
  programId: number;
  externalEventId?: string; // ID from the external VPP system
  name: string;
  description?: string;
  status: VPPEventStatus;
  responseDirection: VPPResponseDirection;
  startTime: string; // ISO date string
  endTime: string; // ISO date string
  capacity: number; // Requested capacity in kW
  compensationRate?: number; // Event-specific compensation (overrides program rate)
  notificationSent: boolean;
  notificationTime?: string; // ISO date string
  acceptanceDeadline?: string; // ISO date string
  participatingSites: number[]; // Array of participating site IDs
  createdAt: string;
  updatedAt: string;
}

// VPP participation record for a specific site and event
export interface VPPParticipation {
  id: number;
  eventId: number;
  siteId: number;
  enrollmentId: number;
  status: 'pending' | 'accepted' | 'rejected' | 'participating' | 'completed' | 'failed';
  acceptedCapacity: number; // Committed capacity in kW
  actualResponse?: number; // Actual capacity response in kW
  startTime?: string; // Actual start time (ISO date string)
  endTime?: string; // Actual end time (ISO date string)
  responsePlan?: VPPResponsePlan; // Plan for how devices will respond
  performance?: number; // Performance score (0-100%)
  compensation?: number; // Calculated compensation amount
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// VPP response plan for a participation
export interface VPPResponsePlan {
  id: number;
  participationId: number;
  strategy: 'balanced' | 'priority_based' | 'cost_optimized' | 'custom';
  resourceAllocations: {
    resourceId: number;
    resourceType: VPPResourceType;
    targetCapacity: number; // Target capacity in kW
    priority: number; // Lower is higher priority
    availableCapacity: number; // Available capacity in kW
    constraints: {
      minCapacity?: number;
      maxCapacity?: number;
      minStateOfCharge?: number; // For batteries
      maxStateOfCharge?: number; // For batteries
      minDuration?: number; // Minimum duration in minutes
      maxDuration?: number; // Maximum duration in minutes
    };
  }[];
  fallbackPlan?: {
    strategy: 'reduce_commitment' | 'use_generator' | 'cancel_participation';
    thresholds: {
      metric: 'resource_availability' | 'battery_soc' | 'solar_production';
      value: number;
      action: string;
    }[];
  };
  createdAt: string;
  updatedAt: string;
}

// VPP metrics and reporting
export interface VPPMetrics {
  id: number;
  participationId: number;
  timestamp: string; // ISO date string
  metrics: {
    targetCapacity: number; // Target capacity in kW
    actualCapacity: number; // Actual capacity in kW
    deviation: number; // Deviation in kW
    deviationPercentage: number; // Deviation as a percentage
    activeResources: number; // Number of active resources
    totalResources: number; // Total number of resources
    averageBatterySOC?: number; // Average battery state of charge (%)
    gridFrequency?: number; // Grid frequency (Hz)
    gridVoltage?: number; // Grid voltage (V)
    renewable?: number; // Percentage of renewable energy used
  };
  resourceMetrics: {
    resourceId: number;
    targetCapacity: number; // Target capacity in kW
    actualCapacity: number; // Actual capacity in kW
    status: 'active' | 'inactive' | 'error';
    message?: string;
  }[];
  createdAt: string;
}

// Insert schemas
export interface InsertVPPProgram extends Omit<VPPProgram, 'id' | 'createdAt' | 'updatedAt'> {}
export interface InsertVPPEnrollment extends Omit<VPPEnrollment, 'id' | 'createdAt' | 'updatedAt'> {}
export interface InsertVPPEvent extends Omit<VPPEvent, 'id' | 'createdAt' | 'updatedAt'> {}
export interface InsertVPPParticipation extends Omit<VPPParticipation, 'id' | 'createdAt' | 'updatedAt'> {}
export interface InsertVPPResponsePlan extends Omit<VPPResponsePlan, 'id' | 'createdAt' | 'updatedAt'> {}
export interface InsertVPPMetrics extends Omit<VPPMetrics, 'id' | 'createdAt'> {}