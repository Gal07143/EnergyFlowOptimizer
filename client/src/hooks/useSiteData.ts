import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useState } from 'react';

interface Site {
  id: number;
  name: string;
  address?: string;
  maxCapacity?: number;
  gridConnectionPoint?: number;
  timezone?: string;
  createdAt: string;
  updatedAt: string;
}

// Get all sites
export function useSites() {
  return useQuery({ queryKey: ['/api/sites'] });
}

// Get a single site
export function useSite(siteId: number) {
  return useQuery({
    queryKey: ['/api/sites', siteId],
    enabled: !!siteId
  });
}

// Create a site
export function useCreateSite() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (site: Partial<Site>) => {
      const response = await apiRequest('POST', '/api/sites', site);
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate the sites query to refetch the list
      queryClient.invalidateQueries({ queryKey: ['/api/sites'] });
      
      toast({
        title: 'Site created',
        description: 'New site has been added',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error creating site',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Update a site
export function useUpdateSite() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ id, ...site }: Partial<Site> & { id: number }) => {
      const response = await apiRequest('PUT', `/api/sites/${id}`, site);
      return await response.json();
    },
    onSuccess: (data) => {
      // Invalidate the queries to refetch the latest data
      queryClient.invalidateQueries({ queryKey: ['/api/sites', data.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/sites'] });
      
      toast({
        title: 'Site updated',
        description: `${data.name} has been updated`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error updating site',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Current selected site management
export function useSiteSelector() {
  // Get the site ID from local storage, or use a default (1)
  const [currentSiteId, setCurrentSiteId] = useState<number>(() => {
    const storedSiteId = localStorage.getItem('currentSiteId');
    return storedSiteId ? parseInt(storedSiteId, 10) : 1;
  });
  
  const { data: sites } = useSites();
  const { data: currentSite } = useSite(currentSiteId);
  
  // Change the current site
  const changeSite = (siteId: number) => {
    setCurrentSiteId(siteId);
    localStorage.setItem('currentSiteId', siteId.toString());
  };
  
  return {
    currentSiteId,
    currentSite,
    sites,
    changeSite
  };
}

// Initialize demo data for the application
export function useInitializeDemoData() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/demo-setup', {});
      return await response.json();
    },
    onSuccess: (data) => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries();
      
      toast({
        title: 'Demo data initialized',
        description: 'Example data has been loaded into the application',
      });
      
      return data;
    },
    onError: (error) => {
      toast({
        title: 'Error initializing demo data',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
