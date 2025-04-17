/**
 * Virtual Power Plant (VPP) Service
 * Manages VPP programs, enrollments, events, and participation
 */

import { randomBytes } from 'crypto';
import { getMqttService, formatTopic } from './mqttService';
import { getDeviceManagementService } from './deviceManagementService';
import { getSiteManagementService } from './siteManagementService';
import { TOPIC_PATTERNS } from '@shared/messageSchema';
import {
  VPPProgram,
  VPPEnrollment,
  VPPEvent,
  VPPParticipation,
  VPPResponsePlan,
  VPPMetrics,
  VPPProgramType,
  VPPEventStatus,
  VPPParticipationMode,
  VPPResourceType,
  VPPResponseDirection
} from '@shared/vppSchema';

// In-memory storage for VPP entities (will be replaced with database in production)
class VPPRegistry {
  private programs: Map<number, VPPProgram> = new Map();
  private enrollments: Map<number, VPPEnrollment> = new Map();
  private events: Map<number, VPPEvent> = new Map();
  private participations: Map<number, VPPParticipation> = new Map();
  private responsePlans: Map<number, VPPResponsePlan> = new Map();
  private metrics: Map<number, VPPMetrics[]> = new Map();
  
  private nextProgramId: number = 1;
  private nextEnrollmentId: number = 1;
  private nextEventId: number = 1;
  private nextParticipationId: number = 1;
  private nextResponsePlanId: number = 1;
  private nextMetricsId: number = 1;
  
  private inDevelopment: boolean = process.env.NODE_ENV === 'development';
  
  constructor() {
    if (this.inDevelopment) {
      console.log('Development mode: Initializing VPP registry');
      this.generateMockData();
    }
  }
  
  // Program methods
  addProgram(program: Omit<VPPProgram, 'id' | 'createdAt' | 'updatedAt'>): VPPProgram {
    const now = new Date().toISOString();
    const newProgram: VPPProgram = {
      ...program,
      id: this.nextProgramId++,
      createdAt: now,
      updatedAt: now
    };
    
    this.programs.set(newProgram.id, newProgram);
    console.log(`Added VPP program ${newProgram.id} (${newProgram.name})`);
    return newProgram;
  }
  
  getProgram(id: number): VPPProgram | undefined {
    return this.programs.get(id);
  }
  
  getAllPrograms(): VPPProgram[] {
    return Array.from(this.programs.values());
  }
  
  getActivePrograms(): VPPProgram[] {
    return this.getAllPrograms().filter(p => p.isActive);
  }
  
  updateProgram(id: number, updates: Partial<Omit<VPPProgram, 'id' | 'createdAt' | 'updatedAt'>>): VPPProgram | undefined {
    const program = this.programs.get(id);
    if (!program) {
      return undefined;
    }
    
    const updatedProgram: VPPProgram = {
      ...program,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    this.programs.set(id, updatedProgram);
    return updatedProgram;
  }
  
  removeProgram(id: number): boolean {
    return this.programs.delete(id);
  }
  
  // Enrollment methods
  addEnrollment(enrollment: Omit<VPPEnrollment, 'id' | 'createdAt' | 'updatedAt'>): VPPEnrollment {
    const now = new Date().toISOString();
    const newEnrollment: VPPEnrollment = {
      ...enrollment,
      id: this.nextEnrollmentId++,
      createdAt: now,
      updatedAt: now
    };
    
    this.enrollments.set(newEnrollment.id, newEnrollment);
    console.log(`Added VPP enrollment ${newEnrollment.id} for site ${newEnrollment.siteId} in program ${newEnrollment.programId}`);
    return newEnrollment;
  }
  
  getEnrollment(id: number): VPPEnrollment | undefined {
    return this.enrollments.get(id);
  }
  
  getEnrollmentsByProgram(programId: number): VPPEnrollment[] {
    return Array.from(this.enrollments.values()).filter(e => e.programId === programId);
  }
  
  getEnrollmentsBySite(siteId: number): VPPEnrollment[] {
    return Array.from(this.enrollments.values()).filter(e => e.siteId === siteId);
  }
  
  getActiveEnrollmentsBySite(siteId: number): VPPEnrollment[] {
    return this.getEnrollmentsBySite(siteId).filter(e => e.status === 'active');
  }
  
  updateEnrollment(id: number, updates: Partial<Omit<VPPEnrollment, 'id' | 'createdAt' | 'updatedAt'>>): VPPEnrollment | undefined {
    const enrollment = this.enrollments.get(id);
    if (!enrollment) {
      return undefined;
    }
    
    const updatedEnrollment: VPPEnrollment = {
      ...enrollment,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    this.enrollments.set(id, updatedEnrollment);
    return updatedEnrollment;
  }
  
  removeEnrollment(id: number): boolean {
    return this.enrollments.delete(id);
  }
  
  // Event methods
  addEvent(event: Omit<VPPEvent, 'id' | 'createdAt' | 'updatedAt'>): VPPEvent {
    const now = new Date().toISOString();
    const newEvent: VPPEvent = {
      ...event,
      id: this.nextEventId++,
      createdAt: now,
      updatedAt: now
    };
    
    this.events.set(newEvent.id, newEvent);
    console.log(`Added VPP event ${newEvent.id} (${newEvent.name}) for program ${newEvent.programId}`);
    return newEvent;
  }
  
  getEvent(id: number): VPPEvent | undefined {
    return this.events.get(id);
  }
  
  getEventsByProgram(programId: number): VPPEvent[] {
    return Array.from(this.events.values()).filter(e => e.programId === programId);
  }
  
  getEventsBySite(siteId: number): VPPEvent[] {
    return Array.from(this.events.values()).filter(e => e.participatingSites.includes(siteId));
  }
  
  getActiveEvents(): VPPEvent[] {
    const now = new Date().toISOString();
    return Array.from(this.events.values()).filter(e => 
      e.status === 'active' && 
      e.startTime <= now && 
      e.endTime >= now
    );
  }
  
  getUpcomingEvents(): VPPEvent[] {
    const now = new Date().toISOString();
    return Array.from(this.events.values()).filter(e => 
      e.status === 'upcoming' && 
      e.startTime > now
    );
  }
  
  updateEvent(id: number, updates: Partial<Omit<VPPEvent, 'id' | 'createdAt' | 'updatedAt'>>): VPPEvent | undefined {
    const event = this.events.get(id);
    if (!event) {
      return undefined;
    }
    
    const updatedEvent: VPPEvent = {
      ...event,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    this.events.set(id, updatedEvent);
    return updatedEvent;
  }
  
  removeEvent(id: number): boolean {
    return this.events.delete(id);
  }
  
  // Participation methods
  addParticipation(participation: Omit<VPPParticipation, 'id' | 'createdAt' | 'updatedAt'>): VPPParticipation {
    const now = new Date().toISOString();
    const newParticipation: VPPParticipation = {
      ...participation,
      id: this.nextParticipationId++,
      createdAt: now,
      updatedAt: now
    };
    
    this.participations.set(newParticipation.id, newParticipation);
    console.log(`Added VPP participation ${newParticipation.id} for site ${newParticipation.siteId} in event ${newParticipation.eventId}`);
    return newParticipation;
  }
  
  getParticipation(id: number): VPPParticipation | undefined {
    return this.participations.get(id);
  }
  
  getParticipationsByEvent(eventId: number): VPPParticipation[] {
    return Array.from(this.participations.values()).filter(p => p.eventId === eventId);
  }
  
  getParticipationsBySite(siteId: number): VPPParticipation[] {
    return Array.from(this.participations.values()).filter(p => p.siteId === siteId);
  }
  
  getParticipationsByEnrollment(enrollmentId: number): VPPParticipation[] {
    return Array.from(this.participations.values()).filter(p => p.enrollmentId === enrollmentId);
  }
  
  getActiveParticipationsBySite(siteId: number): VPPParticipation[] {
    return this.getParticipationsBySite(siteId).filter(p => 
      p.status === 'participating' || p.status === 'accepted'
    );
  }
  
  updateParticipation(id: number, updates: Partial<Omit<VPPParticipation, 'id' | 'createdAt' | 'updatedAt'>>): VPPParticipation | undefined {
    const participation = this.participations.get(id);
    if (!participation) {
      return undefined;
    }
    
    const updatedParticipation: VPPParticipation = {
      ...participation,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    this.participations.set(id, updatedParticipation);
    return updatedParticipation;
  }
  
  removeParticipation(id: number): boolean {
    return this.participations.delete(id);
  }
  
  // Response plan methods
  addResponsePlan(plan: Omit<VPPResponsePlan, 'id' | 'createdAt' | 'updatedAt'>): VPPResponsePlan {
    const now = new Date().toISOString();
    const newPlan: VPPResponsePlan = {
      ...plan,
      id: this.nextResponsePlanId++,
      createdAt: now,
      updatedAt: now
    };
    
    this.responsePlans.set(newPlan.id, newPlan);
    console.log(`Added VPP response plan ${newPlan.id} for participation ${newPlan.participationId}`);
    return newPlan;
  }
  
  getResponsePlan(id: number): VPPResponsePlan | undefined {
    return this.responsePlans.get(id);
  }
  
  getResponsePlanByParticipation(participationId: number): VPPResponsePlan | undefined {
    return Array.from(this.responsePlans.values()).find(p => p.participationId === participationId);
  }
  
  updateResponsePlan(id: number, updates: Partial<Omit<VPPResponsePlan, 'id' | 'createdAt' | 'updatedAt'>>): VPPResponsePlan | undefined {
    const plan = this.responsePlans.get(id);
    if (!plan) {
      return undefined;
    }
    
    const updatedPlan: VPPResponsePlan = {
      ...plan,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    this.responsePlans.set(id, updatedPlan);
    return updatedPlan;
  }
  
  removeResponsePlan(id: number): boolean {
    return this.responsePlans.delete(id);
  }
  
  // Metrics methods
  addMetrics(metrics: Omit<VPPMetrics, 'id' | 'createdAt'>): VPPMetrics {
    const now = new Date().toISOString();
    const newMetrics: VPPMetrics = {
      ...metrics,
      id: this.nextMetricsId++,
      createdAt: now
    };
    
    const participationMetrics = this.metrics.get(metrics.participationId) || [];
    participationMetrics.push(newMetrics);
    this.metrics.set(metrics.participationId, participationMetrics);
    
    return newMetrics;
  }
  
  getMetricsByParticipation(participationId: number): VPPMetrics[] {
    return this.metrics.get(participationId) || [];
  }
  
  getLatestMetricsByParticipation(participationId: number): VPPMetrics | undefined {
    const participationMetrics = this.metrics.get(participationId) || [];
    if (participationMetrics.length === 0) {
      return undefined;
    }
    
    // Sort by timestamp descending
    participationMetrics.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    return participationMetrics[0];
  }
  
  // Generate mock data for development
  private generateMockData(): void {
    if (!this.inDevelopment) {
      return;
    }
    
    console.log('Generating mock VPP data for development');
    
    // Create mock VPP programs
    const mockPrograms = [
      {
        name: 'Peak Demand Response',
        provider: 'GridFlex Solutions',
        type: 'demand_response' as VPPProgramType,
        description: 'Reduce load during peak demand periods to help balance the grid',
        minCapacity: 10,
        maxCapacity: 1000,
        compensationRate: 0.50,
        compensationCurrency: 'USD',
        participationMode: 'automatic' as VPPParticipationMode,
        activeHours: {
          start: '14:00',
          end: '20:00',
          daysOfWeek: [1, 2, 3, 4, 5]
        },
        resourceTypes: ['battery', 'ev_charger', 'flexible_load'] as VPPResourceType[],
        minResponseTime: 300,
        maxEventDuration: 240,
        cooldownPeriod: 24,
        isActive: true,
        requiresRegistration: true
      },
      {
        name: 'Frequency Regulation',
        provider: 'PowerBalance',
        type: 'frequency_regulation' as VPPProgramType,
        description: 'Help stabilize grid frequency with fast-responding resources',
        minCapacity: 50,
        compensationRate: 0.75,
        compensationCurrency: 'USD',
        participationMode: 'automatic' as VPPParticipationMode,
        activeHours: {
          start: '00:00',
          end: '23:59',
          daysOfWeek: [0, 1, 2, 3, 4, 5, 6]
        },
        resourceTypes: ['battery'] as VPPResourceType[],
        minResponseTime: 30,
        maxEventDuration: 60,
        cooldownPeriod: 2,
        isActive: true,
        requiresRegistration: true
      },
      {
        name: 'Emergency Capacity Relief',
        provider: 'GridReliability',
        type: 'capacity_market' as VPPProgramType,
        description: 'Provide emergency capacity during critical grid conditions',
        minCapacity: 100,
        compensationRate: 1.25,
        compensationCurrency: 'USD',
        participationMode: 'manual' as VPPParticipationMode,
        activeHours: {
          start: '00:00',
          end: '23:59',
          daysOfWeek: [0, 1, 2, 3, 4, 5, 6]
        },
        resourceTypes: ['battery', 'generator', 'flexible_load'] as VPPResourceType[],
        minResponseTime: 1800,
        maxEventDuration: 480,
        cooldownPeriod: 48,
        isActive: true,
        requiresRegistration: false
      }
    ];
    
    // Add programs to registry
    const programs = mockPrograms.map(p => this.addProgram(p));
    
    // Create mock enrollments (assuming site IDs 1 and 2)
    const mockEnrollments = [
      {
        programId: programs[0].id,
        siteId: 1,
        status: 'active' as const,
        capacity: 25,
        participationMode: 'automatic' as VPPParticipationMode,
        autoAcceptEvents: true,
        resourceIds: [1, 2, 3], // Assuming these are device IDs at the site
        startDate: new Date().toISOString()
      },
      {
        programId: programs[1].id,
        siteId: 1,
        status: 'active' as const,
        capacity: 60,
        participationMode: 'automatic' as VPPParticipationMode,
        autoAcceptEvents: true,
        resourceIds: [2], // Battery only
        startDate: new Date().toISOString()
      },
      {
        programId: programs[2].id,
        siteId: 2,
        status: 'active' as const,
        capacity: 120,
        participationMode: 'manual' as VPPParticipationMode,
        autoAcceptEvents: false,
        resourceIds: [4, 5], // Assuming these are device IDs at site 2
        startDate: new Date().toISOString()
      }
    ];
    
    // Add enrollments to registry
    const enrollments = mockEnrollments.map(e => this.addEnrollment(e));
    
    // Create mock events
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    
    const mockEvents = [
      {
        programId: programs[0].id,
        name: 'Afternoon Peak Reduction',
        description: 'Reduce grid peak during high demand period',
        status: 'upcoming' as VPPEventStatus,
        responseDirection: 'decrease' as VPPResponseDirection,
        startTime: oneHourFromNow.toISOString(),
        endTime: twoHoursFromNow.toISOString(),
        capacity: 500,
        notificationSent: true,
        notificationTime: now.toISOString(),
        acceptanceDeadline: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
        participatingSites: [1]
      },
      {
        programId: programs[1].id,
        name: 'Frequency Support Event',
        description: 'Provide grid frequency stabilization',
        status: 'active' as VPPEventStatus,
        responseDirection: 'maintain' as VPPResponseDirection,
        startTime: new Date(now.getTime() - 15 * 60 * 1000).toISOString(), // Started 15 min ago
        endTime: new Date(now.getTime() + 45 * 60 * 1000).toISOString(), // Ends 45 min from now
        capacity: 200,
        notificationSent: true,
        notificationTime: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
        participatingSites: [1]
      },
      {
        programId: programs[2].id,
        name: 'Emergency Grid Relief',
        description: 'Emergency capacity event due to extreme weather conditions',
        status: 'completed' as VPPEventStatus,
        responseDirection: 'decrease' as VPPResponseDirection,
        startTime: threeDaysAgo.toISOString(),
        endTime: twoDaysAgo.toISOString(),
        capacity: 800,
        notificationSent: true,
        notificationTime: new Date(threeDaysAgo.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        acceptanceDeadline: new Date(threeDaysAgo.getTime() - 1 * 60 * 60 * 1000).toISOString(),
        participatingSites: [2]
      }
    ];
    
    // Add events to registry
    const events = mockEvents.map(e => this.addEvent(e));
    
    // Create mock participations
    const mockParticipations = [
      {
        eventId: events[0].id,
        siteId: 1,
        enrollmentId: enrollments[0].id,
        status: 'accepted' as const,
        acceptedCapacity: 25,
        createdAt: new Date(now.getTime() - 10 * 60 * 1000).toISOString(),
        updatedAt: new Date(now.getTime() - 5 * 60 * 1000).toISOString()
      },
      {
        eventId: events[1].id,
        siteId: 1,
        enrollmentId: enrollments[1].id,
        status: 'participating' as const,
        acceptedCapacity: 60,
        startTime: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
        actualResponse: 58.5,
        createdAt: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
        updatedAt: now.toISOString()
      },
      {
        eventId: events[2].id,
        siteId: 2,
        enrollmentId: enrollments[2].id,
        status: 'completed' as const,
        acceptedCapacity: 100,
        actualResponse: 95.2,
        startTime: threeDaysAgo.toISOString(),
        endTime: twoDaysAgo.toISOString(),
        performance: 95,
        compensation: 125.5,
        createdAt: new Date(threeDaysAgo.getTime() - 1.5 * 60 * 60 * 1000).toISOString(),
        updatedAt: twoDaysAgo.toISOString()
      }
    ];
    
    // Add participations to registry
    const participations = mockParticipations.map(p => this.addParticipation(p));
    
    // Create mock response plans
    const mockResponsePlans = [
      {
        participationId: participations[0].id,
        strategy: 'balanced' as const,
        resourceAllocations: [
          {
            resourceId: 1,
            resourceType: 'battery' as VPPResourceType,
            targetCapacity: 15,
            priority: 1,
            availableCapacity: 20,
            constraints: {
              minStateOfCharge: 20,
              maxStateOfCharge: 90
            }
          },
          {
            resourceId: 3,
            resourceType: 'ev_charger' as VPPResourceType,
            targetCapacity: 10,
            priority: 2,
            availableCapacity: 11,
            constraints: {
              minCapacity: 0,
              maxCapacity: 11
            }
          }
        ],
        fallbackPlan: {
          strategy: 'reduce_commitment' as const,
          thresholds: [
            {
              metric: 'resource_availability' as const,
              value: 80,
              action: 'reduce_commitment_to_80_percent'
            },
            {
              metric: 'battery_soc' as const,
              value: 30,
              action: 'exclude_battery'
            }
          ]
        },
        createdAt: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
        updatedAt: new Date(now.getTime() - 5 * 60 * 1000).toISOString()
      },
      {
        participationId: participations[1].id,
        strategy: 'priority_based' as const,
        resourceAllocations: [
          {
            resourceId: 2,
            resourceType: 'battery' as VPPResourceType,
            targetCapacity: 60,
            priority: 1,
            availableCapacity: 60,
            constraints: {
              minStateOfCharge: 15,
              maxStateOfCharge: 95
            }
          }
        ],
        createdAt: new Date(now.getTime() - 20 * 60 * 1000).toISOString(),
        updatedAt: new Date(now.getTime() - 20 * 60 * 1000).toISOString()
      }
    ];
    
    // Add response plans to registry
    const responsePlans = mockResponsePlans.map(p => this.addResponsePlan(p));
    
    // Create mock metrics for the active participation
    const mockMetrics = [
      {
        participationId: participations[1].id,
        timestamp: new Date(now.getTime() - 10 * 60 * 1000).toISOString(),
        metrics: {
          targetCapacity: 60,
          actualCapacity: 59.2,
          deviation: -0.8,
          deviationPercentage: -1.33,
          activeResources: 1,
          totalResources: 1,
          averageBatterySOC: 65.3,
          gridFrequency: 60.02,
          gridVoltage: 120.5
        },
        resourceMetrics: [
          {
            resourceId: 2,
            targetCapacity: 60,
            actualCapacity: 59.2,
            status: 'active' as const
          }
        ]
      },
      {
        participationId: participations[1].id,
        timestamp: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
        metrics: {
          targetCapacity: 60,
          actualCapacity: 58.7,
          deviation: -1.3,
          deviationPercentage: -2.17,
          activeResources: 1,
          totalResources: 1,
          averageBatterySOC: 64.1,
          gridFrequency: 60.01,
          gridVoltage: 120.3
        },
        resourceMetrics: [
          {
            resourceId: 2,
            targetCapacity: 60,
            actualCapacity: 58.7,
            status: 'active' as const
          }
        ]
      },
      {
        participationId: participations[1].id,
        timestamp: now.toISOString(),
        metrics: {
          targetCapacity: 60,
          actualCapacity: 58.5,
          deviation: -1.5,
          deviationPercentage: -2.5,
          activeResources: 1,
          totalResources: 1,
          averageBatterySOC: 63.5,
          gridFrequency: 59.98,
          gridVoltage: 120.4
        },
        resourceMetrics: [
          {
            resourceId: 2,
            targetCapacity: 60,
            actualCapacity: 58.5,
            status: 'active' as const
          }
        ]
      }
    ];
    
    // Add metrics to registry
    mockMetrics.forEach(m => this.addMetrics(m));
    
    console.log(`Generated ${programs.length} VPP programs, ${enrollments.length} enrollments, ${events.length} events, ${participations.length} participations, ${responsePlans.length} response plans, and ${mockMetrics.length} metric records`);
  }
}

/**
 * VPP Service - Manages VPP functionality
 */
export class VPPService {
  private vppRegistry: VPPRegistry;
  private mqttService = getMqttService();
  private deviceService = getDeviceManagementService();
  private siteService = getSiteManagementService();
  private eventCheckInterval: NodeJS.Timeout | null = null;
  private participationMonitorInterval: NodeJS.Timeout | null = null;
  private inDevelopment: boolean = process.env.NODE_ENV === 'development';
  
  constructor() {
    this.vppRegistry = new VPPRegistry();
    this.setupEventHandlers();
    
    // Start event and participation monitoring
    this.startEventMonitoring();
    this.startParticipationMonitoring();
    
    console.log('VPP service initialized');
  }
  
  // Set up event handlers for VPP-related messages
  private setupEventHandlers() {
    // Set up handlers for VPP events from external sources
    this.mqttService.addMessageHandler('vpp/events/external/+', (topic, message) => {
      this.handleExternalEvent(message);
    });
    
    // Set up handlers for VPP event responses
    this.mqttService.addMessageHandler('vpp/events/+/responses/+', (topic, message, params) => {
      if (params.eventId && params.siteId) {
        this.handleEventResponse(parseInt(params.eventId), parseInt(params.siteId), message);
      }
    });
  }
  
  // Start regular checking for upcoming VPP events that need to be started
  private startEventMonitoring() {
    // Check every minute for events that need to be started or ended
    this.eventCheckInterval = setInterval(() => {
      this.checkVPPEvents();
    }, 60 * 1000);
  }
  
  // Start monitoring of active participations
  private startParticipationMonitoring() {
    // Monitor active participations every 5 minutes
    this.participationMonitorInterval = setInterval(() => {
      this.monitorActiveParticipations();
    }, 5 * 60 * 1000);
  }
  
  // Check for events that need to be started or ended
  private async checkVPPEvents() {
    const now = new Date();
    const events = this.vppRegistry.getAllPrograms().flatMap(program => 
      this.vppRegistry.getEventsByProgram(program.id)
    );
    
    for (const event of events) {
      const startTime = new Date(event.startTime);
      const endTime = new Date(event.endTime);
      
      // Handle event starting
      if (event.status === 'upcoming' && startTime <= now) {
        await this.startEvent(event.id);
      }
      
      // Handle event ending
      if (event.status === 'active' && endTime <= now) {
        await this.endEvent(event.id);
      }
    }
  }
  
  // Monitor active participations
  private async monitorActiveParticipations() {
    const activeParticipations = this.vppRegistry.getAllPrograms().flatMap(program => 
      this.vppRegistry.getEventsByProgram(program.id)
        .filter(event => event.status === 'active')
        .flatMap(event => this.vppRegistry.getParticipationsByEvent(event.id))
        .filter(participation => participation.status === 'participating')
    );
    
    for (const participation of activeParticipations) {
      await this.recordParticipationMetrics(participation.id);
    }
  }
  
  // Handle incoming external VPP event
  private async handleExternalEvent(message: any) {
    if (!message || !message.programId || !message.event) {
      console.error('Invalid external VPP event message:', message);
      return;
    }
    
    const { programId, event } = message;
    const program = this.vppRegistry.getProgram(programId);
    
    if (!program) {
      console.error(`Program not found for external VPP event: ${programId}`);
      return;
    }
    
    // Create a new VPP event from the external message
    const newEvent: Omit<VPPEvent, 'id' | 'createdAt' | 'updatedAt'> = {
      programId,
      externalEventId: event.id || `ext-${Date.now()}`,
      name: event.name || 'External VPP Event',
      description: event.description,
      status: 'upcoming',
      responseDirection: event.responseDirection || 'decrease',
      startTime: event.startTime,
      endTime: event.endTime,
      capacity: event.capacity,
      compensationRate: event.compensationRate || program.compensationRate,
      notificationSent: false,
      participatingSites: []
    };
    
    // Add the event
    const createdEvent = this.vppRegistry.addEvent(newEvent);
    
    // Notify eligible sites about the event
    await this.notifyEligibleSites(createdEvent.id);
  }
  
  // Handle response to a VPP event from a site
  private async handleEventResponse(eventId: number, siteId: number, message: any) {
    if (!message || !message.response) {
      console.error(`Invalid event response message for event ${eventId} from site ${siteId}`);
      return;
    }
    
    const { response, capacity } = message;
    const event = this.vppRegistry.getEvent(eventId);
    
    if (!event) {
      console.error(`Event not found for response: ${eventId}`);
      return;
    }
    
    // Find the enrollment for this site and program
    const enrollments = this.vppRegistry.getEnrollmentsBySite(siteId)
      .filter(e => e.programId === event.programId && e.status === 'active');
    
    if (enrollments.length === 0) {
      console.error(`No active enrollment found for site ${siteId} in program ${event.programId}`);
      return;
    }
    
    const enrollment = enrollments[0];
    
    // Check if there's already a participation for this event and site
    const existingParticipations = this.vppRegistry.getParticipationsByEvent(eventId)
      .filter(p => p.siteId === siteId);
    
    if (existingParticipations.length > 0) {
      const participation = existingParticipations[0];
      
      if (response === 'accept') {
        // Update the participation status to accepted
        this.vppRegistry.updateParticipation(participation.id, {
          status: 'accepted',
          acceptedCapacity: capacity || enrollment.capacity
        });
        
        // Add the site to the participating sites if not already included
        if (!event.participatingSites.includes(siteId)) {
          const updatedSites = [...event.participatingSites, siteId];
          this.vppRegistry.updateEvent(eventId, { participatingSites: updatedSites });
        }
        
        // Generate response plan if not already created
        await this.generateResponsePlan(participation.id);
      } else if (response === 'reject') {
        // Update the participation status to rejected
        this.vppRegistry.updateParticipation(participation.id, {
          status: 'rejected'
        });
        
        // Remove the site from participating sites
        const updatedSites = event.participatingSites.filter(s => s !== siteId);
        this.vppRegistry.updateEvent(eventId, { participatingSites: updatedSites });
      }
    } else if (response === 'accept') {
      // Create a new participation
      const participation = this.vppRegistry.addParticipation({
        eventId,
        siteId,
        enrollmentId: enrollment.id,
        status: 'accepted',
        acceptedCapacity: capacity || enrollment.capacity,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      // Add the site to participating sites
      const updatedSites = [...event.participatingSites, siteId];
      this.vppRegistry.updateEvent(eventId, { participatingSites: updatedSites });
      
      // Generate response plan
      await this.generateResponsePlan(participation.id);
    }
  }
  
  // Notify eligible sites about a VPP event
  private async notifyEligibleSites(eventId: number) {
    const event = this.vppRegistry.getEvent(eventId);
    if (!event) {
      console.error(`Event not found: ${eventId}`);
      return;
    }
    
    const program = this.vppRegistry.getProgram(event.programId);
    if (!program) {
      console.error(`Program not found for event ${eventId}: ${event.programId}`);
      return;
    }
    
    // Find all active enrollments for this program
    const enrollments = this.vppRegistry.getAllPrograms()
      .filter(p => p.id === program.id)
      .flatMap(p => this.vppRegistry.getEnrollmentsByProgram(p.id))
      .filter(e => e.status === 'active');
    
    // Create a map of site IDs to enrollments
    const siteEnrollments = new Map<number, VPPEnrollment>();
    for (const enrollment of enrollments) {
      siteEnrollments.set(enrollment.siteId, enrollment);
    }
    
    // Notify each eligible site
    for (const [siteId, enrollment] of siteEnrollments.entries()) {
      // Skip if the site is already participating
      if (event.participatingSites.includes(siteId)) {
        continue;
      }
      
      // For automatic participation, auto-accept the event
      if (enrollment.participationMode === 'automatic' && enrollment.autoAcceptEvents) {
        // Create participation record
        const participation = this.vppRegistry.addParticipation({
          eventId,
          siteId,
          enrollmentId: enrollment.id,
          status: 'accepted',
          acceptedCapacity: enrollment.capacity,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        
        // Add site to participating sites
        const updatedSites = [...event.participatingSites, siteId];
        this.vppRegistry.updateEvent(eventId, { participatingSites: updatedSites });
        
        // Generate response plan
        await this.generateResponsePlan(participation.id);
        
        // Notify the site that it has been automatically enrolled
        await this.mqttService.publish(`vpp/sites/${siteId}/events/${eventId}/auto_enrolled`, {
          messageType: 'vpp_auto_enrollment',
          timestamp: new Date().toISOString(),
          eventId,
          programId: program.id,
          programName: program.name,
          eventName: event.name,
          capacity: enrollment.capacity
        });
      } else {
        // Create pending participation
        this.vppRegistry.addParticipation({
          eventId,
          siteId,
          enrollmentId: enrollment.id,
          status: 'pending',
          acceptedCapacity: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        
        // Send notification to site for manual acceptance
        await this.mqttService.publish(`vpp/sites/${siteId}/events/notification`, {
          messageType: 'vpp_event_notification',
          timestamp: new Date().toISOString(),
          eventId,
          programId: program.id,
          programName: program.name,
          eventName: event.name,
          eventDescription: event.description,
          responseDirection: event.responseDirection,
          startTime: event.startTime,
          endTime: event.endTime,
          requestedCapacity: Math.min(enrollment.capacity, event.capacity),
          compensationRate: event.compensationRate || program.compensationRate,
          acceptanceDeadline: event.acceptanceDeadline || new Date(new Date(event.startTime).getTime() - 30 * 60 * 1000).toISOString()
        });
      }
    }
    
    // Mark the event as notification sent
    this.vppRegistry.updateEvent(eventId, {
      notificationSent: true,
      notificationTime: new Date().toISOString()
    });
  }
  
  // Start a VPP event
  private async startEvent(eventId: number) {
    const event = this.vppRegistry.getEvent(eventId);
    if (!event || event.status !== 'upcoming') {
      return;
    }
    
    // Update event status to active
    this.vppRegistry.updateEvent(eventId, {
      status: 'active',
      updatedAt: new Date().toISOString()
    });
    
    // Start participations for all sites
    const participations = this.vppRegistry.getParticipationsByEvent(eventId)
      .filter(p => p.status === 'accepted');
    
    for (const participation of participations) {
      await this.startParticipation(participation.id);
    }
    
    // Notify sites that event has started
    for (const siteId of event.participatingSites) {
      await this.mqttService.publish(`vpp/sites/${siteId}/events/${eventId}/start`, {
        messageType: 'vpp_event_start',
        timestamp: new Date().toISOString(),
        eventId,
        programId: event.programId,
        eventName: event.name,
        startTime: new Date().toISOString(),
        endTime: event.endTime
      });
    }
    
    console.log(`Started VPP event ${eventId} (${event.name})`);
  }
  
  // End a VPP event
  private async endEvent(eventId: number) {
    const event = this.vppRegistry.getEvent(eventId);
    if (!event || event.status !== 'active') {
      return;
    }
    
    // Update event status to completed
    this.vppRegistry.updateEvent(eventId, {
      status: 'completed',
      updatedAt: new Date().toISOString()
    });
    
    // End participations for all sites
    const participations = this.vppRegistry.getParticipationsByEvent(eventId)
      .filter(p => p.status === 'participating');
    
    for (const participation of participations) {
      await this.endParticipation(participation.id);
    }
    
    // Notify sites that event has ended
    for (const siteId of event.participatingSites) {
      await this.mqttService.publish(`vpp/sites/${siteId}/events/${eventId}/end`, {
        messageType: 'vpp_event_end',
        timestamp: new Date().toISOString(),
        eventId,
        programId: event.programId,
        eventName: event.name,
        endTime: new Date().toISOString()
      });
    }
    
    console.log(`Ended VPP event ${eventId} (${event.name})`);
  }
  
  // Start a site's participation in an event
  private async startParticipation(participationId: number) {
    const participation = this.vppRegistry.getParticipation(participationId);
    if (!participation || participation.status !== 'accepted') {
      return;
    }
    
    const now = new Date().toISOString();
    
    // Update participation status
    this.vppRegistry.updateParticipation(participationId, {
      status: 'participating',
      startTime: now,
      updatedAt: now
    });
    
    // Get the response plan
    const responsePlan = this.vppRegistry.getResponsePlanByParticipation(participationId);
    if (!responsePlan) {
      console.error(`No response plan found for participation ${participationId}`);
      return;
    }
    
    // Execute the response plan on the site's resources
    await this.executeResponsePlan(participationId);
    
    // Record initial metrics
    await this.recordParticipationMetrics(participationId);
    
    console.log(`Started participation ${participationId} for site ${participation.siteId} in event ${participation.eventId}`);
  }
  
  // End a site's participation in an event
  private async endParticipation(participationId: number) {
    const participation = this.vppRegistry.getParticipation(participationId);
    if (!participation || participation.status !== 'participating') {
      return;
    }
    
    const now = new Date().toISOString();
    
    // Record final metrics
    await this.recordParticipationMetrics(participationId);
    
    // Calculate performance and compensation
    const metrics = this.vppRegistry.getMetricsByParticipation(participationId);
    let performance = 0;
    let actualResponse = 0;
    
    if (metrics.length > 0) {
      // Calculate average actual response
      actualResponse = metrics.reduce((sum, m) => sum + m.metrics.actualCapacity, 0) / metrics.length;
      
      // Calculate performance percentage based on target vs actual
      const targetCapacity = participation.acceptedCapacity;
      performance = Math.min(100, Math.max(0, (actualResponse / targetCapacity) * 100));
    }
    
    // Calculate compensation
    const event = this.vppRegistry.getEvent(participation.eventId);
    const program = event ? this.vppRegistry.getProgram(event.programId) : null;
    
    let compensation = 0;
    if (event && program) {
      const compensationRate = event.compensationRate || program.compensationRate;
      const startTime = new Date(participation.startTime || event.startTime);
      const endTime = new Date(now);
      const durationHours = (endTime.getTime() - startTime.getTime()) / (60 * 60 * 1000);
      
      compensation = actualResponse * durationHours * compensationRate;
    }
    
    // Release resources back to normal operation
    await this.releaseResponsePlanResources(participationId);
    
    // Update participation as completed
    this.vppRegistry.updateParticipation(participationId, {
      status: 'completed',
      endTime: now,
      actualResponse,
      performance,
      compensation,
      updatedAt: now
    });
    
    console.log(`Ended participation ${participationId} for site ${participation.siteId} in event ${participation.eventId}`);
  }
  
  // Generate a response plan for a participation
  private async generateResponsePlan(participationId: number) {
    const participation = this.vppRegistry.getParticipation(participationId);
    if (!participation) {
      console.error(`Participation not found: ${participationId}`);
      return;
    }
    
    const enrollment = this.vppRegistry.getEnrollment(participation.enrollmentId);
    if (!enrollment) {
      console.error(`Enrollment not found for participation ${participationId}: ${participation.enrollmentId}`);
      return;
    }
    
    const event = this.vppRegistry.getEvent(participation.eventId);
    if (!event) {
      console.error(`Event not found for participation ${participationId}: ${participation.eventId}`);
      return;
    }
    
    const program = this.vppRegistry.getProgram(event.programId);
    if (!program) {
      console.error(`Program not found for event ${event.id}: ${event.programId}`);
      return;
    }
    
    // Create resource allocations based on enrolled resources
    const resourceAllocations: any[] = [];
    
    // Get all devices for the site
    // NOTE: In a real implementation, you would check device status, capabilities, etc.
    const targetCapacity = participation.acceptedCapacity;
    let remainingCapacity = targetCapacity;
    
    // Assign capacity to each resource based on priority and availability
    for (let i = 0; i < enrollment.resourceIds.length && remainingCapacity > 0; i++) {
      const resourceId = enrollment.resourceIds[i];
      
      // Get device from device service (mocked here)
      const device = this.deviceService.getDevice(resourceId);
      if (!device) {
        console.warn(`Device not found for resource allocation: ${resourceId}`);
        continue;
      }
      
      // Skip devices that can't participate
      if (device.status !== 'online') {
        continue;
      }
      
      // Map device type to VPP resource type
      let resourceType: VPPResourceType;
      switch (device.type) {
        case 'battery_storage':
          resourceType = 'battery';
          break;
        case 'ev_charger':
          resourceType = 'ev_charger';
          break;
        case 'solar_pv':
          resourceType = 'solar_pv';
          break;
        default:
          resourceType = 'flexible_load';
      }
      
      // Skip if resource type not eligible for this program
      if (!program.resourceTypes.includes(resourceType)) {
        continue;
      }
      
      // Determine available capacity (this would use device telemetry in a real system)
      // Here we're using mock values for demonstration
      const availableCapacity = this.getAvailableCapacity(device, event.responseDirection);
      if (availableCapacity <= 0) {
        continue;
      }
      
      // Allocate capacity to this resource
      const allocatedCapacity = Math.min(remainingCapacity, availableCapacity);
      remainingCapacity -= allocatedCapacity;
      
      // Add resource allocation
      resourceAllocations.push({
        resourceId: device.id,
        resourceType,
        targetCapacity: allocatedCapacity,
        priority: i + 1, // Priority based on resource order
        availableCapacity,
        constraints: this.getResourceConstraints(device, resourceType)
      });
    }
    
    // Create the response plan
    const responsePlan: Omit<VPPResponsePlan, 'id' | 'createdAt' | 'updatedAt'> = {
      participationId,
      strategy: 'balanced',
      resourceAllocations,
      fallbackPlan: {
        strategy: 'reduce_commitment',
        thresholds: [
          {
            metric: 'resource_availability',
            value: 80,
            action: 'reduce_commitment_to_80_percent'
          }
        ]
      }
    };
    
    // Add the response plan
    return this.vppRegistry.addResponsePlan(responsePlan);
  }
  
  // Execute a response plan for a participation
  private async executeResponsePlan(participationId: number) {
    const responsePlan = this.vppRegistry.getResponsePlanByParticipation(participationId);
    if (!responsePlan) {
      console.error(`No response plan found for participation ${participationId}`);
      return;
    }
    
    const participation = this.vppRegistry.getParticipation(participationId);
    if (!participation) {
      console.error(`Participation not found: ${participationId}`);
      return;
    }
    
    const event = this.vppRegistry.getEvent(participation.eventId);
    if (!event) {
      console.error(`Event not found for participation ${participationId}: ${participation.eventId}`);
      return;
    }
    
    // Execute each resource allocation
    for (const allocation of responsePlan.resourceAllocations) {
      try {
        const device = this.deviceService.getDevice(allocation.resourceId);
        if (!device) {
          console.warn(`Device not found for resource allocation: ${allocation.resourceId}`);
          continue;
        }
        
        // Skip devices that can't participate
        if (device.status !== 'online') {
          continue;
        }
        
        // Send command to device based on response direction and resource type
        const topic = `devices/${device.id}/commands/request`;
        const command = this.buildVppDeviceCommand(device, event.responseDirection, allocation.targetCapacity);
        
        await this.mqttService.publish(topic, command);
        console.log(`Sent VPP command to device ${device.id}: ${JSON.stringify(command)}`);
      } catch (error) {
        console.error(`Error executing response plan for resource ${allocation.resourceId}:`, error);
      }
    }
  }
  
  // Release resources from a response plan
  private async releaseResponsePlanResources(participationId: number) {
    const responsePlan = this.vppRegistry.getResponsePlanByParticipation(participationId);
    if (!responsePlan) {
      console.warn(`No response plan found for participation ${participationId}`);
      return;
    }
    
    // Release each resource
    for (const allocation of responsePlan.resourceAllocations) {
      try {
        const device = this.deviceService.getDevice(allocation.resourceId);
        if (!device) {
          console.warn(`Device not found for resource allocation: ${allocation.resourceId}`);
          continue;
        }
        
        // Skip devices that are offline
        if (device.status !== 'online') {
          continue;
        }
        
        // Send command to release device from VPP control
        const topic = `devices/${device.id}/commands/request`;
        const command = {
          messageType: 'command',
          timestamp: new Date().toISOString(),
          commandId: `release-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          command: 'vpp_release',
          parameters: {
            participationId
          }
        };
        
        await this.mqttService.publish(topic, command);
        console.log(`Released device ${device.id} from VPP control`);
      } catch (error) {
        console.error(`Error releasing resource ${allocation.resourceId}:`, error);
      }
    }
  }
  
  // Record metrics for a participation
  private async recordParticipationMetrics(participationId: number) {
    const participation = this.vppRegistry.getParticipation(participationId);
    if (!participation) {
      console.error(`Participation not found: ${participationId}`);
      return;
    }
    
    const responsePlan = this.vppRegistry.getResponsePlanByParticipation(participationId);
    if (!responsePlan) {
      console.warn(`No response plan found for participation ${participationId}`);
      return;
    }
    
    // Create resource metrics for each allocation
    const resourceMetrics = [];
    let totalActualCapacity = 0;
    
    for (const allocation of responsePlan.resourceAllocations) {
      try {
        const device = this.deviceService.getDevice(allocation.resourceId);
        if (!device) {
          console.warn(`Device not found for resource allocation: ${allocation.resourceId}`);
          continue;
        }
        
        // Get current capacity from device (simulated here)
        let actualCapacity = 0;
        let status: 'active' | 'inactive' | 'error' = 'inactive';
        
        if (device.status === 'online') {
          // Simulate actual capacity with some variance
          const variance = (Math.random() * 0.1) - 0.05; // +/- 5%
          actualCapacity = allocation.targetCapacity * (1 + variance);
          status = 'active';
        } else if (device.status === 'error') {
          status = 'error';
        }
        
        // Add to total actual capacity
        totalActualCapacity += actualCapacity;
        
        // Add resource metric
        resourceMetrics.push({
          resourceId: allocation.resourceId,
          targetCapacity: allocation.targetCapacity,
          actualCapacity,
          status
        });
      } catch (error) {
        console.error(`Error recording metrics for resource ${allocation.resourceId}:`, error);
      }
    }
    
    // Calculate overall metrics
    const targetCapacity = participation.acceptedCapacity;
    const deviation = totalActualCapacity - targetCapacity;
    const deviationPercentage = (deviation / targetCapacity) * 100;
    
    // Create metrics record
    const metrics: Omit<VPPMetrics, 'id' | 'createdAt'> = {
      participationId,
      timestamp: new Date().toISOString(),
      metrics: {
        targetCapacity,
        actualCapacity: totalActualCapacity,
        deviation,
        deviationPercentage,
        activeResources: resourceMetrics.filter(m => m.status === 'active').length,
        totalResources: resourceMetrics.length,
        // Simulate other metrics
        averageBatterySOC: 65 + (Math.random() * 20) - 10,
        gridFrequency: 60 + (Math.random() * 0.2) - 0.1,
        gridVoltage: 120 + (Math.random() * 2) - 1,
        renewable: 30 + (Math.random() * 40)
      },
      resourceMetrics
    };
    
    // Add metrics to registry
    return this.vppRegistry.addMetrics(metrics);
  }
  
  // Helper method to get available capacity for a device
  private getAvailableCapacity(device: any, responseDirection: VPPResponseDirection): number {
    // In a real system, this would query the device for its current capacity and constraints
    // Here we use mock values based on device type
    switch (device.type) {
      case 'battery_storage':
        return responseDirection === 'increase' ? 20 : 15;
      case 'ev_charger':
        return responseDirection === 'increase' ? 0 : 11;
      case 'solar_pv':
        return responseDirection === 'increase' ? 0 : 8;
      default:
        return 5;
    }
  }
  
  // Helper method to get constraints for a resource
  private getResourceConstraints(device: any, resourceType: VPPResourceType): any {
    // In a real system, this would query the device for its constraints
    // Here we use mock values based on resource type
    switch (resourceType) {
      case 'battery':
        return {
          minStateOfCharge: 20,
          maxStateOfCharge: 90,
          minCapacity: 0,
          maxCapacity: 20
        };
      case 'ev_charger':
        return {
          minCapacity: 0,
          maxCapacity: 11,
          minDuration: 15
        };
      case 'solar_pv':
        return {
          minCapacity: 0,
          maxCapacity: 10
        };
      default:
        return {
          minCapacity: 0,
          maxCapacity: 5
        };
    }
  }
  
  // Helper method to build a device command for VPP participation
  private buildVppDeviceCommand(device: any, responseDirection: VPPResponseDirection, targetCapacity: number): any {
    const command: any = {
      messageType: 'command',
      timestamp: new Date().toISOString(),
      commandId: `vpp-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      command: 'vpp_participate',
      parameters: {
        responseDirection,
        targetCapacity
      }
    };
    
    // Add device-specific parameters based on type
    switch (device.type) {
      case 'battery_storage':
        if (responseDirection === 'increase') {
          command.parameters.mode = 'discharge';
          command.parameters.dischargeRate = targetCapacity;
        } else {
          command.parameters.mode = 'charge';
          command.parameters.chargeRate = targetCapacity;
        }
        break;
      
      case 'ev_charger':
        if (responseDirection === 'decrease') {
          command.parameters.chargingLimit = device.protocolConfig.maxPower - targetCapacity;
        }
        break;
      
      case 'solar_pv':
        if (responseDirection === 'decrease') {
          command.parameters.curtailment = targetCapacity;
        }
        break;
        
      default:
        // Generic parameters for other device types
        break;
    }
    
    return command;
  }
  
  // Public API methods
  
  // Get all VPP programs
  getAllPrograms(): VPPProgram[] {
    return this.vppRegistry.getAllPrograms();
  }
  
  // Get active VPP programs
  getActivePrograms(): VPPProgram[] {
    return this.vppRegistry.getActivePrograms();
  }
  
  // Get a specific VPP program
  getProgram(id: number): VPPProgram | undefined {
    return this.vppRegistry.getProgram(id);
  }
  
  // Create a new VPP program
  createProgram(program: Omit<VPPProgram, 'id' | 'createdAt' | 'updatedAt'>): VPPProgram {
    return this.vppRegistry.addProgram(program);
  }
  
  // Update a VPP program
  updateProgram(id: number, updates: Partial<Omit<VPPProgram, 'id' | 'createdAt' | 'updatedAt'>>): VPPProgram | undefined {
    return this.vppRegistry.updateProgram(id, updates);
  }
  
  // Delete a VPP program
  deleteProgram(id: number): boolean {
    return this.vppRegistry.removeProgram(id);
  }
  
  // Get enrollments for a site
  getEnrollmentsBySite(siteId: number): VPPEnrollment[] {
    return this.vppRegistry.getEnrollmentsBySite(siteId);
  }
  
  // Get enrollments for a program
  getEnrollmentsByProgram(programId: number): VPPEnrollment[] {
    return this.vppRegistry.getEnrollmentsByProgram(programId);
  }
  
  // Enroll a site in a VPP program
  enrollSite(enrollment: Omit<VPPEnrollment, 'id' | 'createdAt' | 'updatedAt'>): VPPEnrollment {
    return this.vppRegistry.addEnrollment(enrollment);
  }
  
  // Update an enrollment
  updateEnrollment(id: number, updates: Partial<Omit<VPPEnrollment, 'id' | 'createdAt' | 'updatedAt'>>): VPPEnrollment | undefined {
    return this.vppRegistry.updateEnrollment(id, updates);
  }
  
  // Unenroll a site from a VPP program
  unenrollSite(enrollmentId: number): boolean {
    return this.vppRegistry.removeEnrollment(enrollmentId);
  }
  
  // Get all events
  getAllEvents(): VPPEvent[] {
    return this.vppRegistry.getAllPrograms().flatMap(program => 
      this.vppRegistry.getEventsByProgram(program.id)
    );
  }
  
  // Get active events
  getActiveEvents(): VPPEvent[] {
    return this.vppRegistry.getActiveEvents();
  }
  
  // Get upcoming events
  getUpcomingEvents(): VPPEvent[] {
    return this.vppRegistry.getUpcomingEvents();
  }
  
  // Get events for a site
  getEventsBySite(siteId: number): VPPEvent[] {
    return this.vppRegistry.getEventsBySite(siteId);
  }
  
  // Get events for a program
  getEventsByProgram(programId: number): VPPEvent[] {
    return this.vppRegistry.getEventsByProgram(programId);
  }
  
  // Create a new VPP event
  createEvent(event: Omit<VPPEvent, 'id' | 'createdAt' | 'updatedAt'>): VPPEvent {
    const newEvent = this.vppRegistry.addEvent(event);
    
    // Notify eligible sites if notification not explicitly disabled
    if (event.notificationSent !== false) {
      this.notifyEligibleSites(newEvent.id);
    }
    
    return newEvent;
  }
  
  // Update a VPP event
  updateEvent(id: number, updates: Partial<Omit<VPPEvent, 'id' | 'createdAt' | 'updatedAt'>>): VPPEvent | undefined {
    return this.vppRegistry.updateEvent(id, updates);
  }
  
  // Cancel a VPP event
  cancelEvent(id: number): VPPEvent | undefined {
    const event = this.vppRegistry.getEvent(id);
    if (!event || (event.status !== 'upcoming' && event.status !== 'active')) {
      return undefined;
    }
    
    // Update event status
    const updatedEvent = this.vppRegistry.updateEvent(id, {
      status: 'cancelled',
      updatedAt: new Date().toISOString()
    });
    
    // Notify participating sites
    for (const siteId of event.participatingSites) {
      this.mqttService.publish(`vpp/sites/${siteId}/events/${id}/cancel`, {
        messageType: 'vpp_event_cancelled',
        timestamp: new Date().toISOString(),
        eventId: id,
        programId: event.programId,
        eventName: event.name
      });
    }
    
    // Release resources if the event was active
    if (event.status === 'active') {
      const participations = this.vppRegistry.getParticipationsByEvent(id)
        .filter(p => p.status === 'participating');
      
      for (const participation of participations) {
        this.releaseResponsePlanResources(participation.id);
        
        // Update participation status
        this.vppRegistry.updateParticipation(participation.id, {
          status: 'completed',
          endTime: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    }
    
    return updatedEvent;
  }
  
  // Get participations for an event
  getParticipationsByEvent(eventId: number): VPPParticipation[] {
    return this.vppRegistry.getParticipationsByEvent(eventId);
  }
  
  // Get participations for a site
  getParticipationsBySite(siteId: number): VPPParticipation[] {
    return this.vppRegistry.getParticipationsBySite(siteId);
  }
  
  // Accept a VPP event for a site
  acceptEvent(eventId: number, siteId: number, capacity?: number): VPPParticipation | undefined {
    const event = this.vppRegistry.getEvent(eventId);
    if (!event || event.status !== 'upcoming') {
      console.error(`Cannot accept event ${eventId}: event not found or not upcoming`);
      return undefined;
    }
    
    // Find the enrollment for this site and program
    const enrollments = this.vppRegistry.getEnrollmentsBySite(siteId)
      .filter(e => e.programId === event.programId && e.status === 'active');
    
    if (enrollments.length === 0) {
      console.error(`No active enrollment found for site ${siteId} in program ${event.programId}`);
      return undefined;
    }
    
    const enrollment = enrollments[0];
    
    // Check if there's already a participation
    const existingParticipations = this.vppRegistry.getParticipationsByEvent(eventId)
      .filter(p => p.siteId === siteId);
    
    if (existingParticipations.length > 0) {
      const participation = existingParticipations[0];
      
      // Update the participation
      const updatedParticipation = this.vppRegistry.updateParticipation(participation.id, {
        status: 'accepted',
        acceptedCapacity: capacity || enrollment.capacity,
        updatedAt: new Date().toISOString()
      });
      
      // Add the site to participating sites
      if (!event.participatingSites.includes(siteId)) {
        const updatedSites = [...event.participatingSites, siteId];
        this.vppRegistry.updateEvent(eventId, { participatingSites: updatedSites });
      }
      
      // Generate response plan if not already created
      const responsePlan = this.vppRegistry.getResponsePlanByParticipation(participation.id);
      if (!responsePlan) {
        this.generateResponsePlan(participation.id);
      }
      
      return updatedParticipation;
    } else {
      // Create a new participation
      const participation = this.vppRegistry.addParticipation({
        eventId,
        siteId,
        enrollmentId: enrollment.id,
        status: 'accepted',
        acceptedCapacity: capacity || enrollment.capacity,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      // Add the site to participating sites
      const updatedSites = [...event.participatingSites, siteId];
      this.vppRegistry.updateEvent(eventId, { participatingSites: updatedSites });
      
      // Generate response plan
      this.generateResponsePlan(participation.id);
      
      return participation;
    }
  }
  
  // Reject a VPP event for a site
  rejectEvent(eventId: number, siteId: number): VPPParticipation | undefined {
    const event = this.vppRegistry.getEvent(eventId);
    if (!event || event.status !== 'upcoming') {
      console.error(`Cannot reject event ${eventId}: event not found or not upcoming`);
      return undefined;
    }
    
    // Check if there's already a participation
    const existingParticipations = this.vppRegistry.getParticipationsByEvent(eventId)
      .filter(p => p.siteId === siteId);
    
    if (existingParticipations.length > 0) {
      const participation = existingParticipations[0];
      
      // Update the participation
      const updatedParticipation = this.vppRegistry.updateParticipation(participation.id, {
        status: 'rejected',
        updatedAt: new Date().toISOString()
      });
      
      // Remove the site from participating sites
      const updatedSites = event.participatingSites.filter(s => s !== siteId);
      this.vppRegistry.updateEvent(eventId, { participatingSites: updatedSites });
      
      return updatedParticipation;
    } else {
      // Find the enrollment for this site and program
      const enrollments = this.vppRegistry.getEnrollmentsBySite(siteId)
        .filter(e => e.programId === event.programId && e.status === 'active');
      
      if (enrollments.length === 0) {
        console.error(`No active enrollment found for site ${siteId} in program ${event.programId}`);
        return undefined;
      }
      
      const enrollment = enrollments[0];
      
      // Create a rejected participation
      return this.vppRegistry.addParticipation({
        eventId,
        siteId,
        enrollmentId: enrollment.id,
        status: 'rejected',
        acceptedCapacity: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  }
  
  // Get metrics for a participation
  getMetricsByParticipation(participationId: number): VPPMetrics[] {
    return this.vppRegistry.getMetricsByParticipation(participationId);
  }
  
  // Get the latest metrics for a participation
  getLatestMetricsByParticipation(participationId: number): VPPMetrics | undefined {
    return this.vppRegistry.getLatestMetricsByParticipation(participationId);
  }
  
  // Clean up when the service is terminated
  cleanup() {
    if (this.eventCheckInterval) {
      clearInterval(this.eventCheckInterval);
    }
    
    if (this.participationMonitorInterval) {
      clearInterval(this.participationMonitorInterval);
    }
  }
}

// Singleton instance
let vppServiceInstance: VPPService | null = null;

// Initialize the VPP service
export function initVPPService(): VPPService {
  if (!vppServiceInstance) {
    vppServiceInstance = new VPPService();
  }
  return vppServiceInstance;
}

// Get the VPP service instance
export function getVPPService(): VPPService {
  if (!vppServiceInstance) {
    return initVPPService();
  }
  return vppServiceInstance;
}