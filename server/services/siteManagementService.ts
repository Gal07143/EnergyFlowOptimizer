/**
 * Site Management Service
 * Manages sites (locations with energy assets) in the system
 */

import { storage } from '../storage';

// Site data interface
export interface Site {
  id: number;
  name: string;
  location: {
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
  };
  timezone: string;
  type: 'residential' | 'commercial' | 'industrial' | 'utility' | 'other';
  capacity: {
    solarCapacity?: number;
    batteryCapacity?: number;
    gridConnectionCapacity?: number;
    evChargerCapacity?: number;
  };
  settings: {
    optimizationMode: 'cost_saving' | 'self_sufficiency' | 'peak_shaving' | 'battery_life' | 'custom';
    selfConsumptionTarget?: number;
    batterySoCMin?: number;
    batterySoCMax?: number;
    gridExportLimit?: number;
    gridImportLimit?: number;
    demandChargeThreshold?: number;
  };
  owner: string;
  managedBy: string[];
  status: 'active' | 'inactive' | 'maintenance';
  createdAt: string;
  updatedAt: string;
}

export class SiteManagementService {
  /**
   * Get all sites
   */
  async getAllSites(): Promise<Site[]> {
    return storage.getSites();
  }
  
  /**
   * Get a site by ID
   */
  async getSite(id: number): Promise<Site | undefined> {
    return storage.getSite(id);
  }
  
  /**
   * Get sites by owner
   */
  async getSitesByOwner(owner: string): Promise<Site[]> {
    const sites = await storage.getSites();
    return sites.filter(site => site.owner === owner);
  }
  
  /**
   * Get sites managed by a user
   */
  async getSitesManagedBy(userId: string): Promise<Site[]> {
    const sites = await storage.getSites();
    return sites.filter(site => site.managedBy.includes(userId));
  }
  
  /**
   * Create a new site
   */
  async createSite(site: Omit<Site, 'id' | 'createdAt' | 'updatedAt'>): Promise<Site> {
    return storage.createSite(site);
  }
  
  /**
   * Update a site
   */
  async updateSite(id: number, updates: Partial<Omit<Site, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Site | undefined> {
    return storage.updateSite(id, updates);
  }
  
  /**
   * Delete a site
   */
  async deleteSite(id: number): Promise<boolean> {
    return storage.deleteSite(id);
  }
}

// Singleton instance
let siteManagementServiceInstance: SiteManagementService | null = null;

// Initialize the site management service
export function initSiteManagementService(): SiteManagementService {
  if (!siteManagementServiceInstance) {
    siteManagementServiceInstance = new SiteManagementService();
  }
  return siteManagementServiceInstance;
}

// Get the site management service instance
export function getSiteManagementService(): SiteManagementService {
  if (!siteManagementServiceInstance) {
    return initSiteManagementService();
  }
  return siteManagementServiceInstance;
}