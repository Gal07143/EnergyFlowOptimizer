import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Site } from '@shared/schema';

interface SiteContextType {
  currentSiteId: number;
  currentSite: Site | null;
  sites: Site[];
  changeSite: (siteId: number) => void;
}

const SiteContext = createContext<SiteContextType>({
  currentSiteId: 1,
  currentSite: null,
  sites: [],
  changeSite: () => {},
});

export const SiteProvider = ({ children }: { children: ReactNode }) => {
  const [currentSiteId, setCurrentSiteId] = useState<number>(() => {
    const savedSiteId = localStorage.getItem('currentSiteId');
    return savedSiteId ? parseInt(savedSiteId, 10) : 1;
  });

  const { data: sites = [] } = useQuery<Site[]>({
    queryKey: ['/api/sites'],
  });

  const currentSite = sites.find(site => site.id === currentSiteId) || null;

  const changeSite = (siteId: number) => {
    setCurrentSiteId(siteId);
    localStorage.setItem('currentSiteId', siteId.toString());
  };

  useEffect(() => {
    if (sites.length > 0 && !currentSite) {
      // If current site is not found in the list, default to the first site
      changeSite(sites[0].id);
    }
  }, [sites, currentSite]);

  return (
    <SiteContext.Provider
      value={{
        currentSiteId,
        currentSite,
        sites,
        changeSite
      }}
    >
      {children}
    </SiteContext.Provider>
  );
};

export const useSiteContext = () => useContext(SiteContext);