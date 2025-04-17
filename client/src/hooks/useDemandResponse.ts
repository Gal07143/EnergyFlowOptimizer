import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { z } from 'zod';

// Define demand response types
export interface DemandResponseProgram {
  id: number;
  name: string;
  provider: string;
  programType: string;
  description?: string;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  incentiveRate?: number;
  notificationLeadTime?: number;
  maxEventDuration?: number;
  participationRequirements?: Record<string, unknown>;
}

export interface DemandResponseEvent {
  id: number;
  programId: number;
  programName: string;
  name: string;
  description?: string;
  status: 'scheduled' | 'pending' | 'active' | 'completed' | 'cancelled';
  startTime: string;
  endTime: string;
  targetReduction?: number;
  incentiveModifier?: number;
  isEmergency: boolean;
  notificationTime?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SiteEventParticipation {
  id: number;
  siteId: number;
  eventId: number;
  participationStatus: 'opt_in' | 'opt_out' | 'automatic';
  responseMethod?: string;
  reductionAchieved?: number;
  incentiveEarned?: number;
  startTime?: string;
  endTime?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SiteDemandResponseSettings {
  id: number;
  siteId: number;
  isEnrolled: boolean;
  maxReductionCapacity?: number;
  defaultParticipation: 'opt_in' | 'opt_out' | 'automatic';
  autoResponseEnabled: boolean;
  notificationEmail?: string;
  notificationSms?: string;
  notificationPush: boolean;
  minimumIncentiveThreshold?: number;
  devicePriorities?: Record<string, number>;
  responseStrategy?: Record<string, boolean>;
  createdAt: string;
  updatedAt: string;
}

// Get demand response programs for a site
export function useDemandResponsePrograms(siteId: number | undefined) {
  return useQuery<DemandResponseProgram[]>({
    queryKey: ['/api/sites', siteId, 'demand-response', 'programs'],
    enabled: !!siteId,
  });
}

// Get demand response events for a site
export function useDemandResponseEvents(siteId: number | undefined) {
  return useQuery<DemandResponseEvent[]>({
    queryKey: ['/api/sites', siteId, 'demand-response', 'events'],
    enabled: !!siteId,
  });
}

// Get demand response settings for a site
export function useDemandResponseSettings(siteId: number | undefined) {
  return useQuery<SiteDemandResponseSettings>({
    queryKey: ['/api/sites', siteId, 'demand-response', 'settings'],
    enabled: !!siteId,
  });
}

// Get site participations in events
export function useSiteEventParticipations(siteId: number | undefined) {
  return useQuery<SiteEventParticipation[]>({
    queryKey: ['/api/sites', siteId, 'demand-response', 'participations'],
    enabled: !!siteId,
  });
}

// Update demand response settings
export function useUpdateDemandResponseSettings() {
  return useMutation({
    mutationFn: async ({ 
      siteId, 
      settingsData 
    }: { 
      siteId: number; 
      settingsData: Partial<SiteDemandResponseSettings> 
    }) => {
      const response = await apiRequest('PUT', `/api/sites/${siteId}/demand-response/settings`, settingsData);
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/sites', data.siteId, 'demand-response', 'settings'] });
    },
  });
}

// Opt-in to a demand response event
export function useOptInDemandResponseEvent() {
  return useMutation({
    mutationFn: async ({ 
      siteId, 
      eventId,
      participationId
    }: { 
      siteId: number; 
      eventId: number;
      participationId?: number;
    }) => {
      const url = participationId 
        ? `/api/sites/${siteId}/demand-response/events/${eventId}/participations/${participationId}/opt-in`
        : `/api/sites/${siteId}/demand-response/events/${eventId}/participations/opt-in`;
      
      const response = await apiRequest('POST', url);
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/sites', data.siteId, 'demand-response', 'participations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sites', data.siteId, 'demand-response', 'events'] });
    },
  });
}

// Opt-out of a demand response event
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
      const url = participationId 
        ? `/api/sites/${siteId}/demand-response/events/${eventId}/participations/${participationId}/opt-out`
        : `/api/sites/${siteId}/demand-response/events/${eventId}/participations/opt-out`;
      
      const response = await apiRequest('POST', url, { notes });
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/sites', data.siteId, 'demand-response', 'participations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sites', data.siteId, 'demand-response', 'events'] });
    },
  });
}

// Get event details
export function useEventDetails(siteId: number | undefined, eventId: number | undefined) {
  return useQuery<DemandResponseEvent>({
    queryKey: ['/api/sites', siteId, 'demand-response', 'events', eventId],
    enabled: !!siteId && !!eventId,
  });
}

// Get program details
export function useProgramDetails(siteId: number | undefined, programId: number | undefined) {
  return useQuery<DemandResponseProgram>({
    queryKey: ['/api/sites', siteId, 'demand-response', 'programs', programId],
    enabled: !!siteId && !!programId,
  });
}