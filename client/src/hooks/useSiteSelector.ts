import { useSiteContext } from './use-site-context';

export function useSiteSelector() {
  const siteContext = useSiteContext();

  return {
    currentSiteId: siteContext.currentSiteId,
    currentSite: siteContext.currentSite,
    sites: siteContext.sites,
    changeSite: siteContext.changeSite
  };
}