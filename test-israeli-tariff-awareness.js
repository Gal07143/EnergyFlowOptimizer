/**
 * Test script specifically for Israeli tariff awareness in optimization
 * This is a focused test to verify the optimization engine recognizes the tariff
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
    
    // Step 3: Create Israeli ToU tariff
    console.log(`Creating Israeli ToU tariff for site ${siteId}...`);
    const tariffResponse = await api.post(`/sites/${siteId}/tariff/israeli/tou`, {
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
    
    console.log('Successfully created Israeli ToU tariff:');
    console.log(JSON.stringify(tariffResponse.data, null, 2));
    
    // Step 4: Verify the current tariff is actually the Israeli one
    console.log(`Fetching current tariff for site ${siteId}...`);
    const currentTariff = await api.get(`/sites/${siteId}/tariff`);
    console.log('Current tariff:');
    console.log(JSON.stringify(currentTariff.data, null, 2));
    
    // Step 5: Run basic optimization to see if tariff is recognized
    console.log(`Running basic optimization for site ${siteId}...`);
    const optimizationResponse = await api.post(`/sites/${siteId}/optimize/tariff`, {
      batteryId: 2,
      optimizationMode: 'cost_saving',
      timeHorizon: 24
    });
    
    console.log('Optimization results:');
    console.log(JSON.stringify(optimizationResponse.data, null, 2));
    
    // Check if the tariff was recognized in the optimization
    const isIsraeliTariffRecognized = optimizationResponse.data.tariff?.isIsraeliTariff === true ||
                                     optimizationResponse.data.reasoning?.includes('Israeli') ||
                                     optimizationResponse.data.tariff?.currency === 'ILS';
    
    console.log(`\nIsraeli tariff recognized in optimization: ${isIsraeliTariffRecognized ? '✅' : '❌'}`);
    
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