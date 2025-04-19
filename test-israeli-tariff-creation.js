/**
 * Test script to specifically test creation of an Israeli Time-of-Use tariff
 */

import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';
let siteId = null;
let authToken = null;

async function login() {
  try {
    console.log('Logging in...');
    const response = await axios.post(`${API_BASE}/login`, {
      username: 'admin',
      password: 'password123'
    });
    
    authToken = response.data.token;
    // Set the auth token for all future requests
    axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
    console.log('Login successful!');
    return true;
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    return false;
  }
}

async function createIsraeliTariff() {
  try {
    console.log('Creating demo site...');
    const siteResponse = await axios.post(`${API_BASE}/sites`, {
      name: 'Israeli Tariff Test Site',
      location: 'Tel Aviv, Israel',
      timezone: 'Asia/Jerusalem'
    });
    
    console.log('Site creation response:', JSON.stringify(siteResponse.data, null, 2));
    
    if (siteResponse.data && siteResponse.data.id) {
      siteId = siteResponse.data.id;
    } else if (siteResponse.data && siteResponse.data.site && siteResponse.data.site.id) {
      siteId = siteResponse.data.site.id;
    } else {
      // Fallback to creating a demo site through the demo-setup endpoint
      console.log('Site ID not found in response, trying demo-setup endpoint...');
      const demoResponse = await axios.post(`${API_BASE}/demo-setup`);
      siteId = demoResponse.data.site.id;
    }
    
    console.log(`Demo site created successfully! Site ID: ${siteId}`);
    
    console.log('Creating Israeli Time-of-Use tariff...');
    const tariffResponse = await axios.post(`${API_BASE}/sites/${siteId}/tariff`, {
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
    
    console.log('Israeli ToU tariff created successfully:');
    console.log(JSON.stringify(tariffResponse.data, null, 2));
    
    return tariffResponse.data;
  } catch (error) {
    console.error('Failed to create Israeli tariff:', error.response?.data || error.message);
    return null;
  }
}

async function fetchTariff() {
  try {
    console.log(`Fetching tariff for site ${siteId}...`);
    const response = await axios.get(`${API_BASE}/sites/${siteId}/tariff`);
    
    console.log('Tariff details:');
    console.log(JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Failed to fetch tariff:', error.response?.data || error.message);
    return null;
  }
}

async function getCurrentTariffRate() {
  try {
    console.log(`Fetching current tariff rate for site ${siteId}...`);
    const response = await axios.get(`${API_BASE}/sites/${siteId}/tariff/rate`);
    
    console.log('Current tariff rate:');
    console.log(JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Failed to fetch current tariff rate:', error.response?.data || error.message);
    return null;
  }
}

async function main() {
  // Step 0: Login first
  if (!(await login())) {
    console.log('Exiting due to login failure');
    return;
  }
  
  // Step 1: Create Israeli ToU tariff
  const tariff = await createIsraeliTariff();
  if (!tariff) {
    console.log('Exiting due to tariff creation failure');
    return;
  }
  
  // Step 2: Fetch the created tariff to verify
  const fetchedTariff = await fetchTariff();
  if (!fetchedTariff) {
    console.log('Exiting due to tariff fetch failure');
    return;
  }
  
  // Step 3: Get current tariff rate
  const currentRate = await getCurrentTariffRate();
  
  console.log('\nTest summary:');
  console.log(`- Israeli tariff created: ${fetchedTariff.name.includes('Israeli') ? '✅' : '❌'}`);
  console.log(`- Time-of-Use enabled: ${fetchedTariff.isTimeOfUse ? '✅' : '❌'}`);
  console.log(`- Schedule data present: ${fetchedTariff.scheduleData ? '✅' : '❌'}`);
  console.log(`- Current rate period: ${currentRate ? '✅ ' + currentRate.period : '❌'}`);
  console.log(`- Currency set to ILS: ${fetchedTariff.currency === 'ILS' ? '✅' : '❌'}`);
}

main().catch(error => {
  console.error('Test failed with error:', error);
});