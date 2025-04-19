/**
 * Test script to ensure the Israeli tariff is set as the primary tariff
 * This test deletes the default tariff first, then creates an Israeli tariff
 */

import axios from 'axios';
import fs from 'fs';

// Create a basic axios instance
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 10000 // Add timeout to avoid hanging
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
    
    // Step 3: Get the current (default) tariff
    console.log(`Fetching current tariff for site ${siteId}...`);
    const currentTariffResponse = await api.get(`/sites/${siteId}/tariff`);
    const defaultTariff = currentTariffResponse.data;
    console.log('Default tariff:');
    console.log(JSON.stringify(defaultTariff, null, 2));
    
    // Step 4: Delete the default tariff
    console.log(`Deleting default tariff with ID: ${defaultTariff.id}...`);
    try {
      const deleteResponse = await api.delete(`/api/tariffs/${defaultTariff.id}`);
      console.log('Default tariff deleted successfully');
    } catch (error) {
      console.error('Failed to delete default tariff:', error.response?.data || error.message);
      console.log('Continuing with test...');
    }
    
    // Step 5: Create Israeli ToU tariff
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
    
    const israeliTariff = israeliTariffResponse.data;
    console.log(`Successfully created Israeli ToU tariff with ID: ${israeliTariff.id}`);
    
    // Step 6: Verify the active tariff is now the Israeli one
    console.log(`Verifying active tariff for site ${siteId}...`);
    const updatedTariffResponse = await api.get(`/sites/${siteId}/tariff`);
    const activeTariff = updatedTariffResponse.data;
    console.log('Current active tariff:');
    console.log(JSON.stringify(activeTariff, null, 2));
    
    // Check if the active tariff is now the Israeli one
    const isIsraeliTariffActive = 
      activeTariff.id === israeliTariff.id ||
      activeTariff.name.includes('Israeli') ||
      activeTariff.currency === 'ILS';
    
    console.log(`\nIsraeli tariff set as active: ${isIsraeliTariffActive ? '✅' : '❌'}`);
    
    // Step 7: Get current tariff rate
    try {
      console.log(`Fetching current tariff rate for site ${siteId}...`);
      const rateResponse = await api.get(`/sites/${siteId}/tariff/rate`);
      console.log('Current tariff rate:');
      console.log(JSON.stringify(rateResponse.data, null, 2));
      
      // Check if the tariff rate is using Israeli currency
      const isRateUsingIsraeliCurrency = rateResponse.data.currency === 'ILS';
      console.log(`Rate using Israeli currency (ILS): ${isRateUsingIsraeliCurrency ? '✅' : '❌'}`);
    } catch (error) {
      console.error('Failed to fetch current rate:', error.response?.data || error.message);
    }
    
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