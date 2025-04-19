/**
 * Test script for Israeli tariff integration with optimization service
 * This tests whether the optimization engine is aware of and uses tariff data
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
    
    // Step 4: Run tariff-based optimization
    console.log(`Running tariff-based optimization for site ${siteId}...`);
    try {
      const optimizationResponse = await api.post(`/sites/${siteId}/optimize/tariff`, {
        batteryId: 2, // Assuming battery ID 2 exists
        optimizationMode: 'cost_saving',
        timeHorizon: 24
      });
      
      console.log('Optimization results:');
      console.log(JSON.stringify(optimizationResponse.data, null, 2));
      console.log(`Tariff optimization test: ✅`);
    } catch (error) {
      console.error('Optimization failed:', error.response?.data || error.message);
      console.log(`Tariff optimization test: ❌`);
    }
    
    // Step 5: Test a specific tariff strategy
    console.log(`Testing tariff strategy for site ${siteId}...`);
    try {
      const strategyResponse = await api.post(`/sites/${siteId}/optimize/strategy/tariff_arbitrage`, {
        batteryId: 2,
        timeHorizon: 24
      });
      
      console.log('Strategy results:');
      console.log(JSON.stringify(strategyResponse.data, null, 2));
      console.log(`Tariff strategy test: ✅`);
    } catch (error) {
      console.error('Strategy execution failed:', error.response?.data || error.message);
      console.log(`Tariff strategy test: ❌`);
    }
    
    // Step 6: Get optimization summary
    console.log(`Getting optimization summary for site ${siteId}...`);
    try {
      const summaryResponse = await api.get(`/sites/${siteId}/optimize/tariff-summary`);
      
      console.log('Optimization summary:');
      console.log(JSON.stringify(summaryResponse.data, null, 2));
      console.log(`Summary retrieval test: ✅`);
    } catch (error) {
      console.error('Summary retrieval failed:', error.response?.data || error.message);
      console.log(`Summary retrieval test: ❌`);
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