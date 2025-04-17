import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from './use-toast';

export interface Site {
  id: number;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  installedCapacity?: number;
  createdAt: string;
  updatedAt: string;
  siteType?: string;
  status?: string;
}

interface SiteContextType {
  sites: Site[];
  currentSite: Site | null;
  isLoading: boolean;
  error: Error | null;
  setSiteById: (siteId: number) => void;
}

// Create the context with default values
const SiteContext = createContext<SiteContextType>({
  sites: [],
  currentSite: null,
  isLoading: true,
  error: null,
  setSiteById: () => {},
});

interface SiteProviderProps {
  children: React.ReactNode;
}

export function SiteProvider({ children }: SiteProviderProps) {
  const [currentSite, setCurrentSite] = useState<Site | null>(null);
  const { toast } = useToast();
  
  // Fetch all available sites
  const { data: sites = [], isLoading, error } = useQuery<Site[], Error>({
    queryKey: ['/api/sites'],
    queryFn: () => fetch('/api/sites').then(res => {
      if (!res.ok) throw new Error('Failed to load sites');
      return res.json();
    }),
    onError: (error) => {
      toast({
        title: 'Error loading sites',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Set current site by ID
  const setSiteById = (siteId: number) => {
    const selectedSite = sites.find(site => site.id === siteId);
    if (selectedSite) {
      setCurrentSite(selectedSite);
      localStorage.setItem('currentSiteId', siteId.toString());
    } else {
      toast({
        title: 'Site not found',
        description: `Site with ID ${siteId} was not found`,
        variant: 'destructive',
      });
    }
  };

  // On initial load, try to restore the last selected site or default to the first one
  useEffect(() => {
    if (sites.length > 0 && !currentSite) {
      const savedSiteId = localStorage.getItem('currentSiteId');
      
      if (savedSiteId) {
        const siteId = parseInt(savedSiteId);
        const savedSite = sites.find(site => site.id === siteId);
        
        if (savedSite) {
          setCurrentSite(savedSite);
        } else {
          // If saved site not found, default to the first site
          setCurrentSite(sites[0]);
          localStorage.setItem('currentSiteId', sites[0].id.toString());
        }
      } else {
        // No saved site, default to the first one
        setCurrentSite(sites[0]);
        localStorage.setItem('currentSiteId', sites[0].id.toString());
      }
    }
  }, [sites, currentSite]);

  const contextValue: SiteContextType = {
    sites,
    currentSite,
    isLoading,
    error,
    setSiteById,
  };

  return (
    <SiteContext.Provider value={contextValue}>
      {children}
    </SiteContext.Provider>
  );
}

// Custom hook for using the site context
export function useSiteContext() {
  const context = useContext(SiteContext);
  if (!context) {
    throw new Error('useSiteContext must be used within a SiteProvider');
  }
  return context;
}