import { Request, Response } from 'express';
import { db } from '../db';
import { tariffs, type Tariff } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Get all tariffs
 */
export async function getTariffs(req: Request, res: Response) {
  try {
    const allTariffs = await db.select().from(tariffs);
    res.json(allTariffs);
  } catch (error) {
    console.error('Error fetching tariffs:', error);
    res.status(500).json({ message: 'Failed to fetch tariffs' });
  }
}

/**
 * Get a specific tariff by ID
 */
export async function getTariff(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const [tariff] = await db.select().from(tariffs).where(eq(tariffs.id, parseInt(id)));
    
    if (!tariff) {
      return res.status(404).json({ message: 'Tariff not found' });
    }
    
    res.json(tariff);
  } catch (error) {
    console.error('Error fetching tariff:', error);
    res.status(500).json({ message: 'Failed to fetch tariff' });
  }
}

/**
 * Get a tariff for a specific site
 */
export async function getSiteTariff(req: Request, res: Response) {
  try {
    const { siteId } = req.params;
    const [tariff] = await db.select().from(tariffs).where(eq(tariffs.siteId, parseInt(siteId)));
    
    if (!tariff) {
      return res.status(404).json({ message: 'Tariff not found for this site' });
    }
    
    res.json(tariff);
  } catch (error) {
    console.error('Error fetching site tariff:', error);
    res.status(500).json({ message: 'Failed to fetch site tariff' });
  }
}

/**
 * Create a new tariff
 */
export async function createTariff(req: Request, res: Response) {
  try {
    const [tariff] = await db.insert(tariffs).values(req.body).returning();
    res.status(201).json(tariff);
  } catch (error) {
    console.error('Error creating tariff:', error);
    res.status(500).json({ message: 'Failed to create tariff' });
  }
}

/**
 * Update an existing tariff
 */
export async function updateTariff(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const [updatedTariff] = await db
      .update(tariffs)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(tariffs.id, parseInt(id)))
      .returning();
    
    if (!updatedTariff) {
      return res.status(404).json({ message: 'Tariff not found' });
    }
    
    res.json(updatedTariff);
  } catch (error) {
    console.error('Error updating tariff:', error);
    res.status(500).json({ message: 'Failed to update tariff' });
  }
}

/**
 * Create Israeli tariff data
 * Using time-of-use structure with seasonal variations
 */
export async function createIsraeliTariffData(siteId: number) {
  try {
    // Check if site already has a tariff
    const existingTariff = await db.select().from(tariffs).where(eq(tariffs.siteId, siteId));
    
    if (existingTariff.length > 0) {
      // Update existing tariff to Israeli TOU tariff
      await db
        .update(tariffs)
        .set({
          name: 'Israeli TOU Tariff',
          provider: 'Israel Electric Corporation',
          importRate: 0.48, // Base rate in NIS
          exportRate: 0.23, // Solar feed-in rate
          isTimeOfUse: true,
          currency: 'ILS',
          scheduleData: createIsraeliScheduleData(),
          updatedAt: new Date()
        })
        .where(eq(tariffs.siteId, siteId));
    } else {
      // Create new Israeli TOU tariff
      await db.insert(tariffs).values({
        siteId,
        name: 'Israeli TOU Tariff',
        provider: 'Israel Electric Corporation',
        importRate: 0.48, // Base rate in NIS
        exportRate: 0.23, // Solar feed-in rate
        isTimeOfUse: true,
        currency: 'ILS',
        scheduleData: createIsraeliScheduleData(),
        dataIntervalSeconds: 60
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error creating Israeli tariff data:', error);
    return { success: false, error };
  }
}

/**
 * Helper function to create Israeli TOU schedule data
 */
function createIsraeliScheduleData() {
  return {
    seasons: [
      {
        name: 'Summer',
        months: [6, 7, 8], // June, July, August
        rates: [
          {
            name: 'Peak',
            rate: 0.94, // NIS per kWh
            times: [
              { days: [1, 2, 3, 4, 5], // Monday to Friday
                hours: [
                  { start: "17:00", end: "22:00" } // 5pm to 10pm
                ]
              }
            ]
          },
          {
            name: 'Shoulder',
            rate: 0.63, // NIS per kWh
            times: [
              { days: [1, 2, 3, 4, 5], // Monday to Friday
                hours: [
                  { start: "07:00", end: "17:00" } // 7am to 5pm
                ]
              }
            ]
          },
          {
            name: 'Off-Peak',
            rate: 0.33, // NIS per kWh
            times: [
              { days: [1, 2, 3, 4, 5], // Monday to Friday
                hours: [
                  { start: "00:00", end: "07:00" }, // 12am to 7am
                  { start: "22:00", end: "24:00" }  // 10pm to 12am
                ]
              },
              { days: [6, 0], // Saturday and Sunday (0 = Sunday)
                hours: [
                  { start: "00:00", end: "24:00" } // All day
                ]
              }
            ]
          }
        ]
      },
      {
        name: 'Winter',
        months: [12, 1, 2], // December, January, February
        rates: [
          {
            name: 'Peak',
            rate: 0.85, // NIS per kWh
            times: [
              { days: [1, 2, 3, 4, 5], // Monday to Friday
                hours: [
                  { start: "17:00", end: "21:00" } // 5pm to 9pm
                ]
              }
            ]
          },
          {
            name: 'Shoulder',
            rate: 0.57, // NIS per kWh
            times: [
              { days: [1, 2, 3, 4, 5], // Monday to Friday
                hours: [
                  { start: "07:00", end: "17:00" } // 7am to 5pm
                ]
              }
            ]
          },
          {
            name: 'Off-Peak',
            rate: 0.30, // NIS per kWh
            times: [
              { days: [1, 2, 3, 4, 5], // Monday to Friday
                hours: [
                  { start: "00:00", end: "07:00" }, // 12am to 7am
                  { start: "21:00", end: "24:00" }  // 9pm to 12am
                ]
              },
              { days: [6, 0], // Saturday and Sunday (0 = Sunday)
                hours: [
                  { start: "00:00", end: "24:00" } // All day
                ]
              }
            ]
          }
        ]
      },
      {
        name: 'Transition',
        months: [3, 4, 5, 9, 10, 11], // March, April, May, September, October, November
        rates: [
          {
            name: 'Peak',
            rate: 0.69, // NIS per kWh
            times: [
              { days: [1, 2, 3, 4, 5], // Monday to Friday
                hours: [
                  { start: "17:00", end: "22:00" } // 5pm to 10pm
                ]
              }
            ]
          },
          {
            name: 'Off-Peak',
            rate: 0.39, // NIS per kWh
            times: [
              { days: [1, 2, 3, 4, 5], // Monday to Friday
                hours: [
                  { start: "00:00", end: "17:00" }, // 12am to 5pm
                  { start: "22:00", end: "24:00" }  // 10pm to 12am
                ]
              },
              { days: [6, 0], // Saturday and Sunday (0 = Sunday)
                hours: [
                  { start: "00:00", end: "24:00" } // All day
                ]
              }
            ]
          }
        ]
      }
    ]
  };
}

/**
 * Get the current tariff rate based on date and time
 */
export async function getCurrentTariffRate(req: Request, res: Response) {
  try {
    const { siteId } = req.params;
    const [tariff] = await db.select().from(tariffs).where(eq(tariffs.siteId, parseInt(siteId)));
    
    if (!tariff) {
      return res.status(404).json({ message: 'Tariff not found for this site' });
    }
    
    // If not time-of-use, return standard rate
    if (!tariff.isTimeOfUse) {
      return res.json({
        currentRate: tariff.importRate,
        rateType: 'Standard',
        currency: tariff.currency
      });
    }
    
    // Get current rate from schedule
    const now = req.query.datetime ? new Date(req.query.datetime as string) : new Date();
    const currentRate = getCurrentRateFromSchedule(tariff, now);
    
    res.json(currentRate);
  } catch (error) {
    console.error('Error fetching current tariff rate:', error);
    res.status(500).json({ message: 'Failed to fetch current tariff rate' });
  }
}

/**
 * Calculate the current rate from a tariff schedule
 */
function getCurrentRateFromSchedule(tariff: Tariff, date: Date): any {
  // Default to base rate if schedule data is missing
  if (!tariff.scheduleData || !tariff.scheduleData.seasons) {
    return {
      currentRate: tariff.importRate,
      rateType: 'Standard',
      currency: tariff.currency
    };
  }
  
  const scheduleData = tariff.scheduleData as any;
  const month = date.getMonth() + 1; // 1-12
  const day = date.getDay(); // 0-6 (0 = Sunday)
  const hour = date.getHours();
  const minute = date.getMinutes();
  const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  
  // Find current season
  const currentSeason = scheduleData.seasons.find((season: any) => 
    season.months.includes(month)
  );
  
  if (!currentSeason) {
    return {
      currentRate: tariff.importRate,
      rateType: 'Standard',
      currency: tariff.currency,
      season: 'Unknown'
    };
  }
  
  // Find applicable rate in the season
  for (const rateObj of currentSeason.rates) {
    for (const timeRule of rateObj.times) {
      // Check if the current day is in this rule
      if (timeRule.days.includes(day)) {
        // Check if the current time is in any of the hour ranges
        for (const hourRange of timeRule.hours) {
          if (isTimeInRange(timeStr, hourRange.start, hourRange.end)) {
            return {
              currentRate: rateObj.rate,
              rateType: rateObj.name,
              currency: tariff.currency,
              season: currentSeason.name
            };
          }
        }
      }
    }
  }
  
  // Fallback to default rate
  return {
    currentRate: tariff.importRate,
    rateType: 'Standard',
    currency: tariff.currency,
    season: currentSeason.name
  };
}

/**
 * Check if a time is within a given range
 */
function isTimeInRange(time: string, start: string, end: string): boolean {
  // Handle special case for midnight
  if (end === '24:00') {
    return time >= start || time < '00:00';
  }
  
  return time >= start && time < end;
}