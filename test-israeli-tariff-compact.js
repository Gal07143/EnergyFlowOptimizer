/**
 * Compact test script for Israeli tariff integration
 * This script tests creation, retrieval, and TOU rate functionality
 */

import axios from 'axios';

// Create a basic axios instance
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 5000 // Shorter timeout to avoid hanging
});

async function main() {
  try {
    // Step 1: Login
    console.log('Logging in...');
    const loginResponse = await api.post('/login', {
      username: 'admin',
      password: 'password123'
    });
    
    // Save the session cookie
    const cookies = loginResponse.headers['set-cookie'];
    if (cookies) {
      // Set cookie for future requests
      api.defaults.headers.Cookie = cookies.join('; ');
    }
    
    console.log('Login successful!');
    
    // Step 2: Create demo site
    console.log('Creating demo site...');
    const demoResponse = await api.post('/demo-setup');
    const siteId = demoResponse.data.site.id;
    console.log(`Created demo site with ID: ${siteId}`);
    
    // Step 3: Delete the default tariff
    console.log('Getting default tariff...');
    const defaultTariffResponse = await api.get(`/sites/${siteId}/tariff`);
    const defaultTariffId = defaultTariffResponse.data.id;
    
    console.log(`Deleting default tariff with ID: ${defaultTariffId}`);
    await api.delete(`/tariffs/${defaultTariffId}`);
    console.log('Default tariff deleted');
    
    // Step 4: Create Israeli ToU tariff
    console.log(`Creating Israeli ToU tariff for site ${siteId}...`);
    const israeliTariffResponse = await api.post(`/sites/${siteId}/tariff/israeli/tou`, {
      name: 'Israeli Time-of-Use Tariff',
      provider: 'Israel Electric Corporation',
      importRate: 0.48,
      exportRate: 0.23,
      isTimeOfUse: true,
      currency: 'ILS',
      scheduleData: {
        summer: {
          peak: 0.53,
          shoulder: 0.45,
          offPeak: 0.25
        },
        winter: {
          peak: 0.51, 
          shoulder: 0.43,
          offPeak: 0.22
        },
        spring: {
          peak: 0.49,
          shoulder: 0.41,
          offPeak: 0.21
        },
        autumn: {
          peak: 0.49,
          shoulder: 0.41,
          offPeak: 0.21
        }
      }
    });
    
    console.log('Israeli tariff created successfully!');
    
    // Step 5: Verify it's now the primary tariff
    const updatedTariffResponse = await api.get(`/sites/${siteId}/tariff`);
    const activeTariff = updatedTariffResponse.data;
    
    const isIsraeliTariffPrimary = 
      activeTariff.name.includes('Israeli') && 
      activeTariff.currency === 'ILS';
    
    console.log('Current active tariff:');
    console.log(`- Name: ${activeTariff.name}`);
    console.log(`- Currency: ${activeTariff.currency}`);
    console.log(`- Time-of-Use enabled: ${activeTariff.isTimeOfUse}`);
    
    console.log(`\nTest results:`);
    console.log(`- Israeli tariff as primary: ${isIsraeliTariffPrimary ? '✅' : '❌'}`);
    
    // Step 6: Get current tariff rate
    const rateResponse = await api.get(`/sites/${siteId}/tariff/rate`);
    const tariffRate = rateResponse.data;
    
    console.log('Current tariff rate:');
    console.log(`- Rate: ${tariffRate.rate} ${tariffRate.currency}`);
    console.log(`- Period: ${tariffRate.period}`);
    console.log(`- Currency in ILS: ${tariffRate.currency === 'ILS' ? '✅' : '❌'}`);
    
    console.log('\nTest completed successfully! 🎉');
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

main();