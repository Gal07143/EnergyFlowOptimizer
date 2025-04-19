/**
 * Test script specifically for Israeli HV tariff creation
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
    
    // Step 3: Create Israeli HV tariff
    console.log(`Creating Israeli HV tariff for site ${siteId}...`);
    const hvTariffResponse = await api.post(`/sites/${siteId}/tariff/israeli/hv`, {
      name: 'Israeli HV Tariff',
      provider: 'Israel Electric Corporation',
      importRate: 0.38,
      exportRate: 0.19,
      isTimeOfUse: true,
      currency: 'ILS',
      scheduleData: {
        summer: {
          peak: 0.44,
          shoulder: 0.36,
          offPeak: 0.20
        },
        winter: {
          peak: 0.41, 
          shoulder: 0.33,
          offPeak: 0.18
        },
        spring: {
          peak: 0.39,
          shoulder: 0.31,
          offPeak: 0.17
        },
        autumn: {
          peak: 0.39,
          shoulder: 0.31,
          offPeak: 0.17
        }
      }
    });
    
    console.log('Successfully created Israeli HV tariff:');
    console.log(JSON.stringify(hvTariffResponse.data, null, 2));
    
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