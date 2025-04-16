/**
 * Format a number to a specified number of decimal places
 * @param value - The number to format
 * @param decimals - The number of decimal places (default: 2)
 * @returns Formatted number as string
 */
export function formatNumber(value: number | string | undefined, decimals: number = 2): string {
  if (value === undefined || value === null) return '0';
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) return '0';
  
  return numValue.toFixed(decimals);
}

/**
 * Format a date to a readable string
 * @param date - Date to format
 * @param includeTime - Whether to include time in the formatted string
 * @returns Formatted date string
 */
export function formatDate(date: Date | string, includeTime: boolean = false): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
    return 'Invalid date';
  }
  
  const options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric'
  };
  
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }
  
  return dateObj.toLocaleDateString('en-US', options);
}

/**
 * Format a timestamp to a relative time string (e.g., "5 minutes ago")
 * @param timestamp - Timestamp to format
 * @returns Relative time string
 */
export function formatRelativeTime(timestamp: Date | string): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;
  
  return formatDate(date);
}

/**
 * Format a value with appropriate units
 * @param value - Value to format
 * @param type - Type of value (power, energy, percentage)
 * @param decimals - Number of decimal places
 * @returns Formatted value with units
 */
export function formatValueWithUnits(
  value: number | string | undefined,
  type: 'power' | 'energy' | 'percentage' | 'currency',
  decimals: number = 1,
  currencyCode: string = 'USD'
): string {
  if (value === undefined || value === null) return '0';
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) return '0';
  
  switch (type) {
    case 'power':
      return `${formatNumber(numValue, decimals)} kW`;
    case 'energy':
      return `${formatNumber(numValue, decimals)} kWh`;
    case 'percentage':
      return `${formatNumber(numValue, decimals)}%`;
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: decimals
      }).format(numValue);
    default:
      return formatNumber(numValue, decimals);
  }
}

/**
 * Creates a random ID for use in lists, etc.
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}
