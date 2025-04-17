import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';

// Interface definitions
export interface DemandResponseProgram {
  id: number;
  siteId: number;
  name: string;
  description: string;
  provider: string;
  programType: string;
  isActive: boolean;
  minReductionAmount: number | null;
  maxReductionAmount: number | null;
  incentiveRate: number | null;
  startDate: string | null;
  endDate: string | null;
  maxEventDuration: number | null;
  notificationLeadTime: number | null;
  maxEventsPerYear: number | null;
  maxEventsPerMonth: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface DemandResponseEvent {
  id: number;
  siteId: number;
  programId: number;
  programName?: string;
  name: string;
  description: string;
  status: 'scheduled' | 'pending' | 'active' | 'completed' | 'cancelled';
  startTime: string;
  endTime: string;
  notificationTime: string | null;
  targetReduction: number | null;
  actualReduction: number | null;
  incentiveModifier: number | null;
  notes: string | null;
  isEmergency: boolean;
  weatherConditions: any;
  createdAt: string;
  updatedAt: string;
}

export interface SiteDemandResponseSettings {
  id: number;
  siteId: number;
  isEnrolled: boolean;
  maxReductionCapacity: number | null;
  defaultParticipation: 'opt_in' | 'opt_out' | 'automatic';
  autoResponseEnabled: boolean;
  notificationEmail: string | null;
  notificationSms: string | null;
  notificationPush: boolean;
  minimumIncentiveThreshold: number | null;
  devicePriorities: Record<string, unknown>;
  responseStrategy: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SiteEventParticipation {
  id: number;
  siteId: number;
  eventId: number;
  participationStatus: 'opt_in' | 'opt_out' | 'automatic';
  responseMethod: 'manual' | 'automatic';
  reductionAchieved: number | null;
  incentiveEarned: number | null;
  startTime: string | null;
  endTime: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DemandResponseAction {
  id: number;
  participationId: number;
  deviceId: number;
  actionType: string;
  startTime: string;
  endTime: string;
  setPoint?: number;
  estimatedReduction: number | null;
  actualReduction: number | null;
  status: 'scheduled' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

// Programs
export function useDemandResponsePrograms(siteId: number | undefined) {
  return useQuery<DemandResponseProgram[]>({
    queryKey: ['/api/sites', siteId, 'demand-response/programs'],
    enabled: !!siteId,
  });
}

export function useDemandResponseProgram(programId: number | undefined) {
  return useQuery<DemandResponseProgram>({
    queryKey: ['/api/demand-response/programs', programId],
    enabled: !!programId,
  });
}

export function useCreateDemandResponseProgram() {
  return useMutation({
    mutationFn: async (programData: Omit<DemandResponseProgram, 'id' | 'createdAt' | 'updatedAt'>) => {
      const response = await apiRequest('POST', '/api/demand-response/programs', programData);
      return await response.json();
    },
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['/api/sites', data.siteId, 'demand-response/programs'] });
    },
  });
}

export function useUpdateDemandResponseProgram() {
  return useMutation({
    mutationFn: async ({ 
      programId, 
      programData 
    }: { 
      programId: number; 
      programData: Partial<Omit<DemandResponseProgram, 'id' | 'createdAt' | 'updatedAt'>>
    }) => {
      const response = await apiRequest('PUT', `/api/demand-response/programs/${programId}`, programData);
      return await response.json();
    },
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['/api/sites', data.siteId, 'demand-response/programs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/demand-response/programs', data.id] });
    },
  });
}

// Events
export function useDemandResponseEvents(siteId: number | undefined) {
  return useQuery<DemandResponseEvent[]>({
    queryKey: ['/api/sites', siteId, 'demand-response/events'],
    enabled: !!siteId,
  });
}

export function useDemandResponseEvent(eventId: number | undefined) {
  return useQuery<DemandResponseEvent>({
    queryKey: ['/api/demand-response/events', eventId],
    enabled: !!eventId,
  });
}

export function useCreateDemandResponseEvent() {
  return useMutation({
    mutationFn: async (eventData: Omit<DemandResponseEvent, 'id' | 'createdAt' | 'updatedAt'>) => {
      const response = await apiRequest('POST', '/api/demand-response/events', eventData);
      return await response.json();
    },
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['/api/sites', data.siteId, 'demand-response/events'] });
    },
  });
}

export function useUpdateDemandResponseEvent() {
  return useMutation({
    mutationFn: async ({ 
      eventId, 
      eventData 
    }: { 
      eventId: number; 
      eventData: Partial<Omit<DemandResponseEvent, 'id' | 'createdAt' | 'updatedAt'>>
    }) => {
      const response = await apiRequest('PUT', `/api/demand-response/events/${eventId}`, eventData);
      return await response.json();
    },
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['/api/sites', data.siteId, 'demand-response/events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/demand-response/events', data.id] });
    },
  });
}

// Settings
export function useDemandResponseSettings(siteId: number | undefined) {
  return useQuery<SiteDemandResponseSettings>({
    queryKey: ['/api/sites', siteId, 'demand-response/settings'],
    enabled: !!siteId,
  });
}

export function useCreateDemandResponseSettings() {
  return useMutation({
    mutationFn: async (settingsData: Omit<SiteDemandResponseSettings, 'id' | 'createdAt' | 'updatedAt'>) => {
      const response = await apiRequest('POST', '/api/demand-response/settings', settingsData);
      return await response.json();
    },
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['/api/sites', data.siteId, 'demand-response/settings'] });
    },
  });
}

export function useUpdateDemandResponseSettings() {
  return useMutation({
    mutationFn: async ({ 
      siteId, 
      settingsData 
    }: { 
      siteId: number; 
      settingsData: Partial<Omit<SiteDemandResponseSettings, 'id' | 'createdAt' | 'updatedAt'>>
    }) => {
      const response = await apiRequest('PUT', `/api/sites/${siteId}/demand-response/settings`, settingsData);
      return await response.json();
    },
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['/api/sites', data.siteId, 'demand-response/settings'] });
    },
  });
}

// Participations
export function useSiteEventParticipations(siteId: number | undefined) {
  return useQuery<SiteEventParticipation[]>({
    queryKey: ['/api/sites', siteId, 'demand-response/participations'],
    enabled: !!siteId,
  });
}

export function useSiteEventParticipation(participationId: number | undefined) {
  return useQuery<SiteEventParticipation>({
    queryKey: ['/api/demand-response/participations', participationId],
    enabled: !!participationId,
  });
}

export function useCreateSiteEventParticipation() {
  return useMutation({
    mutationFn: async (participationData: Omit<SiteEventParticipation, 'id' | 'createdAt' | 'updatedAt'>) => {
      const response = await apiRequest('POST', '/api/demand-response/participations', participationData);
      return await response.json();
    },
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['/api/sites', data.siteId, 'demand-response/participations'] });
    },
  });
}

export function useUpdateSiteEventParticipation() {
  return useMutation({
    mutationFn: async ({ 
      participationId, 
      participationData 
    }: { 
      participationId: number; 
      participationData: Partial<Omit<SiteEventParticipation, 'id' | 'createdAt' | 'updatedAt'>>
    }) => {
      const response = await apiRequest('PUT', `/api/demand-response/participations/${participationId}`, participationData);
      return await response.json();
    },
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['/api/sites', data.siteId, 'demand-response/participations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/demand-response/participations', data.id] });
    },
  });
}

// DR Event Opt-in/Opt-out
export function useOptInDemandResponseEvent() {
  return useMutation({
    mutationFn: async ({ siteId, eventId }: { siteId: number; eventId: number }) => {
      const response = await apiRequest('POST', '/api/demand-response/participations', {
        siteId,
        eventId,
        participationStatus: 'opt_in',
        responseMethod: 'manual'
      });
      return await response.json();
    },
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['/api/sites', data.siteId, 'demand-response/participations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sites', data.siteId, 'demand-response/events'] });
    },
  });
}

export function useOptOutDemandResponseEvent() {
  return useMutation({
    mutationFn: async ({ 
      siteId, 
      eventId,
      participationId,
      notes
    }: { 
      siteId: number; 
      eventId: number;
      participationId?: number;
      notes?: string;
    }) => {
      // If we have an existing participation, update it
      if (participationId) {
        const response = await apiRequest('PUT', `/api/demand-response/participations/${participationId}`, {
          participationStatus: 'opt_out',
          responseMethod: 'manual',
          notes
        });
        return await response.json();
      } 
      // Otherwise create a new opt-out participation
      else {
        const response = await apiRequest('POST', '/api/demand-response/participations', {
          siteId,
          eventId,
          participationStatus: 'opt_out',
          responseMethod: 'manual',
          notes
        });
        return await response.json();
      }
    },
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['/api/sites', data.siteId, 'demand-response/participations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sites', data.siteId, 'demand-response/events'] });
    },
  });
}

// DR Actions
export function useDemandResponseActions(eventId: number | undefined) {
  return useQuery<DemandResponseAction[]>({
    queryKey: ['/api/demand-response/events', eventId, 'actions'],
    enabled: !!eventId,
  });
}

export function useCreateDemandResponseAction() {
  return useMutation({
    mutationFn: async (actionData: Omit<DemandResponseAction, 'id' | 'createdAt' | 'updatedAt'>) => {
      const response = await apiRequest('POST', '/api/demand-response/actions', actionData);
      return await response.json();
    },
    onSuccess: (data, variables) => {
      // Find the relevant participation
      queryClient.invalidateQueries({ 
        queryKey: ['/api/demand-response/events', variables.participationId, 'actions'] 
      });
    },
  });
}