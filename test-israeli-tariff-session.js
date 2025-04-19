/**
 * Test script for Israeli tariff creation using session-based authentication
 * This script uses axios with cookie support to maintain authentication session
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Set up cookie handling
const COOKIE_PATH = path.join(process.cwd(), 'cookies.txt');
let cookies = [];

try {
  if (fs.existsSync(COOKIE_PATH)) {
    cookies = fs.readFileSync(COOKIE_PATH, 'utf8').split('\n').filter(Boolean);
  }
} catch (error) {
  console.error('Error reading cookies:', error);
}

// Create an axios instance with cookie support
const api = axios.create({
  baseURL: 'http://localhost:5000/api'
});

// Add request interceptor to include cookies in requests
api.interceptors.request.use(config => {
  if (cookies.length > 0) {
    config.headers.Cookie = cookies.join('; ');
  }
  return config;
});

// Add response interceptor to save cookies from responses
api.interceptors.response.use(response => {
  const setCookies = response.headers['set-cookie'];
  if (setCookies) {
    cookies = setCookies;
    fs.writeFileSync(COOKIE_PATH, cookies.join('\n'));
    console.log('Cookies saved to file');
  }
  return response;
});

let siteId = null;

async function login() {
  try {
    console.log('Logging in...');
    const response = await api.post('/login', {
      username: 'admin',
      password: 'password123'
    });
    
    console.log('Login successful!');
    console.log('User data:', response.data);
    return true;
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    return false;
  }
}

async function createDemoData() {
  try {
    console.log('Creating demo site and data...');
    const response = await api.post('/demo-setup');
    
    siteId = response.data.site.id;
    console.log(`Demo site created successfully! Site ID: ${siteId}`);
    return true;
  } catch (error) {
    console.error('Failed to create demo site:', error.response?.data || error.message);
    return false;
  }
}

async function getUser() {
  try {
    console.log('Fetching user data...');
    const response = await api.get('/user');
    console.log('User data:', response.data);
    
    // Check if user has manager role
    const userRole = response.data.role;
    console.log(`User role: ${userRole}`);
    
    if (!['admin', 'partner_admin', 'manager'].includes(userRole)) {
      console.warn('Warning: User does not have manager role. Tariff creation may fail.');
    }
    
    return response.data;
  } catch (error) {
    console.error('Failed to fetch user:', error.response?.data || error.message);
    return null;
  }
}

async function createIsraeliTariff() {
  try {
    console.log(`Creating Israeli Time-of-Use tariff for site ${siteId}...`);
    const response = await api.post(`/sites/${siteId}/tariff/israeli/tou`, {
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
    console.log(JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Failed to create Israeli tariff:', error.response?.data || error.message);
    return null;
  }
}

async function fetchTariff() {
  try {
    console.log(`Fetching tariff for site ${siteId}...`);
    const response = await api.get(`/sites/${siteId}/tariff`);
    
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
    const response = await api.get(`/sites/${siteId}/tariff/rate`);
    
    console.log('Current tariff rate:');
    console.log(JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Failed to fetch current tariff rate:', error.response?.data || error.message);
    return null;
  }
}

async function main() {
  // Step 1: Login
  if (!(await login())) {
    console.log('Exiting due to login failure');
    return;
  }
  
  // Step 2: Check user role
  const user = await getUser();
  if (!user) {
    console.log('Exiting due to user fetch failure');
    return;
  }
  
  // Step 3: Create demo data
  if (!(await createDemoData())) {
    console.log('Exiting due to demo data creation failure');
    return;
  }
  
  // Step 4: Create Israeli ToU tariff
  const tariff = await createIsraeliTariff();
  if (!tariff) {
    console.log('Exiting due to tariff creation failure');
    return;
  }
  
  // Step 5: Fetch the created tariff to verify
  const fetchedTariff = await fetchTariff();
  if (!fetchedTariff) {
    console.log('Exiting due to tariff fetch failure');
    return;
  }
  
  // Step 6: Get current tariff rate
  const currentRate = await getCurrentTariffRate();
  
  console.log('\nTest summary:');
  console.log(`- Israeli tariff created: ${tariff.name?.includes('Israeli') ? '✅' : '❌'}`);
  console.log(`- Time-of-Use enabled: ${tariff.isTimeOfUse ? '✅' : '❌'}`);
  console.log(`- Schedule data present: ${tariff.scheduleData ? '✅' : '❌'}`);
  console.log(`- Current rate period: ${currentRate ? '✅ ' + currentRate.period : '❌'}`);
  console.log(`- Currency set to ILS: ${tariff.currency === 'ILS' ? '✅' : '❌'}`);
}

main().catch(error => {
  console.error('Test failed with error:', error);
});