/**
 * Minimalist test script for Israeli tariff creation using session-based authentication
 * Streamlined to focus only on essential operations
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
      fs.writeFileSync('cookies.txt', cookies.join('\n'));
      
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
    const touTariffResponse = await api.post(`/sites/${siteId}/tariff/israeli/tou`, {
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
    
    // Log success
    console.log('Successfully created Israeli ToU tariff:');
    console.log(JSON.stringify(touTariffResponse.data, null, 2));
    
    // Step 4: Create Israeli LV tariff
    console.log(`Creating Israeli LV tariff for site ${siteId}...`);
    const lvTariffResponse = await api.post(`/sites/${siteId}/tariff/israeli/lv`, {
      name: 'Israeli LV Tariff',
      provider: 'Israel Electric Corporation',
      importRate: 0.42,
      exportRate: 0.21,
      isTimeOfUse: true,
      currency: 'ILS',
      scheduleData: {
        summer: {
          peak: 0.48,
          shoulder: 0.39,
          offPeak: 0.22
        },
        winter: {
          peak: 0.45, 
          shoulder: 0.37,
          offPeak: 0.20
        },
        spring: {
          peak: 0.43,
          shoulder: 0.35,
          offPeak: 0.19
        },
        autumn: {
          peak: 0.43,
          shoulder: 0.35,
          offPeak: 0.19
        }
      }
    });
    
    console.log('Successfully created Israeli LV tariff:');
    console.log(JSON.stringify(lvTariffResponse.data, null, 2));
    
    // Step 5: Create Israeli HV tariff
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