import { db } from "./db";
import { eq, and, desc, gte, lte, isNotNull } from "drizzle-orm";
import { 
  users, 
  sites, 
  devices, 
  deviceReadings, 
  energyReadings, 
  energyForecasts,
  optimizationSettings, 
  tariffs,
  partners,
  type User, 
  type InsertUser, 
  type Site, 
  type InsertSite,
  type Device, 
  type InsertDevice,
  type DeviceReading, 
  type InsertDeviceReading,
  type EnergyReading, 
  type InsertEnergyReading,
  type EnergyForecast,
  type InsertEnergyForecast,
  type OptimizationSetting, 
  type InsertOptimizationSetting,
  type Tariff, 
  type InsertTariff,
  type Partner,
  type InsertPartner
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsersByPartner(partnerId: number): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  setVerificationCode(userId: number, code: string): Promise<boolean>;
  verifyEmail(userId: number, code: string): Promise<boolean>;
  isEmailVerified(userId: number): Promise<boolean>;

  // Partner operations
  getPartner(id: number): Promise<Partner | undefined>;
  getPartners(): Promise<Partner[]>;
  createPartner(partner: InsertPartner): Promise<Partner>;
  updatePartner(id: number, partner: Partial<Partner>): Promise<Partner | undefined>;
  
  // Site operations
  getSite(id: number): Promise<Site | undefined>;
  getSites(): Promise<Site[]>;
  getSitesByPartner(partnerId: number): Promise<Site[]>;
  createSite(site: InsertSite): Promise<Site>;
  updateSite(id: number, site: Partial<Site>): Promise<Site | undefined>;

  // Device operations
  getDevice(id: number): Promise<Device | undefined>;
  getDevicesByType(siteId: number, type: string): Promise<Device[]>;
  getDevicesBySite(siteId: number): Promise<Device[]>;
  createDevice(device: InsertDevice): Promise<Device>;
  updateDevice(id: number, device: Partial<Device>): Promise<Device | undefined>;
  deleteDevice(id: number): Promise<boolean>;

  // Device Readings
  getDeviceReadings(deviceId: number, limit?: number): Promise<DeviceReading[]>;
  getDeviceReadingsByTimeRange(deviceId: number, startTime: Date, endTime: Date): Promise<DeviceReading[]>;
  createDeviceReading(reading: InsertDeviceReading): Promise<DeviceReading>;

  // Energy Readings
  getEnergyReadings(siteId: number, limit?: number): Promise<EnergyReading[]>;
  getEnergyReadingsByTimeRange(siteId: number, startTime: Date, endTime: Date): Promise<EnergyReading[]>;
  getLatestEnergyReading(siteId: number): Promise<EnergyReading | undefined>;
  createEnergyReading(reading: InsertEnergyReading): Promise<EnergyReading>;

  // Optimization Settings
  getOptimizationSettings(siteId: number): Promise<OptimizationSetting | undefined>;
  createOptimizationSettings(settings: InsertOptimizationSetting): Promise<OptimizationSetting>;
  updateOptimizationSettings(id: number, settings: Partial<OptimizationSetting>): Promise<OptimizationSetting | undefined>;

  // Energy Forecasts
  getEnergyForecasts(siteId: number): Promise<EnergyForecast[]>;
  getEnergyForecastsByType(siteId: number, forecastType: string): Promise<EnergyForecast[]>;
  getLatestEnergyForecast(siteId: number, interval?: string): Promise<EnergyForecast | undefined>;
  createEnergyForecast(forecast: InsertEnergyForecast): Promise<EnergyForecast>;
  
  // Tariffs
  getTariffs(siteId: number): Promise<Tariff[]>;
  getTariff(id: number): Promise<Tariff | undefined>;
  createTariff(tariff: InsertTariff): Promise<Tariff>;
  updateTariff(id: number, tariff: Partial<Tariff>): Promise<Tariff | undefined>;
  deleteTariff(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return updatedUser || undefined;
  }
  
  async setVerificationCode(userId: number, code: string): Promise<boolean> {
    // Set expiry time to 30 minutes from now
    const expiryTime = new Date(Date.now() + 30 * 60 * 1000);
    
    try {
      await db
        .update(users)
        .set({ 
          verificationCode: code,
          verificationCodeExpiry: expiryTime 
        })
        .where(eq(users.id, userId));
      
      return true;
    } catch (error) {
      console.error('Failed to set verification code:', error);
      return false;
    }
  }
  
  async verifyEmail(userId: number, code: string): Promise<boolean> {
    const user = await this.getUser(userId);
    
    if (!user) {
      return false;
    }
    
    // Check if code matches and hasn't expired
    if (user.verificationCode === code && 
        user.verificationCodeExpiry && 
        new Date(user.verificationCodeExpiry) > new Date()) {
      
      // Update user to mark email as verified and clear verification code
      await db
        .update(users)
        .set({ 
          isEmailVerified: true,
          verificationCode: null,
          verificationCodeExpiry: null
        })
        .where(eq(users.id, userId));
      
      return true;
    }
    
    return false;
  }
  
  async isEmailVerified(userId: number): Promise<boolean> {
    const user = await this.getUser(userId);
    return user?.isEmailVerified || false;
  }

  // Site operations
  async getSite(id: number): Promise<Site | undefined> {
    const [site] = await db.select().from(sites).where(eq(sites.id, id));
    return site || undefined;
  }

  async getSites(): Promise<Site[]> {
    return await db.select().from(sites);
  }

  async createSite(site: InsertSite): Promise<Site> {
    // Fix for drizzle-orm typing issues
    const [newSite] = await db.insert(sites).values([site] as any).returning();
    return newSite;
  }

  async updateSite(id: number, site: Partial<Site>): Promise<Site | undefined> {
    const [updatedSite] = await db
      .update(sites)
      .set({ ...site, updatedAt: new Date() })
      .where(eq(sites.id, id))
      .returning();
    return updatedSite || undefined;
  }

  // Device operations
  async getDevice(id: number): Promise<Device | undefined> {
    const [device] = await db.select().from(devices).where(eq(devices.id, id));
    return device || undefined;
  }

  async getDevicesByType(siteId: number, type: string): Promise<Device[]> {
    return await db
      .select()
      .from(devices)
      .where(and(eq(devices.siteId, siteId), eq(devices.type, type as any)));
  }

  async getDevicesBySite(siteId: number): Promise<Device[]> {
    return await db.select().from(devices).where(eq(devices.siteId, siteId));
  }

  async createDevice(device: InsertDevice): Promise<Device> {
    const [newDevice] = await db.insert(devices).values([device] as any).returning();
    return newDevice;
  }

  async updateDevice(id: number, device: Partial<Device>): Promise<Device | undefined> {
    const [updatedDevice] = await db
      .update(devices)
      .set({ ...device, updatedAt: new Date() })
      .where(eq(devices.id, id))
      .returning();
    return updatedDevice || undefined;
  }

  async deleteDevice(id: number): Promise<boolean> {
    const deletedDevices = await db.delete(devices).where(eq(devices.id, id)).returning();
    return deletedDevices.length > 0;
  }

  // Device readings
  async getDeviceReadings(deviceId: number, limit: number = 100): Promise<DeviceReading[]> {
    return await db
      .select()
      .from(deviceReadings)
      .where(eq(deviceReadings.deviceId, deviceId))
      .orderBy(desc(deviceReadings.timestamp))
      .limit(limit);
  }

  async getDeviceReadingsByTimeRange(
    deviceId: number, 
    startTime: Date, 
    endTime: Date
  ): Promise<DeviceReading[]> {
    return await db
      .select()
      .from(deviceReadings)
      .where(
        and(
          eq(deviceReadings.deviceId, deviceId),
          gte(deviceReadings.timestamp, startTime),
          lte(deviceReadings.timestamp, endTime)
        )
      )
      .orderBy(desc(deviceReadings.timestamp));
  }

  async createDeviceReading(reading: InsertDeviceReading): Promise<DeviceReading> {
    const [newReading] = await db.insert(deviceReadings).values([reading] as any).returning();
    return newReading;
  }

  // Energy readings
  async getEnergyReadings(siteId: number, limit: number = 100): Promise<EnergyReading[]> {
    return await db
      .select()
      .from(energyReadings)
      .where(eq(energyReadings.siteId, siteId))
      .orderBy(desc(energyReadings.timestamp))
      .limit(limit);
  }

  async getEnergyReadingsByTimeRange(
    siteId: number, 
    startTime: Date, 
    endTime: Date
  ): Promise<EnergyReading[]> {
    return await db
      .select()
      .from(energyReadings)
      .where(
        and(
          eq(energyReadings.siteId, siteId),
          gte(energyReadings.timestamp, startTime),
          lte(energyReadings.timestamp, endTime)
        )
      )
      .orderBy(desc(energyReadings.timestamp));
  }

  async getLatestEnergyReading(siteId: number): Promise<EnergyReading | undefined> {
    const [reading] = await db
      .select()
      .from(energyReadings)
      .where(eq(energyReadings.siteId, siteId))
      .orderBy(desc(energyReadings.timestamp))
      .limit(1);
    return reading || undefined;
  }

  async createEnergyReading(reading: InsertEnergyReading): Promise<EnergyReading> {
    const [newReading] = await db.insert(energyReadings).values([reading] as any).returning();
    return newReading;
  }

  // Optimization settings
  async getOptimizationSettings(siteId: number): Promise<OptimizationSetting | undefined> {
    const [settings] = await db
      .select()
      .from(optimizationSettings)
      .where(eq(optimizationSettings.siteId, siteId));
    return settings || undefined;
  }

  async createOptimizationSettings(settings: InsertOptimizationSetting): Promise<OptimizationSetting> {
    const [newSettings] = await db.insert(optimizationSettings).values([settings] as any).returning();
    return newSettings;
  }

  async updateOptimizationSettings(
    id: number, 
    settings: Partial<OptimizationSetting>
  ): Promise<OptimizationSetting | undefined> {
    const [updatedSettings] = await db
      .update(optimizationSettings)
      .set({ ...settings, updatedAt: new Date() })
      .where(eq(optimizationSettings.id, id))
      .returning();
    return updatedSettings || undefined;
  }

  // Energy Forecasts
  async getEnergyForecasts(siteId: number): Promise<EnergyForecast[]> {
    return await db
      .select()
      .from(energyForecasts)
      .where(eq(energyForecasts.siteId, siteId))
      .orderBy(desc(energyForecasts.timestamp));
  }
  
  async getEnergyForecastsByType(siteId: number, forecastType: string): Promise<EnergyForecast[]> {
    return await db
      .select()
      .from(energyForecasts)
      .where(
        and(
          eq(energyForecasts.siteId, siteId),
          eq(energyForecasts.forecastType, forecastType as any)
        )
      )
      .orderBy(desc(energyForecasts.timestamp));
  }
  
  async getLatestEnergyForecast(
    siteId: number, 
    interval?: string
  ): Promise<EnergyForecast | undefined> {
    // Note: We don't have an interval field in our current schema
    // but we're keeping the parameter for future compatibility
    const [forecast] = await db
      .select()
      .from(energyForecasts)
      .where(eq(energyForecasts.siteId, siteId))
      .orderBy(desc(energyForecasts.timestamp))
      .limit(1);
      
    return forecast || undefined;
  }
  
  async createEnergyForecast(forecast: InsertEnergyForecast): Promise<EnergyForecast> {
    const [newForecast] = await db.insert(energyForecasts).values([forecast] as any).returning();
    return newForecast;
  }

  // Tariffs
  async getTariffs(siteId: number): Promise<Tariff[]> {
    return await db.select().from(tariffs).where(eq(tariffs.siteId, siteId));
  }

  async getTariff(id: number): Promise<Tariff | undefined> {
    const [tariff] = await db.select().from(tariffs).where(eq(tariffs.id, id));
    return tariff || undefined;
  }

  async createTariff(tariff: InsertTariff): Promise<Tariff> {
    const [newTariff] = await db.insert(tariffs).values([tariff] as any).returning();
    return newTariff;
  }

  async updateTariff(id: number, tariff: Partial<Tariff>): Promise<Tariff | undefined> {
    const [updatedTariff] = await db
      .update(tariffs)
      .set({ ...tariff, updatedAt: new Date() })
      .where(eq(tariffs.id, id))
      .returning();
    return updatedTariff || undefined;
  }
  
  async deleteTariff(id: number): Promise<boolean> {
    const deletedTariffs = await db
      .delete(tariffs)
      .where(eq(tariffs.id, id))
      .returning();
    return deletedTariffs.length > 0;
  }
}

export const storage = new DatabaseStorage();
